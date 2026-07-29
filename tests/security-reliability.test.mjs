import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { buildClaudeArgs, runProcess } from "../apps/syno/syno/executors.mjs";
import { assertJsonMutation, assertSameOriginMutation, securityHeaders } from "../apps/syno/syno/http-security.mjs";
import { assertRegisteredOperation, buildOperationRequest, intentForOperation } from "../apps/syno/syno/operation-registry.mjs";
import { OutputService } from "../apps/syno/syno/output-service.mjs";
import { buildOpenCodeMigrationContext, remoteSafeJobSummary, routeSynoApi } from "../apps/syno/syno/runtime.mjs";
import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { validateValue } from "../apps/syno/syno/settings-registry.mjs";
import { backupState, restoreState, verifyArchive } from "../apps/syno/syno/state-archive.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";
import { isPrivateAddress } from "../apps/syno/syno/source-fetcher.mjs";
import { frontmatterData } from "../apps/syno/syno/validator.mjs";

const execFileAsync = promisify(execFile);

test("legacy conversation migration excludes tool output, private turns, and secrets", () => {
  const migrated = buildOpenCodeMigrationContext({
    summaries: [{ summary: "此前讨论 Agent；api_key = super-secret-value" }],
    messages: [
      { role: "tool", content: "完整本地知识正文不应外发" },
      { role: "assistant", content: "工具返回：本地绝密资料" },
      { role: "user", content: "继续讨论 Tool Loop" },
      { role: "user", content: "privacy: private\n这是私密内容" },
      { role: "user", content: "Authorization: Bearer abcdefghijklmnop" },
    ],
  });
  assert.match(migrated, /继续讨论 Tool Loop/);
  assert.doesNotMatch(migrated, /完整本地知识|本地绝密|这是私密内容|super-secret-value|abcdefghijklmnop/);
  assert.match(migrated, /REDACTED_SECRET/);
});

test("remote Job summaries exclude requests, approval codes, diff previews, and raw errors", () => {
  const summary = remoteSafeJobSummary({
    id: "job-1",
    intent: "ingest",
    status: "awaiting_approval",
    risk: "high",
    phase: "merge",
    changedPaths: ["vault/00-Inbox/note.md"],
    request: { content: "token=private-value" },
    approvalCode: "ABC123",
    result: { preview: "diff --git\n+private body", summary: "安全摘要" },
    error: { message: "provider echoed private body" },
  });
  assert.deepEqual(summary, {
    id: "job-1",
    intent: "ingest",
    status: "awaiting_approval",
    risk: "high",
    phase: "merge",
    changedPaths: ["vault/00-Inbox/note.md"],
    summary: "安全摘要",
  });
  assert.doesNotMatch(JSON.stringify(summary), /private|ABC123|diff --git|token=/);
});

test("public Job API rejects Policy fields and maps only server-owned modes", async () => {
  const calls = [];
  const runtime = {
    developmentMode: false,
    core: { async execute(request) { calls.push(request); return { job: { id: "job-test" } }; } },
  };
  const req = { method: "POST" };
  await assert.rejects(
    routeSynoApi(runtime, req, new URL("http://localhost/api/syno/jobs"), async () => ({ text: "x", intent: "search" })),
    /不接受 Policy 字段/,
  );
  await routeSynoApi(runtime, req, new URL("http://localhost/api/syno/jobs"), async () => ({ text: "策划", mode: "create_content_idea" }));
  assert.equal(calls[0].intent, "create_content_idea");
  await assert.rejects(
    routeSynoApi(runtime, req, new URL("http://localhost/api/syno/jobs"), async () => ({ text: "x", mode: "delete" })),
    /未知的公共任务模式/,
  );
});

test("registered deterministic operations cannot lie about their Policy intent", () => {
  const request = buildOperationRequest("topics.schedule", { path: "ops/content/a.md" });
  assert.equal(request.intent, "create_action");
  assert.throws(() => assertRegisteredOperation({
    intent: "search",
    decision: { intent: "search" },
    request: { ...request, intent: "search" },
  }), /意图不一致/);
});

