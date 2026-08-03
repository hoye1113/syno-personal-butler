import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelDeliveryOutbox } from "../apps/syno/syno/channel-delivery-outbox.mjs";

async function fixture(options = {}) {
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
    ...options,
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
  const unknownEvents = [];
  const unknownReport = await outbox.deliverDue(
    async () => ({ deliveryUnknown: true, reason: "SEND_TIMEOUT" }),
    { onDeliveryUnknown: async (event) => unknownEvents.push([event.status, event.lastErrorCode]) },
  );
  assert.equal(unknownReport.unknown, 1);
  assert.deepEqual(unknownEvents, [["delivery_unknown", "SEND_TIMEOUT"]]);
  assert.equal((await outbox.get(unknown.event.eventId)).status, "delivery_unknown");
  assert.equal((await outbox.get(blocked.event.eventId)).status, "pending");
  const immediateRetry = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(immediateRetry.delivered, 0);
});

test("a persistently failing earlier event does not starve a later Final", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const ack = await outbox.enqueue({ ...base, responseKind: "ack", responseVersion: 1, deliveryKey: "starve-ack", payload: { text: "ACK" }, dueAt: clockState.now.toISOString() });
  // The ACK persistently fails and backs off into the future.
  const failedReport = await outbox.deliverDue(async () => ({ retryable: true, reason: "NETWORK" }));
  assert.equal(failedReport.retryable, 1);
  assert.equal((await outbox.get(ack.event.eventId)).status, "failed_retryable");

  const final = await outbox.enqueue({ ...base, responseKind: "final", responseVersion: 2, deliveryKey: "starve-final", payload: { text: "FINAL" }, dueAt: clockState.now.toISOString() });
  // The Final is due now and must not be held back by the failed_retryable ACK.
  const finalReport = await outbox.deliverDue(async (_payload, event) => event.responseKind === "final" ? { delivered: true } : { retryable: true, reason: "NETWORK" });
  assert.equal(finalReport.delivered, 1);
  assert.equal((await outbox.get(final.event.eventId)).status, "delivered");
  assert.equal((await outbox.get(ack.event.eventId)).status, "failed_retryable");
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

test("an expired claimed event is reclaimed after a process crash", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    ...base,
    sourceId: "request-crashed-claim",
    responseKind: "final",
    deliveryKey: "crashed-claim-1",
    payload: { text: "RECOVER ME" },
    dueAt: clockState.now.toISOString(),
  });
  const file = path.join(root, "channel-outbox", `${created.event.eventId}.json`);
  const crashed = JSON.parse(await fs.readFile(file, "utf8"));
  crashed.status = "claimed";
  crashed.claim = {
    leaseId: "dead-process",
    workerId: "outbox-dead",
    claimedAt: clockState.now.toISOString(),
    leaseExpiresAt: new Date(clockState.now.getTime() + 30_000).toISOString(),
  };
  await fs.writeFile(file, `${JSON.stringify(crashed, null, 2)}\n`);
  clockState.now = new Date(clockState.now.getTime() + 60_000);

  let sends = 0;
  const report = await outbox.deliverDue(async () => {
    sends += 1;
    return { delivered: true };
  });

  assert.equal(sends, 1);
  assert.equal(report.delivered, 1);
  assert.equal((await outbox.get(created.event.eventId)).status, "delivered");
});

test("delivery completion hook runs only after delivered is durably recorded", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    ...base,
    sourceId: "request-after-delivered",
    responseKind: "final",
    deliveryKey: "after-delivered-1",
    payload: { text: "COMMIT FIRST" },
    dueAt: clockState.now.toISOString(),
  });
  const observed = [];
  await outbox.deliverDue(
    async () => ({ delivered: true }),
    {
      async onDelivered(event) {
        observed.push((await outbox.get(event.eventId)).status);
      },
    },
  );
  assert.deepEqual(observed, ["delivered"]);
  assert.equal((await outbox.get(created.event.eventId)).status, "delivered");
});

