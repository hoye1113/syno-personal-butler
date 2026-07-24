import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ContextManager, ToolTruncator, Deduplicator, HandoffGen } from "../apps/syno/syno/context-manager.mjs";
import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { ConversationRouter } from "../apps/syno/syno/conversation-router.mjs";
import { ToolLoopAgent } from "../apps/syno/syno/tool-loop-agent.mjs";
import { ToolLoopExecutor, rotateConversation } from "../apps/syno/syno/tool-loop-executor.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { ProviderClient, estimateTokens } from "../apps/syno/syno/provider-client.mjs";

function makeTool(name = "t.search") {
  return {
    name, description: "s", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", properties: { q: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async () => ({}),
  };
}

function tmpDir(t, prefix) {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("ToolTruncator keeps small results and truncate-middles large ones", () => {
  const t = new ToolTruncator({ tokenLimit: 1000 });
  const small = { ok: true, data: "x" };
  assert.equal(t.truncate(small, "tool"), small);
  const big = { ok: true, data: "y".repeat(100000) };
  const out = t.truncate(big, "tool");
  assert.equal(out.truncated, true);
  assert.equal(out.tool, "tool");
  assert.ok(out.head.length > 0 && out.tail.length > 0);
  assert.ok(out.omittedChars > 0);
});

test("Deduplicator collapses identical tool results keeping the newest", () => {
  const d = new Deduplicator();
  const { messages, removed } = d.deduplicate([
    { role: "tool", tool_call_id: "a", content: "same" },
    { role: "tool", tool_call_id: "b", content: "same" },
    { role: "tool", tool_call_id: "c", content: "different" },
  ]);
  assert.equal(removed, 1);
  assert.equal(messages[0].content, "same");
  assert.equal(JSON.parse(messages[1].content).note, "duplicate of earlier result");
  assert.equal(messages[2].content, "different");
});

test("ContextManager estimate includes tool definitions like ProviderClient (R2)", () => {
  const tools = new ToolRegistry([makeTool()]);
  const cm = new ContextManager({ tools });
  const msgs = [{ role: "system", content: "sys" }, { role: "user", content: "hi" }];
  const withTools = cm.estimateForMessages(msgs);
  const withoutTools = estimateTokens(msgs, []);
  assert.ok(withTools > withoutTools, "estimate with tools must exceed estimate without");
});

test("compress returns none below the light threshold", async () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "hi" }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 1_000_000 } });
  assert.equal(result.action, "none");
});

test("compression archives old tool results and keeps tail (Layer1/Layer2)", async () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]), options: { tailMessages: 2 } });
  const messages = [
    { role: "system", content: "sys" },
    { role: "user", content: "u1" },
    { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "t.search", arguments: "{}" } }] },
    { role: "tool", tool_call_id: "c1", content: JSON.stringify({ big: "x".repeat(4000) }) },
    { role: "assistant", content: "a1" },
    { role: "user", content: "u2" },
  ];
  // 动态选 contextLength 让 ratio ≈ 0.65（落在 [light, overflow)），确保走 L1/L2 而非 rotate。
  const est = cm.estimateForMessages(messages);
  const result = await cm.compress(messages, { runConfig: { contextLength: Math.ceil(est / 0.65) } });
  assert.notEqual(result.action, "none");
  assert.ok(result.archivable.length >= 1, "old tool result should be archived");
  assert.ok(result.archivable.some((m) => m.role === "tool"));
});

test("Layer4 returns rotate signal with handoff and never creates a conversation", async () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const big = "x".repeat(4_000_000);
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: big }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 100_000 } });
  assert.equal(result.action, "rotate");
  assert.ok(result.handoff);
  assert.match(result.handoff, /已延续前情/);
});

test("Layer3 LLM unavailable falls back to rule-based summary", async () => {
  // tailMessages 设大（30）让 prune 不截断，确保 ratio 落在 [heavy, overflow) 时 Layer3 必触发。
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]), provider: { async complete() { throw new Error("down"); } }, options: { tailMessages: 30 } });
  const messages = [
    { role: "system", content: "sys" },
    ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `msg-${i}-` + "z".repeat(800) })),
  ];
  const est = cm.estimateForMessages(messages);
  // ratio ≈ 0.9 ∈ [0.85, 0.95) → Layer3 摘要；provider 抛错 → 规则降级
  const result = await cm.compress(messages, { runConfig: { contextLength: Math.ceil(est / 0.9) } });
  assert.equal(result.action, "layer3");
  assert.ok(result.summary && result.summary.length > 0, "must produce a rule-based summary when the LLM is down");
});

