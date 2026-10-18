import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DECISION_RESERVATION_TTL_MS, PendingDecisionStore, decisionVersion } from "../packages/syno-core/pending-decision.mjs";

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-decision-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-10-18T08:00:00Z");
  return { store: new PendingDecisionStore({ file: path.join(root, "pending.json"), clock: () => now }), advance(ms) { now = new Date(now.getTime() + ms); } };
}
const input = (jobId = "job-1") => ({ jobId, ownerKey: "owner", threadKey: "main", summary: "收录方案", options: ["create", "reject"], businessVersion: "v1" });
const scope = (decision) => ({ ownerKey: "owner", threadKey: "main", version: decisionVersion(decision) });

test("republishing a Job keeps one active decision", async (t) => {
  const { store } = await setup(t);
  const first = await store.add(input());
  assert.equal((await store.add(input())).id, first.id);
  assert.equal((await store.list({ ownerKey: "owner" })).length, 1);
});

test("structured decisions require exact ID and reject cross-owner/thread/consumed access", async (t) => {
  const { store } = await setup(t);
  const first = await store.add(input("job-1"));
  const second = await store.add(input("job-2"));
  for (const patch of [{ ownerKey: "stranger" }, { threadKey: "other" }]) await assert.rejects(store.reserve(first.id, { ...scope(first), ...patch }), { code: "PENDING_DECISION_EXPIRED" });
  assert.equal((await store.reserve(second.id, scope(second))).jobId, "job-2");
  await store.update(second.id, { reservedAt: null, consumedAt: "2026-10-18T08:01:00Z" });
  await assert.rejects(store.reserve(second.id, scope(second)), { code: "PENDING_DECISION_EXPIRED" });
  assert.equal((await store.reserve(first.id, scope(first))).jobId, "job-1");
});

test("current proposal version includes its bound diff digest and declared options", async (t) => {
  const { store } = await setup(t);
  const decision = await store.add({ ...input(), diffDigest: "digest-v1" });
  await store.update(decision.id, { diffDigest: "digest-v2" });
  await assert.rejects(store.reserve(decision.id, scope(decision)), { code: "PENDING_DECISION_VERSION_CHANGED" });
  const [fresh] = await store.list({ ownerKey: "owner" });
  const reserved = await store.reserve(fresh.id, scope(fresh));
  assert.equal(reserved.diffDigest, "digest-v2");
  assert.deepEqual(reserved.options, ["create", "reject"]);
});

test("concurrent reservations have one winner, leases recover and expired decisions stay rejected", async (t) => {
  const { store, advance } = await setup(t);
  const decision = await store.add(input());
  const results = await Promise.allSettled([store.reserve(decision.id, scope(decision)), store.reserve(decision.id, scope(decision))]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.code, "PENDING_DECISION_BUSY");
  advance(DECISION_RESERVATION_TTL_MS + 1);
  assert.equal((await store.reserve(decision.id, scope(decision))).id, decision.id);
  advance(24 * 3600_000);
  await assert.rejects(store.reserve(decision.id, scope(decision)), { code: "PENDING_DECISION_EXPIRED" });
});

test("same-millisecond presentations remain in insertion order across repeated reads", async (t) => {
  const { store } = await setup(t);
  const first = await store.add(input("job-1"));
  const second = await store.add(input("job-2"));
  for (let i = 0; i < 10; i += 1) assert.deepEqual((await store.present({ ownerKey: "owner", threadKey: "main", channel: "feishu" })).orderedDecisionIds, [first.id, second.id]);
});
