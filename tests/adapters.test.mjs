import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FakeCalendarAdapter, MarkdownCalendarAdapter } from "../apps/syno/syno/calendar-adapters.mjs";
import { ChannelHub, FakeChannelAdapter } from "../apps/syno/syno/channels.mjs";
import { FeishuChannelAdapter, FeishuCredentialStore, FeishuStateStore, renderRegistrationQr, SILENT_SDK_LOGGER, validateRegistrationUrl } from "../apps/syno/syno/feishu-channel.mjs";
import { createWeixinMessageHandler, parseWeixinApproval } from "../apps/syno/syno/runtime.mjs";
import { Scheduler, occurrenceFor } from "../apps/syno/syno/scheduler.mjs";
import { LocalCredentialStore, LocalProcessLock, normalizeInbound, parseAttachmentKey, readLimitedBody, renderLoginQr, resolveAttachmentUrl, sniffMime, validateIlinkBaseUrl, validateLoginQrUrl, WeixinIlinkAdapter, WeixinIlinkClient } from "../apps/syno/syno/weixin-ilink.mjs";

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

test("Markdown Calendar persists a rebuildable event", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-calendar-adapter-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new MarkdownCalendarAdapter({ opsRoot: root });
  const event = await adapter.create({ id: "event-one", title: "选题排期", start: "2026-07-16T10:00:00+08:00", end: "2026-07-16T11:00:00+08:00" });
  assert.match(await fs.readFile(event.path, "utf8"), /选题排期/);
});

test("Scheduler catches up only the most recent occurrence", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-scheduler-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const due = [];
  const scheduler = new Scheduler({ stateFile: path.join(root, "state.json"), onDue: async (id) => due.push(id) });
  const now = new Date(2026, 6, 19, 22, 30, 0);
  assert.equal(occurrenceFor({ hour: 22, minute: 0 }, now).getDate(), 19);
  assert.deepEqual(await scheduler.tick(now), ["morning", "evening", "weekly"]);
  assert.deepEqual(await scheduler.tick(new Date(2026, 6, 19, 23, 0, 0)), []);
  assert.deepEqual(due, ["morning", "evening", "weekly"]);
});

test("Weixin Adapter normalizes text/voice and keeps login behind a seam", async () => {
  const inbound = normalizeInbound({ message_id: 9, from_user_id: "owner", context_token: "ctx", item_list: [{ type: 3, voice_item: { text: "语音转写" } }] });
  assert.equal(inbound.text, "语音转写");
  const client = {
    async getQrCode() { return { ret: 0, qrcode: "qr", qrcode_img_content: "https://liteapp.weixin.qq.com/q/example?bot_type=3" }; },
    async getQrStatus() { return { status: "confirmed", bot_token: "test-token", ilink_user_id: "owner" }; },
  };
  let saved;
  let renderedQrUrl;
  const credentials = { async save(value) { saved = value; }, async load() { return null; }, async clear() {} };
  const adapter = new WeixinIlinkAdapter({ client, credentialStore: credentials, qrRenderer: async (value) => { renderedQrUrl = value; return "data:image/png;base64,fixture"; } });
  const login = await adapter.beginLogin();
  assert.equal(login.qrcode, "qr");
  assert.equal(login.imageUrl, "data:image/png;base64,fixture");
  assert.equal(renderedQrUrl, "https://liteapp.weixin.qq.com/q/example?bot_type=3");
  assert.equal((await adapter.pollLogin()).status, "confirmed");
  assert.equal(saved.ownerId, "owner");
  assert.throws(() => validateIlinkBaseUrl("https://attacker.example/api"), /官方域名/);
  assert.throws(() => validateLoginQrUrl("https://attacker.example/qr"), /官方域名/);
});

test("Weixin login URL renders to an in-memory PNG data URL", async () => {
  const rendered = await renderLoginQr("https://liteapp.weixin.qq.com/q/example?bot_type=3");
  assert.match(rendered, /^data:image\/png;base64,/);
  assert.ok(rendered.length > 1_000);
});