test("applyCompaction archives removed messages, replaces active, logs (R5)", () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const conversation = { id: "c1", messages: [{ role: "user", content: "old" }, { role: "user", content: "recent" }], archive: [], summaries: [], compactionLog: [] };
  cm.applyCompaction(conversation, {
    action: "layer2",
    messages: [{ role: "system", content: "sys" }, { role: "user", content: "recent" }],
    archivable: [{ role: "user", content: "old" }],
    summary: null,
    stats: { beforeTokens: 1000, afterTokens: 500, ratio: 0.8 },
  });
  assert.equal(conversation.messages.length, 1);
  assert.equal(conversation.messages[0].content, "recent");
  assert.equal(conversation.archive.length, 1);
  assert.equal(conversation.archive[0].content, "old");
  assert.ok(conversation.archive[0].archivedAt);
  assert.equal(conversation.archive[0].archiveReason, "layer2");
  assert.equal(conversation.compactionLog.length, 1);
  assert.equal(conversation.compactionLog[0].action, "layer2");
});

test("applyCompaction materializes Layer3 summary into active messages (R4)", () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const conversation = { id: "c", messages: [], archive: [], summaries: [], compactionLog: [] };
  cm.applyCompaction(conversation, {
    action: "layer3",
    messages: [{ role: "system", content: "sys" }, { role: "system", content: "[前情摘要]\n\n要点" }, { role: "user", content: "recent" }],
    archivable: [{ role: "user", content: "old" }],
    summary: "要点",
    stats: { beforeTokens: 1000, afterTokens: 300, ratio: 0.9 },
  });
  assert.ok(conversation.messages.some((m) => String(m.content).includes("[前情摘要]")), "summary must be materialized into active messages");
  assert.equal(conversation.summaries.length, 1);
  assert.equal(conversation.summaries[0].summary, "要点");
});

test("HandoffGen caps handoff size for huge conversations (R7)", async () => {
  const gen = new HandoffGen({ tokenCap: 1000 });
  const messages = Array.from({ length: 100 }, () => ({ role: "user", content: "y".repeat(10000) }));
  const handoff = await gen.generateHandoff(messages, {});
  assert.ok(handoff.length <= 1000 * 3.2 + 100, "handoff must stay within cap (plus truncation marker slack)");
});

test("ConversationStore.get normalizes legacy conversations missing new fields (R3)", async (t) => {
  const root = tmpDir(t, "syno-cm-legacy-");
  const store = new ConversationStore({ root });
  const legacy = { id: "conversation-legacy", channel: "web", ownerId: "local-user", status: "active", messages: [{ role: "user", content: "hi" }], createdAt: "x", updatedAt: "x" };
  await fs.writeFile(path.join(root, "conversation-legacy.json"), JSON.stringify(legacy));
  const loaded = await store.get("conversation-legacy");
  assert.deepEqual(loaded.archive, []);
  assert.deepEqual(loaded.summaries, []);
  assert.deepEqual(loaded.compactionLog, []);
  assert.equal(loaded.handoffContext, null);
});

test("ConversationRouter rotate retires old id and resolve skips it (R6)", async (t) => {
  const root = tmpDir(t, "syno-cm-router-");
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  const first = await router.resolve({ ownerKey: "local-user" });
  const { oldId } = await router.rotate({ ownerKey: "local-user", newConversationId: "conversation-new1" });
  assert.equal(oldId, first);
  const after = await router.resolve({ ownerKey: "local-user" });
  assert.equal(after, "conversation-new1");
  assert.notEqual(after, first);
});

