import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import test from "node:test";

import { DeepSeekHarnessWebClient } from "../apps/syno/syno/deepseek-harness-web-client.mjs";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const GOOD_TOKEN = "test-launch-token";
const COOKIE_PAIR = "dsh-auth-test=v1.fake";

function wsTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

// 客户端→服务端帧带掩码（RFC 6455）；fake 必须解掩才能读到 mux open 帧。
function decodeClientFrames(state, chunk) {
  state.buffer = state.buffer ? Buffer.concat([state.buffer, chunk]) : chunk;
  const frames = [];
  while (state.buffer.length >= 2) {
    const opcode = state.buffer[0] & 0x0f;
    const masked = (state.buffer[1] & 0x80) !== 0;
    let length = state.buffer[1] & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (state.buffer.length < 4) break;
      length = state.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (state.buffer.length < 10) break;
      length = Number(state.buffer.readBigUInt64BE(2));
      offset = 10;
    }
    const maskLength = masked ? 4 : 0;
    if (state.buffer.length < offset + maskLength + length) break;
    let payload = state.buffer.subarray(offset + maskLength, offset + maskLength + length);
    if (masked) {
      const mask = state.buffer.subarray(offset, offset + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }
    state.buffer = state.buffer.subarray(offset + maskLength + length);
    frames.push({ opcode, payload });
  }
  return frames;
}

function rpcOk(rpcId, value) {
  return JSON.stringify({ type: "server-response", rpcId, result: { ok: true, value } });
}

// DSH 0.1.7 协议 fake：令牌换 cookie（303 + set-cookie）、/api/* 一律校验
// cookie、单条 /api/remote.mux 承载 session/follow 逻辑流。
function startFakeWeb({ onPrompt, selectModel, beforePromptResponse, promptResponseDelayMs = 0 } = {}) {
  const state = {
    rejectMux: false,
    sessionCreates: [],
    sessionPrompts: [],
    upgradeCookies: [],
    tokenExchanges: [],
  };
  const sockets = new Set();
  const followStreams = new Map(); // streamId -> { sessionId, send(value) }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/" && url.searchParams.has("token")) {
      state.tokenExchanges.push(url.searchParams.get("token"));
      if (url.searchParams.get("token") === GOOD_TOKEN) {
        res.writeHead(303, { location: "./", "set-cookie": `${COOKIE_PAIR}; Path=/; HttpOnly; SameSite=Strict` });
        res.end();
      } else {
        res.writeHead(303, { location: "./" });
        res.end();
      }
      return;
    }
    if (url.pathname === "/api/remote.mux") {
      res.writeHead(426, { connection: "Upgrade", upgrade: "websocket" });
      res.end("upgrade required");
      return;
    }
    if (req.headers.cookie !== COOKIE_PAIR) {
      res.writeHead(401);
      res.end("unauthorized");
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const message = JSON.parse(body || "{}");
      const args = message.payload?.args ?? {};
      const request = args.request ?? args._request ?? {};
      if (message.method === "session/list") {
        res.end(rpcOk(message.rpcId, { items: [] }));
        return;
      }
      if (message.method === "session/create") {
        state.sessionCreates.push(request);
        res.end(rpcOk(message.rpcId, { sessionId: request.sessionId }));
        return;
      }
      if (message.method === "session/selectModel") {
        if (typeof selectModel === "function") {
          selectModel(req, res, message);
          return;
        }
        res.end(rpcOk(message.rpcId, { selected: { provider: request.provider, model: request.model } }));
        return;
      }
      if (message.method === "session/prompt") {
        state.sessionPrompts.push(request);
        const sessionId = request.sessionId;
        if (typeof beforePromptResponse === "function") {
          beforePromptResponse({ sessionId, sendEvent: (event) => sendFollowEvent(sessionId, event) });
        }
        const respond = () => res.end(rpcOk(message.rpcId, { accepted: true }));
        if (promptResponseDelayMs > 0) setTimeout(respond, promptResponseDelayMs);
        else respond();
        setTimeout(() => {
          if (typeof onPrompt === "function") {
            onPrompt({ sessionId, sendEvent: (event) => sendFollowEvent(sessionId, event) });
            return;
          }
          sendFollowEvent(sessionId, { type: "turn/start", data: { turn: 1 } });
          sendFollowEvent(sessionId, {
            type: "assistant/message",
            data: { message: { content: [{ type: "text", text: "web-hello" }] } },
          });
          sendFollowEvent(sessionId, { type: "turn/end", data: { turn: 1, reason: { kind: "completed" } } });
        }, 20);
        return;
      }
      if (message.method === "session/cancel") {
        res.end(rpcOk(message.rpcId, { accepted: true }));
        return;
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });

  function sendFollowEvent(sessionId, event) {
    const stream = followStreams.get(`follow:${sessionId}`);
    stream?.send({ type: "event", event });
  }

  server.on("upgrade", (req, socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname !== "/api/remote.mux" || state.rejectMux) {
      socket.destroy();
      return;
    }
    state.upgradeCookies.push(req.headers.cookie ?? null);
    const key = req.headers["sec-websocket-key"];
    const accept = createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n"
      + "Upgrade: websocket\r\n"
      + "Connection: Upgrade\r\n"
      + `Sec-WebSocket-Accept: ${accept}\r\n`
      + "\r\n",
    );
    const parseState = { buffer: null };
    socket.on("data", (chunk) => {
      for (const frame of decodeClientFrames(parseState, chunk)) {
        if (frame.opcode !== 0x1) continue;
        let message;
        try {
          message = JSON.parse(frame.payload.toString("utf8"));
        } catch {
          continue;
        }
        if (message.type === "open" && message.endpoint === "session/follow") {
          const address = message.payload?.args?.request?.address;
          const sessionId = address?.sessionId;
          followStreams.set(message.streamId, {
            sessionId,
            send(value) {
              socket.write(wsTextFrame(JSON.stringify({ type: "item", streamId: message.streamId, value })));
            },
          });
          socket.write(wsTextFrame(JSON.stringify({
            type: "item",
            streamId: message.streamId,
            value: {
              type: "snapshot",
              header: { version: 1, id: sessionId, createdAt: 0, isSeeded: false },
              cursor: 0,
              records: [],
              hasMore: false,
              projections: {},
            },
          })));
        }
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port,
        state,
        close() {
          for (const socket of sockets) socket.destroy();
          sockets.clear();
          server.close();
        },
      });
    });
  });
}

