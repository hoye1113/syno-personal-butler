import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FakeCalendarAdapter, MarkdownCalendarAdapter } from "../apps/syno/syno/calendar-adapters.mjs";
import { ChannelHub, FakeChannelAdapter } from "../apps/syno/syno/channels.mjs";
import { parseWeixinApproval } from "../apps/syno/syno/runtime.mjs";
import { Scheduler, occurrenceFor } from "../apps/syno/syno/scheduler.mjs";
import { LocalProcessLock, normalizeInbound, readLimitedBody, sniffMime, validateIlinkBaseUrl, WeixinIlinkAdapter } from "../apps/syno/syno/weixin-ilink.mjs";

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
    async getQrCode() { return { ret: 0, qrcode: "qr", qrcode_img_content: "https://example.invalid/qr" }; },
    async getQrStatus() { return { status: "confirmed", bot_token: "test-token", ilink_user_id: "owner" }; },
  };
  let saved;
  const credentials = { async save(value) { saved = value; }, async load() { return null; }, async clear() {} };
  const adapter = new WeixinIlinkAdapter({ client, credentialStore: credentials });
  assert.equal((await adapter.beginLogin()).qrcode, "qr");
  assert.equal((await adapter.pollLogin()).status, "confirmed");
  assert.equal(saved.ownerId, "owner");
  assert.throws(() => validateIlinkBaseUrl("https://attacker.example/api"), /官方域名/);
});

test("Weixin approval commands are parsed deterministically", () => {
  assert.deepEqual(parseWeixinApproval("批准 job-20260717-a1b2c3d4 0f12ab"), {
    jobId: "job-20260717-a1b2c3d4",
    code: "0F12AB",
  });
  assert.equal(parseWeixinApproval("批准全部任务"), null);
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
