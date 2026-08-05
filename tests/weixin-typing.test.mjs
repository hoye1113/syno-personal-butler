// 验证微信「正在输入」typing 指示器 + 即时 ack（feature 见 commit 07ed59f；SYNO_WEIXIN_TYPING 默认开）。
//
// 覆盖：
// - WeixinIlinkClient.getConfig / sendTyping 的 endpoint 与 body 契约（status=1 开始 / 2 停止）
// - handleInbound 收到主人消息后：先发 ack「收到，正在处理…」→ 起 typing status:1 → onMessage 完成后 stop status:2
// - try/finally 保证 onMessage throw / deferredDelivery / send 未送达 三路径都收尾 typing（不悬空「正在输入」）
// - typing 票据失效（sendtyping errcode 非 0）自动清缓存重取重试
// - typing 全链路失败静默，不影响 ack 与业务回复
// - typingIndicator=false 时不调任何 typing API，但 ack 照发
// - 非主人消息走短路径，不进 typing/ack 主流程
// - keepalive：每 5s 重发 status:1（mock.timers 推进），stop 后 clearInterval 不再重发
//
// 注意：typing 的微信端「正在输入中…」可见性文档未百分百确认，需真机实测；
// 本测试只验证调用契约与生命周期，不验证微信 UI 表现。

import test from "node:test";
import assert from "node:assert/strict";

import { WeixinIlinkClient, WeixinIlinkAdapter, envToggle } from "../apps/syno/syno/weixin-ilink.mjs";

function fakeCredentialStore() {
  return { async save() {}, async load() { return null; }, async clear() {}, async saveRuntime() {} };
}

function ownerAdapter({ client, onMessage, typingIndicator, typingIntervalMs }) {
  const adapter = new WeixinIlinkAdapter({
    client,
    credentialStore: fakeCredentialStore(),
    onMessage: onMessage || (async () => ({ text: "ok" })),
    ...(typingIndicator === undefined ? {} : { typingIndicator }),
    ...(typingIntervalMs === undefined ? {} : { typingIntervalMs }),
  });
  adapter.credential = { token: "t", ownerId: "owner", contexts: {}, seenIds: [] };
  return adapter;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const INBOUND = {
  message_id: "m1",
  message_type: 1,
  from_user_id: "owner",
  context_token: "ctx",
  item_list: [{ type: 1, text_item: { text: "hi" } }],
};

// ===== client 契约 =====

test("WeixinIlinkClient.getConfig POST 到 ilink/bot/getconfig，body 含 ilink_user_id 与 context_token", async () => {
  const calls = [];
  const client = new WeixinIlinkClient({
    token: "t",
    fetcher: async (url, options) => { calls.push({ url, method: options.method, body: JSON.parse(options.body) }); return { ret: 0, typing_ticket: "tk" }; },
  });
  await client.getConfig({ ilinkUserId: "owner", contextToken: "ctx" });
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /ilink\/bot\/getconfig$/);
  assert.equal(calls[0].body.ilink_user_id, "owner");
  assert.equal(calls[0].body.context_token, "ctx");
});

test("WeixinIlinkClient.sendTyping POST 到 ilink/bot/sendtyping，body 含 typing_ticket 与 status", async () => {
  const calls = [];
  const client = new WeixinIlinkClient({
    token: "t",
    fetcher: async (url, options) => { calls.push({ url, method: options.method, body: JSON.parse(options.body) }); return { ret: 0 }; },
  });
  await client.sendTyping({ ilinkUserId: "owner", typingTicket: "tk", status: 1, contextToken: "ctx" });
  assert.equal(calls[0].method, "POST");
  assert.match(calls[0].url, /ilink\/bot\/sendtyping$/);
  assert.equal(calls[0].body.ilink_user_id, "owner");
  assert.equal(calls[0].body.typing_ticket, "tk");
  assert.equal(calls[0].body.status, 1);
});

