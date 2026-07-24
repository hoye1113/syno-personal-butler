import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ContextManager, SummaryGuard, HandoffGen } from "../apps/syno/syno/context-manager.mjs";
import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { ConversationRouter } from "../apps/syno/syno/conversation-router.mjs";
import { rotateConversation, accumulateDigest } from "../apps/syno/syno/tool-loop-executor.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

// 记忆保真（FIDELITY）测试：摘要护栏 + factualStatus 标记 + Layer3 真注入。
// 对照 docs/M2-MEMORY-FIDELITY-PLAN.md 改动①②④。

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

// 触发 Layer3 的标准构造：system + 20 条 ~800 字符交替 user/assistant；ratio≈0.9 ∈ [heavy, overflow)。
function heavyMessages() {
  return [
    { role: "system", content: "sys" },
    ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `msg-${i}-` + "z".repeat(800) })),
  ];
}

function cmWith(provider, opts = {}) {
  return new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider,
    options: { tailMessages: 30, ...opts },
  });
}

async function compressHeavy(cm, messages = heavyMessages()) {
  const est = cm.estimateForMessages(messages);
  return cm.compress(messages, { runConfig: { contextLength: Math.ceil(est / 0.9) } });
}

test("SummaryGuard: rejects numbers absent from source; accepts matching / no-entity / normalized", () => {
  const g = new SummaryGuard();
  // 摘要编造源里没有的年份 → 拒绝
  assert.equal(g.assess("会议定在 2026 年", "决策：2026 完成，预算 9999").reject, true);
  // 摘要数字都在源里 → 放行
  assert.equal(g.assess("预算 50000，2026 启动", "总结：预算 50000，2026 启动").reject, false);
  // 摘要无强实体（无可比对的 ≥4 位数字）→ 无法判定 → 放行
  assert.equal(g.assess("讨论了项目", "聊了项目进展").reject, false);
  // 归一化：源 "1,000" 与摘要 "1000" 视为同一实体 → 放行
  assert.equal(g.assess("花了 1,000 元", "花费 1000 元").reject, false);
  // 稳健性：空 / 异常输入不抛、默认放行
  assert.equal(g.assess(null, null).reject, false);
  assert.equal(g.assess("", "").reject, false);
});

test("compress rejects an LLM summary that fabricates entities and keeps the tail (FIDELITY)", async () => {
  const cm = cmWith({ async complete() { return { message: { content: "摘要：项目编号 8888 将在 9999 启动" } }; } });
  const r = await compressHeavy(cm);
  assert.equal(r.summary, null, "fabricated summary must not be produced");
  assert.notEqual(r.action, "layer3", "must degrade below layer3");
  assert.ok(!r.messages.some((m) => m._syno?.kind === "summary"), "no summary message must be injected");
  // 被拒后近窗原样保留（最新一条仍在）
  assert.ok(r.messages.some((m) => String(m.content).includes("msg-19-")), "tail must be preserved verbatim");
  assert.equal(cm.stats().summaryGuardRejections, 1);
});

test("compress materializes a faithful LLM summary into active messages, marked unverified (FIDELITY)", async () => {
  const cm = cmWith({ async complete() { return { message: { content: "忠实摘要：用户讨论了项目进展" } }; } });
  const r = await compressHeavy(cm);
  assert.equal(r.action, "layer3");
  assert.ok(r.summary);
  const summaryMsg = r.messages.find((m) => m._syno?.kind === "summary");
  assert.ok(summaryMsg, "summary must be injected into active messages");
  assert.match(String(summaryMsg.content), /\[前情摘要\]/);
  assert.equal(summaryMsg._syno.factualStatus, "unverified");
  assert.ok(summaryMsg._syno.generatedAt, "generatedAt must be set");
  // 近窗保留：最新原消息仍在，且在摘要之后
  assert.ok(r.messages.some((m) => String(m.content).includes("msg-19-")), "tail must be preserved verbatim");
});

