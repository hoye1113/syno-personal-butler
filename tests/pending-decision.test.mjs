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

test("republishing the same Job reuses one pending decision", async (t) => {
  const { store } = await setup(t);
  const input = {
    jobId: "job-20260728-stable",
    ownerKey: "owner",
    threadKey: "main",
    kind: "single",
    phase: "execution",
    summary: "收录方案",
    approvalCode: "ABC123",
  };
  const first = await store.add(input);
  const replay = await store.add(input);
  assert.equal(replay.id, first.id);
  assert.equal((await store.list({ ownerKey: "owner", threadKey: "main" })).length, 1);
});

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

test("a clarification decision bound to a diff digest verifies the authoritative digest before confirming", async (t) => {
  const { store } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-12345678",
    ownerKey: "owner",
    threadKey: "main",
    summary: "覆盖已有笔记（带差异指纹）",
    diffDigest: "digest-v1",
    approvalCode: "ABC123",
  });
  assert.equal(decision.kind, "single");
  // 权威摘要一致 → 允许确认（getDiffDigest 优先于静态 diffDigest）
  const ok = await store.parse("可以", {
    ownerKey: "owner",
    threadKey: "main",
    getDiffDigest: async (jobId) => {
      assert.equal(jobId, "job-20260728-12345678");
      return "digest-v1";
    },
  });
  assert.equal(ok.action, "approve");
  assert.equal(ok.decision.id, decision.id);
  // 权威摘要变化 → 拒绝（防伪：diff 变了必须重新确认）
  await store.update(decision.id, { reservedAt: null });
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main", getDiffDigest: async () => "digest-v2" }),
    (error) => error.code === "PENDING_DECISION_DIGEST_CHANGED",
  );
  // 未绑定 digest 的澄清事项不触发防伪校验，直接确认
  await store.update(decision.id, { reservedAt: null, diffDigest: null });
  const unbound = await store.parse("可以", { ownerKey: "owner", threadKey: "main" });
  assert.equal(unbound.action, "approve");
});

test("expired decisions and changed diff digests fail closed", async (t) => {
  const { store, advance } = await setup(t);
  const decision = await store.add({
    jobId: "job-20260728-12345678",
    ownerKey: "owner",
    threadKey: "main",
    summary: "带指纹的澄清",
    diffDigest: "digest-v1",
    approvalCode: "ABC123",
    ttlMs: 1_000,
  });
  // 摘要变化 → 拒绝
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main", getDiffDigest: async () => "digest-v2" }),
    (error) => error.code === "PENDING_DECISION_DIGEST_CHANGED",
  );
  advance(2_000);
  // 过期 → 拒绝（过期检查先于摘要检查）
  await assert.rejects(
    store.parse("可以", { ownerKey: "owner", threadKey: "main", getDiffDigest: async () => decision.diffDigest }),
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

test("an ingest decision accepts only a declared human-readable proposal option", async (t) => {
  const { store } = await setup(t);
  await store.add({
    jobId: "job-20260728-options",
    ownerKey: "owner",
    threadKey: "main",
    kind: "single",
    summary: "处理重复来源",
    options: ["keep-separate", "append-source", "link-only", "reject"],
    approvalCode: "ABC123",
  });
  const selected = await store.parse("仅关联", { ownerKey: "owner", threadKey: "main" });
  assert.equal(selected.action, "select");
  assert.equal(selected.option, "link-only");
  await store.update(selected.decision.id, { reservedAt: null });
  await assert.rejects(
    store.parse("覆盖原文", { ownerKey: "owner", threadKey: "main" }),
    (error) => error.code === "PENDING_DECISION_NOT_A_REPLY",
  );
});

test("replaying proposal publication reuses the same active PendingDecision", async (t) => {
  const { store } = await setup(t);
  const input = {
    jobId: "job-20260728-idempotent",
    ownerKey: "owner",
    threadKey: "main",
    kind: "single",
    phase: "execution",
    summary: "同一收录方案",
    options: ["create", "reject"],
    approvalCode: "ABC123",
    artifactId: "artifact-1",
  };
  const first = await store.add(input);
  const replay = await store.add(input);
  assert.equal(replay.id, first.id);
  assert.equal((await store.list({ ownerKey: "owner", threadKey: "main" })).length, 1);
});

test("Project-scoped decisions cannot be presented or resolved across Project boundaries", async (t) => {
  const { store } = await setup(t);
  const projectA = await store.add({ jobId: "job-project-a", ownerKey: "owner", threadKey: "main", projectRef: "project-a", summary: "A", approvalCode: "AAA111" });
  const projectB = await store.add({ jobId: "job-project-b", ownerKey: "owner", threadKey: "main", projectRef: "project-b", summary: "B", approvalCode: "BBB222" });

  assert.deepEqual((await store.list({ ownerKey: "owner", threadKey: "main", projectRef: "project-a" })).map((item) => item.id), [projectA.id]);
  assert.deepEqual((await store.list({ ownerKey: "owner", threadKey: "main", projectRef: "project-b" })).map((item) => item.id), [projectB.id]);

  const presentationA = await store.present({ ownerKey: "owner", threadKey: "main", channel: "weixin", projectRef: "project-a" });
  const presentationB = await store.present({ ownerKey: "owner", threadKey: "main", channel: "weixin", projectRef: "project-b" });
  assert.notEqual(presentationA.presentationId, presentationB.presentationId);
  assert.deepEqual(presentationA.orderedDecisionIds, [projectA.id]);
  assert.deepEqual(presentationB.orderedDecisionIds, [projectB.id]);

  const resolvedB = await store.parse("确认", {
    ownerKey: "owner",
    threadKey: "main",
    channel: "weixin",
    projectRef: "project-b",
    presentationId: presentationB.presentationId,
  });
  assert.equal(resolvedB.decision.id, projectB.id);
  await store.update(projectB.id, { reservedAt: null });
  const resolvedA = await store.parse("确认", { ownerKey: "owner", threadKey: "main", channel: "weixin", projectRef: "project-a", presentationId: presentationB.presentationId });
  assert.equal(resolvedA.decision.id, projectA.id);
});