test("getConfig / sendTyping 在 contextToken 缺省时不带 context_token 字段", async () => {
  const calls = [];
  const client = new WeixinIlinkClient({
    token: "t",
    fetcher: async (_url, options) => { calls.push(JSON.parse(options.body)); return { ret: 0, typing_ticket: "tk" }; },
  });
  await client.getConfig({ ilinkUserId: "owner" });
  assert.equal("context_token" in calls[0], false);
});

// ===== envToggle 开关语义 =====

test("envToggle：defaultOn=true 黑名单（0/false 关，其余含缺省开），defaultOn=false 白名单（1/true 开，其余含缺省关）", () => {
  // defaultOn: true（typing 语义：默认开，仅 0/false 关）
  assert.equal(envToggle(undefined, { defaultOn: true }), true);
  assert.equal(envToggle("", { defaultOn: true }), true);
  assert.equal(envToggle("1", { defaultOn: true }), true);
  assert.equal(envToggle("0", { defaultOn: true }), false);
  assert.equal(envToggle("false", { defaultOn: true }), false);
  assert.equal(envToggle(" FALSE ", { defaultOn: true }), false);
  // defaultOn: false（ack 语义：默认关，仅 1/true 开）
  assert.equal(envToggle(undefined, { defaultOn: false }), false);
  assert.equal(envToggle("", { defaultOn: false }), false);
  assert.equal(envToggle("0", { defaultOn: false }), false);
  assert.equal(envToggle("1", { defaultOn: false }), true);
  assert.equal(envToggle("true", { defaultOn: false }), true);
  assert.equal(envToggle(" TRUE ", { defaultOn: false }), true);
});

// ===== handleInbound 生命周期 =====

test("正常路径：先发 ack，起 typing status:1，onMessage 后 stop status:2，回复送达", async () => {
  const order = [];
  const typingCalls = [];
  const client = {
    async sendText({ text }) { order.push(`sendText:${text}`); return { ret: 0 }; },
    async getConfig() { order.push("getConfig"); return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  const adapter = ownerAdapter({
    client,
    onMessage: async () => { order.push("onMessage"); return { text: "reply" }; },
  });
  const delivery = await adapter.handleInbound(INBOUND);
  assert.equal(delivery.delivered, true);
  const ackIdx = order.findIndex((e) => e.startsWith("sendText:收到"));
  const msgIdx = order.indexOf("onMessage");
  assert.ok(ackIdx >= 0 && msgIdx >= 0 && ackIdx < msgIdx, `ack 必须先于 onMessage: ${JSON.stringify(order)}`);
  assert.ok(typingCalls.includes(1), "应发 typing status:1（开始）");
  assert.equal(typingCalls[typingCalls.length - 1], 2, "最后应发 status:2（停止）");
});

test("onMessage throw：finally 仍 stop typing，不悬空「正在输入」", async () => {
  const typingCalls = [];
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => { throw new Error("forced"); } });
  await assert.rejects(adapter.handleInbound(INBOUND), /forced/);
  assert.ok(typingCalls.includes(2), "throw 路径也应发 status:2 停止 typing");
});

test("deferredDelivery 提前返回：finally 仍 stop typing", async () => {
  const typingCalls = [];
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => ({ deferredDelivery: true, requestId: "r1" }) });
  const result = await adapter.handleInbound(INBOUND);
  assert.equal(result.deferred, true);
  assert.ok(typingCalls.includes(2), "deferred 路径也应发 status:2");
});

test("send 未送达抛错：finally 仍 stop typing", async () => {
  const typingCalls = [];
  let sendCount = 0;
  const client = {
    async sendText() { sendCount += 1; return sendCount === 2 ? { ret: -1 } : { ret: 0 }; }, // ack 成功，reply 失败
    async getConfig() { return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => ({ text: "reply" }) });
  await assert.rejects(adapter.handleInbound(INBOUND), /微信回复未送达/);
  assert.ok(typingCalls.includes(2), "send 失败路径也应发 status:2");
});

// ===== 健壮性 =====

