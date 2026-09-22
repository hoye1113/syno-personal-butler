import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createInspirationFeedbackTool } from "../apps/syno/syno/inspiration-feedback-tool.mjs";
import { InspirationStore } from "../apps/syno/syno/inspiration-store.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

// P1（#17）inspiration.record_feedback 工具单测：无卡/有卡/TTL 过期/非法取值/无边界上下文拒绝/
// 桥上下文放行/同卡不重复落账。路由语义（什么时候该调）由提示词 + eval 守，这里守工具内硬约束。

async function makeFixture(t, { clock } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-fb-tool-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new InspirationStore({ opsRoot: path.join(root, "ops"), ...(clock ? { clock } : {}) });
  const eventsLog = [];
  const tool = createInspirationFeedbackTool({
    inspirationStore: store,
    recordEvent: async (name, data) => eventsLog.push({ name, data }),
  });
  const registry = new ToolRegistry([tool]);
  return { store, eventsLog, registry };
}

async function deliveredCard(store) {
  const card = await store.create({ date: "2026-09-04", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联文本" });
  await store.markDelivered(card.id, "event-1");
  return card;
}

test("factory requires an InspirationStore", () => {
  assert.throws(() => createInspirationFeedbackTool({}), /缺少 InspirationStore/);
});

test("no card awaiting feedback → recorded:false with reason, nothing written", async (t) => {
  const { store, eventsLog, registry } = await makeFixture(t);
  const output = await registry.execute("inspiration.record_feedback", { feedback: "useful" }, { allowAgentSettings: true });
  assert.deepEqual(output, { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list()).length, 0);
  assert.equal(eventsLog.length, 0, "无卡不落事件");
});

test("with a delivered card → records feedback, fires inspiration.feedback.recorded, second call is a no-op", async (t) => {
  const { store, eventsLog, registry } = await makeFixture(t);
  const card = await deliveredCard(store);
  const output = await registry.execute("inspiration.record_feedback", { feedback: "not_useful" }, { allowAgentSettings: true, channel: "weixin" });
  assert.deepEqual(output, { recorded: true, inspirationId: card.id, feedback: "not_useful" });
  const updated = (await store.list())[0];
  assert.equal(updated.status, "feedback");
  assert.equal(updated.feedback, "not_useful");
  assert.equal(eventsLog.length, 1);
  assert.equal(eventsLog[0].name, "inspiration.feedback.recorded");
  assert.deepEqual(eventsLog[0].data, { inspirationId: card.id, feedback: "not_useful", channel: "weixin" });
  // 同卡第二次调用：已反馈的卡不再 awaiting → 幂等 no-op，不重复落账
  const again = await registry.execute("inspiration.record_feedback", { feedback: "useful" }, { allowAgentSettings: true });
  assert.deepEqual(again, { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list()).filter((record) => record.feedback).length, 1);
});

test("card delivered beyond the feedback TTL → no_card_awaiting", async (t) => {
  let nowMs = new Date("2026-09-04T12:35:00+08:00").getTime();
  const { store, registry } = await makeFixture(t, { clock: () => new Date(nowMs) });
  await deliveredCard(store);
  nowMs += 25 * 60 * 60 * 1000; // 投递 25h 后（TTL 24h 外）
  const output = await registry.execute("inspiration.record_feedback", { feedback: "useful" }, { allowAgentSettings: true });
  assert.deepEqual(output, { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list())[0].feedback || null, null);
});

test("illegal feedback value is rejected by input schema (TOOL_INPUT_INVALID)", async (t) => {
  const { registry } = await makeFixture(t);
  await assert.rejects(
    registry.execute("inspiration.record_feedback", { feedback: "meh" }, { allowAgentSettings: true }),
    (error) => error.code === "TOOL_INPUT_INVALID",
  );
});

test("context without boundary flags is refused (TOOL_APPROVAL_REQUIRED); bridge/agent context passes", async (t) => {
  const { store, registry } = await makeFixture(t);
  const card = await deliveredCard(store);
  await assert.rejects(
    registry.execute("inspiration.record_feedback", { feedback: "useful" }),
    (error) => error.code === "TOOL_APPROVAL_REQUIRED",
  );
  await assert.rejects(
    registry.execute("inspiration.record_feedback", { feedback: "useful" }, { channel: "weixin" }),
    (error) => error.code === "TOOL_APPROVAL_REQUIRED",
  );
  const output = await registry.execute("inspiration.record_feedback", { feedback: "useful" }, { allowAgentSettings: true });
  assert.equal(output.recorded, true);
  assert.equal(output.inspirationId, card.id);
});

// 精确 ID 路径（2026-09-22）：有 ID 时只允许同一 Owner 已投递且未反馈的卡；
// 已反馈卡返回既有事实不覆盖；无 ID 时维持 24h 最近卡安全行为。
test("explicit inspirationId only writes the exact owner-delivered card and reports prior feedback as fact", async (t) => {
  const { store, eventsLog, registry } = await makeFixture(t);
  const card = await store.create({ date: "2026-09-22", sampledRefs: ["vault/a.md", "vault/b.md"], text: "精确卡" });
  await store.markDelivered(card.id, "event-1", { ownerKey: "owner" });
  const context = { allowAgentSettings: true, ownerId: "owner", channel: "weixin" };

  const output = await registry.execute("inspiration.record_feedback", { feedback: "useful", inspirationId: card.id }, context);
  assert.deepEqual(output, { recorded: true, inspirationId: card.id, feedback: "useful" });
  assert.equal(eventsLog.at(-1).name, "inspiration.feedback.recorded");

  // 已反馈卡：返回事实状态，不覆盖历史记录。
  const again = await registry.execute("inspiration.record_feedback", { feedback: "not_useful", inspirationId: card.id }, context);
  assert.deepEqual(again, { recorded: false, reason: "already_recorded", inspirationId: card.id, feedback: "useful" });
  assert.equal((await store.list()).find((record) => record.id === card.id).feedback, "useful");

  // 跨 Owner 拒绝精确回填。
  const other = await registry.execute("inspiration.record_feedback", { feedback: "useful", inspirationId: card.id }, { ...context, ownerId: "intruder" });
  assert.deepEqual(other, { recorded: false, reason: "not_delivered_to_owner", inspirationId: card.id });
});

test("explicit inspirationId refuses a historical card without a persisted delivery owner", async (t) => {
  const { store, registry } = await makeFixture(t);
  const card = await deliveredCard(store); // 历史形态：无 deliveredOwnerKey
  const output = await registry.execute("inspiration.record_feedback", { feedback: "useful", inspirationId: card.id }, { allowAgentSettings: true, ownerId: "owner" });
  assert.deepEqual(output, { recorded: false, reason: "not_delivered_to_owner", inspirationId: card.id });
  assert.equal((await store.list())[0].feedback || null, null);
});
