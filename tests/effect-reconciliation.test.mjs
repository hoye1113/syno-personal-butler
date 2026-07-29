import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { EffectReconciliationCaseStore } from "../apps/syno/syno/effect-reconciliation-case-store.mjs";
import { EffectReconciliationWorker } from "../apps/syno/syno/effect-reconciliation-worker.mjs";

async function cleanup(root) { await fs.rm(root, { recursive: true, force: true }); }

function makeStore(root, clock) {
  return new EffectReconciliationCaseStore({ root, lockFile: path.join(root, "..", "cases.lock"), leaseMs: 1_000, clock });
}

test("Unknown Case separates Owner and System resolutions and claims atomically", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-case-"));
  t.after(() => cleanup(root));
  let now = new Date("2026-07-29T00:00:00.000Z");
  const store = makeStore(root, () => now);
  const opened = await store.open({ toolInvocationKey: "invocation-unknown", toolName: "settings.adjust", ownerKey: "owner", lastErrorCode: "TRANSPORT_TIMEOUT" });
  const duplicate = await store.open({ toolInvocationKey: "invocation-unknown", toolName: "settings.adjust", ownerKey: "owner", lastErrorCode: "OTHER" });
  assert.equal(opened.created, true);
  assert.equal(duplicate.created, false);
  const first = await store.claim(opened.case.caseId, { workerId: "worker-a", now });
  const second = await store.claim(opened.case.caseId, { workerId: "worker-b", now });
  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
  const owner = await store.resolveOwner(opened.case.caseId, { result: "confirmed_not_started", resolvedBy: "owner" });
  assert.equal(owner.ownerResolution.source, "owner");
  assert.equal(owner.ownerResolution.result, "confirmed_not_started");
  assert.equal(owner.status, "open");
  now = new Date("2026-07-29T00:00:00.001Z");
  const resolved = await store.resolveSystem(opened.case.caseId, { result: "confirmed_committed", readOnly: true });
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.ownerResolution.result, "confirmed_not_started");
  assert.equal(resolved.systemResolution.source, "system");
});

test("Reconciliation Worker only calls the supplied read-only function and backs off unresolved cases", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-worker-"));
  t.after(() => cleanup(root));
  const store = makeStore(root, () => new Date("2026-07-29T00:00:00.000Z"));
  const opened = await store.open({ toolInvocationKey: "invocation-worker", toolName: "job.create", ownerKey: "owner" });
  const calls = [];
  const worker = new EffectReconciliationWorker({ store, workerId: "worker-1", reconcileReadOnly: async (candidate) => { calls.push(candidate.toolInvocationKey); return { resolved: false, errorCode: "NOT_VISIBLE" }; } });
  const first = await worker.runOnce();
  assert.deepEqual(calls, ["invocation-worker"]);
  assert.equal(first[0].resolved, false);
  const current = await store.get(opened.case.caseId);
  assert.equal(current.status, "open");
  assert.equal(current.lastErrorCode, "NOT_VISIBLE");
  assert.ok(current.nextReconcileAt);
  assert.equal(current.attempts, 1);
});

test("Owner-confirmed not-started reconciliation never reuses the old invocation key", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-owner-"));
  t.after(() => cleanup(root));
  const store = makeStore(root, () => new Date("2026-07-29T00:00:00.000Z"));
  const opened = await store.open({ toolInvocationKey: "old-invocation", toolName: "job.create", ownerKey: "owner" });
  const resolved = await store.resolveOwner(opened.case.caseId, { result: "confirmed_not_started" });
  assert.equal(resolved.ownerResolution.result, "confirmed_not_started");
  assert.notEqual("new-invocation", resolved.toolInvocationKey);
});