test("HTTP policy blocks script injection surfaces and framing", () => {
  const headers = securityHeaders("text/html; charset=utf-8");
  assert.match(headers["Content-Security-Policy"], /script-src 'self'/);
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
});

test("SSRF guard covers compact IPv4-mapped IPv6 and documentation ranges", () => {
  for (const address of ["::ffff:7f00:1", "::ffff:192.168.1.1", "2001:db8::1", "198.51.100.10", "203.0.113.5"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  assert.equal(isPrivateAddress("8.8.8.8"), false);
  assert.equal(isPrivateAddress("2001:4860:4860::8888"), false);
});

test("frontmatter rejects duplicate keys and YAML indirection", () => {
  assert.throws(() => frontmatterData("---\ntitle: one\ntitle: two\ntags: [safe]\n---\nbody"), /重复字段/);
  assert.throws(() => frontmatterData("---\ntitle: &shared one\ntags: [safe]\n---\nbody"), /不受支持/);
  assert.throws(() => frontmatterData("---\n<<: *shared\ntitle: one\n---\nbody"), /merge key/);
});

test("runtime Contract validation rejects malformed records", async () => {
  await validateContractRecord("job", {
    id: "job-20260717-abcd1234", intent: "search", status: "completed", profile: "syno-read",
    approval: "none", created: new Date().toISOString(), updated: new Date().toISOString(), request: {},
  });
  await assert.rejects(validateContractRecord("job", {
    id: "not-a-job", intent: "search", status: "invented", profile: "root", approval: "none",
    created: "yesterday", updated: "now", request: {},
  }), /Contract 校验失败/);
});

test("Claude escalation is customization-free and MCP-empty", () => {
  const args = buildClaudeArgs({ profile: "syno-read", decision: { allowedRoots: [] }, request: {} });
  for (const flag of ["--safe-mode", "--no-chrome", "--disable-slash-commands", "--no-session-persistence", "--strict-mcp-config"]) {
    assert.ok(args.includes(flag), flag);
  }
  assert.equal(args[args.indexOf("--permission-mode") + 1], "dontAsk");
  assert.deepEqual(JSON.parse(args[args.indexOf("--mcp-config") + 1]), { mcpServers: {} });
  assert.equal(args.includes("--model"), false);
});

test("Windows cmd launch preserves spaced arguments", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-cmd-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const command = path.join(root, "echo-arg.cmd");
  await fs.writeFile(command, "@echo off\r\necho %~1\r\n", "utf8");
  const result = await runProcess(command, ["hello world"], { timeoutMs: 10_000 });
  assert.equal(result.stdout.trim(), "hello world");
});

test("output progress API cannot publish without domain-validated feedback", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-output-api-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outputs = new OutputService({ opsRoot: path.join(root, "ops") });
  const { opportunity } = await outputs.createOpportunity({ title: "讲清 Tool Loop", reason: "验证理解" });
  await outputs.progress(opportunity.id, { action: "accept" });
  await outputs.progress(opportunity.id, { action: "draft", userOutput: "这是主人亲自写出的观点、证据、边界和例子。" });
  const runtime = {
    developmentMode: false,
    core: {
      async execute(request) {
        assert.equal(request.operation, "outputs.opportunity.progress");
        return outputs.progress(request.payload.id, request.payload);
      },
    },
  };
  const url = new URL(`http://localhost/api/syno/outputs/opportunities/${opportunity.id}/progress`);
  await assert.rejects(
    routeSynoApi(runtime, { method: "POST" }, url, async () => ({ action: "publish", feedback: "" })),
    /发布反馈/,
  );
  const records = await outputs.list();
  assert.equal(records[0].status, "drafting");
});