function makeClient(fake, options = {}) {
  return new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    token: GOOD_TOKEN,
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 5_000,
    ...options,
  });
}

test("DeepSeekHarnessWebClient exchanges the launch token and runs a turn over the mux", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = makeClient(fake);
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const result = await client.runTurn("syno-main-test", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "web-hello");
  assert.deepEqual(fake.state.tokenExchanges, [GOOD_TOKEN]);
  assert.deepEqual(fake.state.upgradeCookies, [COOKIE_PAIR]);
  const prompt = fake.state.sessionPrompts[0];
  assert.equal(typeof prompt.requestId, "string");
  assert.ok(prompt.requestId.length > 0);
  assert.equal(prompt.mode, "queue");
  assert.deepEqual(prompt.content, [{ type: "text", text: "你好" }]);
});

test("DeepSeekHarnessWebClient without a token is rejected by the auth fence", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = makeClient(fake, { token: null, initializeTimeoutMs: 400 });
  t.after(() => client.close());
  await assert.rejects(
    () => client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" }),
    (error) => error.code === "HARNESS_TRANSPORT_ERROR" && error.retryable === false,
  );
});

test("DeepSeekHarnessWebClient fails fast when the token exchange sets no cookie", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = makeClient(fake, { token: "wrong-token" });
  t.after(() => client.close());
  await assert.rejects(
    () => client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" }),
    (error) => error.code === "HARNESS_AUTH_FAILED" && error.retryable === true,
  );
});

test("DeepSeekHarnessWebClient pins the requested agent preset on new sessions", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = makeClient(fake);
  t.after(() => client.close());
  await client.initialize({
    cwd: "/tmp/workspace",
    provider: "deepseek-official",
    model: "deepseek-v4-flash",
    agentPreset: "syno",
  });
  await client.runTurn("syno-preset", [{ type: "text", text: "你好" }]);
  assert.equal(fake.state.sessionCreates[0]?.agentPreset, "syno");
});

test("DeepSeekHarnessWebClient settles on turn/end even without assistant text", async (t) => {
  const fake = await startFakeWeb({
    onPrompt({ sessionId, sendEvent }) {
      sendEvent({ type: "turn/start", data: { turn: 1 } });
      sendEvent({ type: "turn/end", data: { turn: 1, reason: { kind: "completed" } } });
    },
  });
  t.after(() => fake.close());
  const client = makeClient(fake);
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const started = Date.now();
  const result = await client.runTurn("syno-empty", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "");
  assert.ok(Date.now() - started < 700);
});

