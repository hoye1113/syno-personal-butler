import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertOpenCodeServerSecurity,
  OPENCODE_MODELS,
  OpenCodeCognitiveRuntime,
  OpenCodeSessionBindingStore,
  retryableFailure,
} from "../apps/syno/syno/opencode-cognitive-runtime.mjs";
import { assertCognitiveCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";

async function temporaryRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-opencode-runtime-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function memoryBindings() {
  const records = new Map();
  const leases = new Set();
  return {
    async active(ownerKey, threadKey) { return records.get(`${ownerKey}\0${threadKey}`) || null; },
    async list() { return [...records.values()]; },
    async bind(record) {
      const value = { ...record, lifecycle: "available", lastActivityAt: new Date().toISOString() };
      records.set(`${record.ownerKey}\0${record.threadKey}`, value);
      return value;
    },
    async acquire(ownerKey, threadKey) {
      const binding = records.get(`${ownerKey}\0${threadKey}`);
      if (!binding || leases.has(binding.openCodeSessionId)) return null;
      leases.add(binding.openCodeSessionId);
      return { binding, release: () => leases.delete(binding.openCodeSessionId) };
    },
    async touch() {},
    addOrphan() {},
  };
}

function bridgeTools() {
  return {
    list: () => [{ name: "knowledge.search" }],
    bindContext: () => () => {},
    effectVersion: () => 0,
  };
}

test("OpenCodeCognitiveRuntime declares the locked v2 capability contract", () => {
  const runtime = new OpenCodeCognitiveRuntime({ client: {}, bindings: {} });
  const report = runtime.capabilities();
  assert.deepEqual(report, {
    version: 2,
    adapter: "opencode-cli-server",
    agentCount: 1,
    provider: "opencode",
    models: OPENCODE_MODELS,
    agentSelectableModel: false,
    providerFallback: false,
    directFileAccess: false,
    terminal: false,
    sourceWrite: false,
    dynamicMcp: false,
    tools: [],
  });
  assert.equal(assertCognitiveCapabilities(report).version, 2);
  assert.throws(() => assertCognitiveCapabilities({ ...report, directFileAccess: true }), /directFileAccess/);
});

test("an unavailable OpenCode process is a retryable provider outage", () => {
  assert.equal(retryableFailure({ code: "OPENCODE_NOT_RUNNING" }), true);
  assert.equal(retryableFailure({ code: "OPENCODE_EXITED" }), true);
  assert.equal(retryableFailure({ code: "OPENCODE_START_TIMEOUT" }), true);
});

test("OpenCode server security gate fails closed on a callable builtin or missing MCP", () => {
  const secure = {
    isolatedWorkspace: true,
    defaultAgent: "syno",
    enabledProviders: ["opencode"],
    shareDisabled: true,
    snapshotsDisabled: true,
    globalPermissionDenied: true,
    forbiddenCallableToolIds: [],
    mcpNames: ["syno"],
    mcpStatuses: { syno: "connected" },
  };
  assert.equal(assertOpenCodeServerSecurity(secure), secure);
  assert.throws(() => assertOpenCodeServerSecurity({ ...secure, forbiddenCallableToolIds: ["bash"] }), (error) => error.code === "OPENCODE_SECURITY_GATE_FAILED");
  assert.throws(() => assertOpenCodeServerSecurity({ ...secure, mcpNames: [] }), (error) => error.code === "OPENCODE_SECURITY_GATE_FAILED");
});

test("OpenCode sessions follow the Owner across channels and persist only binding metadata", async (t) => {
  const root = await temporaryRoot(t);
  const bindings = new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") });
  const created = [];
  const messages = [];
  const client = {
    async createSession(title) { const id = `session-${created.length + 1}`; created.push({ id, title }); return { id }; },
    async sendMessage(sessionId, payload) { messages.push({ sessionId, payload }); return { parts: [{ type: "text", text: "收到" }] }; },
  };
  const runtime = new OpenCodeCognitiveRuntime({ client, bindings });

  const weixin = await runtime.run({ text: "第一条" }, { ownerKey: "owner-1", threadKey: "main", channel: "weixin" });
  const feishu = await runtime.run({ text: "第二条" }, { ownerKey: "owner-1", threadKey: "main", channel: "feishu" });

  assert.equal(weixin.conversationId, "session-1");
  assert.equal(feishu.conversationId, "session-1");
  assert.deepEqual(created, [{ id: "session-1", title: "Syno main" }]);
  assert.deepEqual(messages.map((item) => item.sessionId), ["session-1", "session-1"]);
  assert.equal(messages[0].payload.tools.bash, false);
  assert.equal(messages[0].payload.tools.read, false);
  assert.equal(messages[0].payload.tools.skill, true);
  const serialized = await fs.readFile(path.join(root, "bindings.json"), "utf8");
  assert.doesNotMatch(serialized, /第一条|第二条|收到/);
  assert.match(serialized, /session-1/);
});

test("OpenCode outbound guard blocks secrets before creating a session or calling the remote model", async (t) => {
  const root = await temporaryRoot(t);
  let calls = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    client: {
      async createSession() { calls += 1; return { id: "must-not-exist" }; },
      async sendMessage() { calls += 1; return { parts: [{ type: "text", text: "unsafe" }] }; },
    },
  });
  await assert.rejects(
    runtime.run({ text: `请记住 token=${"sk-" + "this-is-a-secret-value"}` }, { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "REMOTE_CONTENT_BLOCKED",
  );
  assert.equal(calls, 0);
});

test("OpenCode outbound guard also protects migration context and system events", async (t) => {
  const root = await temporaryRoot(t);
  let sends = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    migrationLoader: async () => ({ text: "Authorization: Bearer abcdefghijklmnop" }),
    client: {
      async createSession() { return { id: "session-guarded" }; },
      async sendMessage() { sends += 1; return { parts: [] }; },
    },
  });
  await assert.rejects(
    runtime.run({ text: "普通问题" }, { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "REMOTE_CONTENT_BLOCKED",
  );
  assert.equal(sends, 0);

  const cleanRuntime = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "events.json") }),
    client: {
      async createSession() { return { id: "session-events" }; },
      async sendMessage() { sends += 1; return { parts: [] }; },
    },
  });
  await assert.rejects(
    cleanRuntime.appendSystemEvent({ ownerKey: "owner", text: "cookie=private-cookie-value" }),
    (error) => error.code === "REMOTE_CONTENT_BLOCKED",
  );
  assert.equal(sends, 0);
});

