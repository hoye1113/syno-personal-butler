// P4.3-D: real end-to-end rehearsal over the official cutover toolchain on synthetic data only.
process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../experiments/superagent-p0/production-rehearsal.mjs", import.meta.url));
const CANARY = "PRIVATE_";
const STAGE_NAMES = [
  "01-before", "02-freeze", "03-retire", "04-import", "05-takeover", "06-snapshot",
  "07-lock", "08-drain", "09-unfreeze", "10-queued", "11-final", "12-rollback",
];

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "syno-p43d-rehearsal-"));
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    timeout: 240_000,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

function collectReportFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.json$/u.test(entry.name)) files.push(absolute);
    }
  };
  walk(root);
  return files;
}

// Every persisted JSON under the output root is a report surface: stages, runtime status, snapshot,
// queued scenario and failure branches. Only the synthetic SQLite fixtures may keep raw payloads.
function outputJsonFiles(outputRoot) {
  return collectReportFiles(outputRoot);
}

function assertNoLeaks(outputRoot, secrets) {
  for (const file of outputJsonFiles(outputRoot)) {
    const text = readFileSync(file, "utf8");
    for (const secret of secrets) {
      assert.equal(text.includes(secret), false, `报告泄露 ${secret}：${file}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI argument contract: fail closed before creating anything.
// ---------------------------------------------------------------------------

test("help 不创建目录；相对路径／重复／未知／缺失参数与已存在目录失败关闭", () => {
  const root = temporaryRoot();
  try {
    const help = runCli(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /production-rehearsal/u);

    const relative = runCli(["run", "--output-root", "relative-dir"]);
    assert.equal(relative.status, 2);
    assert.equal(existsSync(path.join(process.cwd(), "relative-dir")), false);

    const duplicate = runCli(["run", "--output-root", path.join(root, "a"), "--output-root", path.join(root, "b")]);
    assert.equal(duplicate.status, 2);
    assert.equal(existsSync(path.join(root, "a")), false);

    const unknown = runCli(["run", "--output-root", path.join(root, "c"), "--database", "/tmp/x"]);
    assert.equal(unknown.status, 2);
    assert.equal(existsSync(path.join(root, "c")), false);

    const missing = runCli(["run", "--output-root"]);
    assert.equal(missing.status, 2);

    const noCommand = runCli([]);
    assert.equal(noCommand.status, 2);

    const existing = path.join(root, "existing");
    mkdirSync(existing);
    writeFileSync(path.join(existing, "keep.txt"), "keep\n", "utf8");
    const rerun = runCli(["run", "--output-root", existing]);
    assert.equal(rerun.status, 2);
    assert.equal(readFileSync(path.join(existing, "keep.txt"), "utf8"), "keep\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Full main chain through the real CLI.
// ---------------------------------------------------------------------------

test("完整 CLI 主链逐阶段通过，失败分支独立阻断，报告不含 PRIVATE_ canary", () => {
  const root = temporaryRoot();
  const outputRoot = path.join(root, "run");
  try {
    const result = runCli(["run", "--output-root", outputRoot]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.includes(CANARY), false, "stdout 泄露 canary");
    const stdout = JSON.parse(result.stdout.trim());
    assert.equal(stdout.schema, "syno-p43-production-rehearsal-v1");
    assert.equal(stdout.ok, true);
    assert.equal(stdout.stages, 12);
    assert.equal(stdout.failureBranches, 5);
    assert.deepEqual(stdout.claims, { realProductionSwitched: false, realMessageRead: false, externalEffects: 0 });

    const summary = readJson(path.join(outputRoot, "rehearsal-summary.json"));
    assert.equal(summary.schema, "syno-p43-production-rehearsal-v1");
    assert.equal(summary.ok, true);
    assert.equal(summary.synthetic, true);
    assert.deepEqual(summary.stages.map((stage) => stage.name), STAGE_NAMES);
    assert.ok(summary.stages.every((stage) => stage.status === "ok" && /^[0-9a-f]{64}$/u.test(stage.hash)));
    assert.deepEqual(summary.claims, { realProductionSwitched: false, realMessageRead: false, externalEffects: 0 });
    assert.equal(summary.generation, 1);
    assert.deepEqual(summary.counts, {
      beforeReplies: 1,
      duringMessages: 2,
      afterReplies: 1,
      frozenSpools: 2,
      forwardedSpools: 2,
      spoolAttempts: 2,
      pending: 0,
      tasks: 2,
      attempts: 2,
      runs: 2,
      deliveries: 2,
      acceptedDeliveries: 2,
      dedupeOnly: 1,
      mappingOnly: 1,
      externalEffects: 0,
    });
    assert.ok(Object.values(summary.checks).every((value) => value === true));

    const stage = (name) => readJson(path.join(outputRoot, "stages", `${name}.json`));

    const before = stage("01-before");
    assert.equal(before.status, "ok");
    assert.deepEqual(before.counts, { events: 1, inboxes: 1, replies: 1, tasks: 0, deliveries: 0 });
    assert.equal(before.reply.state, "accepted");

    const freeze = stage("02-freeze");
    assert.deepEqual(freeze.counts, {
      frozenSpools: 2, generation: 1, delegates: 0, deliveries: 0, duringEvents: 0, duringInboxes: 0, tasks: 0,
    });

    const retire = stage("03-retire");
    assert.equal(retire.counts.frozenSpools, 2);
    assert.equal(retire.counts.generation, 1);

    const importStage = stage("04-import");
    assert.equal(importStage.counts.dedupeOnly, 1);
    assert.equal(importStage.counts.mappingOnly, 1);
    assert.equal(importStage.counts.seenExcludedSpool, 2);
    assert.equal(importStage.counts.seenAlreadyPresent, 1);
    assert.equal(importStage.counts.carriedPending, 2);
    assert.equal(importStage.counts.blockedPending, 0);
    assert.equal(importStage.counts.externalEffects, 0);
    assert.equal(importStage.hashes.state, freeze.hashes.state, "导入不得改变旧 JSON");

    const takeover = stage("05-takeover");
    assert.equal(takeover.counts.ready, 1);
    assert.equal(takeover.counts.drainRequired, 1);
    assert.equal(takeover.counts.takeoverFrozenSpools, 2);
    assert.equal(takeover.counts.generation, 1);
    assert.equal(takeover.counts.externalEffects, 0);

    const snapshot = stage("06-snapshot");
    assert.equal(snapshot.counts.vaultFiles, 2);
    assert.equal(snapshot.counts.safetyFiles, 3);
    assert.equal(snapshot.counts.oldTasks, 0);
    assert.equal(snapshot.counts.externalEffects, 0);
    assert.ok(snapshot.counts.planItems >= 2);
    const plan = readJson(path.join(outputRoot, "snapshot", "migration-plan.json"));
    assert.equal(plan.cutoverBlocked, false);
    assert.equal(plan.externalEffects, 0);
    assert.equal(plan.items.some((item) => item.kind === "task"), false, "旧 Task 不得进入迁移执行");

    const lock = stage("07-lock");
    assert.equal(lock.counts.owners, 1);
    assert.equal(lock.counts.competitors, 0);
    assert.equal(lock.lock.competitorCode, "PROCESS_LOCK_HELD");

    const drain = stage("08-drain");
    assert.equal(drain.counts.forwarded, 2);
    assert.equal(drain.counts.attempts, 2);
    assert.equal(drain.counts.pending, 0);
    assert.equal(drain.counts.batches, 2);
    assert.equal(drain.counts.recoveredSpools, 0);
    assert.equal(drain.counts.recoveredReplies, 0);
    assert.equal(drain.drain.messages.length, 2);

    const unfreeze = stage("09-unfreeze");
    assert.equal(unfreeze.counts.adapterRecovered, 2);
    assert.equal(unfreeze.counts.adapterSends, 0);
    assert.equal(unfreeze.counts.adapterFactsAdded, 0);
    assert.equal(unfreeze.counts.afterDeliveries, 1);
    assert.equal(unfreeze.counts.afterAccepted, 1);

    const queued = stage("10-queued");
    assert.equal(queued.counts.queuedEvents, 1);
    assert.equal(queued.counts.resumedTasks, 1);
    assert.equal(queued.counts.workerExecutions, 2);
    assert.equal(queued.counts.remainingQueued, 0);
    assert.equal(queued.counts.activeTasks, 0);
    assert.equal(queued.counts.contextVersionAfterResume, queued.counts.contextVersionBeforeResume + 1);

    const finalStage = stage("11-final");
    assert.equal(finalStage.counts.blockers, 0);
    assert.equal(finalStage.counts.messages, 4);
    assert.equal(finalStage.counts.duringMessages, 2);
    assert.equal(finalStage.counts.replyMessages, 2);
    assert.equal(finalStage.counts.artifacts, 5);
    assert.equal(finalStage.counts.tasks, 2);
    assert.equal(finalStage.counts.attempts, 2);
    assert.equal(finalStage.counts.runs, 2);
    assert.equal(finalStage.counts.deliveries, 2);
    assert.notEqual(finalStage.hashes.finalCopy, takeover.hashes.takeoverCopy, "最终副本与 takeover 副本必须分 hash");

    const verification = readJson(path.join(outputRoot, "final", "verification.json"));
    assert.equal(verification.ok, true);
    assert.deepEqual(verification.blockers, []);
    const evidence = readJson(path.join(outputRoot, "final", "evidence.json"));
    assert.equal(evidence.freezeGeneration, 1);
    assert.deepEqual(evidence.global, {
      activeTasks: 0,
      otherActiveTasks: 0,
      queuedEvents: 0,
      pendingDecisions: 0,
      queuedDeliveries: 0,
      unknownDeliveries: 0,
      handoverPending: 0,
      handoverHolds: 0,
      reconciliationBlocking: false,
    });
    const owners = Object.fromEntries(evidence.messages.map((message) => [message.role, message]));
    assert.equal(owners.before.replies[0].state, "accepted");
    assert.equal(owners.after.replies[0].state, "accepted");
    assert.notEqual(owners.before.replies[0].ownerInstanceId, owners.after.replies[0].ownerInstanceId);
    for (const message of evidence.messages.filter((entry) => entry.role === "during")) {
      assert.equal(message.spools[0].state, "forwarded");
      assert.equal(message.spools[0].attempts, 1);
      assert.equal(message.spools[0].ownerInstanceId, owners.after.replies[0].ownerInstanceId);
      assert.equal(message.deliveries[0].state, "accepted");
      assert.equal(message.deliveries[0].maySend, false);
    }

    const rollback = stage("12-rollback");
    assert.deepEqual(rollback.counts, { added: 2, changed: 0, deleted: 0, externalEffects: 0 });
    const delta = readJson(path.join(outputRoot, "rollback", "delta.json"));
    assert.equal(delta.requiresIncrementReview, true);
    assert.equal(delta.actions.delete, 0);
    assert.equal(delta.actions.parallelConsumers, 0);
    assert.equal(delta.actions.externalEffects, 0);

    // Independent failure branches.
    assert.deepEqual(summary.failureBranches.map((branch) => branch.name), [
      "competing-lock",
      "dispatching-sending-interruption",
      "delivery-unknown",
      "generation-or-n-mismatch",
      "cross-object-context-artifact",
    ]);
    assert.ok(summary.failureBranches.every((branch) => branch.status === "blocked"));

    const lockBranch = readJson(path.join(outputRoot, "failures", "competing-lock", "report.json"));
    assert.equal(lockBranch.competitorCode, "PROCESS_LOCK_HELD");
    assert.equal(lockBranch.statusUnchanged, true);

    const interruptedBranch = readJson(path.join(outputRoot, "failures", "interrupted", "report.json"));
    assert.deepEqual(interruptedBranch.recovered, { status: "recovered", spool: 1, reply: 1 });
    assert.equal(interruptedBranch.deliverCalls, 1);
    assert.ok(interruptedBranch.preflightBlockers.includes("handover_hold"));
    assert.ok(interruptedBranch.verifyBlockers.includes("reply_not_accepted"));

    const unknownBranch = readJson(path.join(outputRoot, "failures", "delivery-unknown", "report.json"));
    assert.equal(unknownBranch.maySend, false);
    assert.equal(unknownBranch.evidenceUnknown, 1);
    assert.ok(unknownBranch.preflightBlockers.includes("unknown_delivery"));
    assert.ok(unknownBranch.verifyBlockers.includes("unknown_delivery"));

    const generationBranch = readJson(path.join(outputRoot, "failures", "generation-mismatch", "report.json"));
    assert.ok(generationBranch.preflightBlockers.includes("handover_generation_mismatch"));
    assert.ok(generationBranch.countBlockers.includes("takeover_count_mismatch"));
    assert.ok(generationBranch.generationBlockers.includes("evidence_generation_mismatch"));

    const crossBranch = readJson(path.join(outputRoot, "failures", "cross-object", "report.json"));
    assert.ok(crossBranch.functionBlockers.includes("context_object_mismatch"));
    assert.ok(crossBranch.functionBlockers.includes("artifact_hash_mismatch"));
    assert.ok(crossBranch.cliBlockers.includes("artifact_hash_mismatch"));

    // Sanitization: the synthetic database really contains the canary, while every persisted JSON
    // (including runtime/host-status.json) stays free of canary, Owner ID and synthetic secrets.
    const syntheticDatabase = readFileSync(path.join(outputRoot, "runtime", "unified.db"));
    assert.ok(syntheticDatabase.includes(Buffer.from(CANARY)), "fixture 必须真的带有 canary");
    assert.ok(syntheticDatabase.includes(Buffer.from("ou_p43d_")), "fixture DB 必然带有合成 Owner ID");

    const hostStatus = readJson(path.join(outputRoot, "runtime", "host-status.json"));
    assert.equal(hostStatus.schema, "syno-host-status-v1");
    assert.equal(hostStatus.running, false);
    assert.equal(hostStatus.lifecycle, "stopped");
    assert.equal(hostStatus.frozen, true);
    assert.equal(hostStatus.handover.frozen, true);
    assert.equal(hostStatus.handover.generation, 1);
    assert.equal(hostStatus.handover.pendingCount, 2);
    assert.deepEqual(hostStatus.handover.spool.counts, { frozen: 2, dispatching: 0, forwarded: 0, hold: 0 });
    assert.equal(hostStatus.handover.pending.length, 2);
    assert.ok(hostStatus.handover.pending.every((entry) => entry.state === "frozen" && entry.freezeGeneration === 1 && entry.attempts === 0));
    assert.match(hostStatus.appId, /^cli_p43d_[0-9a-z]+$/u);
    assert.match(hostStatus.instanceId, /^host_old_[0-9a-z]+$/u);
    const ownerId = `ou_p43d_${hostStatus.appId.slice("cli_p43d_".length)}`;
    assert.equal(JSON.stringify(hostStatus).includes(ownerId), false, "host-status 不得包含合成 Owner ID");

    assertNoLeaks(outputRoot, [CANARY, "ou_p43d_", ownerId, "syno-p43d-isolated-rehearsal", "synthetic-unused-secret"]);
    assert.equal(readFileSync(path.join(outputRoot, "rehearsal-summary.json"), "utf8").includes(CANARY), false);
    assert.equal(result.stdout.includes("ou_p43d_"), false, "stdout 泄露 ownerId");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