test("Weixin long poll times out locally and preserves its cursor", async () => {
  const client = new WeixinIlinkClient({
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
    }),
  });
  assert.deepEqual(await client.getUpdates("cursor-one", undefined, 5), { ret: 0, msgs: [], get_updates_buf: "cursor-one" });
});

test("Weixin gives every consecutive reply a unique client id", async () => {
  const requests = [];
  const client = new WeixinIlinkClient({
    token: "token",
    fetcher: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ret: 0 };
    },
  });
  await client.sendText({ toUserId: "owner", contextToken: "context-1", text: "reply one" });
  await client.sendText({ toUserId: "owner", contextToken: "context-2", text: "reply two" });
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.msg.client_id));
  assert.notEqual(requests[0].msg.client_id, requests[1].msg.client_id);
  assert.deepEqual(requests.map((request) => request.msg.context_token), ["context-1", "context-2"]);
});

test("Weixin poller replies to consecutive owner messages and advances each state", async () => {
  let saved = { token: "test", baseUrl: "https://ilinkai.weixin.qq.com/", ownerId: "owner", cursor: "", contexts: {}, seenIds: [] };
  const credentials = {
    async load() { return structuredClone(saved); },
    async save(value) { saved = structuredClone(value); },
    async clear() {},
  };
  let updateCall = 0;
  const sent = [];
  const client = {
    async getUpdates(_cursor, signal) {
      updateCall += 1;
      if (updateCall <= 2) return {
        ret: 0,
        get_updates_buf: `cursor-${updateCall}`,
        msgs: [{ message_id: `message-${updateCall}`, message_type: 1, from_user_id: "owner", context_token: `context-${updateCall}`, item_list: [{ type: 1, text_item: { text: `message ${updateCall}` } }] }],
      };
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
    },
    async sendText(value) { sent.push(value); return { message_id: `reply-${sent.length}` }; },
  };
  const processLock = { async acquire() { return true; }, async release() {} };
  const adapter = new WeixinIlinkAdapter({ client, clientFactory: () => client, credentialStore: credentials, processLock, onMessage: async ({ text }) => ({ text: `reply to ${text}` }) });
  await adapter.start();
  for (let index = 0; index < 40 && (sent.length < 2 || saved.cursor !== "cursor-2"); index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(sent.length, 2);
  assert.equal(saved.cursor, "cursor-2");
  assert.deepEqual(saved.seenIds, ["message-1", "message-2"]);
  assert.equal(adapter.status().lastError, null);
  await adapter.stop();
});

test("Weixin stale session cooldown preserves credentials and resumes polling", async () => {
  let saved = { token: "kept-token", baseUrl: "https://ilinkai.weixin.qq.com/", ownerId: "owner", cursor: "", contexts: {}, seenIds: [] };
  let clearCalls = 0;
  const credentials = {
    async load() { return structuredClone(saved); },
    async save(value) { saved = structuredClone(value); },
    async clear() { clearCalls += 1; saved = null; },
  };
  let updateCall = 0;
  const sent = [];
  const client = {
    async getUpdates(_cursor, signal) {
      updateCall += 1;
      if (updateCall === 1) return { errcode: -14 };
      if (updateCall === 2) return {
        ret: 0,
        get_updates_buf: "recovered-cursor",
        msgs: [{ message_id: "recovered-message", message_type: 1, from_user_id: "owner", context_token: "context", item_list: [{ type: 1, text_item: { text: "after cooldown" } }] }],
      };
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
    },
    async sendText(value) { sent.push(value); return { message_id: "reply" }; },
  };
  const processLock = { async acquire() { return true; }, async release() {} };
  const adapter = new WeixinIlinkAdapter({
    client,
    clientFactory: () => client,
    credentialStore: credentials,
    processLock,
    staleSessionPauseMs: 1,
    onMessage: async () => ({ text: "recovered" }),
  });
  await adapter.start();
  for (let index = 0; index < 40 && !sent.length; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(clearCalls, 0);
  assert.equal(saved.token, "kept-token");
  assert.equal(saved.cursor, "recovered-cursor");
  assert.equal(sent.length, 1);
  assert.equal(adapter.status().running, true);
  assert.equal(adapter.status().lastError, null);
  await adapter.stop();
});

test("Weixin confirmed rescan replaces a running poller with the new credential", async () => {
  let saved = { token: "old-token", baseUrl: "https://ilinkai.weixin.qq.com/", ownerId: "owner", cursor: "old-cursor", contexts: {}, seenIds: [] };
  let clearCalls = 0;
  const credentials = {
    async load() { return structuredClone(saved); },
    async save(value) { saved = structuredClone(value); },
    async clear() { clearCalls += 1; },
  };
  const createdFor = [];
  let oldPollAborted = false;
  const waitForAbort = (signal, onAbort = () => {}) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => {
    onAbort();
    reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
  }, { once: true }));
  const clientFactory = (credential) => {
    createdFor.push(credential.token);
    return {
      async getQrCode() { return { ret: 0, qrcode: "replacement-qr", qrcode_img_content: "https://liteapp.weixin.qq.com/q/replacement?bot_type=3" }; },
      async getQrStatus() { return { status: "confirmed", bot_token: "new-token", ilink_user_id: "owner", ilink_bot_id: "bot" }; },
      async getUpdates(_cursor, signal) { return waitForAbort(signal, () => { if (credential.token === "old-token") oldPollAborted = true; }); },
    };
  };
  const processLock = { async acquire() { return true; }, async release() {} };
  const adapter = new WeixinIlinkAdapter({ clientFactory, credentialStore: credentials, processLock, qrRenderer: async () => "data:image/png;base64,fixture" });
  await adapter.start();
  await adapter.beginLogin();
  assert.equal((await adapter.pollLogin()).status, "confirmed");
  assert.deepEqual(createdFor, ["old-token", "new-token"]);
  assert.equal(oldPollAborted, true);
  assert.equal(saved.token, "new-token");
  assert.equal(clearCalls, 0);
  assert.equal(adapter.status().running, true);
  assert.equal(adapter.status().ownerBound, true);
  await adapter.stop();
});