test("OpenCodeCognitiveRuntime serializes concurrent messages for one session", async (t) => {
  const root = await temporaryRoot(t);
  const bindings = new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") });
  let releaseFirst;
  const order = [];
  const client = {
    async createSession() { return { id: "session-serial" }; },
    async sendMessage(_id, payload) {
      order.push(`start:${payload.parts[0].text}`);
      if (payload.parts[0].text === "one") await new Promise((resolve) => { releaseFirst = resolve; });
      order.push(`end:${payload.parts[0].text}`);
      return { parts: [{ type: "text", text: payload.parts[0].text }] };
    },
  };
  const runtime = new OpenCodeCognitiveRuntime({ client, bindings });
  const first = runtime.run({ text: "one" }, { ownerKey: "owner", threadKey: "main" });
  while (!releaseFirst) await new Promise((resolve) => setImmediate(resolve));
  const second = runtime.run({ text: "two" }, { ownerKey: "owner", threadKey: "main" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["start:one"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["start:one", "end:one", "start:two", "end:two"]);
});

test("different Sessions run tool-free requests concurrently", async () => {
  const started = [];
  const releases = [];
  let created = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: memoryBindings(),
    client: {
      async createSession() { created += 1; return { id: `session-${created}` }; },
      async sendMessage(id) {
        started.push(id);
        await new Promise((resolve) => releases.push(resolve));
        return { parts: [{ type: "text", text: "ok" }] };
      },
    },
    tools: bridgeTools(),
  });
  const first = runtime.run({ text: "one" }, { ownerKey: "one", threadKey: "main", allowedTools: [] });
  const second = runtime.run({ text: "two" }, { ownerKey: "two", threadKey: "main", allowedTools: [] });
  while (started.length < 2) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started.length, 2);
  releases.splice(0).forEach((release) => release());
  await Promise.all([first, second]);
});

