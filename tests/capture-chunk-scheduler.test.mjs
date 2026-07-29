import assert from "node:assert/strict";
import test from "node:test";

import { CaptureChunkScheduler, priorityWeight } from "../apps/syno/syno/capture-chunk-scheduler.mjs";

test("CaptureChunkScheduler keeps provider and budget gates ahead of background work", async () => {
  let providerAvailable = false;
  const started = [];
  const scheduler = new CaptureChunkScheduler({ concurrency: 2, reservedCapacity: 1, providerAvailable: () => providerAvailable, budget: 2 });
  const blocked = scheduler.enqueue({ id: "background", priority: "background", run: async () => { started.push("background"); } });
  await Promise.resolve();
  assert.deepEqual(started, []);
  providerAvailable = true;
  const foreground = scheduler.enqueue({ id: "foreground", priority: "foreground", run: async () => { started.push("foreground"); } });
  await Promise.all([blocked, foreground]);
  assert.deepEqual(started, ["foreground", "background"]);
  assert.equal(scheduler.snapshot().budgetRemaining, 0);
  assert.ok(priorityWeight("foreground") > priorityWeight("background"));
});

test("CaptureChunkScheduler aging prevents a queued background chunk from starving", async () => {
  let now = 0;
  const started = [];
  const scheduler = new CaptureChunkScheduler({ concurrency: 1, reservedCapacity: 0, clock: () => new Date(now) });
  const first = scheduler.enqueue({ id: "first", priority: "foreground", run: async () => { started.push("first"); } });
  await first;
  now = 10 * 60_000;
  const background = scheduler.enqueue({ id: "background", priority: "background", run: async () => { started.push("background"); } });
  const second = scheduler.enqueue({ id: "second", priority: "foreground", run: async () => { started.push("second"); } });
  await Promise.all([background, second]);
  assert.deepEqual(started, ["first", "second", "background"]);
});

test("CaptureChunkScheduler rejects work that cannot fit the remaining budget", async () => {
  const scheduler = new CaptureChunkScheduler({ budget: 1 });
  await assert.rejects(
    scheduler.enqueue({ id: "too-expensive", cost: 2, run: async () => {} }),
    { code: "CAPTURE_BUDGET_EXCEEDED" },
  );
});