test("Weixin credentials keep token and reply contexts outside metadata and backup state", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-credentials-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "state", "weixin-runtime.json");
  const store = new LocalCredentialStore({
    root: path.join(root, "credentials"),
    stateFile,
    protect: async (value) => Buffer.from(value, "utf8").toString("base64"),
    unprotect: async (value) => Buffer.from(value, "base64").toString("utf8"),
  });
  await store.save({ token: "bot-secret", baseUrl: "https://ilinkai.weixin.qq.com/", botId: "bot", ownerId: "owner", cursor: "cursor", contexts: { owner: "reply-secret" }, seenIds: ["m1"] });
  const metadata = await fs.readFile(store.metadataFile, "utf8");
  const state = await fs.readFile(stateFile, "utf8");
  assert.doesNotMatch(metadata, /bot-secret|reply-secret/);
  assert.doesNotMatch(state, /bot-secret|reply-secret/);
  assert.equal(JSON.parse(metadata).version, 2);
  assert.deepEqual(await store.load(), {
    version: 2, baseUrl: "https://ilinkai.weixin.qq.com/", botId: "bot", ownerId: "owner",
    savedAt: JSON.parse(metadata).savedAt, token: "bot-secret", contexts: { owner: "reply-secret" }, cursor: "cursor", seenIds: ["m1"],
  });
});