test("Bridge requests serialize globally while a waiting Bridge does not block another Session's tool-free request", async () => {
  const started = [];
  let releaseBridge;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: memoryBindings(),
    client: {
      async createSession(title) { return { id: title }; },
      async sendMessage(id) {
        started.push(id);
        if (id === "Syno bridge-one") await new Promise((resolve) => { releaseBridge = resolve; });
        return { parts: [{ type: "text", text: "ok" }] };
      },
    },
    tools: bridgeTools(),
  });
  const first = runtime.run({ text: "one" }, {
    ownerKey: "owner",
    threadKey: "bridge-one",
    allowedTools: ["syno_knowledge_search"],
  });
  while (!releaseBridge) await new Promise((resolve) => setImmediate(resolve));
  const waiting = runtime.run({ text: "two" }, {
    ownerKey: "owner",
    threadKey: "bridge-two",
    allowedTools: ["syno_knowledge_search"],
  });
  const toolFree = runtime.run({ text: "three" }, {
    ownerKey: "owner",
    threadKey: "plain",
    allowedTools: [],
  });
  while (!started.includes("Syno plain")) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, ["Syno bridge-one", "Syno plain"]);
  releaseBridge();
  await Promise.all([first, waiting, toolFree]);
  assert.deepEqual(started, ["Syno bridge-one", "Syno plain", "Syno bridge-two"]);
});

test("queued and waiting_bridge cancellation never call OpenCode", async () => {
  const sends = [];
  let releaseSession;
  let releaseBridge;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: memoryBindings(),
    client: {
      async createSession(title) { return { id: title }; },
      async sendMessage(id) {
        sends.push(id);
        if (id === "Syno same") await new Promise((resolve) => { releaseSession = resolve; });
        if (id === "Syno bridge-owner") await new Promise((resolve) => { releaseBridge = resolve; });
        return { parts: [{ type: "text", text: "ok" }] };
      },
    },
    tools: bridgeTools(),
  });

  const first = runtime.run({ text: "one" }, { ownerKey: "owner", threadKey: "same", allowedTools: [] });
  while (!releaseSession) await new Promise((resolve) => setImmediate(resolve));
  let queuedRunId;
  const queued = runtime.run({ text: "two" }, {
    ownerKey: "owner",
    threadKey: "same",
    allowedTools: [],
    onStart: (runId) => { queuedRunId = runId; },
  });
  while (!queuedRunId) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.cancel(queuedRunId), true);
  await assert.rejects(queued, { code: "SCHEDULER_CANCELED" });
  releaseSession();
  await first;

  const bridgeOwner = runtime.run({ text: "bridge one" }, {
    ownerKey: "owner",
    threadKey: "bridge-owner",
    allowedTools: ["syno_knowledge_search"],
  });
  while (!releaseBridge) await new Promise((resolve) => setImmediate(resolve));
  let waitingRunId;
  const waiting = runtime.run({ text: "bridge two" }, {
    ownerKey: "owner",
    threadKey: "bridge-waiter",
    allowedTools: ["syno_knowledge_search"],
    onStart: (runId) => { waitingRunId = runId; },
  });
  while (!waitingRunId || runtime.inspect(waitingRunId)?.status !== "waiting_bridge") {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(runtime.cancel(waitingRunId), true);
  await assert.rejects(waiting, { code: "SCHEDULER_CANCELED" });
  assert.deepEqual(sends, ["Syno same", "Syno bridge-owner"]);
  releaseBridge();
  await bridgeOwner;
});

test("abort unknown freezes the Session and rejects subsequent writes", async () => {
  let runningRunId;
  let sends = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: memoryBindings(),
    client: {
      async createSession() { return { id: "session-unknown" }; },
      async sendMessage(_id, _payload, { signal }) {
        sends += 1;
        return new Promise((_resolve, reject) => signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted locally"), { code: "ABORT_ERR" }));
        }, { once: true }));
      },
      async abortSession() { throw Object.assign(new Error("ack lost"), { code: "ECONNRESET" }); },
    },
  });
  const active = runtime.run({ text: "one" }, {
    ownerKey: "owner",
    threadKey: "main",
    allowedTools: [],
    onStart: (runId) => { runningRunId = runId; },
  });
  while (!runningRunId || runtime.inspect(runningRunId)?.status !== "running") {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(runtime.cancel(runningRunId), true);
  await assert.rejects(active, { code: "OPENCODE_ABORT_UNKNOWN" });
  assert.equal(runtime.inspect(runningRunId).status, "cancel_unknown");
  await assert.rejects(
    runtime.run({ text: "two" }, { ownerKey: "owner", threadKey: "main", allowedTools: [] }),
    { code: "SCHEDULER_KEY_BLOCKED" },
  );
  assert.equal(sends, 1);
});

