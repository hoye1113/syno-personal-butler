// P3 synthetic migration rehearsal: plan, copy and diff only; no production adapter or external effect.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const within = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

export function inventoryTree(root) {
  const files = [];
  const walk = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      assert.ok(!entry.isSymbolicLink(), "迁移快照不允许符号链接");
      const absolute = path.join(directory, entry.name);
      const relative = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) walk(absolute, relative);
      else {
        assert.ok(entry.isFile(), "迁移快照只允许普通文件和目录");
        files.push({ path: relative, sha256: sha256(readFileSync(absolute)) });
      }
    }
  };
  walk(root);
  return files;
}

export function planMigration(snapshot) {
  assert.equal(snapshot?.schema, 1, "未知迁移快照版本");
  const items = [];
  const keys = new Set();
  const add = (kind, record, action) => {
    assert.ok(record?.id && record?.objectId, `${kind} 缺少 ID 或对象`);
    assert.ok(!record.targetObjectId || record.targetObjectId === record.objectId, `${kind} 不得跨对象迁移`);
    const key = `${kind}:${record.id}`;
    assert.ok(!keys.has(key), `重复迁移键：${key}`);
    keys.add(key);
    items.push({ kind, id: record.id, objectId: record.objectId, targetKey: key, action });
  };
  for (const record of snapshot.inbox || []) {
    add("inbox", record, record.state === "processed" ? "dedupe_only" : "hold_for_reconciliation");
  }
  for (const record of snapshot.tasks || []) {
    const action = record.state === "completed" ? "history_only"
      : record.state === "queued" ? "requeue_after_cutover"
        : record.state === "running" && record.checkpoint && record.sourceSha256 ? "resume_after_verification"
          : "hold_for_reconciliation";
    add("task", record, action);
  }
  for (const record of snapshot.decisions || []) {
    const action = record.state === "pending" && Number.isInteger(record.version) ? "migrate_exact_version"
      : ["accepted", "rejected"].includes(record.state) ? "history_only" : "hold_for_reconciliation";
    add("decision", record, action);
  }
  for (const record of snapshot.deliveries || []) {
    const action = record.state === "accepted" ? "dedupe_no_resend"
      : record.state === "queued" ? "migrate_claimable" : "hold_for_reconciliation";
    add("delivery", record, action);
  }
  for (const record of snapshot.publishing || []) {
    add("publishing", record, record.state === "succeeded" && record.version ? "mapping_only" : "hold_for_reconciliation");
  }
  for (const record of snapshot.domainRecords || []) {
    add("domain", record, Number.isInteger(record.version) ? "copy_versioned" : "hold_for_reconciliation");
  }
  return {
    schema: 1,
    items,
    cutoverBlocked: items.some((item) => item.action === "hold_for_reconciliation"),
    externalEffects: 0,
  };
}

export function rehearseCopy({ sourceRoot, targetRoot }) {
  const source = path.resolve(sourceRoot);
  const target = path.resolve(targetRoot);
  assert.ok(!within(source, target) && !within(target, source), "源快照与目标目录不得互相包含");
  const sourceInventory = inventoryTree(source);
  const snapshot = JSON.parse(readFileSync(path.join(source, "migration-snapshot.json"), "utf8"));
  const plan = planMigration(snapshot);
  assert.equal(plan.cutoverBlocked, false, "存在 unknown 或不完整记录，禁止复制为可切换副本");
  mkdirSync(target, { recursive: false });
  cpSync(source, target, { recursive: true, force: false, errorOnExist: true });
  const targetInventory = inventoryTree(target);
  assert.deepEqual(targetInventory, sourceInventory, "副本文件或哈希与源快照不一致");
  assert.deepEqual(inventoryTree(source), sourceInventory, "迁移改变了源快照");
  const receipt = { schema: 1, plan, sourceInventory, targetInventory, externalEffects: 0 };
  writeFileSync(path.join(target, "migration-receipt.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
  return { ...receipt, receiptPath: path.join(target, "migration-receipt.json") };
}

export function rollbackDelta({ baseline, currentRoot, exclude = [] }) {
  const excluded = new Set(exclude);
  const before = new Map(baseline.filter((item) => !excluded.has(item.path)).map((item) => [item.path, item.sha256]));
  const after = new Map(inventoryTree(currentRoot).filter((item) => !excluded.has(item.path)).map((item) => [item.path, item.sha256]));
  const added = [...after.keys()].filter((key) => !before.has(key)).sort();
  const deleted = [...before.keys()].filter((key) => !after.has(key)).sort();
  const changed = [...before.keys()].filter((key) => after.has(key) && after.get(key) !== before.get(key)).sort();
  return { added, deleted, changed, requiresIncrementReview: added.length + deleted.length + changed.length > 0 };
}
