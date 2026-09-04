// P1 反馈路由 eval（live-provider，显式门）：验证模型在真实聊天循环里对灵感反馈的路由判断——
// 这层是「概率行为」，单测只能守工具内硬约束（见 tests/inspiration-feedback-tool.test.mjs），
// 路由对不对必须拿真模型跑。不进 CI glob（npm test 只匹配 *.test.mjs）。
//
// 手动跑：
//   $env:DEEPSEEK_API_KEY="..."; $env:SYNO_LIVE_EVAL="1"; node --test tests/eval/inspiration-feedback-routing.eval.mjs
//   （模型名可用 DEEPSEEK_EVAL_MODEL 覆盖，默认 deepseek-chat）
//
// 三个决策点（计划冻结）：
//   1. 有待反馈卡 + 「有用」→ 恰好一次落账（feedback=useful）；
//   2. 有待反馈卡 + 「这篇文章有用吗」（泛谈，非评卡）→ 零调用；
//   3. 无待反馈卡 + 「没用」→ 零调用且如实告知（不编造已记录）。
// 误判的可接受形态是「该落没落」（主人重说一句即可），不可接受形态是「落错」（污染灵感档案）。

import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createInspirationFeedbackTool } from "../../apps/syno/syno/inspiration-feedback-tool.mjs";
import { InspirationStore } from "../../apps/syno/syno/inspiration-store.mjs";
import { ToolRegistry } from "../../apps/syno/syno/tool-registry.mjs";

const LIVE = process.env.SYNO_LIVE_EVAL === "1" && Boolean(process.env.DEEPSEEK_API_KEY);
const MODEL = process.env.DEEPSEEK_EVAL_MODEL || "deepseek-chat";
const ENDPOINT = process.env.DEEPSEEK_EVAL_ENDPOINT || "https://api.deepseek.com/chat/completions";

// 与生产聊天面同口径的最小提示：工具约束照抄 syno-agent.md 的 core 规则句（保持同步靠人工——
// eval 本就是定期人工跑的探针，伪造「自动同步」反而掩盖提示词漂移）。
const SYSTEM = [
  "你是 Syno 的知识库管家，正在和主人微信聊天。",
  "主人明确评价最近一张「今日灵感」卡（有用/没用/一般等）时调 syno_inspiration_record_feedback 落账；",
  "泛谈文章「有用吗」不调；返回 recorded:false 就如实说当前没有待反馈的卡。",
  "回答用中文，一两句话。",
].join("");

async function chatLoop({ registry, userText, executions }) {
  const tool = registry.list()[0];
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userText },
  ];
  for (let turn = 0; turn < 4; turn += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: [{
          type: "function",
          function: {
            name: "syno_inspiration_record_feedback",
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }],
        temperature: 0,
      }),
    });
    if (!response.ok) throw new Error(`provider HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const data = await response.json();
    const message = data.choices?.[0]?.message || {};
    messages.push({ role: "assistant", content: message.content || null, tool_calls: message.tool_calls });
    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (!calls.length) return String(message.content || "");
    for (const call of calls) {
      const args = JSON.parse(call.function?.arguments || "{}");
      let output;
      try {
        output = await registry.execute("inspiration.record_feedback", args, { allowAgentSettings: true, channel: "weixin" });
        executions.push(args);
      } catch (error) {
        output = { error: String(error?.message || error) };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }
  return "(tool loop exhausted)";
}

async function makeRegistry(t, { withCard }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-fb-eval-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new InspirationStore({ opsRoot: path.join(root, "ops") });
  if (withCard) {
    const card = await store.create({ date: "2026-09-04", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联" });
    await store.markDelivered(card.id, "event-1");
  }
  const registry = new ToolRegistry([createInspirationFeedbackTool({ inspirationStore: store })]);
  return { store, registry };
}

test("P1 eval: awaiting card + 「有用」 → exactly one useful recording", { skip: !LIVE }, async (t) => {
  const { store, registry } = await makeRegistry(t, { withCard: true });
  const executions = [];
  await chatLoop({ registry, userText: "有用", executions });
  assert.equal(executions.length, 1, `应恰好调用一次，实际 ${executions.length}`);
  assert.equal(executions[0].feedback, "useful");
  const records = (await store.list()).filter((record) => record.feedback);
  assert.equal(records.length, 1);
  assert.equal(records[0].feedback, "useful");
});

test("P1 eval: awaiting card + 「这篇文章有用吗」（泛谈） → zero calls", { skip: !LIVE }, async (t) => {
  const { store, registry } = await makeRegistry(t, { withCard: true });
  const executions = [];
  await chatLoop({ registry, userText: "这篇文章有用吗", executions });
  assert.equal(executions.length, 0, `泛谈不应落账，实际调用 ${executions.length} 次`);
  assert.equal((await store.list()).filter((record) => record.feedback).length, 0);
});

test("P1 eval: no awaiting card + 「没用」 → zero recording, honest reply", { skip: !LIVE }, async (t) => {
  const { store, registry } = await makeRegistry(t, { withCard: false });
  const executions = [];
  const reply = await chatLoop({ registry, userText: "没用", executions });
  const recorded = (await store.list()).filter((record) => record.feedback).length;
  assert.equal(recorded, 0, "无卡不得落账");
  if (executions.length > 0) {
    // 调了工具但没落账（工具如实返回 no_card_awaiting）是可接受形态；回复不得编造已记录
    assert.doesNotMatch(reply, /已(记下|记录|落账)/, `无卡时不得声称已记录：${reply}`);
  }
});