test("Windows service Web API exposes only fixed status, install and uninstall actions", async () => {
  const calls = [];
  const windowsService = {
    async status() { calls.push(["status"]); return { supported: true, installed: false, running: false, startup: "at_logon", webUrl: "http://127.0.0.1:8888/", legacyTaskDetected: true, lastTaskResult: null }; },
    async mutate(action, context) { calls.push(["mutate", action, context.channel, context.senderId]); return { installed: action === "install", running: action === "install", jobId: "job-audit" }; },
  };
  const runtime = { developmentMode: false, windowsService };
  const readBody = async () => ({ taskName: "attacker", command: "calc.exe" });
  assert.equal((await routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/windows-service"), readBody)).legacyTaskDetected, true);
  await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/windows-service/install"), readBody);
  await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/windows-service/uninstall"), readBody);
  assert.deepEqual(calls, [["status"], ["mutate", "install", "web", "local-user"], ["mutate", "uninstall", "web", "local-user"]]);
  await assert.rejects(routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/windows-service/restart"), readBody), /未知 Syno API/);
});

test("an ingest action that mutates an existing note is deterministically high risk", () => {
  assert.equal(intentForOperation("ingest.apply", { decision: { action: "create" } }), "curate_note");
  assert.equal(intentForOperation("ingest.apply", { decision: { action: "keep-separate" } }), "curate_note");
  assert.equal(intentForOperation("ingest.apply", { decision: { action: "append-source" } }), "overwrite_note");
  assert.equal(intentForOperation("ingest.apply", { decision: { action: "link-only" } }), "overwrite_note");
});

test("OpenCode Web API exposes redacted status, fixed restart, credential save, and authenticated MCP only", async () => {
  const calls = [];
  const runtime = {
    runtimeMode: "opencode",
    openCodeSupervisor: {
      async health() { return { healthy: true, state: "running", pid: 42 }; },
    },
    async restartOpenCode() { calls.push("restart"); return { state: "running" }; },
    openCodeCredentials: {
      async status() { return { configured: true, provider: "opencode" }; },
      async save(token) { calls.push(["save", token]); return { configured: true, provider: "opencode" }; },
    },
    openCodeCognitiveRuntime: {
      lastAttempts: [{ modelId: "opencode/mimo-v2.5-free", status: "completed" }],
      capabilities() { return { version: 2, adapter: "opencode-cli-server" }; },
    },
    toolBridge: {
      async handle(input) { calls.push(["mcp", input.authorization]); return { jsonrpc: "2.0", id: 1, result: {} }; },
    },
  };
  const status = await routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/opencode"), async () => ({}));
  assert.equal(status.credential.configured, true);
  assert.equal(Object.hasOwn(status.credential, "token"), false);
  await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/opencode/restart"), async () => ({}));
  await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/opencode/credential"), async () => ({ token: "secret-from-test" }));
  await routeSynoApi(runtime, { method: "POST", headers: { authorization: "Bearer bridge" } }, new URL("http://localhost/api/syno/opencode/mcp"), async () => ({ jsonrpc: "2.0", id: 1, method: "ping" }));
  assert.deepEqual(calls, ["restart", ["save", "secret-from-test"], "restart", ["mcp", "Bearer bridge"]]);
});

test("Syno health identifies the product, protocol and exact repository without exposing its path", async () => {
  const health = await routeSynoApi({ developmentMode: false }, { method: "GET" }, new URL("http://localhost/api/syno/health"), async () => ({}));
  assert.equal(health.ok, true);
  assert.equal(health.alive, true);
  assert.equal(health.state, "ready");
  assert.equal(health.product, "syno-personal-butler");
  assert.equal(health.protocolVersion, 2);
  assert.match(health.repoFingerprint, /^[a-f0-9]{16}$/);
  assert.equal(Object.hasOwn(health, "repoRoot"), false);
});

test("context stats endpoint returns aggregate telemetry without credentials (OBS 3.1)", async () => {
  const stats = { byAction: { none: 3, rotate: 1 }, compressions: 4, rotates: 1 };
  const runtime = { developmentMode: false, contextManager: { stats: () => stats } };
  const result = await routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/context/stats"), async () => ({}));
  assert.equal(result.compressions, 4);
  assert.equal(result.byAction.rotate, 1);
  assert.equal(result.apiKey, undefined); // 仅聚合指标，绝不携带 provider 凭证
  // 无 contextManager 时优雅降级
  const degraded = await routeSynoApi({ developmentMode: false }, { method: "GET" }, new URL("http://localhost/api/syno/context/stats"), async () => ({}));
  assert.equal(degraded.ok, false);
});

test("context.thresholds setting validates ratio shape (OBS 3.1)", () => {
  assert.equal(validateValue("context.thresholds", null), null);
  assert.deepEqual(validateValue("context.thresholds", { light: 0.5, heavy: 0.8 }), { light: 0.5, heavy: 0.8 });
  assert.throws(() => validateValue("context.thresholds", { light: 1.5 }), /(0,1)/);
  assert.throws(() => validateValue("context.thresholds", { unknown: 0.5 }), /未知压缩阈值/);
  assert.throws(() => validateValue("context.thresholds", "x"), /对象或 null/);
});

test("state-changing Windows service requests require JSON", () => {
  assert.doesNotThrow(() => assertJsonMutation({ method: "POST", headers: { "content-type": "application/json; charset=utf-8" } }));
  assert.throws(() => assertJsonMutation({ method: "POST", headers: { "content-type": "text/plain" } }), /JSON/);
});

test("state-changing Windows service requests require an exact same-origin browser Origin", () => {
  assert.doesNotThrow(() => assertSameOriginMutation({ method: "POST", headers: { host: "127.0.0.1:8888", origin: "http://127.0.0.1:8888" } }));
  assert.throws(() => assertSameOriginMutation({ method: "POST", headers: { host: "127.0.0.1:8888" } }), /Origin/);
  assert.throws(() => assertSameOriginMutation({ method: "POST", headers: { host: "127.0.0.1:8888", origin: "http://evil.invalid" } }), /同源/);
});

test("conversation retention removes confirmed raw voice before the conversation", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-retention-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const now = new Date("2026-07-17T12:00:00.000Z");
  const store = new ConversationStore({ root, clock: () => now });
  const conversation = await store.create({ messages: [{ role: "user", content: "转录", rawVoice: { file: "voice.wav", confirmedAt: "2026-07-09T11:00:00.000Z" } }] });
  await store.prune();
  const retained = await store.get(conversation.id);
  assert.equal(retained.status, "active");
  assert.equal("rawVoice" in retained.messages[0], false);
});

test("prune trims compactionLog and summaries to retention caps (STORE 3.2)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-meta-trim-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const now = new Date("2026-07-17T12:00:00.000Z");
  const store = new ConversationStore({ root, clock: () => now, retention: { compactionLogMax: 3, summariesMax: 2 } });
  const conv = await store.create({});
  const loaded = await store.get(conv.id);
  loaded.compactionLog = Array.from({ length: 10 }, (_, i) => ({ at: now.toISOString(), action: "layer2", n: i }));
  loaded.summaries = Array.from({ length: 8 }, (_, i) => ({ at: now.toISOString(), summary: `s${i}`, version: i + 1 }));
  await store.save(loaded);
  await store.prune();
  const retained = await store.get(conv.id);
  assert.equal(retained.compactionLog.length, 3);
  assert.equal(retained.compactionLog[0].n, 7); // 保留最近 3 条（n=7,8,9）
  assert.equal(retained.summaries.length, 2);
  assert.equal(retained.summaries[0].version, 7); // 保留最近 2 条（version 7,8）
});

test("archive externalizes past threshold, lazy-loaded via getArchive (STORE 3.2)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-archive-ext-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const now = new Date("2026-07-17T12:00:00.000Z");
  const store = new ConversationStore({ root, clock: () => now, retention: { archiveExternalThreshold: 3 } });
  const conv = await store.create({});
  // 第一批：达到阈值 → 外置，主文件清空 archive 并留 archiveRef
  await store.archiveMessages(conv.id, Array.from({ length: 3 }, (_, i) => ({ role: "tool", content: `old-${i}` })));
  const after1 = await store.get(conv.id);
  assert.equal(after1.archive.length, 0, "外置后主文件 archive 清空");
  assert.ok(after1.archiveRef, "主文件留 archiveRef");
  assert.equal((await store.getArchive(conv.id)).length, 3, "getArchive 读到全部 3 条");
  // 第二批：已外置 → 追加（不丢老数据）
  await store.archiveMessages(conv.id, [{ role: "tool", content: "new-0" }]);
  assert.equal((await store.getArchive(conv.id)).length, 4, "追加后共 4 条，老数据不丢");
  // 未达阈值的小对话仍内联（行为不变）
  const small = await store.create({});
  await store.archiveMessages(small.id, [{ role: "tool", content: "x" }]);
  const smallLoaded = await store.get(small.id);
  assert.equal(smallLoaded.archive.length, 1, "小对话 archive 内联");
  assert.ok(!smallLoaded.archiveRef);
});

