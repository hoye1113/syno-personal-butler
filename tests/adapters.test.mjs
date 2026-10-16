import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FakeCalendarAdapter, MarkdownCalendarAdapter } from "../apps/syno/syno/calendar-adapters.mjs";
import { ChannelHub, FakeChannelAdapter } from "../packages/syno-core/channels.mjs";
import { FeishuChannelAdapter, FeishuCredentialStore, FeishuStateStore, renderRegistrationQr, SILENT_SDK_LOGGER, validateRegistrationUrl } from "../packages/syno-core/feishu-channel.mjs";
import { ProcessFileLock } from "../packages/syno-core/process-lock.mjs";

async function removeTemp(root) {
  await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

test("Channel and Calendar fake Adapters satisfy their contracts", async () => {
  const channel = new FakeChannelAdapter();
  const hub = new ChannelHub({ fake: channel });
  await hub.start();
  assert.equal(hub.status().fake.running, true);
  assert.equal((await hub.send({ text: "hello" }, ["fake"])).fake.delivered, true);
  await hub.stop();
  const calendar = new FakeCalendarAdapter();
  const created = await calendar.create({ title: "test" });
  assert.equal((await calendar.status()).available, true);
  assert.equal((await calendar.remove(created.id)).removed, true);
});

test("ChannelHub.start tolerates a failing adapter and keeps others running", async () => {
  const ok = new FakeChannelAdapter();
  const failing = {
    start: async () => { throw new Error("ws handshake timeout"); },
    stop: async () => ({}),
    status: () => ({ running: false, available: false }),
    send: async () => ({ delivered: false }),
  };
  const hub = new ChannelHub({ ok, failing });
  const results = await hub.start();
  assert.equal(results.ok.running, true, "healthy adapter should still start");
  assert.equal(results.failing.error, "ws handshake timeout", "failing adapter error should be captured, not thrown");
  assert.equal(hub.status().ok.running, true, "healthy adapter remains available");
  await hub.stop();
});

// 2026-10-16：默认 home 随实际注册通道走（主人只用飞书；单一通道时就是它自己）。
test("ChannelHub derives the default home channel from the registered adapters", async () => {
  const feishuOnly = new ChannelHub({ feishu: new FakeChannelAdapter() });
  assert.equal(feishuOnly.homeChannel, "feishu");
  // 多通道时优先飞书；未来新增通道同样按「飞书优先」兜底
  const multi = new ChannelHub({ web: new FakeChannelAdapter(), feishu: new FakeChannelAdapter() });
  assert.equal(multi.homeChannel, "feishu");
  const noFeishu = new ChannelHub({ web: new FakeChannelAdapter() });
  assert.equal(noFeishu.homeChannel, "web", "没有飞书时用注册到的第一个通道");
});

test("Markdown Calendar persists a rebuildable event", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-calendar-adapter-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MarkdownCalendarAdapter({ opsRoot: root });
  const event = await adapter.create({ id: "event-one", title: "选题排期", start: "2026-07-16T10:00:00+08:00", end: "2026-07-16T11:00:00+08:00" });
  assert.match(await fs.readFile(event.path, "utf8"), /选题排期/);
});

test("Feishu adapter keeps delivery identity local because SDK send has no provider key", async () => {
  const calls = [];
  const adapter = new FeishuChannelAdapter({
    credentials: { async load() { return null; } },
    channelFactory: () => ({ async send(...args) { calls.push(args); } }),
  });
  adapter.channel = { async send(...args) { calls.push(args); } };
  adapter.running = true;
  const result = await adapter.send({ chatId: "chat", text: "retry", deliveryKey: "delivery-feishu-1" });
  assert.equal(result.delivered, true);
  assert.equal(result.deliveryCapability, "at_least_once");
  assert.equal(result.stableProviderIdentity, null);
  assert.equal(result.deliveryKey, "delivery-feishu-1");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], undefined);
});

