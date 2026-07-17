import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { FakeCalendarAdapter, MarkdownCalendarAdapter } from "../apps/syno/syno/calendar-adapters.mjs";
import { ChannelHub, FakeChannelAdapter } from "../apps/syno/syno/channels.mjs";
import { parseWeixinApproval } from "../apps/syno/syno/runtime.mjs";
import { Scheduler, occurrenceFor } from "../apps/syno/syno/scheduler.mjs";
import { normalizeInbound, validateIlinkBaseUrl, WeixinIlinkAdapter } from "../apps/syno/syno/weixin-ilink.mjs";

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