test("a failed delivered projection retries without sending the channel message again", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    ...base,
    sourceId: "request-projection-retry",
    responseKind: "final",
    deliveryKey: "projection-retry-1",
    payload: { text: "SEND ONCE" },
    dueAt: clockState.now.toISOString(),
  });
  let sends = 0;
  let projections = 0;
  const first = await outbox.deliverDue(
    async () => { sends += 1; return { delivered: true }; },
    {
      async onDelivered() {
        projections += 1;
        throw Object.assign(new Error("projection failed"), { code: "PROJECTION_FAILED" });
      },
    },
  );
  assert.equal(first.projectionFailed, 1);
  assert.equal((await outbox.get(created.event.eventId)).status, "delivered");

  clockState.now = new Date(clockState.now.getTime() + 31_000);
  const second = await outbox.deliverDue(
    async () => { sends += 1; return { delivered: true }; },
    { async onDelivered() { projections += 1; } },
  );
  assert.equal(sends, 1);
  assert.equal(projections, 2);
  assert.equal(second.projected, 1);
  assert.ok((await outbox.get(created.event.eventId)).projectedAt);
});

test("an authenticated Home target update makes target-blocked proactive delivery due immediately", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "proactive-target-wakeup",
    ownerKey: "owner-a",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "proactive-target-wakeup:weixin:v1",
    payload: { text: "WAIT FOR TARGET" },
    dueAt: clockState.now.toISOString(),
  });
  await outbox.deliverDue(async () => ({ retryable: true, reason: "CHANNEL_TARGET_MISSING" }));
  assert.equal((await outbox.get(created.event.eventId)).status, "failed_retryable");

  const awakened = await outbox.wakeTarget("owner-a", "weixin");
  assert.equal(awakened, 1);
  const report = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(report.delivered, 1);
  assert.equal((await outbox.get(created.event.eventId)).status, "delivered");
});

test("delivery policy can pause proactive events without blocking ordinary mobile replies", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const proactive = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "proactive-paused",
    ownerKey: "owner-a",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "proactive-paused:weixin:v1",
    payload: { text: "DO NOT SEND YET" },
    dueAt: clockState.now.toISOString(),
  });
  const ordinary = await outbox.enqueue({
    ...base,
    sourceId: "request-unblocked",
    responseKind: "final",
    deliveryKey: "ordinary-unblocked",
    payload: { text: "SEND ORDINARY" },
    dueAt: clockState.now.toISOString(),
  });
  const sent = [];
  const report = await outbox.deliverDue(
    async (_payload, event) => { sent.push(event.eventId); return { delivered: true }; },
    { shouldDeliver: async (event) => event.sourceType !== "proactive_bundle" },
  );

  assert.deepEqual(sent, [ordinary.event.eventId]);
  assert.equal(report.delivered, 1);
  assert.equal((await outbox.get(proactive.event.eventId)).status, "pending");
  assert.equal((await outbox.get(proactive.event.eventId)).attempts, 0);
});

test("enqueue cancellation is checked inside the Outbox lock before any durable write", async (t) => {
  const { root, outbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let checks = 0;
  const result = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "proactive-stopped",
    ownerKey: "owner-a",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "proactive-stopped:weixin:v1",
    payload: { text: "MUST NOT PERSIST" },
    shouldEnqueue: async () => {
      checks += 1;
      return false;
    },
  });

  assert.equal(checks, 1);
  assert.equal(result.skipped, true);
  assert.equal(result.event, null);
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
});

test("Home cutover supersedes every nonterminal proactive event for the old target", async (t) => {
  const { root, outbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const old = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "old-home-bundle",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "old-home-bundle:weixin:v1",
    payload: { text: "OLD HOME" },
  });
  const current = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "new-home-bundle",
    ownerKey: "local-user",
    targetChannel: "feishu",
    responseKind: "proactive",
    deliveryKey: "new-home-bundle:feishu:v1",
    payload: { text: "NEW HOME" },
  });

  assert.equal(await outbox.supersedeProactiveTarget("local-user", "weixin"), 1);
  assert.equal((await outbox.get(old.event.eventId)).status, "superseded");
  assert.equal((await outbox.get(current.event.eventId)).status, "pending");
});