test("prune trims external archive by archivedDays (STORE 3.2)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-archive-prune-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const now = new Date("2026-07-17T12:00:00.000Z");
  const store = new ConversationStore({ root, clock: () => now, retention: { archiveExternalThreshold: 1 } });
  const conv = await store.create({});
  await store.archiveMessages(conv.id, [{ role: "tool", content: "fresh" }], "compaction", now.toISOString());
  await store.archiveMessages(conv.id, [{ role: "tool", content: "stale" }], "compaction", new Date(now.getTime() - 40 * 86400000).toISOString());
  await store.prune();
  const archive = await store.getArchive(conv.id);
  assert.equal(archive.length, 1, "老 archive 被 30 天保留裁掉，新的保留");
  assert.equal(archive[0].content, "fresh");
});

test("state archive excludes credentials, verifies hashes and restores only to an empty target", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-archive-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const archive = path.join(root, "archive");
  const restored = path.join(root, "restored");
  await fs.mkdir(path.join(source, "conversations"), { recursive: true });
  await fs.writeFile(path.join(source, "conversations", "a.json"), "{\"safe\":true}", "utf8");
  const manifest = await backupState({ sourceRoot: source, archiveRoot: archive, clock: () => new Date("2026-07-17T00:00:00.000Z") });
  assert.equal(manifest.credentialsIncluded, false);
  assert.equal((await verifyArchive(archive)).entries.length, 1);
  assert.deepEqual(await restoreState({ archiveRoot: archive, targetRoot: restored }), { restored: 1, version: 1 });
  await assert.rejects(restoreState({ archiveRoot: archive, targetRoot: restored }), /必须为空/);
});

