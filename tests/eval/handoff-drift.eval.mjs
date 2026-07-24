// M2b DRIFT eval（on-demand）：测 handoff 链跨 N 次 rotate 的「锚点存活曲线」。
// 不进 CI glob（pnpm test = tests/*.test.mjs + apps/syno/tests/*.test.mjs，*.eval.mjs 不匹配）。
// 手动跑：`node --test tests/eval/handoff-drift.eval.mjs`
//
// 为什么跑而不靠读码断言：本会话已栽过一次（finding #2 误判 summary 进下一轮）。
// DRIFT 前提（finding #7：post-M1 偏遗忘而非复利）看起来可从 HandoffGen 读码预测，
// 但实测才作数。本 eval 走真实 compress→overflow→handoff 链路。
//
// 两段历史：
//   改造前（commit 6f0e9f0）：rotate 不前传 summary → 实测 depth≥2 存活 0%（锚点丢失）。
//   改造后（本版）：rotateConversation 用 accumulateDigest 把「上轮最新 summary || handoff」
//     累积进 fresh.handoffContext，HandoffGen 把它折成 ## 前情（未经核实） preamble。
//   本 eval 必须走「传 handoffContext 进 compress + 用 accumulateDigest 累积」这条真路径，
//   否则只是复测已被修复的旧缺陷，结论无意义。
//
// 仿真 vs 真实 rotateConversation：本 eval 不直接调 rotateConversation（那需要 ConversationStore/Router
// 和磁盘 IO）。而是在内存里复刻它的两步语义：
//   (1) digest = old.summaries[-1]?.summary || handoff
//   (2) handoffContext = accumulateDigest(old.handoffContext, digest)
// 然后把 handoffContext 传进下一轮 compress({ handoffContext })，校验生成的 handoff 含锚点。
// 这正是 tool-loop-agent.mjs + tool-loop-executor.mjs 的真实数据流。
//
// 覆盖范围（on-demand，不进 CI glob）：
//   - 本 eval 跑的是「无 layer3 summary」的最坏路径（digest 退回 handoff）——这是 re-injection 真正
//     起作用、最该压测的路径。depth≥3 的硬断言**锁住了「digest=handoff 的 re-injection」语义**：
//     若有人改成 preamble-free 精简 digest，depth≥3 会翻转为 ✗（probe 已验证 d3/d5 回退）。
//   - 「summary 在场」的首选路径（digest=summaries[-1]?.summary）由 CI 单测
//     `rotateConversation forwards ... into fresh.handoffContext` 覆盖，此处不重复。

import test from "node:test";
import assert from "node:assert/strict";
import { ContextManager } from "../../apps/syno/syno/context-manager.mjs";
import { ToolRegistry } from "../../apps/syno/syno/tool-registry.mjs";
import { accumulateDigest } from "../../apps/syno/syno/tool-loop-executor.mjs";

const ANCHOR = "决策锚-A7X9-2026"; // 确定性、独特、可逐字匹配
const DEPTHS = [1, 2, 3, 5];
const GATE = 0.80; // 决策门：depth≥2 存活率 ≥80% → 改造生效；否则改造未达预期

function makeTool() {
  return {
    name: "t", description: "s", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object" }, outputSchema: { type: "object" }, execute: async () => ({}),
  };
}

function filler(i) {
  return `turn-${i}-` + "y".repeat(2000); // 大体量 generic 轮次，逼出 overflow
}

function newContextManager() {
  return new ContextManager({
    tools: new ToolRegistry([makeTool()]),
    provider: null, // rotate 路径不调 LLM（HandoffGen 是规则字面拼接）
    options: { tailMessages: 30 },
  });
}