test("OpenCode model fallback is deterministic and stops after an irreversible tool effect", async (t) => {
  const root = await temporaryRoot(t);
  const bindings = new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") });
  const attempts = [];
  const client = {
    async createSession() { return { id: "session-fallback" }; },
    async abortSession(id) { attempts.push(`abort:${id}`); },
    async sendMessage(_id, payload) {
      attempts.push(payload.model.modelID);
      if (attempts.filter((item) => !item.startsWith("abort:")).length === 1) throw Object.assign(new Error("limited"), { status: 429 });
      return { parts: [{ type: "text", text: "ok" }] };
    },
  };
  const runtime = new OpenCodeCognitiveRuntime({ client, bindings });
  const result = await runtime.run({ text: "hello" }, { ownerKey: "owner", threadKey: "main" });
  assert.equal(result.text, "ok");
  assert.deepEqual(attempts, [
    OPENCODE_MODELS[0].replace(/^opencode\//, ""),
    "abort:session-fallback",
    OPENCODE_MODELS[1].replace(/^opencode\//, ""),
  ]);
  assert.equal(result.attempts[0].failureCode, "HTTP_429");

  const noRetry = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings-2.json") }),
    client: {
      async createSession() { return { id: "session-side-effect" }; },
      async sendMessage() {
        throw Object.assign(new Error("tool committed then transport failed"), { status: 503, irreversibleEffect: true });
      },
    },
  });
  await assert.rejects(noRetry.run({ text: "write" }, { ownerKey: "owner", threadKey: "main" }), (error) => {
    assert.equal(error.code, "OPENCODE_ATTEMPTS_EXHAUSTED");
    assert.equal(error.attempts.length, 1);
    return true;
  });
});

test("OpenCode imports legacy summary and recent messages exactly once before the first reply", async (t) => {
  const root = await temporaryRoot(t);
  const messages = [];
  let migrations = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    migrationLoader: async () => {
      migrations += 1;
      return { conversationId: "conversation-old", text: "旧摘要\nuser: 最近问题" };
    },
    client: {
      async createSession() { return { id: "session-migrated" }; },
      async sendMessage(id, payload) {
        messages.push({ id, payload });
        return payload.noReply ? { parts: [] } : { parts: [{ type: "text", text: "继续回答" }] };
      },
    },
  });
  await runtime.run({ text: "继续" }, { ownerKey: "owner", threadKey: "main" });
  await runtime.run({ text: "再问" }, { ownerKey: "owner", threadKey: "main" });
  assert.equal(migrations, 1);
  assert.equal(messages[0].payload.noReply, true);
  assert.equal(messages[0].payload.tools.skill, false);
  assert.match(messages[0].payload.parts[0].text, /旧摘要/);
  const binding = await runtime.bindings.active("owner", "main");
  assert.equal(binding.migratedFromConversationId, "conversation-old");
});

test("OpenCode runtime does not retry when the Tool Bridge observed a write before transport failure", async (t) => {
  const root = await temporaryRoot(t);
  let effects = 0;
  let attempts = 0;
  const tools = {
    list() { return []; },
    effectVersion() { return effects; },
    bindContext() { return () => {}; },
  };
  const runtime = new OpenCodeCognitiveRuntime({
    tools,
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    client: {
      async createSession() { return { id: "session-effect" }; },
      async sendMessage() {
        attempts += 1;
        effects += 1;
        throw Object.assign(new Error("transport failed after tool"), { status: 503 });
      },
    },
  });
  await assert.rejects(runtime.run({ text: "change" }, { ownerKey: "owner", messageId: "msg-1" }), (error) => error.attempts.length === 1);
  assert.equal(attempts, 1);
});

test("new conversation and retention cleanup use OpenCode session endpoints", async (t) => {
  const root = await temporaryRoot(t);
  let now = new Date("2026-07-28T00:00:00Z");
  const deleted = [];
  const bindings = new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json"), clock: () => now });
  const client = {
    async createSession() { return { id: `session-${Date.now()}-${Math.random()}` }; },
    async sendMessage() { return { parts: [{ type: "text", text: "ok" }] }; },
    async deleteSession(id) { deleted.push(id); },
  };
  const runtime = new OpenCodeCognitiveRuntime({ client, bindings, clock: () => now });
  const first = await runtime.run({ text: "hello" }, { ownerKey: "owner", threadKey: "main" });
  const replacement = await runtime.newConversation({ ownerKey: "owner", threadKey: "main" });
  assert.notEqual(replacement.openCodeSessionId, first.conversationId);

  now = new Date("2026-09-01T00:00:00Z");
  const cleanup = await runtime.cleanupExpired();
  assert.equal(cleanup.deleted, 1);
  assert.equal(deleted.length, 2);
});

