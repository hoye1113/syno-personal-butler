import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { DeepSeekHarnessWebClient } from "../apps/syno/syno/deepseek-harness-web-client.mjs";

function sseFrame(payload) {
  return `data: ${JSON.stringify({ type: "server-request", rpcId: `evt-${Date.now()}`, payload })}\n\n`;
}

function rpcOk(rpcId, value) {
  return JSON.stringify({ type: "server-response", rpcId, result: { ok: true, value } });
}

function startFakeWeb({ onPrompt, selectModel } = {}) {
  let hostStream;
  let muxStream;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/api/events.host") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(":\n\n");
      hostStream = res;
      return;
    }
    if (url.pathname === "/api/events.mux") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(":\n\n");
      muxStream = res;
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
          hostStream?.write(sseFrame({ type: "host/session-status", sessionId, running: true }));
          muxStream?.write(sseFrame({
            type: "session/event",
            sessionId,
            event: { type: "assistant/message", data: { message: { content: [{ type: "text", text: "web-hello" }] } } },
          }));
          hostStream?.write(sseFrame({ type: "host/session-status", sessionId, running: false }));
        }, 20);
        return;
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        port: server.address().port,
        close() {
          hostStream?.end();
          muxStream?.end();
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

test("DeepSeekHarnessWebClient settles on running-then-idle even without assistant text", async (t) => {
  const fake = await startFakeWeb({
    onPrompt({ sessionId, hostStream }) {
      hostStream?.write(sseFrame({ type: "host/session-status", sessionId, running: true }));
      hostStream?.write(sseFrame({ type: "host/session-status", sessionId, running: false }));
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

test("DeepSeekHarnessWebClient keeps SSE streams after initializeTimeoutMs", async (t) => {
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
