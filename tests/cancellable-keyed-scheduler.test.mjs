import assert from "node:assert/strict";
import test from "node:test";

import {
  CancellableKeyedScheduler,
  SchedulerCancellationError,
} from "../apps/syno/syno/cancellable-keyed-scheduler.mjs";

test("CancellableKeyedScheduler serializes one key and runs different keys concurrently", async () => {
  const scheduler = new CancellableKeyedScheduler({ name: "session" });
  const events = [];
  let release;
  const first = scheduler.enqueue("a", async () => {
    events.push("a1:start");
    await new Promise((resolve) => { release = resolve; });
    events.push("a1:end");
  });
  const second = scheduler.enqueue("a", async () => events.push("a2"));
  const other = scheduler.enqueue("b", async () => events.push("b1"));
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  await other.promise;
  assert.deepEqual(events, ["a1:start", "b1"]);
  release();
  await Promise.all([first.promise, second.promise]);
  assert.deepEqual(events, ["a1:start", "b1", "a1:end", "a2"]);
});

test("queued cancellation races acquisition with exactly one winner", async () => {
  const scheduler = new CancellableKeyedScheduler();
  let release;
  const first = scheduler.enqueue("one", () => new Promise((resolve) => { release = resolve; }));
  const second = scheduler.enqueue("one", async () => "must-not-run");
  assert.equal(second.cancel(new SchedulerCancellationError()), true);
  assert.equal(second.cancel(), false);
  await assert.rejects(second.promise, { code: "SCHEDULER_CANCELED" });
  release();
  await first.promise;
});

test("blocking a key rejects queued work and prevents later acquisition", async () => {
  const scheduler = new CancellableKeyedScheduler({ name: "session" });
  scheduler.block("unknown", "abort confirmation missing");
  const ticket = scheduler.enqueue("unknown", async () => "must-not-run");
  await assert.rejects(ticket.promise, { code: "SCHEDULER_KEY_BLOCKED" });
  assert.equal(scheduler.status("unknown").blocked, "abort confirmation missing");
});