test("rotateConversation archives old, creates new with handoff, rotates route (R1)", async (t) => {
  const root = tmpDir(t, "syno-cm-rotate-");
  const store = new ConversationStore({ root });
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  const old = await store.create({ id: "conversation-old1", channel: "weixin", ownerId: "local-user" });
  await router.resolve({ ownerKey: "local-user", conversationId: old.id });
  const newId = await rotateConversation({ conversations: store, conversationRouter: router, ownerKey: "local-user", oldConversationId: old.id, handoff: "前情提要", channel: "weixin", ownerId: "local-user" });
  const oldRefreshed = await store.get(old.id);
  assert.equal(oldRefreshed.status, "archived");
  assert.equal(oldRefreshed.rotatedTo, newId);
  const fresh = await store.get(newId);
  // handoff 以语义正确的载体注入（system + _syno.kind），而非伪 user——防自污染
  assert.equal(fresh.messages[0].role, "system");
  assert.equal(fresh.messages[0].content, "前情提要");
  assert.equal(fresh.messages[0]._syno?.kind, "handoff");
  assert.equal(await router.resolve({ ownerKey: "local-user" }), newId);
});

test("ToolLoopExecutor captures rotate, reruns on new conversation, caps depth (R1/R7)", async (t) => {
  const root = tmpDir(t, "syno-cm-executor-");
  const store = new ConversationStore({ root });
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  let calls = 0;
  const runtime = {
    name: "native-tool-loop",
    async run(request, ctx) {
      calls += 1;
      if (calls <= 3) return { rotate: true, handoff: "h", fromConversationId: ctx.conversationId, pendingRequest: request, channel: ctx.channel, ownerId: ctx.ownerId };
      return { runId: "r", executor: "native-tool-loop", text: "done", conversationId: ctx.conversationId };
    },
  };
  const executor = new ToolLoopExecutor({ runtime, conversations: store, conversationRouter: router, rotateMaxDepth: 2 });
  await router.resolve({ ownerKey: "local-user", conversationId: "conversation-start1" });
  const result = await executor.submit({ request: { text: "hi" }, conversationId: "conversation-start1", channel: "web", senderId: "local-user" });
  assert.equal(result.rotateCapped, true);
  assert.match(result.text, /对话已过长/);
  assert.ok(calls === 3, `expected 3 runtime calls (rotateMaxDepth=2), got ${calls}`);
});

test("ToolLoopAgent returns rotate signal when contextManager triggers rotate", async (t) => {
  const root = tmpDir(t, "syno-cm-agent-rotate-");
  const conversations = new ConversationStore({ root });
  const provider = { async complete() { return { message: { role: "assistant", content: "should not reach" }, model: "fixed" }; } };
  const contextManager = {
    async compress() { return { action: "rotate", handoff: "前情", stats: {} }; },
    applyCompaction() {}, trackUsage() {}, truncateToolResult(r) { return r; },
  };
  const agent = new ToolLoopAgent({ provider, tools: new ToolRegistry([makeTool()]), conversations, contextManager });
  const result = await agent.run({ text: "hi" }, { conversationId: "conversation-rotate1" });
  assert.equal(result.rotate, true);
  assert.equal(result.handoff, "前情");
  assert.equal(result.fromConversationId, "conversation-rotate1");
});

test("ToolLoopAgent without contextManager stays backward-compatible (no rotate, no compress)", async (t) => {
  const root = tmpDir(t, "syno-cm-backcompat-");
  const conversations = new ConversationStore({ root });
  const provider = { async complete() { return { message: { role: "assistant", content: "ok" }, model: "fixed" }; } };
  const agent = new ToolLoopAgent({ provider, tools: new ToolRegistry([makeTool()]), conversations });
  const result = await agent.run({ text: "hi" });
  assert.equal(result.text, "ok");
  assert.equal(result.rotate, undefined);
});

test("ProviderClient threshold is contextLength * 0.97 (O10)", async () => {
  const over = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://x/v1", token: "s", modelId: "fixed", contextLength: 10000 }; } },
    fetchImpl: async () => new Response("{}"),
  });
  // estimate ≈ ceil((chars+overhead)/3.2)+256 ; pick chars so estimate ∈ (9700, 10000)
  await assert.rejects(over.complete([{ role: "user", content: "x".repeat(30300) }]), (e) => e.code === "PROVIDER_CONTEXT_LIMIT");

  const under = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://x/v1", token: "s", modelId: "fixed", contextLength: 10000 }; } },
    fetchImpl: async () => new Response(JSON.stringify({ model: "fixed", choices: [{ message: { role: "assistant", content: "ok" } }] })),
  });
  // estimate < 9700 → request proceeds
  const res = await under.complete([{ role: "user", content: "x".repeat(29800) }]);
  assert.equal(res.message.content, "ok");
});