test("state archive CLI completes an isolated backup, verify and restore cycle", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-archive-cli-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const localData = path.join(root, "local-data");
  const state = path.join(localData, "state");
  const archive = path.join(root, "archive");
  const original = path.join(root, "original-state");
  await fs.mkdir(path.join(state, "conversations"), { recursive: true });
  await fs.mkdir(path.join(state, "jobs"), { recursive: true });
  await fs.writeFile(path.join(state, "conversations", "safe.json"), "{\"safe\":true}", "utf8");
  await fs.writeFile(path.join(state, "jobs", "waiting.json"), "{\"status\":\"waiting_provider\"}", "utf8");
  const command = path.resolve("scripts", "state-archive.mjs");
  const env = { ...process.env, SYNO_LOCAL_DATA: localData };

  const backup = await execFileAsync(process.execPath, [command, "backup", archive], { env, windowsHide: true });
  const manifest = JSON.parse(backup.stdout);
  assert.equal(manifest.credentialsIncluded, false);
  assert.deepEqual(manifest.entries.map((entry) => entry.path), ["conversations/safe.json", "jobs/waiting.json"]);

  const verified = JSON.parse((await execFileAsync(process.execPath, [command, "verify", archive], { env, windowsHide: true })).stdout);
  assert.equal(verified.entries.length, 2);
  await fs.rename(state, original);
  const restored = JSON.parse((await execFileAsync(process.execPath, [command, "restore", archive], { env, windowsHide: true })).stdout);
  assert.deepEqual(restored, { restored: 2, version: 1 });
  assert.equal(await fs.readFile(path.join(state, "jobs", "waiting.json"), "utf8"), "{\"status\":\"waiting_provider\"}");
  await assert.rejects(execFileAsync(process.execPath, [command, "restore", archive], { env, windowsHide: true }), /Command failed/);

  const forwardedArchive = path.join(root, "forwarded-archive");
  const forwarded = JSON.parse((await execFileAsync(process.execPath, [command, "--", "backup", forwardedArchive], { env, windowsHide: true })).stdout);
  assert.equal(forwarded.credentialsIncluded, false);
});
