// P3 native import for synthetic public captures only; legacy IDs stay in the receipt mapping.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openNativeCaptureRuntime } from "./native-capture-runtime.mjs";
import { inventoryTree, planMigration } from "./migration-rehearsal.mjs";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

export function importNativeCaptures({ sourceRoot, databasePath, vaultRoot }) {
  const source = path.resolve(sourceRoot);
  const sourceInventory = inventoryTree(source);
  const snapshot = JSON.parse(readFileSync(path.join(source, "migration-snapshot.json"), "utf8"));
  const plan = planMigration(snapshot);
  assert.equal(plan.cutoverBlocked, false, "存在阻断记录，不能导入原生 Runtime");
  const deliveries = new Map((snapshot.deliveries || []).map((record) => [record.taskId, record]));
  const runtimes = new Map();
  const imported = [];
  let modelCalls = 0;
  let externalEffects = 0;
  const runtimeFor = (record) => {
    assert.equal(record.type, "capture", "原生 M3 仅支持合成公开文章收录");
    const key = `${record.sourcePath}\n${record.sourceUrl}`;
    if (!runtimes.has(key)) {
      runtimes.set(key, openNativeCaptureRuntime({
        databasePath,
        vaultRoot,
        sourcePath: path.join(source, record.sourcePath),
        sourceUrl: record.sourceUrl,
      }));
    }
    return runtimes.get(key);
  };
  try {
    for (const record of snapshot.tasks || []) {
      assert.ok(["completed", "queued", "running"].includes(record.state), "未知 Task 不允许导入");
      assert.match(record.messageId, /^[A-Za-z0-9_-]{1,48}$/, "旧消息 ID 不符合原生约束");
      const sourceText = readFileSync(path.join(source, record.sourcePath), "utf8");
      assert.equal(record.objectId, `capture:${sha256(sourceText).slice(0, 16)}`, "Task 对象与来源哈希不匹配");
      if (record.state === "running") {
        assert.equal(record.checkpoint, "candidate-written", "只有已写候选的 Task 可确定恢复");
        assert.equal(record.sourceSha256, sha256(sourceText), "恢复记录的来源版本不匹配");
      }
      const runtime = runtimeFor(record);
      const taskId = `task-${record.messageId}`;
      if (record.state === "queued") {
        let existing = null;
        try { existing = runtime.trace(taskId); }
        catch (error) { if (!String(error.message || error).includes("缺少 Task")) throw error; }
        if (existing) {
          assert.equal(existing.taskState, "running", "已导入 queued Task 状态异常");
          assert.equal(existing.contextId, record.objectId, "重放时 Context 跨对象");
          assert.equal(existing.sourceSha256, sha256(sourceText), "重放时来源版本不同");
          imported.push({
            legacyTaskId: record.id, taskId, runId: existing.nativeRunId, attemptId: existing.attemptId,
            contextId: existing.contextId, contextVersion: existing.contextVersion,
            deliveryState: null, replayNoNewFacts: true,
          });
          continue;
        }
      }
      const beforeFacts = runtime.factCount();
      const execution = runtime.begin({
        appId: "migration_test",
        messageId: record.messageId,
        chatId: "migration_chat",
        ownerId: "migration_owner",
      });
      assert.equal(execution.contextId, record.objectId, "原生 Context 跨对象");
      const result = { legacyTaskId: record.id, taskId: execution.taskId, runId: execution.runId, attemptId: execution.attemptId, contextId: execution.contextId, contextVersion: execution.contextVersion };
      if (record.state !== "queued") {
        assert.ok(record.artifactPath, "已完成或可恢复 Task 缺少既有产物");
        const artifact = readFileSync(path.join(source, record.artifactPath), "utf8");
        mkdirSync(path.dirname(execution.artifactPath), { recursive: true });
        try {
          writeFileSync(execution.artifactPath, artifact, { flag: "wx" });
        } catch (error) {
          assert.equal(error.code, "EEXIST", "迁移产物写入失败");
          assert.equal(readFileSync(execution.artifactPath, "utf8"), artifact, "重放时既有产物内容不同");
        }
        const trace = runtime.complete(execution);
        assert.equal(trace.taskState, "completed", "迁移记录未通过 Result Lane");
        const delivery = deliveries.get(record.id);
        assert.ok(delivery, "已完成导入必须保留原 delivery 处置");
        assert.equal(delivery.objectId, record.objectId, "delivery 不得跨对象");
        if (delivery.state === "accepted") {
          const claim = runtime.claim(execution.deliveryKey);
          runtime.accept(execution.deliveryKey);
          result.deliveryClaimedDuringImport = claim.claimed;
        }
        result.deliveryState = runtime.trace(execution.taskId).deliveryState;
      } else {
        const trace = runtime.trace(execution.taskId);
        assert.equal(trace.taskState, "running", "未派发 Task 导入后应保持可执行");
        assert.equal(trace.nativeRunState, "claimed", "未派发 Task 未绑定原生 run");
        assert.equal(trace.deliveryState, null, "未派发 Task 不得产生 delivery");
        result.deliveryState = null;
      }
      result.replayNoNewFacts = runtime.factCount() === beforeFacts;
      imported.push(result);
    }
    assert.deepEqual(inventoryTree(source), sourceInventory, "原生导入改变了源快照");
    return {
      schema: 1,
      imported,
      factCount: runtimes.size ? [...runtimes.values()][0].factCount() : 0,
      modelCalls,
      externalEffects,
      sourceInventory,
    };
  } finally {
    for (const runtime of runtimes.values()) runtime.close();
  }
}