// 构造一个会触发 overflow 的对话。handoffFromPrev 非空时把上轮 handoff 作 system 注入
// （模拟 rotateConversation 的真实落地：fresh.messages[0] = {role:system, _syno:{kind:handoff}}）。
// anchorAtStart=true 时把锚点放进首条 user（模拟「早期一次性决策」，之后不再重述）。
function buildConversation(handoffFromPrev, anchorAtStart) {
  const msgs = [{ role: "system", content: "system-prompt" }];
  if (handoffFromPrev) {
    msgs.push({ role: "system", content: handoffFromPrev, _syno: { kind: "handoff", factualStatus: "unverified" } });
  }
  msgs.push({ role: "user", content: (anchorAtStart ? `${ANCHOR} ` : "") + filler(0) });
  for (let i = 1; i <= 4; i += 1) {
    msgs.push({ role: i % 2 ? "assistant" : "user", content: filler(i) });
  }
  return msgs;
}

test("DRIFT: 锚点跨 rotate 存活曲线（depth 1/2/3/5）——  summary 前传路径", async () => {
  const cm = newContextManager();
  const contextLength = 2000; // 小窗口，易达 overflow(0.95)；轮次体量足够，每轮必触发
  const survived = {};
  // 模拟 rotateConversation 累积的稳定载体（跨段滚动窗口）
  let handoffContext = "";
  // 模拟 old.summaries[-1]?.summary（layer3 产物；rotate 用它退回 handoff）
  let lastSummary = null;
  let prevHandoff = null;

  const assertRotate = (compressed, depth) => {
    if (compressed.action !== "rotate") {
      throw new Error(`depth${depth} 未触发 rotate（action=${compressed.action}, ratio=${compressed.stats?.ratio?.toFixed(3)}）`);
    }
  };

  // depth 1：原对话含锚点
  let conv = buildConversation(null, true);
  let compressed = await cm.compress(conv, { runConfig: { contextLength }, handoffContext });
  assertRotate(compressed, 1);
  survived[1] = compressed.handoff.includes(ANCHOR);
  prevHandoff = compressed.handoff;
  // rotate 后：上轮 summary（无则退回 handoff）累积进 handoffContext，进下一轮 handoff 的「前情」段
  lastSummary = prevHandoff; // 仿真：本轮无真 layer3 summary，退回 handoff（rotateConversation 的 || 兜底）
  handoffContext = accumulateDigest(handoffContext, lastSummary);

  // depth 2/3/5：每轮新对话 = [system, 上轮 handoff(system), generic 轮次]，不重述锚点
  // 关键：把累积的 handoffContext 传进 compress，让 HandoffGen 把锚点折进 preamble
  for (const d of [2, 3, 5]) {
    conv = buildConversation(prevHandoff, false);
    compressed = await cm.compress(conv, { runConfig: { contextLength }, handoffContext });
    assertRotate(compressed, d);
    survived[d] = compressed.handoff.includes(ANCHOR);
    prevHandoff = compressed.handoff;
    lastSummary = prevHandoff;
    handoffContext = accumulateDigest(handoffContext, lastSummary);
  }

  const deepDepths = DEPTHS.filter((d) => d >= 2);
  const deepSurvival = deepDepths.filter((d) => survived[d]).length / deepDepths.length;
  const verdict = deepSurvival >= GATE
    ? "改造生效（summary 前传：depth≥2 存活率 ≥80%）"
    : "改造未达预期：depth≥2 仍有丢失，检查 accumulateDigest/handoffContext 接线";

  const curve = DEPTHS.map((d) => `depth${d}=${survived[d] ? "存活" : "丢失"}`).join("  ");
  console.log("\n===== M2b DRIFT 锚点存活曲线（summary 前传路径）=====");
  console.log(`锚点: ${ANCHOR}`);
  console.log(`曲线: ${curve}`);
  console.log(`depth≥2 存活率: ${(deepSurvival * 100).toFixed(0)}%  (门限 ${GATE * 100}%)`);
  console.log(`裁决: ${verdict}`);
  console.log("===================================\n");

  // 硬断言：前传路径下，锚点应跨所有 depth 存活（preamble 字面折入，确定性拼接）。
  // 改造前（6f0e9f0）此处 depth2+ 全丢失；此处翻转即证明修复落地。
  for (const d of DEPTHS) {
    assert.equal(survived[d], true, `depth${d} 锚点应存活（前传路径生效）`);
  }
});