test("Home cutover waits for an in-flight old-target send and fences later sends", async (t) => {
  const { root, outbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "old-home-in-flight",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "old-home-in-flight:weixin:v1",
    payload: { text: "IN FLIGHT" },
  });
  let sendStarted;
  let releaseSend;
  const started = new Promise((resolve) => { sendStarted = resolve; });
  const sending = new Promise((resolve) => { releaseSend = resolve; });
  const drain = outbox.deliverDue(async () => {
    sendStarted();
    await sending;
    return { delivered: true };
  });
  await started;

  let cutoverResolved = false;
  const cutoverPromise = outbox.beginProactiveTargetCutover("local-user", "weixin").then((value) => {
    cutoverResolved = true;
    return value;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cutoverResolved, false);
  releaseSend();
  await drain;
  const cutover = await cutoverPromise;
  assert.equal((await outbox.get(first.event.eventId)).status, "delivered");

  const later = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "old-home-later",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "old-home-later:weixin:v1",
    payload: { text: "LATER" },
  });
  let laterSends = 0;
  await outbox.deliverDue(async () => { laterSends += 1; return { delivered: true }; });
  assert.equal(laterSends, 0);
  cutover.release();
  assert.equal((await outbox.get(later.event.eventId)).status, "pending");
});

test("a superseded in-flight claim cannot overwrite its terminal status", async (t) => {
  const { root, outbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "old-home-cas",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "old-home-cas:weixin:v1",
    payload: { text: "CAS" },
  });
  let sendStarted;
  let releaseSend;
  const started = new Promise((resolve) => { sendStarted = resolve; });
  const sending = new Promise((resolve) => { releaseSend = resolve; });
  const drain = outbox.deliverDue(async () => {
    sendStarted();
    await sending;
    return { delivered: true };
  });
  await started;
  await outbox.supersedeProactiveTarget("local-user", "weixin");
  releaseSend();
  const report = await drain;

  assert.equal(report.delivered, 0);
  assert.equal(report.superseded, 1);
  assert.equal((await outbox.get(created.event.eventId)).status, "superseded");
});

test("cutover between lease acquisition and claimed commit prevents the old-target send", async (t) => {
  let claimReached;
  let releaseClaim;
  const reached = new Promise((resolve) => { claimReached = resolve; });
  const held = new Promise((resolve) => { releaseClaim = resolve; });
  const { root, outbox } = await fixture({
    beforeClaimCommit: async () => {
      claimReached();
      await held;
    },
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "old-home-pre-claim",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "old-home-pre-claim:weixin:v1",
    payload: { text: "PRE CLAIM" },
  });
  let sends = 0;
  const drain = outbox.deliverDue(async () => {
    sends += 1;
    return { delivered: true };
  });
  await reached;
  const cutover = await outbox.beginProactiveTargetCutover("local-user", "weixin");
  releaseClaim();
  await drain;

  assert.equal(sends, 0);
  assert.equal((await outbox.get(created.event.eventId)).status, "superseded");
  cutover.release();
});

test("onFailedRetryable and onFailedTerminal hooks receive the settled record", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const retryable = await outbox.enqueue({ ...base, sourceId: "request-retryable-hook", responseKind: "final", deliveryKey: "hook-retryable", payload: { text: "RETRYABLE" }, dueAt: clockState.now.toISOString() });
  const retryableEvents = [];
  await outbox.deliverDue(
    async () => ({ retryable: true, reason: "NETWORK" }),
    { onFailedRetryable: async (event) => retryableEvents.push([event.status, event.lastErrorCode, Number(event.attempts || 0)]) },
  );
  assert.deepEqual(retryableEvents, [["failed_retryable", "NETWORK", 1]]);
  assert.equal((await outbox.get(retryable.event.eventId)).status, "failed_retryable");

  const terminal = await outbox.enqueue({ ...base, sourceId: "request-terminal-hook", responseKind: "final", deliveryKey: "hook-terminal", payload: { text: "TERMINAL" }, dueAt: clockState.now.toISOString() });
  const terminalEvents = [];
  await outbox.deliverDue(
    async (_payload, event) => event.sourceId === "request-terminal-hook" ? { retryable: false, reason: "WRONG_CHANNEL" } : { delivered: true },
    { onFailedTerminal: async (event) => terminalEvents.push([event.status, event.lastErrorCode, event.sourceId]) },
  );
  assert.deepEqual(terminalEvents, [["failed_terminal", "WRONG_CHANNEL", "request-terminal-hook"]]);
  assert.equal((await outbox.get(terminal.event.eventId)).status, "failed_terminal");
});