test("Weixin legacy plaintext credentials migrate to the DPAPI split on first load", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-legacy-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const credentialRoot = path.join(root, "credentials");
  const stateFile = path.join(root, "state", "weixin-runtime.json");
  const store = new LocalCredentialStore({
    root: credentialRoot,
    stateFile,
    protect: async (value) => Buffer.from(value, "utf8").toString("base64"),
    unprotect: async (value) => Buffer.from(value, "base64").toString("utf8"),
  });
  await fs.mkdir(credentialRoot, { recursive: true });
  await fs.writeFile(store.metadataFile, JSON.stringify({ token: "legacy-token", baseUrl: "https://ilinkai.weixin.qq.com/", ownerId: "owner", cursor: "old", contexts: { owner: "legacy-context" }, seenIds: ["old-message"] }), "utf8");
  const loaded = await store.load();
  assert.equal(loaded.token, "legacy-token");
  assert.equal(loaded.contexts.owner, "legacy-context");
  assert.doesNotMatch(await fs.readFile(store.metadataFile, "utf8"), /legacy-token|legacy-context/);
  assert.doesNotMatch(await fs.readFile(stateFile, "utf8"), /legacy-token|legacy-context/);
  assert.equal((await store.load()).cursor, "old");
});

test("Weixin approval commands are parsed deterministically", () => {
  assert.deepEqual(parseWeixinApproval("批准 job-20260717-a1b2c3d4 0f12ab"), {
    jobId: "job-20260717-a1b2c3d4",
    code: "0F12AB",
  });
  assert.equal(parseWeixinApproval("批准全部任务"), null);
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

test("Feishu channel gives the SDK a silent logger so request errors cannot print App Secret", async () => {
  let options;
  const adapter = new FeishuChannelAdapter({
    credentials: { async load() { return { appId: "cli_test", appSecret: "must-not-log", ownerOpenId: "owner" }; } },
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
    credentials, stateStore: new FeishuStateStore({ file: stateFile }), channelFactory,
    onMessage: async (message) => { recovered.push(message.id); return { text: "recovered" }; },
  });
  await second.start();
  for (let index = 0; index < 30 && !recovered.length; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  channels[1].handlers.get("message")({ messageId: "done", chatId: "c1", chatType: "p2p", senderId: "owner", content: "duplicate" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(recovered, ["retry"]);
  assert.deepEqual((await new FeishuStateStore({ file: stateFile }).snapshot()).pending, []);
  await second.stop();
});

test("Feishu keeps a message pending when reply delivery returns false", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-undelivered-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateStore = new FeishuStateStore({ file: path.join(root, "state.json") });
  const handlers = new Map();
  const adapter = new FeishuChannelAdapter({
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

test("Feishu registration starts the long connection after Owner confirmation", async () => {
  let saved = null;
  let connects = 0;
  const adapter = new FeishuChannelAdapter({
    credentials: {
      async save(value) { saved = value; },
      async load() { return saved; },
    },
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

test("Weixin restores cursor context and never promotes the first unknown sender", async () => {
  const sent = [];
  let saved = {
    token: "token",
    baseUrl: "https://ilinkai.weixin.qq.com/",
    ownerId: "",
    cursor: "cursor-one",
    contexts: { owner: "ctx-old" },
    seenIds: ["old-message"],
  };
  const credentials = {
    async load() { return saved; },
    async save(value) { saved = structuredClone(value); },
    async clear() {},
  };
  const client = {
    async getUpdates(_cursor, signal) {
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
    },
    async sendText(value) { sent.push(value); return { ret: 0 }; },
  };
  const processLock = { async acquire() { return true; }, async release() {} };
  const adapter = new WeixinIlinkAdapter({ client, clientFactory: () => client, credentialStore: credentials, processLock });
  await adapter.start();
  assert.equal(adapter.contexts.get("owner"), "ctx-old");
  assert.equal(adapter.seen.has("old-message"), true);
  await adapter.handleInbound({ message_id: 10, from_user_id: "attacker", context_token: "ctx-new", item_list: [{ type: 1, text_item: { text: "hello" } }] });
  assert.equal(saved.ownerId, "");
  assert.match(sent[0].text, /重新扫码/);
  await adapter.stop();
});

test("Weixin process lock allows exactly one poller", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "poller.lock");
  const first = new LocalProcessLock({ file });
  const second = new LocalProcessLock({ file });
  assert.equal(await first.acquire(), true);
  assert.equal(await second.acquire(), false);
  await first.release();
  assert.equal(await second.acquire(), true);
  await second.release();
});

test("Weixin attachments are streamed, sniffed and quarantined without auto-read", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-media-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("safe")]);
  let inbound;
  const credentials = { async save() {}, async load() { return null; }, async clear() {} };
  const client = { async sendText() { return { ret: 0 }; } };
  const adapter = new WeixinIlinkAdapter({
    client,
    credentialStore: credentials,
    quarantineRoot: root,
    fetchImpl: async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
    onMessage: async (message) => { inbound = message; return { text: "ok" }; },
  });
  adapter.credential = { token: "test", ownerId: "owner", contexts: {}, seenIds: [] };
  await adapter.handleInbound({
    message_id: "media-1", message_type: 1, from_user_id: "owner", context_token: "ctx",
    item_list: [
      { type: 1, text_item: { text: "附件" } },
      { type: 2, image_item: { media: { full_url: "https://novac2c.cdn.weixin.qq.com/image" } } },
    ],
  });
  assert.equal(inbound.artifacts[0].mime, "image/png");
  assert.equal(inbound.artifacts[0].autoRead, false);
  assert.equal(sniffMime(png), "image/png");
  await assert.rejects(readLimitedBody(new Response(Buffer.alloc(5)), 4), /超过 10 MB/);
});

test("Weixin decrypts real iLink AES-128-ECB image and file payloads before quarantine", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-encrypted-media-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const key = randomBytes(16);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("encrypted-safe")]);
  const encrypt = (plain) => {
    const cipher = createCipheriv("aes-128-ecb", key, null);
    return Buffer.concat([cipher.update(plain), cipher.final()]);
  };
  const delivered = [];
  let inbound;
  const credentials = { async save() {}, async load() { return null; }, async clear() {} };
  const client = { async sendText(message) { delivered.push(message); return { ret: 0 }; } };
  const responses = [encrypt(png), encrypt(Buffer.from("# Real encrypted file\n"))];
  const adapter = new WeixinIlinkAdapter({
    client,
    credentialStore: credentials,
    quarantineRoot: root,
    fetchImpl: async () => new Response(responses.shift(), { status: 200, headers: { "content-type": "application/octet-stream" } }),
    onMessage: async (message) => { inbound = message; return { text: "ok" }; },
  });
  adapter.credential = { token: "test", ownerId: "owner", contexts: {}, seenIds: [] };

  await adapter.handleInbound({
    message_id: "encrypted-image", message_type: 1, from_user_id: "owner", context_token: "ctx-1",
    item_list: [{ type: 2, image_item: { aeskey: key.toString("hex"), media: { full_url: "https://novac2c.cdn.weixin.qq.com/image" } } }],
  });
  assert.equal(inbound.artifacts[0].mime, "image/png");
  assert.deepEqual(await fs.readFile(inbound.artifacts[0].path), png);

  await adapter.handleInbound({
    message_id: "encrypted-file", message_type: 1, from_user_id: "owner", context_token: "ctx-2",
    item_list: [{ type: 4, file_item: { file_name: "notes.md", media: { aes_key: Buffer.from(key.toString("hex"), "ascii").toString("base64"), full_url: "https://novac2c.cdn.weixin.qq.com/file" } } }],
  });
  assert.equal(inbound.artifacts[0].mime, "text/plain");
  assert.match(path.basename(inbound.artifacts[0].path), /-notes\.md$/);
  assert.equal((await fs.readFile(inbound.artifacts[0].path, "utf8")), "# Real encrypted file\n");
  assert.equal(delivered.length, 2);
  assert.deepEqual(parseAttachmentKey({ image_item: { aeskey: key.toString("hex") } }), key);
  assert.equal(resolveAttachmentUrl({ encrypt_query_param: "signed value" }).toString(), "https://novac2c.cdn.weixin.qq.com/c2c/download?encrypted_query_param=signed+value");
  assert.throws(() => resolveAttachmentUrl({ full_url: "https://example.com/file" }), /allowlist/);
  await assert.rejects(async () => parseAttachmentKey({ file_item: { media: { aes_key: Buffer.from("short").toString("base64") } } }), /AES Key/);
});

test("Weixin quarantined Markdown returns an Artifact receipt without creating a curate Job", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "guide.md");
  await fs.writeFile(file, "# Agent guide\n\nUntrusted attachment body.\n", "utf8");
  const fileSize = (await fs.stat(file)).size;
  const received = [];
  const proposed = [];
  const handler = createWeixinMessageHandler({
    core: { async execute() { throw new Error("attachment must not enter the generic Agent path"); } },
    conversationRouter: { async resolve() { throw new Error("attachment must not resolve a chat conversation"); } },
    ingest: {
      async receive(payload, context) {
        received.push({ payload, context });
        return { artifact: { id: "artifact-attachment-one" }, proposalPending: true };
      },
      async propose(id) { proposed.push(id); return { proposal: { id: "proposal-one" } }; },
    },
    quarantineRoot: root,
  });
  const response = await handler({
    id: "message-file",
    senderId: "owner",
    text: "",
    artifacts: [{ path: file, size: fileSize, mime: "text/plain", isolated: true, autoRead: false }],
  });
  assert.match(response.text, /Artifact ID：artifact-attachment-one/);
  assert.equal(received.length, 1);
  assert.equal(received[0].payload.kind, "txt");
  assert.equal(received[0].payload.name, "guide.md");
  assert.equal(received[0].payload.title, "guide.md");
  assert.equal(Buffer.from(received[0].payload.base64, "base64").toString("utf8"), "# Agent guide\n\nUntrusted attachment body.\n");
  assert.deepEqual(received[0].context, { channel: "weixin", ownerId: "owner" });
  for (let index = 0; index < 10 && !proposed.length; index += 1) await new Promise((resolve) => setTimeout(resolve, 1));
  assert.deepEqual(proposed, ["artifact-attachment-one"]);

  const outsideRoot = await fs.mkdtemp(path.join(tmpdir(), "syno-weixin-outside-"));
  t.after(() => fs.rm(outsideRoot, { recursive: true, force: true }));
  const outsideFile = path.join(outsideRoot, "outside.md");
  await fs.writeFile(outsideFile, "# Outside\n", "utf8");
  const rejected = await handler({
    id: "message-outside",
    senderId: "owner",
    text: "",
    artifacts: [{ path: outsideFile, size: (await fs.stat(outsideFile)).size, mime: "text/plain", isolated: true, autoRead: false }],
  });
  assert.match(rejected.text, /路径超出允许范围/);
  assert.equal(received.length, 1);
});

test("Weixin does not advance cursor or dedupe marker before processing succeeds", async () => {
  let saved = { token: "test", baseUrl: "https://ilinkai.weixin.qq.com/", ownerId: "owner", cursor: "old", contexts: {}, seenIds: [] };
  const credentials = {
    async load() { return structuredClone(saved); },
    async save(value) { saved = structuredClone(value); },
    async clear() {},
  };
  let calls = 0;
  const client = {
    async getUpdates(_cursor, signal) {
      calls += 1;
      if (calls === 1) return { ret: 0, get_updates_buf: "new", msgs: [{ message_id: "fail-1", message_type: 1, from_user_id: "owner", context_token: "ctx", item_list: [{ type: 1, text_item: { text: "fail" } }] }] };
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true }));
    },
    async sendText() { return { ret: 0 }; },
  };
  const processLock = { async acquire() { return true; }, async release() {} };
  const adapter = new WeixinIlinkAdapter({ client, clientFactory: () => client, credentialStore: credentials, processLock, onMessage: async () => { throw new Error("forced"); } });
  await adapter.start();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(saved.cursor, "old");
  assert.deepEqual(saved.seenIds, []);
  await adapter.stop();
});
