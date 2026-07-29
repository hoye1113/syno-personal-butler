import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelDeliveryOutbox } from "../apps/syno/syno/channel-delivery-outbox.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-channel-outbox-"));
  const protect = async (value) => `ciphertext:${Buffer.from(value, "utf8").toString("base64")}`;
  const unprotect = async (value) => Buffer.from(String(value).replace(/^ciphertext:/, ""), "base64").toString("utf8");
  const clockState = { now: new Date("2026-07-29T00:00:00.000Z") };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "channel-outbox"),
    payloadRoot: path.join(root, "channel-outbox-payloads"),
    lockFile: path.join(root, "locks", "channel-outbox.lock"),
    clock: () => clockState.now,
    protect,
    unprotect,
  });
  return { root, outbox, clockState };
}

const base = {
  sourceType: "accepted_request",
  sourceId: "request-1",
  ownerKey: "owner-a",
  targetChannel: "weixin",
};

test("ChannelDeliveryOutbox atomically deduplicates identity and encrypts payload", async (t) => {
  const { root, outbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = await outbox.enqueue({ ...base, responseKind: "final", deliveryKey: "delivery-1", payload: { text: "PRIVATE FINAL" }, dueAt: "2026-07-29T00:00:00.000Z" });
  const duplicate = await outbox.enqueue({ ...base, responseKind: "final", deliveryKey: "delivery-1", payload: { text: "PRIVATE FINAL" }, dueAt: "2026-07-29T00:00:00.000Z" });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.event.eventId, first.event.eventId);
  await assert.rejects(outbox.enqueue({ ...base, responseKind: "final", deliveryKey: "delivery-1", payload: { text: "CHANGED" } }), { code: "DELIVERY_IDENTITY_CONFLICT" });
  const metadata = await fs.readFile(path.join(root, "channel-outbox", `${first.event.eventId}.json`), "utf8");
  assert.doesNotMatch(metadata, /PRIVATE FINAL/);
  assert.equal((await outbox.get(first.event.eventId, { includePayload: true })).payload.text, "PRIVATE FINAL");
});

test("ChannelDeliveryOutbox restores the encrypted delivery target only at delivery time", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const event = await outbox.enqueue({
    ...base,
    responseKind: "final",
    deliveryKey: "target-1",
    deliveryTargetRef: { toUserId: "owner", contextToken: "ctx" },
    payload: { text: "TARGETED" },
    dueAt: clockState.now.toISOString(),
  });
  const delivered = [];
  await outbox.deliverDue(async (payload, record) => {
    delivered.push({ payload, target: record.deliveryTarget });
    return { delivered: true };
  });
  assert.deepEqual(delivered, [{ payload: { text: "TARGETED" }, target: { toUserId: "owner", contextToken: "ctx" } }]);
});

test("ACK and progress receive timing defaults while final supersedes unsent noise", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const ack = await outbox.enqueue({ ...base, responseKind: "ack", deliveryKey: "ack-1", payload: { text: "ACK" } });
  const progress = await outbox.enqueue({ ...base, responseKind: "progress", deliveryKey: "progress-1", payload: { text: "PROGRESS" } });
  const final = await outbox.enqueue({ ...base, responseKind: "final", deliveryKey: "final-1", payload: { text: "FINAL" } });
  assert.equal(new Date(ack.event.dueAt).getTime(), clockState.now.getTime() + 750);
  assert.equal(new Date(progress.event.dueAt).getTime() >= clockState.now.getTime() + 10_000, true);
  assert.equal((await outbox.get(ack.event.eventId)).status, "superseded");
  assert.equal((await outbox.get(progress.event.eventId)).status, "superseded");
  assert.equal((await outbox.get(final.event.eventId)).status, "pending");
});

test("delivery follows responseVersion order and never advances past an unknown event", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const ack = await outbox.enqueue({ ...base, responseKind: "ack", responseVersion: 1, deliveryKey: "ack-ordered", payload: { text: "ACK" }, dueAt: clockState.now.toISOString() });
  const progress = await outbox.enqueue({ ...base, responseKind: "progress", responseVersion: 2, deliveryKey: "progress-ordered", payload: { text: "PROGRESS" }, dueAt: clockState.now.toISOString() });
  const sent = [];
  const firstReport = await outbox.deliverDue(async (payload, event) => {
    sent.push(event.responseVersion);
    return { delivered: true, id: payload.text };
  });
  assert.deepEqual(sent, [1, 2]);
  assert.equal(firstReport.delivered, 2);
  assert.equal((await outbox.get(ack.event.eventId)).status, "delivered");
  assert.equal((await outbox.get(progress.event.eventId)).status, "delivered");

  const unknown = await outbox.enqueue({ ...base, sourceId: "request-2", responseKind: "final", deliveryKey: "unknown-1", payload: { text: "UNKNOWN" }, dueAt: clockState.now.toISOString() });
  const blocked = await outbox.enqueue({ ...base, sourceId: "request-2", responseKind: "recovery", deliveryKey: "blocked-1", payload: { text: "RECOVERY" }, dueAt: clockState.now.toISOString() });
  const unknownReport = await outbox.deliverDue(async () => ({ deliveryUnknown: true, reason: "SEND_TIMEOUT" }));
  assert.equal(unknownReport.unknown, 1);
  assert.equal((await outbox.get(unknown.event.eventId)).status, "delivery_unknown");
  assert.equal((await outbox.get(blocked.event.eventId)).status, "pending");
  const immediateRetry = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(immediateRetry.delivered, 0);
});

test("failed retryable delivery backs off and terminal failure does not retry", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const retry = await outbox.enqueue({ ...base, sourceId: "request-retry", responseKind: "final", deliveryKey: "retry-1", payload: { text: "RETRY" }, dueAt: clockState.now.toISOString() });
  const report = await outbox.deliverDue(async () => ({ retryable: true, reason: "NETWORK" }));
  assert.equal(report.retryable, 1);
  const retryRecord = await outbox.get(retry.event.eventId);
  assert.equal(retryRecord.status, "failed_retryable");
  assert.ok(new Date(retryRecord.dueAt).getTime() > clockState.now.getTime());

  const terminal = await outbox.enqueue({ ...base, sourceId: "request-terminal", responseKind: "final", deliveryKey: "terminal-1", payload: { text: "TERMINAL" }, dueAt: clockState.now.toISOString() });
  const terminalReport = await outbox.deliverDue(async (_payload, event) => event.sourceId === "request-terminal" ? { retryable: false, reason: "WRONG_CHANNEL" } : { delivered: true });
  assert.equal(terminalReport.terminal, 1);
  assert.equal((await outbox.get(terminal.event.eventId)).status, "failed_terminal");
});
