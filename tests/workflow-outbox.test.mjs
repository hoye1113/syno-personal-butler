import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { WorkflowOutbox } from "../apps/syno/syno/workflow-outbox.mjs";

test("WorkflowOutbox is idempotent and retries undelivered workflow events", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-outbox-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });

  const first = await outbox.enqueue({
    workflowId: "workflow-1",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    threadKey: "main",
    redactedPayload: { text: "方案已准备好" },
    idempotencyKey: "workflow-1:proposal:abc",
  });
  const duplicate = await outbox.enqueue({
    workflowId: "workflow-1",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    threadKey: "main",
    redactedPayload: { text: "方案已准备好" },
    idempotencyKey: "workflow-1:proposal:abc",
  });
  assert.equal(duplicate.eventId, first.eventId);

  const failed = await outbox.deliverDue(async () => ({ delivered: false, reason: "offline" }));
  assert.equal(failed.failed, 1);
  assert.equal((await outbox.list())[0].attempts, 1);

  now = new Date("2026-07-28T00:01:00.000Z");
  const delivered = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(delivered.delivered, 1);
  assert.equal((await outbox.list({ includeDelivered: false })).length, 0);
});

test("WorkflowOutbox accepts only a bounded redacted text payload", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-outbox-safe-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outbox = new WorkflowOutbox({ root });
  const base = {
    workflowId: "workflow-safe",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "方案已准备" },
  };
  await outbox.enqueue(base);
  await assert.rejects(
    outbox.enqueue({ ...base, idempotencyKey: "raw", redactedPayload: { text: "ok", sourceBody: "secret" } }),
    /redactedPayload/,
  );
  const redacted = await outbox.enqueue({ ...base, idempotencyKey: "secret", redactedPayload: { text: "api_key = super-secret" } });
  assert.doesNotMatch(redacted.redactedPayload.text, /super-secret/);
});

test("WorkflowOutbox grants one durable delivery lease across instances", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-outbox-lease-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = new WorkflowOutbox({ root });
  const second = new WorkflowOutbox({ root });
  await first.enqueue({
    workflowId: "workflow-lease",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "方案已准备" },
  });

  let releaseFirst;
  const release = new Promise((resolve) => { releaseFirst = resolve; });
  let firstStarted;
  const started = new Promise((resolve) => { firstStarted = resolve; });
  const deliveredEvents = [];
  const firstDrain = first.deliverDue(async (event) => {
    deliveredEvents.push(event.eventId);
    firstStarted();
    await release;
    return { delivered: true };
  });
  await started;

  const secondResult = await second.deliverDue(async (event) => {
    deliveredEvents.push(event.eventId);
    return { delivered: true };
  });
  releaseFirst();
  await firstDrain;

  assert.equal(secondResult.processed, 0);
  assert.equal(deliveredEvents.length, 1);
});
