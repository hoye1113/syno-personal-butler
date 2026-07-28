import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { DECISION_RESERVATION_TTL_MS, PendingDecisionStore } from "../apps/syno/syno/pending-decision.mjs";

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-pending-decision-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T08:00:00.000Z");
  return {
    store: new PendingDecisionStore({ file: path.join(root, "pending.json"), clock: () => now }),
    advance(ms) { now = new Date(now.getTime() + ms); },
  };
}

test("one bound low-risk decision accepts natural confirmation and rejects cross-owner replay", async (t) => {
  const { store } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-12345678",
    ownerKey: "owner-1",
    threadKey: "main",
    kind: "single",
    phase: "execution",
    summary: "收录这篇文章",
    approvalCode: "ABC123",
  });
  const resolved = await store.parse("可以", { ownerKey: "owner-1", threadKey: "main" });
  assert.equal(resolved.action, "approve");
  assert.equal(resolved.decision.id, decision.id);
  assert.equal(resolved.code, "ABC123");
  await store.update(decision.id, { reservedAt: null, consumedAt: "2026-07-28T08:00:01.000Z" });
  await assert.rejects(store.parse("可以", { ownerKey: "owner-2", threadKey: "main" }), (error) => error.code === "PENDING_DECISION_NOT_FOUND");
  await assert.rejects(store.parse("可以", { ownerKey: "owner-1", threadKey: "main" }), (error) => error.code === "PENDING_DECISION_REPLAYED");
});

test("multiple pending decisions require an index or explicit code", async (t) => {
  const { store } = await setup(t);
  for (const [jobId, approvalCode] of [["job-20260728-11111111", "AAA111"], ["job-20260728-22222222", "BBB222"]]) {
    await store.add({ jobId, ownerKey: "owner", threadKey: "main", kind: "single", phase: "execution", summary: jobId, approvalCode });
  }
  await assert.rejects(store.parse("确认", { ownerKey: "owner", threadKey: "main" }), (error) => error.code === "PENDING_DECISION_AMBIGUOUS");
  const second = await store.parse("确认 2", { ownerKey: "owner", threadKey: "main" });
  assert.equal(second.decision.jobId, "job-20260728-22222222");
  const first = await store.parse("拒绝 1", { ownerKey: "owner", threadKey: "main" });
  assert.equal(first.action, "reject");
  assert.equal(first.decision.jobId, "job-20260728-11111111");
});

test("double approval binds diff generation and final digest confirmation to one thread", async (t) => {
  const { store } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-12345678",
    ownerKey: "owner",
    threadKey: "main",
    kind: "double",
    phase: "execution",
    summary: "覆盖已有笔记",
    approvalCode: "ABC123",
  });
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "PENDING_DECISION_PHASE_INVALID",
  );
  const first = await store.parse("确认生成差异", { ownerKey: "owner", threadKey: "main" });
  assert.equal(first.action, "approve");
  assert.equal(first.decision.id, decision.id);

  await store.update(decision.id, { phase: "merge", diffDigest: "digest-v1", approvalCode: "DEF456", consumedAt: null, reservedAt: null });
  await assert.rejects(
    store.parse("确认 1", { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "PENDING_DECISION_PHASE_INVALID",
  );
  await assert.rejects(store.parse("确认应用 ABC123", { ownerKey: "owner", threadKey: "main" }), (error) => error.code === "PENDING_DECISION_CODE_INVALID");
  const final = await store.parse("确认应用 DEF456", {
    ownerKey: "owner",
    threadKey: "main",
    getDiffDigest: async (jobId) => {
      assert.equal(jobId, "job-20260728-12345678");
      return "digest-v1";
    },
  });
  assert.equal(final.action, "approve");
  await assert.rejects(
    store.parse("确认应用 DEF456", { ownerKey: "owner", threadKey: "other", diffDigest: "digest-v1" }),
    (error) => ["PENDING_DECISION_NOT_FOUND", "PENDING_DECISION_REPLAYED"].includes(error.code),
  );
});

test("expired decisions and changed diff digests fail closed", async (t) => {
  const { store, advance } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-12345678",
    ownerKey: "owner",
    threadKey: "main",
    kind: "double",
    phase: "merge",
    summary: "merge",
    diffDigest: "digest-v1",
    approvalCode: "ABC123",
    ttlMs: 1_000,
  });
  await assert.rejects(
    store.parse("确认应用 ABC123", { ownerKey: "owner", threadKey: "main", diffDigest: "digest-v2" }),
    (error) => error.code === "PENDING_DECISION_DIGEST_CHANGED",
  );
  advance(2_000);
  await assert.rejects(
    store.parse("确认应用 ABC123", { ownerKey: "owner", threadKey: "main", diffDigest: decision.diffDigest }),
    (error) => error.code === "PENDING_DECISION_EXPIRED",
  );
});

test("an interrupted approval reservation becomes available again without permitting a replay", async (t) => {
  const { store, advance } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-reserved",
    ownerKey: "owner",
    threadKey: "main",
    kind: "single",
    summary: "待恢复审批",
    approvalCode: "ABC123",
  });
  await store.parse("可以", { ownerKey: "owner", threadKey: "main" });
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "PENDING_DECISION_REPLAYED",
  );
  advance(DECISION_RESERVATION_TTL_MS + 1);
  const recovered = await store.parse("可以", { ownerKey: "owner", threadKey: "main" });
  assert.equal(recovered.decision.id, decision.id);
  await store.update(decision.id, { reservedAt: null, consumedAt: "2026-07-28T08:06:00.000Z" });
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "PENDING_DECISION_REPLAYED",
  );
});