test("rule-based summary bypasses the hallucination guard but is still injected and marked", async () => {
  const cm = cmWith({ async complete() { throw new Error("provider down"); } });
  const r = await compressHeavy(cm);
  assert.equal(r.action, "layer3");
  const summaryMsg = r.messages.find((m) => m._syno?.kind === "summary");
  assert.ok(summaryMsg, "rule-based summary must still be injected");
  assert.equal(summaryMsg._syno.factualStatus, "unverified");
  assert.equal(cm.stats().summaryGuardRejections, 0, "rule origin bypasses the hallucination guard");
});

test("handoff carries factualStatus:unverified (FIDELITY)", async (t) => {
  const root = tmpDir(t, "syno-fidelity-rotate-");
  const store = new ConversationStore({ root });
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  const old = await store.create({ id: "conversation-fid-old", channel: "weixin", ownerId: "local-user" });
  await router.resolve({ ownerKey: "local-user", conversationId: old.id });
  const newId = await rotateConversation({
    conversations: store,
    conversationRouter: router,
    ownerKey: "local-user",
    oldConversationId: old.id,
    handoff: "前情提要",
    channel: "weixin",
    ownerId: "local-user",
  });
  const fresh = await store.get(newId);
  assert.equal(fresh.messages[0]._syno?.kind, "handoff");
  assert.equal(fresh.messages[0]._syno?.factualStatus, "unverified");
});

test("summary-kind message is not re-extracted as a real user statement (anti self-pollution)", () => {
  const cm = cmWith(null);
  const summaryLeak = {
    role: "user",
    content: "决定：上线项目 8888（这是摘要里的内容，非真实用户陈述）",
    _syno: { kind: "summary", factualStatus: "unverified" },
  };
  const items = cm.extractValuable([{ role: "user", content: "决定：用户确认本周上线真实功能模块" }, summaryLeak]);
  assert.equal(items.length, 1, "summary-kind message must be skipped even with decision keywords");
  assert.equal(items[0].content, "决定：用户确认本周上线真实功能模块");
});

test("compress → applyCompaction persists the live summary into conversation.messages (end-to-end)", async () => {
  const cm = cmWith({ async complete() { return { message: { content: "忠实摘要：用户讨论了项目进展" } }; } });
  const conversation = { id: "c-e2e", messages: [], archive: [], summaries: [], compactionLog: [] };
  const compressed = await compressHeavy(cm, heavyMessages());
  assert.equal(compressed.action, "layer3");
  cm.applyCompaction(conversation, compressed);
  // 摘要落进活跃消息（applyCompaction 去掉头部 system prompt 后保留 summary system 消息）
  const summaryMsg = conversation.messages.find((m) => m._syno?.kind === "summary");
  assert.ok(summaryMsg, "live-generated summary must persist into conversation.messages");
  assert.equal(summaryMsg._syno.factualStatus, "unverified");
  assert.equal(conversation.summaries.length, 1);
  // 下一轮重建（tool-loop-agent: messages=[prompt,...conversation.messages]）摘要仍在
  const rebuilt = [{ role: "system", content: "prompt" }, ...conversation.messages];
  assert.ok(rebuilt.some((m) => m._syno?.kind === "summary"), "summary survives the next-turn rebuild");
});

test("HandoffGen folds handoffContext into a bounded 前情 preamble (cross-rotate memory)", async () => {
  const gen = new HandoffGen({ tokenCap: 50000 });
  const msgs = [{ role: "user", content: "近况：今天做了 X" }];
  const without = await gen.generateHandoff(msgs, {});
  const withCtx = await gen.generateHandoff(msgs, { handoffContext: "决策锚-A7X9-2026 早期决定" });
  // HANDOFF_HEADER 本身含「前情」二字（"已延续前情"），不能拿裸「前情」当判别；
  // 真正判据是 preamble 段标「上一段对话延续」与正文被折入。
  assert.ok(!without.includes("决策锚-A7X9-2026"), "no forwarded body when handoffContext absent");
  assert.ok(!without.includes("上一段对话延续"), "no preamble section when handoffContext absent");
  assert.ok(withCtx.includes("前情（上一段对话延续"), "preamble section present when handoffContext provided");
  assert.ok(withCtx.includes("决策锚-A7X9-2026"), "handoffContext content survives into the handoff");
  assert.ok(withCtx.includes("未经核实"), "preamble marked unverified");
  assert.ok(withCtx.includes("今天做了 X"), "current intent still present alongside preamble");
});