test("DeepSeekHarnessWebClient waits for the paired turn/end when a stale one races ahead", async (t) => {
  // 2026-09-03 生产事故复现的 0.1.7 版：上一轮迟到的 turn/end 必须被配对
  // 逻辑挡住；step-2 最终答案到达前不得结算。
  let step2Sent = false;
  const fake = await startFakeWeb({
    onPrompt({ sessionId, sendEvent }) {
      sendEvent({ type: "turn/end", data: { turn: 0, reason: { kind: "completed" } } });
      sendEvent({ type: "turn/start", data: { turn: 1 } });
      sendEvent({
        type: "assistant/message",
        data: { step: 1, message: { content: [
          { type: "text", text: "我来读取这个链接的内容。" },
          { type: "tool-call", id: "call_1" },
        ] } },
      });
      sendEvent({ type: "tool/result", data: {} });
      setTimeout(() => {
        step2Sent = true;
        sendEvent({
          type: "assistant/message",
          data: { step: 2, message: { content: [{ type: "text", text: "最终答案：抓取被反爬拦截" }] } },
        });
        sendEvent({ type: "turn/end", data: { turn: 1, reason: { kind: "completed" } } });
      }, 250);
    },
  });
  t.after(() => fake.close());
  const client = makeClient(fake, { turnSettleQuietMs: 60 });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  let resolvedAt = 0;
  const pending = client.runTurn("syno-race", [{ type: "text", text: "读这个链接" }]).then((result) => {
    resolvedAt = Date.now();
    return result;
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(resolvedAt, 0, "stale turn/end 抢跑时不得在 step-2 到达前结算");
  const result = await pending;
  assert.equal(step2Sent, true);
  assert.equal(result.finalResponse, "最终答案：抓取被反爬拦截");
});

test("DeepSeekHarnessWebClient keeps turn events that race ahead of the prompt response", async (t) => {
  // 生产实证（2026-09-23）：DSH 0.1.7 的 turn/start 可能早于 session/prompt
  // RPC 响应到达（实测 +493ms vs +500ms）。事件门禁必须在 prompt 发出时即刻
  // 打开，否则早到的 turn/start 被丢弃、turn/end 配不上对，整轮空等到超时。
  const fake = await startFakeWeb({
    promptResponseDelayMs: 120,
    beforePromptResponse({ sessionId, sendEvent }) {
      sendEvent({ type: "turn/start", data: { turn: 1 } });
      sendEvent({
        type: "assistant/message",
        data: { message: { content: [{ type: "text", text: "early-hello" }] } },
      });
      sendEvent({ type: "turn/end", data: { turn: 1, reason: { kind: "completed" } } });
    },
  });
  t.after(() => fake.close());
  const client = makeClient(fake);
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const started = Date.now();
  const result = await client.runTurn("syno-early-events", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "early-hello");
  assert.ok(Date.now() - started < 1_000, "早到的 turn/end 应直接结算，而不是等到 turnTimeoutMs");
});

test("DeepSeekHarnessWebClient keeps event streams after initializeTimeoutMs", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = makeClient(fake, { initializeTimeoutMs: 500 });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const result = await client.runTurn("syno-after-timeout", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "web-hello");
});

test("DeepSeekHarnessWebClient fails the turn when selectModel is unavailable", async (t) => {
  const notices = [];
  const fake = await startFakeWeb({
    selectModel(_req, res, message) {
      res.end(JSON.stringify({
        type: "server-response",
        rpcId: message.rpcId,
        result: { ok: false, error: { message: "model route missing" } },
      }));
    },
  });
  t.after(() => fake.close());
  const client = makeClient(fake, { onNotice: (notice) => notices.push(notice) });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  await assert.rejects(
    () => client.runTurn("syno-select-fail", [{ type: "text", text: "你好" }]),
    (error) => error.code === "HARNESS_MODEL_SELECT_FAILED" && error.retryable === true,
  );
  assert.equal(notices[0]?.event, "harness.web.select_model.failed");
});

test("DeepSeekHarnessWebClient retries the mux after a partial connect failure", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  fake.state.rejectMux = true;
  const client = makeClient(fake);
  t.after(() => client.close());
  await assert.rejects(
    () => client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" }),
    (error) => error.code === "HARNESS_TRANSPORT_ERROR" || error.code === "HARNESS_NOT_RUNNING",
  );
  fake.state.rejectMux = false;
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const result = await client.runTurn("syno-retry-streams", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "web-hello");
});
