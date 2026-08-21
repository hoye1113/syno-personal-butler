import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import test from "node:test";

import { DeepSeekHarnessWebClient } from "../apps/syno/syno/deepseek-harness-web-client.mjs";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function eventEnvelope(payload) {
  return JSON.stringify({
    type: "server-request",
    rpcId: `evt-${Date.now()}`,
    method: payload.type,
    payload,
  });
}

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

function acceptWebSocket(req, socket) {
  const key = req.headers["sec-websocket-key"];
  const accept = createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n"
    + "Upgrade: websocket\r\n"
    + "Connection: Upgrade\r\n"
    + `Sec-WebSocket-Accept: ${accept}\r\n`
    + "\r\n",
  );
  return {
    send(payload) {
      socket.write(wsTextFrame(eventEnvelope(payload)));
    },
    end() {
      socket.end();
    },
  };
}

function rpcOk(rpcId, value) {
  return JSON.stringify({ type: "server-response", rpcId, result: { ok: true, value } });
}

function startFakeWeb({ onPrompt, selectModel } = {}) {
  let hostStream;
  let muxStream;
  const state = { rejectMux: false, sessionCreates: [] };
  const sockets = new Set();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/api/events.host" || url.pathname === "/api/events.mux") {
      res.writeHead(426, { connection: "Upgrade", upgrade: "websocket" });
      res.end("upgrade required");
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const message = JSON.parse(body || "{}");
      const method = message.method;
      if (method === "session.list") {
        res.end(rpcOk(message.rpcId, { items: [] }));
        return;
      }
      if (method === "session.create") {
        state.sessionCreates.push(message);
        res.end(rpcOk(message.rpcId, { sessionId: message.payload.sessionId }));
        return;
      }
      if (method === "session.selectModel") {
        if (typeof selectModel === "function") {
          selectModel(req, res, message);
          return;
        }
        res.end(rpcOk(message.rpcId, { selected: { provider: "deepseek-official", model: "deepseek-v4-flash" } }));
        return;
      }
      if (method === "session.prompt") {
        res.end(rpcOk(message.rpcId, { accepted: true }));
        const sessionId = message.payload.sessionId;
        setTimeout(() => {
          if (typeof onPrompt === "function") {
            onPrompt({ sessionId, hostStream, muxStream });
            return;
          }
          hostStream?.send({ type: "host/session-status", sessionId, running: true });
          muxStream?.send({
            type: "session/event",
            sessionId,
            event: { type: "assistant/message", data: { message: { content: [{ type: "text", text: "web-hello" }] } } },
          });
          hostStream?.send({ type: "host/session-status", sessionId, running: false });
        }, 20);
        return;
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  server.on("upgrade", (req, socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/api/events.host") {
      hostStream = acceptWebSocket(req, socket);
      return;
    }
    if (url.pathname === "/api/events.mux") {
      if (state.rejectMux) {
        socket.destroy();
        return;
      }
      muxStream = acceptWebSocket(req, socket);
      return;
    }
    socket.destroy();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port,
        state,
        close() {
          hostStream?.end();
          muxStream?.end();
          for (const socket of sockets) socket.destroy();
          sockets.clear();
          server.close();
        },
      });
    });
  });
}

test("DeepSeekHarnessWebClient runTurn waits for idle and reads assistant text", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 5_000,
  });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const result = await client.runTurn("syno-main-test", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "web-hello");
});

test("DeepSeekHarnessWebClient pins the requested agent preset on new sessions", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 5_000,
  });
  t.after(() => client.close());
  await client.initialize({
    cwd: "/tmp/workspace",
    provider: "deepseek-official",
    model: "deepseek-v4-flash",
    agentPreset: "syno",
  });
  await client.runTurn("syno-preset", [{ type: "text", text: "你好" }]);
  assert.equal(fake.state.sessionCreates[0]?.payload.agentPreset, "syno");
});

test("DeepSeekHarnessWebClient settles on running-then-idle even without assistant text", async (t) => {
  const fake = await startFakeWeb({
    onPrompt({ sessionId, hostStream }) {
      hostStream?.send({ type: "host/session-status", sessionId, running: true });
      hostStream?.send({ type: "host/session-status", sessionId, running: false });
    },
  });
  t.after(() => fake.close());
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 800,
  });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  const started = Date.now();
  const result = await client.runTurn("syno-empty", [{ type: "text", text: "你好" }]);
  assert.equal(result.finalResponse, "");
  assert.ok(Date.now() - started < 700);
});

test("DeepSeekHarnessWebClient keeps event streams after initializeTimeoutMs", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 80,
    turnTimeoutMs: 5_000,
  });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  await new Promise((resolve) => setTimeout(resolve, 150));
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
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 5_000,
    onNotice: (notice) => notices.push(notice),
  });
  t.after(() => client.close());
  await client.initialize({ cwd: "/tmp/workspace", provider: "deepseek-official", model: "deepseek-v4-flash" });
  await assert.rejects(
    () => client.runTurn("syno-select-fail", [{ type: "text", text: "你好" }]),
    (error) => error.code === "HARNESS_MODEL_SELECT_FAILED" && error.retryable === true,
  );
  assert.equal(notices[0]?.event, "harness.web.select_model.failed");
});

test("DeepSeekHarnessWebClient retries event streams after a partial connect failure", async (t) => {
  const fake = await startFakeWeb();
  t.after(() => fake.close());
  fake.state.rejectMux = true;
  const client = new DeepSeekHarnessWebClient({
    origin: `http://127.0.0.1:${fake.port}`,
    cwd: "/tmp/workspace",
    initializeTimeoutMs: 5_000,
    turnTimeoutMs: 5_000,
  });
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
