import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { importNativeCaptures } from "../experiments/superagent-p0/native-migration.mjs";
import { inventoryTree } from "../experiments/superagent-p0/migration-rehearsal.mjs";

const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const source = "Public migration fixture\n\nReuse the existing artifact and verify before completion.\n";
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const objectId = `capture:${sourceSha256.slice(0, 16)}`;
const artifact = `---\nsource_url: "${SOURCE_URL}"\nsource_content_sha256: ${sourceSha256}\nworker: OpenCode\nmodel: opencode-go/deepseek-v4.1-flash\n---\n# Migration fixture\n\n${source.trim()}\n`;

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-native-migration-"));
  const sourceRoot = path.join(root, "source");
  mkdirSync(path.join(sourceRoot, "sources"), { recursive: true });
  mkdirSync(path.join(sourceRoot, "artifacts"), { recursive: true });
  writeFileSync(path.join(sourceRoot, "sources", "a.txt"), source);
  writeFileSync(path.join(sourceRoot, "artifacts", "done.md"), artifact);
  writeFileSync(path.join(sourceRoot, "artifacts", "recover.md"), artifact);
  const tasks = [
    { id: "legacy-done", type: "capture", objectId, messageId: "om_mig_done", state: "completed", sourcePath: "sources/a.txt", sourceUrl: SOURCE_URL, artifactPath: "artifacts/done.md" },
    { id: "legacy-recover", type: "capture", objectId, messageId: "om_mig_recover", state: "running", checkpoint: "candidate-written", sourceSha256, sourcePath: "sources/a.txt", sourceUrl: SOURCE_URL, artifactPath: "artifacts/recover.md" },
    { id: "legacy-queued", type: "capture", objectId, messageId: "om_mig_queued", state: "queued", sourcePath: "sources/a.txt", sourceUrl: SOURCE_URL },
  ];
  const snapshot = {
    schema: 1,
    inbox: tasks.map((task) => ({ id: task.messageId, objectId, state: "processed" })),
    tasks,
    deliveries: [
      { id: "done-delivery", taskId: "legacy-done", objectId, state: "accepted" },
      { id: "recover-delivery", taskId: "legacy-recover", objectId, state: "queued" },
    ],
  };
  writeFileSync(path.join(sourceRoot, "migration-snapshot.json"), JSON.stringify(snapshot, null, 2));
  return { root, sourceRoot, options: { sourceRoot, databasePath: path.join(root, "target", "native.db"), vaultRoot: path.join(root, "target", "vault") } };
}

test("native capture import preserves history, recovery and delivery semantics with replay zero new facts", () => {
  const { root, sourceRoot, options } = fixture();
  try {
    const before = inventoryTree(sourceRoot);
    const first = importNativeCaptures(options);
    assert.equal(first.modelCalls, 0);
    assert.equal(first.externalEffects, 0);
    assert.deepEqual(inventoryTree(sourceRoot), before);
    assert.equal(first.imported.length, 3);
    assert.equal(first.imported[0].deliveryState, "accepted");
    assert.equal(first.imported[0].deliveryClaimedDuringImport, true);
    assert.equal(first.imported[1].deliveryState, "queued");
    assert.equal(first.imported[2].deliveryState, null);

    const second = importNativeCaptures(options);
    assert.equal(second.factCount, first.factCount, "完整重放不得新增事实");
    assert.ok(second.imported.every((record) => record.replayNoNewFacts));
    assert.equal(second.imported[0].deliveryClaimedDuringImport, false, "accepted delivery 不得再次认领");
    assert.deepEqual(second.imported.map((record) => [record.taskId, record.runId, record.attemptId]), first.imported.map((record) => [record.taskId, record.runId, record.attemptId]));
    assert.equal(readdirSync(path.join(options.vaultRoot, "02-Resources")).length, 2);
    assert.deepEqual(inventoryTree(sourceRoot), before);

    const db = new DatabaseSync(options.databasePath, { readOnly: true });
    const records = db.prepare("SELECT key, data FROM projections WHERE collection = ?").all("records").map((row) => JSON.parse(row.data));
    db.close();
    const tasks = records.filter((record) => record.kind === "task");
    const deliveries = records.filter((record) => record.kind === "delivery");
    assert.deepEqual(tasks.map((task) => task.state).sort(), ["completed", "completed", "running"]);
    assert.deepEqual(deliveries.map((delivery) => delivery.state).sort(), ["accepted", "queued"]);
    assert.ok(records.filter((record) => record.kind === "attempt").every((attempt) => ["done", "running"].includes(attempt.state)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown, partial publishing and missing checkpoints block before a native database exists", () => {
  const cases = [
    ["unknown Task", (snapshot) => snapshot.tasks.push({ id: "legacy-unknown", type: "capture", objectId, messageId: "om_mig_unknown", state: "unknown", sourcePath: "sources/a.txt", sourceUrl: SOURCE_URL })],
    ["unknown delivery", (snapshot) => { snapshot.deliveries[0].state = "unknown"; }],
    ["partial publishing", (snapshot) => { snapshot.publishing = [{ id: "legacy-publish", objectId, state: "partial", version: 7 }]; }],
    ["missing checkpoint", (snapshot) => { delete snapshot.tasks[1].checkpoint; }],
  ];
  for (const [name, mutate] of cases) {
    const { root, sourceRoot, options } = fixture();
    try {
      const snapshotPath = path.join(sourceRoot, "migration-snapshot.json");
      const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
      mutate(snapshot);
      writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
      assert.throws(() => importNativeCaptures(options), /存在阻断记录，不能导入原生 Runtime/, name);
      assert.equal(existsSync(options.databasePath), false, `${name} 不得创建新账本`);
      assert.equal(existsSync(options.vaultRoot), false, `${name} 不得创建新 vault`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("native import refuses an artifact from another source before completion", () => {
  const { root, sourceRoot, options } = fixture();
  try {
    const snapshotPath = path.join(sourceRoot, "migration-snapshot.json");
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    snapshot.tasks = [snapshot.tasks[0]];
    snapshot.inbox = [snapshot.inbox[0]];
    snapshot.deliveries = [snapshot.deliveries[0]];
    writeFileSync(path.join(sourceRoot, "artifacts", "done.md"), artifact.replace(source.trim(), "forged body"));
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    assert.throws(() => importNativeCaptures(options), /Result Lane 未找到完整公开原文/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