test("rotateConversation forwards the old conversation's latest summary into fresh.handoffContext", async (t) => {
  const root = tmpDir(t, "syno-fidelity-ctx-");
  const store = new ConversationStore({ root });
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  // 旧对话带一条 summary（模拟 layer3 产物）+ 既有 handoffContext（模拟更早的累积）
  const old = await store.create({ id: "conversation-ctx-old", channel: "weixin", ownerId: "local-user" });
  old.summaries = [{ at: "t", summary: "决策锚-A7X9-2026 早期决定", version: 1 }];
  old.handoffContext = "更早的前情";
  await store.save(old);
  await router.resolve({ ownerKey: "local-user", conversationId: old.id });
  const newId = await rotateConversation({
    conversations: store,
    conversationRouter: router,
    ownerKey: "local-user",
    oldConversationId: old.id,
    handoff: "本次前情提要",
    channel: "weixin",
    ownerId: "local-user",
  });
  const fresh = await store.get(newId);
  assert.ok(fresh.handoffContext.includes("决策锚-A7X9-2026"), "latest summary forwarded into handoffContext");
  assert.ok(fresh.handoffContext.includes("更早的前情"), "prior handoffContext accumulated, not replaced");
  assert.equal(fresh.messages[0]._syno?.kind, "handoff");
});

test("accumulateDigest bounds growth (rolling window keeps newest)", () => {
  const big = "x".repeat(6000);
  const out = accumulateDigest(big, big); // 6000 + sep + 6000 > 8000 cap
  assert.ok(out.length <= 8000, "must cap at HANDOFF_CONTEXT_CAP");
  assert.ok(out.startsWith("x"), "keeps head (newest digest)");
});

test("accumulateDigest honors an injected cap (externalized from store.retention)", () => {
  const big = "x".repeat(4000);
  // cap=3000：4000 单段即超 → 截到 3000
  const out = accumulateDigest("", big, 3000);
  assert.equal(out.length, 3000, "must respect the injected cap");
  // 非法/缺省 cap 退回默认
  const def = accumulateDigest(big, big);
  assert.ok(def.length <= 8000, "falls back to default cap when cap omitted/invalid");
  const zero = accumulateDigest(big, big, 0);
  assert.ok(zero.length <= 8000, "falls back to default cap when cap is 0");
});

test("rotateConversation uses store.retention.handoffContextCharsMax as the accumulation cap", async (t) => {
  const root = tmpDir(t, "syno-fidelity-cap-");
  const store = new ConversationStore({ root, retention: { handoffContextCharsMax: 1200 } });
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  const old = await store.create({ id: "conversation-cap-old", channel: "weixin", ownerId: "local-user" });
  old.summaries = [{ at: "t", summary: "s".repeat(5000), version: 1 }]; // 5000 ≫ 1200 与默认 8000
  await store.save(old);
  await router.resolve({ ownerKey: "local-user", conversationId: old.id });
  const newId = await rotateConversation({
    conversations: store, conversationRouter: router, ownerKey: "local-user",
    oldConversationId: old.id, handoff: "h".repeat(5000), channel: "weixin", ownerId: "local-user",
  });
  const fresh = await store.get(newId);
  assert.ok(fresh.handoffContext.length <= 1200, "must cap at the store's handoffContextCharsMax, not the 8000 default");
});