test("typing 全链路失败（getConfig 抛）静默，不影响 ack 与业务回复", async () => {
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { throw new Error("getconfig down"); },
    async sendTyping() { return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => ({ text: "reply" }) });
  const delivery = await adapter.handleInbound(INBOUND);
  assert.equal(delivery.delivered, true, "typing 失败不应影响回复送达");
});

test("typing 票据失效（sendtyping errcode 非 0）自动清缓存重取重试", async () => {
  const cfgCalls = [];
  const typingResults = [];
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { cfgCalls.push(1); return { ret: 0, typing_ticket: `tk-${cfgCalls.length}` }; },
    async sendTyping({ status, typingTicket }) {
      typingResults.push({ status, typingTicket });
      return typingResults.length === 1 ? { errcode: 40001 } : { ret: 0 }; // 首次票据失效
    },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => ({ text: "reply" }) });
  await adapter.handleInbound(INBOUND);
  assert.ok(cfgCalls.length >= 2, `票据失效应触发重取（getconfig 至少 2 次），实际 ${cfgCalls.length}`);
  assert.equal(typingResults[0].typingTicket, "tk-1");
  assert.equal(typingResults[1].typingTicket, "tk-2", "重试应使用重取的新票据");
});

test("typingIndicator=false：不调任何 typing API，但 ack 照发", async () => {
  let typingCalls = 0;
  let ackSent = false;
  const client = {
    async sendText({ text }) { if (text.includes("收到")) ackSent = true; return { ret: 0 }; },
    async getConfig() { typingCalls += 1; return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping() { typingCalls += 1; return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, typingIndicator: false, onMessage: async () => ({ text: "reply" }) });
  await adapter.handleInbound(INBOUND);
  assert.equal(typingCalls, 0, "typingIndicator=false 不应调任何 typing API");
  assert.equal(ackSent, true, "ack 不受 typing 开关影响");
});

test("非主人消息走短路径：不进 typing/ack 主流程（直接拒绝回复，不起 typing）", async () => {
  const typingCalls = [];
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  const adapter = ownerAdapter({ client, onMessage: async () => { throw new Error("不应处理非主人消息"); } });
  await adapter.handleInbound({ ...INBOUND, from_user_id: "stranger", message_id: "stranger-1" });
  assert.equal(typingCalls.length, 0, "短路径不应起 typing");
});

// ===== keepalive（注入短间隔 + 真实 timer；避免 mock.timers 与 fire-and-forget async 的时序死锁）=====

test("keepalive：按间隔重发 status:1，stop 后发 status:2 且 interval 已清除", async () => {
  const typingCalls = [];
  const client = {
    async sendText() { return { ret: 0 }; },
    async getConfig() { return { ret: 0, typing_ticket: "tk" }; },
    async sendTyping({ status }) { typingCalls.push(status); return { ret: 0 }; },
  };
  let resolveMsg;
  const adapter = ownerAdapter({
    client,
    typingIntervalMs: 500, // clamp 下限 500ms；测试用下限值加速 keepalive 验证
    onMessage: () => new Promise((resolve) => { resolveMsg = () => resolve({ text: "done" }); }),
  });
  const handled = adapter.handleInbound(INBOUND);
  await wait(1150); // 等首次 status:1 + ~2 次 keepalive 重发（500ms 间隔）
  const onesBefore = typingCalls.filter((s) => s === 1).length;
  assert.ok(onesBefore >= 2, `keepalive 应多次重发 status:1，实际 ${onesBefore} 次：${JSON.stringify(typingCalls)}`);

  resolveMsg(); // 完成 onMessage → finally stop
  const delivery = await handled;
  assert.equal(delivery.delivered, true);
  assert.equal(typingCalls[typingCalls.length - 1], 2, "stop 应发 status:2");

  // stop 已 clearInterval：再等一个周期，status:1 不应再增长
  const onesAfterStop = typingCalls.filter((s) => s === 1).length;
  await wait(700);
  assert.equal(typingCalls.filter((s) => s === 1).length, onesAfterStop, "stop 后 interval 已清除，不再重发");
});