test("list order desc returns the newest records within a small limit (R2)", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const ids = [];
  for (let i = 0; i < 3; i += 1) {
    clockState.now = new Date(clockState.now.getTime() + 60_000);
    const enqueued = await outbox.enqueue({ ...base, sourceId: `r2-${i}`, responseKind: "final", deliveryKey: `r2-${i}`, payload: { text: `R2-${i}` }, dueAt: clockState.now.toISOString() });
    ids.push(enqueued.event.eventId);
  }
  // oldest-first (default) with limit 2 returns the two OLDEST; desc returns the two NEWEST.
  const asc = await outbox.list({ limit: 2 });
  const desc = await outbox.list({ limit: 2, order: "desc" });
  assert.deepEqual(asc.map((item) => item.eventId), [ids[0], ids[1]]);
  assert.deepEqual(desc.map((item) => item.eventId), [ids[2], ids[1]]);
});

test("retain evicts old terminal records but keeps recent terminal and non-terminal (R7)", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const t0 = clockState.now.getTime();
  // Old delivered record (will age past the retention window).
  const oldDelivered = await outbox.enqueue({ ...base, sourceId: "r7-old", responseKind: "final", deliveryKey: "r7-old", payload: { text: "OLD" }, dueAt: clockState.now.toISOString() });
  await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal((await outbox.get(oldDelivered.event.eventId)).status, "delivered");
  // Advance well past the 14-day window, then add a pending + a fresh delivered record.
  clockState.now = new Date(t0 + 20 * 86_400_000);
  const pending = await outbox.enqueue({ ...base, sourceId: "r7-pending", responseKind: "final", deliveryKey: "r7-pending", payload: { text: "PENDING" }, dueAt: clockState.now.toISOString() });
  const freshDelivered = await outbox.enqueue({ ...base, sourceId: "r7-fresh", responseKind: "final", deliveryKey: "r7-fresh", payload: { text: "FRESH" }, dueAt: clockState.now.toISOString() });
  await outbox.deliverDue(
    async () => ({ delivered: true }),
    { shouldDeliver: async (event) => event.sourceId === "r7-fresh" },
  );
  assert.equal((await outbox.get(freshDelivered.event.eventId)).status, "delivered");
  assert.equal((await outbox.get(pending.event.eventId)).status, "pending");

  const result = await outbox.retain({ now: clockState.now, maxAgeMs: 14 * 86_400_000 });
  assert.equal(result.removed, 1);
  // evicted terminal record: get() throws ENOENT for a deleted file
  await assert.rejects(() => outbox.get(oldDelivered.event.eventId), (error) => error.code === "ENOENT");
  assert.equal((await outbox.get(freshDelivered.event.eventId)).status, "delivered");     // kept (recent terminal)
  assert.equal((await outbox.get(pending.event.eventId)).status, "pending");              // kept (non-terminal)
});

test("a throwing delivery hook does not abort the rest of the drain batch (O8)", async (t) => {
  const { root, outbox, clockState } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await outbox.enqueue({ ...base, sourceId: "o8-a", responseKind: "final", deliveryKey: "o8-a", payload: { text: "A" }, dueAt: clockState.now.toISOString() });
  await outbox.enqueue({ ...base, sourceId: "o8-b", responseKind: "final", deliveryKey: "o8-b", payload: { text: "B" }, dueAt: clockState.now.toISOString() });
  // The hook throws on every call; both events must still settle and the drain must resolve.
  const report = await outbox.deliverDue(
    async () => ({ retryable: true, reason: "NETWORK" }),
    { onFailedRetryable: async () => { throw new Error("hook blew up"); } },
  );
  assert.equal(report.retryable, 2);
});