// ---- Phase 4: extractValuable → LLM 判定 → 可审批 Job 回调 ----

test("extractValuable keeps decision-like user messages, drops short/non-user", () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const items = cm.extractValuable([
    { role: "user", content: "我决定采用方案A，结论是先做MVP并记录为待办" },
    { role: "user", content: "hi" },
    { role: "assistant", content: "决定做某事这是结论" },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "decision");
});

test("extractValuable never extracts handoff (防前情自污染)", () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const items = cm.extractValuable([
    // 正常注入的 handoff（system + _syno.kind）——本就因 role≠user 被排除
    { role: "system", content: "（已延续前情）\n## 用户近期意图\n我决定采用方案A，结论是…", _syno: { kind: "handoff" } },
    // 防御：即便历史/异常路径把 handoff 当 user 注入，也因 _syno.kind 被跳过
    { role: "user", content: "（已延续前情）我决定采用方案A，记录为待办", _syno: { kind: "handoff" } },
    // 真实用户陈述仍被正常提取
    { role: "user", content: "我决定采用方案B并记录为待办" },
  ]);
  assert.equal(items.length, 1);
  assert.match(items[0].content, /方案B/);
});

test("rotate fires onExtractValuable with LLM-approved items", async () => {
  let captured = null;
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { return { message: { content: '{"keep":[1]}' }, model: "fixed" }; } },
    onExtractValuable: async (items) => { captured = items; },
  });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "我决定采用方案A并记录结论" }, { role: "user", content: "x".repeat(4_000_000) }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 100_000 } });
  assert.equal(result.action, "rotate");
  await cm.drainExtractions();
  assert.ok(Array.isArray(captured) && captured.length === 1, "approved item must reach callback");
  assert.match(captured[0].content, /决定/);
});

test("LLM rejects all candidates → onExtractValuable not called", async () => {
  let called = false;
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { return { message: { content: '{"keep":[]}' }, model: "fixed" }; } },
    onExtractValuable: async () => { called = true; },
  });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "我决定采用方案A并记录结论作为待办" }];
  await cm.compress(messages, { runConfig: { contextLength: 100 } });
  await cm.drainExtractions();
  assert.equal(called, false);
});

test("LLM unavailable (provider down) → no proposals, compress unaffected", async () => {
  let called = false;
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { throw new Error("down"); } },
    onExtractValuable: async () => { called = true; },
  });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "我决定采用方案A并记录结论作为待办" }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 100 } });
  assert.equal(result.action, "rotate");
  await cm.drainExtractions();
  assert.equal(called, false);
});

test("dedup: identical content compressed twice proposes only once", async () => {
  const calls = [];
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { return { message: { content: '{"keep":[1]}' }, model: "fixed" }; } },
    onExtractValuable: async (items) => { calls.push(items.length); },
  });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "我决定采用方案A并记录结论作为待办" }];
  await cm.compress(messages, { runConfig: { contextLength: 100 } });
  await cm.compress(messages, { runConfig: { contextLength: 100 } });
  await cm.drainExtractions();
  assert.equal(calls.length, 1);
});

test("throttle caps proposals per conversation (extractMaxPerConversation=5)", async () => {
  const proposed = [];
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { return { message: { content: '{"keep":[1,2,3,4,5,6,7,8]}' }, model: "fixed" }; } },
    onExtractValuable: async (items) => { proposed.push(...items); },
    options: { extractMaxPerConversation: 5 },
  });
  const messages = [
    { role: "system", content: "sys" },
    ...Array.from({ length: 8 }, (_, i) => ({ role: "user", content: `我决定做事项${i}这是结论${i}作为待办` })),
  ];
  await cm.compress(messages, { runConfig: { contextLength: 100 } });
  await cm.drainExtractions();
  assert.ok(proposed.length <= 5, `expected ≤5 proposals, got ${proposed.length}`);
});