test("Feishu long connection accepts only owner DMs and deduplicates messages", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-channel-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handlers = new Map();
  const sent = [];
  const channel = {
    on(name, handler) { handlers.set(name, handler); },
    async connect() {}, async disconnect() {},
    async send(chatId, body, options) { sent.push({ chatId, body, options }); },
  };
  const received = [];
  const adapter = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials: { async load() { return { appId: "cli_test", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    channelFactory: () => channel,
    onMessage: async (message) => { received.push(message); return { text: "已记录" }; },
  });
  await adapter.start();
  handlers.get("message")({ messageId: "m1", chatId: "c1", chatType: "group", senderId: "owner", content: "group" });
  handlers.get("message")({ messageId: "m2", chatId: "c2", chatType: "p2p", senderId: "stranger", content: "stranger" });
  handlers.get("message")({ messageId: "m3", chatId: "c3", chatType: "p2p", senderId: "owner", content: "hello" });
  handlers.get("message")({ messageId: "m3", chatId: "c3", chatType: "p2p", senderId: "owner", content: "duplicate" });
  for (let index = 0; index < 20 && !sent.length; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(received.length, 1);
  assert.equal(received[0].text, "hello");
  assert.equal(sent.length, 1);
  await adapter.stop();
});

test("Feishu first contact in p2p chat binds the owner and rejects subsequent strangers", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-first-contact-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handlers = new Map();
  const sent = [];
  const channel = {
    on(name, handler) { handlers.set(name, handler); },
    async connect() {}, async disconnect() {},
    async send(chatId, body, options) { sent.push({ chatId, body, options }); },
  };
  const received = [];
  let updatedOwner = "";
  const credentials = {
    async load() { return { appId: "cli_test", appSecret: "secret", ownerOpenId: updatedOwner }; },
    async updateOwner(ownerOpenId) { updatedOwner = ownerOpenId; },
  };
  const adapter = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials,
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    channelFactory: () => channel,
    onMessage: async (message) => { received.push(message); return { text: "认主成功" }; },
  });
  await adapter.start();
  assert.equal(adapter.status().ownerBound, false);

  handlers.get("message")({ messageId: "m1", chatId: "c1", chatType: "group", senderId: "user_a", content: "group" });
  assert.equal(updatedOwner, "");

  handlers.get("message")({ messageId: "m2", chatId: "c2", chatType: "p2p", senderId: "user_a", content: "hello owner" });
  for (let index = 0; index < 20 && !sent.length; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(updatedOwner, "user_a");
  assert.equal(adapter.status().ownerBound, true);
  assert.equal(received.length, 1);
  assert.equal(received[0].text, "hello owner");

  handlers.get("message")({ messageId: "m3", chatId: "c3", chatType: "p2p", senderId: "user_b", content: "stranger message" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(received.length, 1);

  handlers.get("message")({ messageId: "m4", chatId: "c2", chatType: "p2p", senderId: "user_a", content: "second message" });
  for (let index = 0; index < 20 && sent.length < 2; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(received.length, 2);
  assert.equal(received[1].text, "second message");

  await adapter.stop();
});

test("Feishu channel gives the SDK a silent logger so request errors cannot print App Secret", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-logger-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let options;
  const adapter = new FeishuChannelAdapter({
    credentials: { async load() { return { appId: "cli_test", appSecret: "must-not-log", ownerOpenId: "owner" }; } },
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    channelFactory: (value) => {
      options = value;
      return { on() {}, async connect() {}, async disconnect() {} };
    },
  });
  await adapter.start();
  assert.equal(options.logger, SILENT_SDK_LOGGER);
  assert.equal(options.loggerLevel, 0);
  const captured = [];
  const original = console.error;
  console.error = (...args) => captured.push(args);
  try { options.logger.error({ config: { data: '{"app_secret":"must-not-log"}' } }); }
  finally { console.error = original; }
  assert.deepEqual(captured, []);
  await adapter.stop();
});

test("Feishu persists successful dedupe and recovers a failed owner DM after restart", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-recovery-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "state.json");
  const credentials = { async load() { return { appId: "cli_test", appSecret: "secret", ownerOpenId: "owner" }; } };
  const channels = [];
  const channelFactory = () => {
    const handlers = new Map();
    const sent = [];
    const channel = { handlers, sent, on(name, handler) { handlers.set(name, handler); }, async connect() {}, async disconnect() {}, async send(chatId, body) { sent.push({ chatId, body }); } };
    channels.push(channel);
    return channel;
  };
  let attempts = 0;
  const first = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials, stateStore: new FeishuStateStore({ file: stateFile }), channelFactory, retryDelayMs: 60_000,
    onMessage: async () => { attempts += 1; if (attempts === 2) throw new Error("forced"); return { text: "ok" }; },
  });
  await first.start();
  channels[0].handlers.get("message")({ messageId: "done", chatId: "c1", chatType: "p2p", senderId: "owner", content: "once" });
  for (let index = 0; index < 30 && channels[0].sent.length < 1; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  channels[0].handlers.get("message")({ messageId: "retry", chatId: "c2", chatType: "p2p", senderId: "owner", content: "retry" });
  for (let index = 0; index < 30 && attempts < 2; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  await first.stop();

  const recovered = [];
  const second = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials, stateStore: new FeishuStateStore({ file: stateFile }), channelFactory,
    onMessage: async (message) => { recovered.push(message.id); return { text: "recovered" }; },
  });
  await second.start();
  for (let index = 0; index < 30; index += 1) {
    if ((await new FeishuStateStore({ file: stateFile }).snapshot()).pending.length === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  channels[1].handlers.get("message")({ messageId: "done", chatId: "c1", chatType: "p2p", senderId: "owner", content: "duplicate" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(recovered, ["retry"]);
  assert.deepEqual((await new FeishuStateStore({ file: stateFile }).snapshot()).pending, []);
  await second.stop();
});

test("Feishu process lock permits only one connected recovery owner", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-lock-"));
  t.after(() => removeTemp(root));
  const lockFile = path.join(root, "feishu.lock");
  const credentials = { async load() { return { appId: "app", appSecret: "secret", ownerOpenId: "owner" }; } };
  let connected = 0;
  const channelFactory = () => ({
    on() {},
    async connect() { connected += 1; },
    async disconnect() {},
    async send() {},
  });
  const makeAdapter = () => new FeishuChannelAdapter({
    credentials,
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    processLock: new ProcessFileLock({ file: lockFile, timeoutMs: 5, pollMs: 1 }),
    channelFactory,
  });
  const first = makeAdapter();
  const second = makeAdapter();
  assert.equal((await first.start()).running, true);
  assert.equal((await second.start()).running, false);
  assert.equal(connected, 1);
  await first.stop();
  assert.equal((await second.start()).running, true);
  assert.equal(connected, 2);
  await second.stop();
});

test("Feishu startup failure tears down the connected channel before releasing ownership", async () => {
  let disconnected = 0;
  let released = 0;
  const adapter = new FeishuChannelAdapter({
    credentials: { async load() { return { appId: "app", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore: { async snapshot() { throw new Error("state unavailable"); } },
    processLock: { async acquire() { return { async release() { released += 1; } }; } },
    channelFactory: () => ({
      on() {},
      async connect() {},
      async disconnect() { disconnected += 1; },
      async send() {},
    }),
  });

  await assert.rejects(adapter.start(), /state unavailable/);
  assert.deepEqual(adapter.status(), { id: "feishu", running: false, available: false, ownerBound: true, registration: "idle", lastError: "state unavailable" });
  assert.equal(disconnected, 1);
  assert.equal(released, 1);
});

test("Feishu stop clears ownership state even when disconnect fails", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-stop-"));
  t.after(() => removeTemp(root));
  let released = 0;
  let handled = 0;
  const handlers = new Map();
  const stateStore = new FeishuStateStore({ file: path.join(root, "state.json") });
  const adapter = new FeishuChannelAdapter({
    credentials: { async load() { return { appId: "app", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore,
    processLock: { async acquire() { return { async release() { released += 1; } }; } },
    channelFactory: () => ({
      on(name, handler) { handlers.set(name, handler); },
      async connect() {},
      async disconnect() { throw new Error("disconnect failed"); },
      async send() {},
    }),
    onMessage: async () => { handled += 1; return { text: "must not send" }; },
  });

  await adapter.start();
  await assert.rejects(adapter.stop(), /disconnect failed/);
  assert.deepEqual(adapter.status(), { id: "feishu", running: false, available: false, ownerBound: true, registration: "idle", lastError: "disconnect failed" });
  assert.equal(released, 1);
  handlers.get("message")({ messageId: "orphan", chatId: "chat", chatType: "p2p", senderId: "owner", content: "late" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(handled, 0);
  assert.deepEqual((await stateStore.snapshot()).pending, []);
});

test("Feishu keeps a message pending when reply delivery returns false", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-undelivered-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateStore = new FeishuStateStore({ file: path.join(root, "state.json") });
  const handlers = new Map();
  const adapter = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials: { async load() { return { appId: "app", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore, retryDelayMs: 60_000,
    channelFactory: () => ({ on(name, handler) { handlers.set(name, handler); }, async connect() {}, async disconnect() {}, async send() {} }),
    onMessage: async () => ({ text: "ok" }),
  });
  await adapter.start();
  adapter.send = async () => ({ delivered: false, reason: "not_connected" });
  handlers.get("message")({ messageId: "undelivered", chatId: "chat", chatType: "p2p", senderId: "owner", content: "hello" });
  for (let index = 0; index < 30 && !adapter.lastError; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal((await stateStore.snapshot()).pending[0].messageId, "undelivered");
  assert.match(adapter.lastError, /not_connected/);
  await adapter.stop();
});

test("Feishu prunes failed payloads after the 30-day retention window", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-retention-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-01T00:00:00.000Z");
  const store = new FeishuStateStore({ file: path.join(root, "state.json"), clock: () => now });
  await store.reserve({ messageId: "expired", chatId: "chat", chatType: "p2p", senderId: "owner", content: "payload" });
  now = new Date("2026-08-01T00:00:01.000Z");
  assert.deepEqual((await store.snapshot()).pending, []);
  assert.doesNotMatch(await fs.readFile(path.join(root, "state.json"), "utf8"), /payload/);
});

test("Feishu credentials keep App Secret outside metadata", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-credentials-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new FeishuCredentialStore({ root, protect: async (value) => `protected:${value}`, unprotect: async (value) => value.replace("protected:", "") });
  const status = await store.save({ appId: "cli_test", appSecret: "app-secret", ownerOpenId: "owner" });
  assert.equal(status.ownerBound, true);
  assert.doesNotMatch(await fs.readFile(store.metadataFile, "utf8"), /app-secret/);
  assert.equal((await store.load()).appSecret, "app-secret");
});

test("Feishu registration URL renders to an in-memory PNG data URL", async () => {
  const url = "https://open.feishu.cn/page/launcher?user_code=ABCD-EFGH&from=sdk";
  assert.equal(validateRegistrationUrl(url), url);
  assert.match(await renderRegistrationQr(url), /^data:image\/png;base64,/);
  assert.throws(() => validateRegistrationUrl("https://example.com/page/launcher?user_code=stolen"), /不在官方启动页范围/);
});

test("Feishu registration starts the long connection after Owner confirmation", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-registration-"));
  t.after(() => removeTemp(root));
  let saved = null;
  let connects = 0;
  const adapter = new FeishuChannelAdapter({
    credentials: {
      async save(value) { saved = value; },
      async load() { return saved; },
    },
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    sdkLoader: async () => ({
      registerApp(options) {
        options.onQRCodeReady({ url: "https://open.feishu.cn/page/launcher?user_code=ABCD-EFGH", expireIn: 600 });
        return new Promise((resolve) => setTimeout(() => resolve({ client_id: "cli_registered", client_secret: "secret", user_info: { open_id: "owner" } }), 25));
      },
    }),
    channelFactory: () => ({
      on() {},
      async connect() { connects += 1; },
      async disconnect() {},
    }),
  });

  const waiting = await adapter.beginRegistration();
  assert.equal(waiting.status, "waiting_scan");
  for (let index = 0; index < 20 && !adapter.running; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(adapter.registrationStatus().status, "confirmed");
  assert.equal(adapter.status().running, true);
  assert.equal(adapter.status().ownerBound, true);
  assert.equal(connects, 1);
  await adapter.stop();
});
