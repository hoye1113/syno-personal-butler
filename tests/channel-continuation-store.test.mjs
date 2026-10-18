import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelContinuationStore } from "../packages/syno-core/channel-continuation-store.mjs";

test("ChannelContinuationStore encrypts payload and isolates owner/channel/thread", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-continuation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-09-22T06:00:00Z");
  const store = new ChannelContinuationStore({
    root: path.join(root, "meta"), payloadRoot: path.join(root, "payload"), lockFile: path.join(root, "lock"),
    clock: () => now, protect: async (value) => Buffer.from(value, "utf8").toString("base64"), unprotect: async (value) => Buffer.from(value, "base64").toString("utf8"),
  });
  const opened = await store.open({ ownerKey: "owner-a", channel: "weixin", threadKey: "main", type: "link_read", correlationId: "message-1", expiresAt: new Date(now.getTime() + 60_000), payload: { url: "https://example.test/private?token=nope" } });
  const metadata = await fs.readFile(path.join(root, "meta", `${opened.id}.json`), "utf8");
  assert.doesNotMatch(metadata, /example\.test|token/);
  assert.equal((await store.resolve({ ownerKey: "owner-b", channel: "weixin", threadKey: "main", type: "link_read" })), null);
  assert.equal((await store.resolve({ ownerKey: "owner-a", channel: "weixin", threadKey: "other", type: "link_read" })), null);
  assert.equal((await store.resolve({ ownerKey: "owner-a", channel: "weixin", threadKey: "main", type: "link_read" })).payload.url, "https://example.test/private?token=nope");
  now = new Date(now.getTime() + 61_000);
  assert.equal(await store.resolve({ ownerKey: "owner-a", channel: "weixin", threadKey: "main", type: "link_read" }), null);
  // 惰性结案会落盘 expired 状态，不会悄悄复活。
  const tombstoned = JSON.parse(await fs.readFile(path.join(root, "meta", `${opened.id}.json`), "utf8"));
  assert.equal(tombstoned.status, "expired");
});

test("ChannelContinuationStore settles a record out of the active set and keeps it unreadable", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-continuation-settle-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ChannelContinuationStore({
    root: path.join(root, "meta"), payloadRoot: path.join(root, "payload"), lockFile: path.join(root, "lock"),
    clock: () => new Date("2026-09-22T06:00:00Z"),
    protect: async (value) => Buffer.from(value, "utf8").toString("base64"), unprotect: async (value) => Buffer.from(value, "base64").toString("utf8"),
  });
  const opened = await store.open({
    ownerKey: "owner-a", channel: "weixin", threadKey: "main", type: "link_read",
    correlationId: "inspiration-20260922-abcdef12", expiresAt: new Date("2026-09-23T06:00:00Z"), payload: { inspirationId: "inspiration-20260922-abcdef12" },
  });
  const settled = await store.settle(opened.id, { status: "resolved" });
  assert.equal(settled.status, "resolved");
  assert.equal(await store.resolve({ ownerKey: "owner-a", channel: "weixin", threadKey: "main", type: "inspiration_feedback" }), null);
  // 结案状态持久化在 metadata 里，重启后依然不命中。
  const persisted = JSON.parse(await fs.readFile(path.join(root, "meta", `${opened.id}.json`), "utf8"));
  assert.equal(persisted.status, "resolved");
  assert.equal(persisted.correlationId, "inspiration-20260922-abcdef12");
});

test("temporary attachment replacement and expiry remove encrypted payloads without affecting link continuations", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-attachment-retention-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-10-18T00:00:00Z");
  const payloadRoot = path.join(root, "payloads");
  const store = new ChannelContinuationStore({ root: path.join(root, "records"), payloadRoot, lockFile: path.join(root, "lock"), clock: () => now, protect: async (text) => Buffer.from(text).toString("base64"), unprotect: async (text) => Buffer.from(text, "base64").toString("utf8") });
  const input = { ownerKey: "owner", channel: "feishu", threadKey: "main", expiresAt: "2026-10-19T00:00:00Z" };
  const link = await store.open({ ...input, type: "link_read", payload: { url: "https://example.com" } });
  const old = await store.open({ ...input, type: "chat_attachments", payload: { attachments: ["old"] } });
  const current = await store.open({ ...input, type: "chat_attachments", payload: { attachments: ["current"] } });
  await assert.rejects(fs.access(path.join(payloadRoot, `${old.id}.dpapi`)), { code: "ENOENT" });
  assert.deepEqual((await store.resolve({ ...input, type: "chat_attachments" })).payload.attachments, ["current"]);
  now = new Date("2026-10-20T00:00:00Z");
  assert.equal(await store.resolve({ ...input, type: "chat_attachments" }), null);
  await assert.rejects(fs.access(path.join(payloadRoot, `${current.id}.dpapi`)), { code: "ENOENT" });
  await fs.access(path.join(payloadRoot, `${link.id}.dpapi`));
});