test("system events append to main without model reply or any tool authority", async (t) => {
  const root = await temporaryRoot(t);
  const messages = [];
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    client: {
      async createSession() { return { id: "session-main" }; },
      async sendMessage(id, payload) { messages.push({ id, payload }); return { parts: [] }; },
    },
  });
  await runtime.appendSystemEvent({ ownerKey: "owner", threadKey: "main", text: "晨间计划完成" });
  assert.equal(messages[0].id, "session-main");
  assert.equal(messages[0].payload.noReply, true);
  assert.equal(messages[0].payload.tools.skill, false);
  assert.equal(messages[0].payload.tools.bash, false);
  assert.match(messages[0].payload.parts[0].text, /Syno system event/);
});

test("capture runs expose only the explicitly allowed Syno tools", async (t) => {
  const root = await temporaryRoot(t);
  let payload;
  const tools = {
    list() {
      return [
        { name: "syno_workflow_context" },
        { name: "syno_knowledge_search" },
        { name: "syno_jobs_submit" },
      ];
    },
  };
  const runtime = new OpenCodeCognitiveRuntime({
    tools,
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    client: {
      async createSession() { return { id: "session-capture" }; },
      async sendMessage(_id, body) {
        payload = body;
        return { parts: [{ type: "text", text: "{}" }] };
      },
    },
  });
  await runtime.run({ text: "capture" }, {
    ownerKey: "owner",
    threadKey: "capture:artifact-1",
    allowedTools: ["syno_workflow_context", "syno_knowledge_search"],
  });
  assert.equal(payload.tools.syno_workflow_context, true);
  assert.equal(payload.tools.syno_knowledge_search, true);
  assert.equal(payload.tools.syno_jobs_submit, false);
  assert.equal(payload.tools.skill, false);
});

test("OpenCode exposes browser tools only to an authorized capture Session and loads the project Skill", async (t) => {
  const root = await temporaryRoot(t);
  const payloads = [];
  const tools = {
    list() {
      return [
        { name: "syno_workflow_context" },
        { name: "syno_browser_status" },
        { name: "syno_browser_navigate" },
        { name: "syno_browser_snapshot" },
      ];
    },
    bindContext() { return () => {}; },
  };
  const runtime = new OpenCodeCognitiveRuntime({
    tools,
    bindings: new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json") }),
    client: {
      async createSession() { return { id: `session-${payloads.length + 1}` }; },
      async sendMessage(_id, body) { payloads.push(body); return { parts: [{ type: "text", text: "抓取结果" }] }; },
    },
  });
  await runtime.run({ text: "普通问题" }, { ownerKey: "owner", threadKey: "main" });
  assert.equal(payloads[0].tools.syno_browser_snapshot, false);
  await runtime.run({ text: "读取页面" }, {
    ownerKey: "owner",
    threadKey: "capture:artifact-1",
    allowedTools: ["syno_browser_status", "syno_browser_navigate", "syno_browser_snapshot"],
    browserWorkflowId: "workflow-1",
    enableSkills: true,
    system: "仅使用 syno-web-capture Skill 完成页面读取。",
  });
  assert.equal(payloads[1].tools.syno_browser_status, true);
  assert.equal(payloads[1].tools.syno_browser_navigate, true);
  assert.equal(payloads[1].tools.skill, true);
  assert.equal(payloads[1].tools.syno_workflow_context, false);
  assert.match(payloads[1].system, /syno-web-capture/);
});

test("capture sessions expire after seven days while main sessions retain thirty days", async (t) => {
  const root = await temporaryRoot(t);
  let now = new Date("2026-07-01T00:00:00Z");
  const deleted = [];
  const bindings = new OpenCodeSessionBindingStore({ file: path.join(root, "bindings.json"), clock: () => now });
  await bindings.bind({ ownerKey: "owner", threadKey: "capture:artifact-1", openCodeSessionId: "capture-session" });
  await bindings.bind({ ownerKey: "owner", threadKey: "main", openCodeSessionId: "main-session" });
  now = new Date("2026-07-09T00:00:00Z");
  const runtime = new OpenCodeCognitiveRuntime({
    bindings,
    clock: () => now,
    client: { async deleteSession(id) { deleted.push(id); } },
  });
  const result = await runtime.cleanupExpired();
  assert.equal(result.deleted, 1);
  assert.deepEqual(deleted, ["capture-session"]);
  assert.equal((await bindings.active("owner", "main")).openCodeSessionId, "main-session");
});