test("onExtractValuable throwing does not break compress (fire-and-forget)", async () => {
  const cm = new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: { async complete() { return { message: { content: '{"keep":[1]}' }, model: "fixed" }; } },
    onExtractValuable: async () => { throw new Error("boom"); },
  });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "我决定采用方案A并记录结论作为待办" }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 100 } });
  assert.equal(result.action, "rotate");
  await cm.drainExtractions();
});

test("no onExtractValuable: extraction is a no-op, compress still rotates", async () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const messages = [{ role: "system", content: "sys" }, { role: "user", content: "x".repeat(4_000_000) }];
  const result = await cm.compress(messages, { runConfig: { contextLength: 100_000 } });
  assert.equal(result.action, "rotate");
  await cm.drainExtractions();
});

test("stats aggregates compression actions, rotates, and extractions (OBS 3.1)", async () => {
  const provider = { async complete() { return { message: { content: '{"keep":[1]}' }, model: "fixed" }; } };
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]), provider, onExtractValuable: async () => {} });
  // none：小对话不压缩
  await cm.compress([{ role: "user", content: "hi" }], { runConfig: { contextLength: 100_000 } });
  // rotate：超大 → 触发提取（用户陈述含决策词）
  const big = "x".repeat(4_000_000);
  await cm.compress(
    [{ role: "system", content: "sys" }, { role: "user", content: `我决定采用方案A并记录为待办 ${big}` }],
    { runConfig: { contextLength: 100_000 } },
  );
  await cm.drainExtractions();
  const s = cm.stats();
  assert.equal(s.byAction.none, 1);
  assert.equal(s.byAction.rotate, 1);
  assert.equal(s.rotates, 1);
  assert.equal(s.compressions, 2);
  assert.ok(s.extractionCalls >= 1, "提取至少被回调一次");
  assert.ok(s.extractionsProposed >= 1);
  assert.ok(s.lastUpdated, "lastUpdated 已记录");
});

test("M2c COST: trackUsage attributes agent token usage (default feature + accumulation + NaN guard)", async () => {
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]) });
  const u1 = { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 };
  const u2 = { prompt_tokens: 200, completion_tokens: 40, total_tokens: 240 };
  cm.trackUsage(u1, "conv-a", "agent"); // 显式 agent
  cm.trackUsage(u2, "conv-a");          // 省略第三参 → 默认 agent（向后兼容）
  let agent = cm.stats().byFeature.agent;
  assert.equal(agent.calls, 2);
  assert.equal(agent.promptTokens, 300);
  assert.equal(agent.completionTokens, 60);
  assert.equal(agent.totalTokens, 360);
  // null / 缺字段 usage 必须是 no-op（绝不产生 NaN、不计 calls）
  cm.trackUsage(null, "conv-a");
  cm.trackUsage({ prompt_tokens: 5 }, "conv-a"); // 缺 completion/total → 非有限 → no-op
  agent = cm.stats().byFeature.agent;
  assert.equal(agent.calls, 2, "malformed usage must not be counted");
  assert.ok(Number.isFinite(agent.promptTokens) && Number.isFinite(agent.totalTokens), "no NaN leakage");
});

test("M2c COST: extraction judge records per-feature token usage (byFeature.judge)", async () => {
  const provider = {
    async complete() {
      return { message: { content: '{"keep":[1]}' }, model: "fixed", usage: { prompt_tokens: 500, completion_tokens: 10, total_tokens: 510 } };
    },
  };
  const cm = new ContextManager({ tools: new ToolRegistry([makeTool()]), provider, onExtractValuable: async () => {} });
  // rotate（4M 字）→ 触发提取 → #judgeValuable；rotate 路径不调 #summarize，故 byFeature.summary 不应出现
  const big = "x".repeat(4_000_000);
  await cm.compress([{ role: "system", content: "sys" }, { role: "user", content: `我决定采用方案A并记录为待办 ${big}` }], { runConfig: { contextLength: 100_000 } });
  await cm.drainExtractions();
  const s = cm.stats();
  const judge = s.byFeature.judge;
  assert.ok(judge, "judge feature must be recorded");
  assert.ok(judge.calls >= 1);
  assert.ok(judge.promptTokens >= 500);
  assert.ok(judge.totalTokens >= 510);
  assert.equal(s.byFeature.summary, undefined, "rotate path must not invoke #summarize");
});
