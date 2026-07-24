import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ContextManager, SummaryGuard } from "../apps/syno/syno/context-manager.mjs";
import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { ConversationRouter } from "../apps/syno/syno/conversation-router.mjs";
import { rotateConversation } from "../apps/syno/syno/tool-loop-executor.mjs";
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
