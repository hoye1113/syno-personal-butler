import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FakeCalendarAdapter, MarkdownCalendarAdapter } from "../apps/syno/syno/calendar-adapters.mjs";
import { ChannelHub, FakeChannelAdapter } from "../apps/syno/syno/channels.mjs";
import { FeishuChannelAdapter, FeishuCredentialStore, FeishuStateStore } from "../apps/syno/syno/feishu-channel.mjs";
import { parseWeixinApproval } from "../apps/syno/syno/runtime.mjs";
import { Scheduler, occurrenceFor } from "../apps/syno/syno/scheduler.mjs";
import { LocalCredentialStore, LocalProcessLock, normalizeInbound, readLimitedBody, renderLoginQr, sniffMime, validateIlinkBaseUrl, validateLoginQrUrl, WeixinIlinkAdapter } from "../apps/syno/syno/weixin-ilink.mjs";

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
