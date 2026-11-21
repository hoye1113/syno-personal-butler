import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inventoryTree, planMigration, rehearseCopy, rollbackDelta } from "../experiments/superagent-p0/migration-rehearsal.mjs";

const cleanSnapshot = () => ({
  schema: 1,
  inbox: [{ id: "om_done", objectId: "capture:a", state: "processed" }],
  tasks: [
    { id: "done", objectId: "capture:a", state: "completed" },
    { id: "queued", objectId: "capture:a", state: "queued" },
    { id: "recoverable", objectId: "capture:a", state: "running", checkpoint: "candidate-written", sourceSha256: "abc123" },
  ],
  decisions: [{ id: "proposal", objectId: "capture:a", state: "pending", version: 3 }],
  deliveries: [
    { id: "sent", objectId: "capture:a", state: "accepted" },
    { id: "pending", objectId: "capture:a", state: "queued" },
  ],
  publishing: [{ id: "note", objectId: "capture:a", state: "succeeded", version: 7 }],
  domainRecords: [{ id: "memory", objectId: "owner", version: 2 }],
});

function fixture(snapshot = cleanSnapshot()) {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-migration-"));
  const sourceRoot = path.join(root, "source");
  mkdirSync(path.join(sourceRoot, "vault", "02-Resources"), { recursive: true });
  writeFileSync(path.join(sourceRoot, "vault", "02-Resources", "a.md"), "ALPHA fixture\n");
  writeFileSync(path.join(sourceRoot, "migration-snapshot.json"), JSON.stringify(snapshot, null, 2));
  return { root, sourceRoot, targetRoot: path.join(root, "target") };
}

test("synthetic migration preserves the source and reports rollback deltas without external effects", () => {
  const { root, sourceRoot, targetRoot } = fixture();
  try {
    const before = inventoryTree(sourceRoot);
    const receipt = rehearseCopy({ sourceRoot, targetRoot });
    assert.equal(receipt.plan.cutoverBlocked, false);
    assert.equal(receipt.externalEffects, 0);
    assert.deepEqual(receipt.targetInventory, before);
    assert.deepEqual(inventoryTree(sourceRoot), before);
    assert.ok(receipt.plan.items.some((item) => item.action === "dedupe_no_resend"));
    assert.ok(receipt.plan.items.some((item) => item.action === "resume_after_verification"));
    assert.ok(receipt.plan.items.some((item) => item.action === "migrate_exact_version"));
    const cleanDelta = rollbackDelta({ baseline: before, currentRoot: targetRoot, exclude: ["migration-receipt.json"] });
    assert.deepEqual(cleanDelta, { added: [], deleted: [], changed: [], requiresIncrementReview: false });

    writeFileSync(path.join(targetRoot, "vault", "02-Resources", "a.md"), "new Runtime increment\n");
    writeFileSync(path.join(targetRoot, "vault", "02-Resources", "new.md"), "new object\n");
    const delta = rollbackDelta({ baseline: before, currentRoot: targetRoot, exclude: ["migration-receipt.json"] });
    assert.deepEqual(delta.changed, ["vault/02-Resources/a.md"]);
    assert.deepEqual(delta.added, ["vault/02-Resources/new.md"]);
    assert.deepEqual(delta.deleted, []);
    assert.equal(delta.requiresIncrementReview, true);
    assert.equal(readFileSync(path.join(sourceRoot, "vault", "02-Resources", "a.md"), "utf8"), "ALPHA fixture\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown effects block the copy instead of being blindly retried", () => {
  const snapshot = cleanSnapshot();
  snapshot.tasks.push({ id: "unknown", objectId: "capture:a", state: "unknown" });
  snapshot.deliveries.push({ id: "unknown", objectId: "capture:a", state: "unknown" });
  const { root, sourceRoot, targetRoot } = fixture(snapshot);
  try {
    const plan = planMigration(snapshot);
    assert.equal(plan.cutoverBlocked, true);
    assert.equal(plan.items.filter((item) => item.action === "hold_for_reconciliation").length, 2);
    assert.throws(() => rehearseCopy({ sourceRoot, targetRoot }), /禁止复制为可切换副本/);
    assert.equal(readFileSync(path.join(sourceRoot, "migration-snapshot.json"), "utf8"), JSON.stringify(snapshot, null, 2));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate keys and cross-object mappings fail closed", () => {
  const duplicate = cleanSnapshot();
  duplicate.tasks.push(duplicate.tasks[0]);
  assert.throws(() => planMigration(duplicate), /重复迁移键/);
  const crossed = cleanSnapshot();
  crossed.decisions[0].targetObjectId = "capture:b";
  assert.throws(() => planMigration(crossed), /不得跨对象迁移/);
});
