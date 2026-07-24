// M2b DRIFT eval（on-demand）：测 handoff 链跨 N 次 rotate 的「锚点存活曲线」。
// 不进 CI glob（pnpm test = tests/*.test.mjs + apps/syno/tests/*.test.mjs，*.eval.mjs 不匹配）。
// 手动跑：`node --test tests/eval/handoff-drift.eval.mjs`
//
// 为什么跑而不靠读码断言：本会话已栽过一次（finding #2 误判 summary 进下一轮）。
// DRIFT 前提（finding #7：post-M1 偏遗忘而非复利）看起来可从 HandoffGen 读码预测，
// 但实测才作数。本 eval 走真实 compress→overflow→handoff 链路。
//
// 机制（已读码核实 HandoffGen L131-144 + rotate L313-318）：
//   generateHandoff 只读 role==="user"(全部) + 末 3 assistant；**不读 system / summary / 上轮 handoff**。
//   rotateConversation 把 handoff 存为 system 消息 → 下一轮 generateHandoff 过滤掉它 → 锚点丢失。
// 故预期：depth1=存活（锚点在 user 字面里），depth2+=丢失（只剩 system handoff + generic 轮次）。

import test from "node:test";
import assert from "node:assert/strict";
import { ContextManager } from "../../apps/syno/syno/context-manager.mjs";
import { ToolRegistry } from "../../apps/syno/syno/tool-registry.mjs";

const ANCHOR = "决策锚-A7X9-2026"; // 确定性、独特、可逐字匹配
const DEPTHS = [1, 2, 3, 5];
const GATE = 0.80; // 决策门：depth≥2 存活率 ≥80% → 不改策略；否则改造候选

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

test("DRIFT: 锚点跨 rotate 存活曲线（depth 1/2/3/5）", async () => {
  const cm = newContextManager();
  const contextLength = 2000; // 小窗口，易达 overflow(0.95)；轮次体量足够，每轮必触发
  const survived = {};
  let prevHandoff = null;

  const assertRotate = (compressed, depth) => {
    if (compressed.action !== "rotate") {
      throw new Error(`depth${depth} 未触发 rotate（action=${compressed.action}, ratio=${compressed.stats?.ratio?.toFixed(3)}）`);
    }
  };

  // depth 1：原对话含锚点
  let conv = buildConversation(null, true);
  let compressed = await cm.compress(conv, { runConfig: { contextLength } });
  assertRotate(compressed, 1);
  survived[1] = compressed.handoff.includes(ANCHOR);
  prevHandoff = compressed.handoff;

  // depth 2/3/5：每轮新对话 = [system, 上轮 handoff(system), generic 轮次]，不重述锚点
  for (const d of [2, 3, 5]) {
    conv = buildConversation(prevHandoff, false);
    compressed = await cm.compress(conv, { runConfig: { contextLength } });
    assertRotate(compressed, d);
    survived[d] = compressed.handoff.includes(ANCHOR);
    prevHandoff = compressed.handoff;
  }

  const deepDepths = DEPTHS.filter((d) => d >= 2);
  const deepSurvival = deepDepths.filter((d) => survived[d]).length / deepDepths.length;
  const verdict = deepSurvival >= GATE
    ? "不改策略（depth≥2 存活率 ≥80%）"
    : "改造候选：把 summary/handoffContext 前传承接进下次 handoff（当前偏遗忘）";

  const curve = DEPTHS.map((d) => `depth${d}=${survived[d] ? "存活" : "丢失"}`).join("  ");
  console.log("\n===== M2b DRIFT 锚点存活曲线 =====");
  console.log(`锚点: ${ANCHOR}`);
  console.log(`曲线: ${curve}`);
  console.log(`depth≥2 存活率: ${(deepSurvival * 100).toFixed(0)}%  (门限 ${GATE * 100}%)`);
  console.log(`裁决: ${verdict}`);
  console.log("===================================\n");

  // 硬断言只锁「eval 接线正确 + 可预测的 literal-assembly 性质」：锚点在 user 字面 → depth1 必存活。
  // depth2+ 的具体值让 eval 输出说话（改造落地后应翻转为存活，届时更新此 sentinel）。
  assert.equal(survived[1], true, "depth1 必存活：锚点在首条 user，HandoffGen 字面拼接全部 user");
});
