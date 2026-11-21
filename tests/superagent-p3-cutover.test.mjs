import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  FORMAT,
  claimDelivery,
  openBusinessView,
} from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { commitLatest } from "../../syno-autoloop-p0/kernel/store.ts";
import { acquireHandoverLock, openHostHandover } from "../experiments/superagent-p0/host-handover.mjs";
import {
  MAX_DELIVERY_RETRY_COUNT,
  buildMigrationSnapshot,
  openHostOperations,
} from "../experiments/superagent-p0/host-operations.mjs";
import {
  inventoryTree,
  planMigration,
  rehearseCopy,
  rollbackDelta,
} from "../experiments/superagent-p0/migration-rehearsal.mjs";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";

const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const source = "P3.4 cutover fixture\n\nNo real service is contacted.\n";
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const message = (id) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test" });

function runtimeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-cutover-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(path.join(vaultRoot, "02-Resources"), { recursive: true });
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, source);
  return {
    root,
    options: {
      databasePath: path.join(root, "runtime", "native.db"),
      vaultRoot,
      sourcePath,
      sourceUrl: SOURCE_URL,
      indexFile: path.join(root, "runtime", "knowledge-index.json"),
      resultRoot: path.join(root, "results"),
    },
  };
}

function writeCapture(execution) {
  const markdown = `---\nsource_url: "${SOURCE_URL}"\nsource_content_sha256: ${sourceSha256}\nworker: OpenCode\nmodel: opencode-go/deepseek-v4.1-flash\n---\n# Cutover\n\n${source.trim()}\n`;
  writeFileSync(execution.artifactPath, markdown, { flag: "wx" });
}

const factCount = (db) => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count);

test("unified status is complete, read-only and JSON serializable", () => {
  const { root, options } = runtimeFixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const capture = runtime.specialist("capture");
    const first = capture.begin(message("om_status_1"));
    assert.throws(() => capture.begin(message("om_status_2")), /当前事件保持 queued/);
    const proposal = runtime.specialist("memory").propose({
      ...message("om_status_memory"), scope: "owner", preference: "SECRET-PREFERENCE",
    });
    assert.equal(proposal.status, "pending");

    const initial = runtime.status();
    assert.equal(initial.schema, "syno-host-status-v1");
    for (const domain of ["capture", "knowledge", "idea", "project", "memory"]) {
      assert.ok(initial.domains[domain], `缺少领域状态：${domain}`);
      assert.ok(Array.isArray(initial.domains[domain].activeTasks));
      assert.ok(Array.isArray(initial.domains[domain].queued));
    }
    assert.equal(initial.domains.capture.activeTasks.length, 1);
    assert.deepEqual(initial.domains.capture.queued.map((entry) => entry.messageId), ["om_status_2"]);
    assert.equal(initial.activeTasks.length, 1);
    assert.equal(initial.activeTasks[0].taskId, first.taskId);
    assert.equal(initial.activeTasks[0].attemptId, first.attemptId);
    assert.equal(initial.activeTasks[0].runId, first.runId);
    assert.equal(initial.decisions.pending.length, 1);
    assert.equal(initial.decisions.pending[0].kind, "memory.confirm");
    assert.equal(initial.decisions.pending[0].originMessageId, "om_status_memory");
    assert.ok(Number.isFinite(initial.decisions.pending[0].expiresAt));
    assert.equal(JSON.stringify(initial).includes("SECRET-PREFERENCE"), false);

    writeCapture(first);
    assert.equal(capture.complete(first).taskState, "completed");
    const withQueuedDelivery = runtime.status();
    const firstDelivery = withQueuedDelivery.deliveries.queued.find(
      (delivery) => delivery.deliveryKey === first.deliveryKey,
    );
    assert.ok(firstDelivery);
    assert.equal(firstDelivery.taskId, first.taskId);
    assert.equal(firstDelivery.may_send, true);
    assert.equal(firstDelivery.claimable, true);

    assert.equal(capture.claim(first.deliveryKey).claimed, true);
    const withUnknown = runtime.status();
    assert.equal(withUnknown.deliveries.queued.length, 0);
    assert.deepEqual(withUnknown.deliveries.unknown.map((delivery) => delivery.deliveryKey), [first.deliveryKey]);
    assert.equal(withUnknown.deliveries.unknown[0].may_send, false);
    assert.equal(withUnknown.deliveries.unknown[0].claimable, false);
    assert.equal(withUnknown.reconciliation.blocking, true);

    const second = capture.begin(runtime.queued("capture")[0]);
    assert.throws(() => capture.begin(message("om_status_3")), /当前事件保持 queued/);
    const runningAgain = runtime.status();
    assert.equal(runningAgain.activeTasks[0].taskId, second.taskId);
    assert.equal(runningAgain.deliveries.unknown[0].deliveryKey, first.deliveryKey);
    assert.deepEqual(runningAgain.domains.capture.queued.map((entry) => entry.messageId), ["om_status_3"]);

    writeCapture(second);
    assert.equal(capture.complete(second).taskState, "completed");
    const third = capture.begin(runtime.queued("capture")[0]);
    const complete = runtime.status();
    assert.equal(complete.activeTasks[0].taskId, third.taskId);
    assert.equal(complete.domains.capture.queued.length, 0);
    assert.ok(complete.deliveries.queued.some((delivery) => delivery.deliveryKey === second.deliveryKey));
    assert.ok(complete.deliveries.unknown.some((delivery) => delivery.deliveryKey === first.deliveryKey));

    runtime.handover.freeze({ reason: "status-view" });
    const spooled = runtime.handover.intake({
      ...message("om_status_spool"),
      worker: "OpenCode",
      text: "PRIVATE-HANDOVER-TEXT",
    });
    assert.equal(spooled.status, "spooled");
    const withHandover = runtime.status();
    assert.equal(withHandover.frozen, true);
    assert.equal(withHandover.handover.pendingCount, 1);
    assert.equal(withHandover.handover.spool.counts.frozen, 1);
    assert.equal(JSON.stringify(withHandover).includes("PRIVATE-HANDOVER-TEXT"), false);
    assert.equal(JSON.stringify(withHandover).includes("SECRET-PREFERENCE"), false);

    const before = runtime.factCount();
    const left = runtime.status();
    const right = runtime.status();
    assert.deepEqual(left, right);
    assert.equal(runtime.factCount(), before);
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(left)));
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("queued work survives a Runtime close/reopen and resumes in Context order", () => {
  const { root, options } = runtimeFixture();
  let runtime = openNativeButlerRuntime(options);
  try {
    const capture = runtime.specialist("capture");
    const first = capture.begin(message("om_restart_1"));
    assert.throws(() => capture.begin(message("om_restart_2")), /当前事件保持 queued/);
    assert.deepEqual(runtime.queued("capture").map((entry) => entry.messageId), ["om_restart_2"]);
    runtime.close();

    // Deterministic process restart only: this does not stand in for a real Host or Feishu acceptance.
    runtime = openNativeButlerRuntime(options);
    const reopened = runtime.specialist("capture");
    assert.deepEqual(runtime.queued("capture").map((entry) => entry.messageId), ["om_restart_2"]);
    writeCapture(first);
    assert.equal(reopened.complete(first).contextVersion, 1);
    const resumed = reopened.begin(runtime.queued("capture")[0]);
    assert.equal(resumed.contextVersion, 2);
    writeCapture(resumed);
    const completed = reopened.complete(resumed);
    assert.equal(completed.taskState, "completed");
    assert.equal(completed.contextVersion, 2);
    assert.equal(runtime.queued("capture").length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("delivery retry is bounded, not-before gated, idempotent and terminal-safe", () => {
  const { root, options } = runtimeFixture();
  let clock = 1_700_000_000_000;
  const runtime = openNativeButlerRuntime({ ...options, now: () => clock });
  const secondDb = new DatabaseSync(options.databasePath);
  secondDb.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(secondDb);
  let bottomClaimCalls = 0;
  const observer = openHostOperations({
    db: secondDb,
    now: () => clock,
    claim: (db, input) => {
      bottomClaimCalls += 1;
      return claimDelivery(db, input);
    },
  });
  try {
    const capture = runtime.specialist("capture");
    const execution = capture.begin(message("om_retry"));
    writeCapture(execution);
    capture.complete(execution);
    assert.equal(capture.claim(execution.deliveryKey).claimed, true);
    assert.equal(openBusinessView(secondDb).get("records", execution.deliveryKey).state, "unknown");

    const missing = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey, delayMs: 1000, commandId: "retry-missing",
    });
    assert.equal(missing.status, "held_unknown");
    assert.equal(openBusinessView(secondDb).get("records", execution.deliveryKey).state, "unknown");

    const retried = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: false,
      delayMs: 60_000,
      reason: "crash before transport call",
      commandId: "retry-1",
    });
    assert.equal(retried.status, "queued");
    assert.equal(retried.receipt.retryCount, 1);
    assert.equal(retried.receipt.notBefore, clock + 60_000);
    const queuedRecord = openBusinessView(secondDb).get("records", execution.deliveryKey);
    assert.equal(queuedRecord.state, "queued");
    assert.equal(queuedRecord.may_send, true);
    assert.equal(queuedRecord.provider_message_id, null);

    const duplicate = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: false,
      delayMs: 60_000,
      reason: "crash before transport call",
      commandId: "retry-1",
    });
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.receipt.retryCount, 1);

    const differentCommand = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: false,
      delayMs: 60_000,
      reason: "second command while queued",
      commandId: "retry-2-queued",
    });
    assert.equal(differentCommand.status, "already_queued");
    assert.equal(openBusinessView(secondDb).get("records", execution.deliveryKey).retry_count, 1);

    const early = observer.claimDueDelivery({ deliveryKey: execution.deliveryKey });
    assert.equal(early.status, "not_due");
    assert.equal(bottomClaimCalls, 0);

    clock = retried.receipt.notBefore;
    const due = observer.claimDueDelivery({ deliveryKey: execution.deliveryKey });
    assert.deepEqual(due, { status: "claimed", claimed: true, deliveryKey: execution.deliveryKey });
    assert.equal(bottomClaimCalls, 1);
    const again = observer.claimDueDelivery({ deliveryKey: execution.deliveryKey });
    assert.equal(again.status, "not_claimable");
    assert.equal(bottomClaimCalls, 1);

    const attempted = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: true,
      delayMs: 0,
      reason: "provider may have received it",
      commandId: "retry-attempted",
    });
    assert.equal(attempted.status, "held_unknown");
    assert.equal(openBusinessView(secondDb).get("records", execution.deliveryKey).state, "unknown");

    for (const index of [2, 3]) {
      const next = runtime.operations.scheduleDeliveryRetry({
        deliveryKey: execution.deliveryKey,
        attempted: false,
        delayMs: 0,
        reason: `retry ${index}`,
        commandId: `retry-${index}`,
      });
      assert.equal(next.status, "queued");
      assert.equal(next.receipt.retryCount, index);
      assert.equal(observer.claimDueDelivery({ deliveryKey: execution.deliveryKey }).status, "claimed");
    }

    const exhausted = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: false,
      delayMs: 0,
      reason: "too many",
      commandId: "retry-exhausted",
    });
    assert.equal(exhausted.status, "retry_exhausted");
    assert.equal(exhausted.retryCount, MAX_DELIVERY_RETRY_COUNT);
    const unknownRecord = openBusinessView(secondDb).get("records", execution.deliveryKey);
    assert.equal(unknownRecord.state, "unknown");
    assert.equal(unknownRecord.may_send, false);
    assert.equal(unknownRecord.provider_message_id, null);

    assert.equal(capture.accept(execution.deliveryKey).get("records", execution.deliveryKey).state, "accepted");
    const accepted = openBusinessView(secondDb).get("records", execution.deliveryKey);
    assert.equal(accepted.may_send, false);
    const beforeAcceptedCommands = factCount(secondDb);
    const terminal = runtime.operations.scheduleDeliveryRetry({
      deliveryKey: execution.deliveryKey,
      attempted: false,
      delayMs: 1000,
      commandId: "retry-after-accept",
    });
    assert.equal(terminal.status, "accepted");
    assert.equal(factCount(secondDb), beforeAcceptedCommands);
    assert.deepEqual(openBusinessView(secondDb).get("records", execution.deliveryKey), accepted);
  } finally {
    secondDb.close();
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("freeze spools only the frozen window, drains once and replays inertly", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-handover-"));
  const databasePath = path.join(root, "handover.db");
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  const handover = openHostHandover({ db, now: () => 1000, instanceId: "host-a" });
  try {
    const before = handover.intake({ ...message("om_before"), worker: "OpenCode", text: "before" });
    assert.equal(before.status, "immediate");

    const frozen = handover.freeze({ reason: "cutover-window" });
    assert.equal(frozen.status, "frozen");
    assert.equal(frozen.control.generation, 1);
    const repeated = handover.freeze({ reason: "ignored" });
    assert.equal(repeated.status, "already_frozen");
    assert.deepEqual(repeated.control, frozen.control);

    const during = handover.intake({
      ...message("om_during"), worker: "OpenCode", text: "SPOOL-PRIVATE-BODY",
    });
    assert.equal(during.status, "spooled");
    assert.equal(during.item.state, "frozen");
    assert.equal(during.duplicate, false);
    const beforeReplay = factCount(db);
    const replay = handover.intake({
      ...message("om_during"), worker: "OpenCode", text: "SPOOL-PRIVATE-BODY",
    });
    assert.equal(replay.status, "spooled");
    assert.equal(replay.duplicate, true);
    assert.equal(factCount(db), beforeReplay);
    assert.throws(() => handover.intake({
      ...message("om_during"), worker: "OpenCode", text: "different body",
    }), /内容冲突/);
    assert.equal(factCount(db), beforeReplay);

    const unfrozen = handover.unfreeze({ reason: "window-closed" });
    assert.equal(unfrozen.status, "unfrozen");
    assert.equal(handover.unfreeze().status, "already_unfrozen");
    assert.throws(() => handover.spool({
      ...message("om_after"), worker: "OpenCode", text: "not frozen",
    }), /未冻结/);
    const after = handover.intake({ ...message("om_after"), worker: "OpenCode", text: "after" });
    assert.equal(after.status, "immediate");
    assert.equal(handover.status().pendingCount, 1);
    assert.equal(handover.status().spool.counts.frozen, 1);

    const forwarded = [];
    const outcomes = await handover.drainFrozen({
      forward: async (item) => {
        forwarded.push(item);
        return { accepted: true, receipt: `task-${item.messageId}` };
      },
    });
    assert.deepEqual(outcomes.map((outcome) => outcome.status), ["forwarded"]);
    assert.deepEqual(forwarded.map((item) => item.messageId), ["om_during"]);
    const drained = handover.status();
    assert.equal(drained.spool.counts.forwarded, 1);
    assert.equal(drained.pendingCount, 0);
    assert.equal(drained.holdCount, 0);
    assert.deepEqual(await handover.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);

    handover.freeze({ reason: "second-window" });
    assert.equal(handover.control().generation, 2);
    const lateReplay = handover.intake({
      ...message("om_during"), worker: "OpenCode", text: "SPOOL-PRIVATE-BODY",
    });
    assert.equal(lateReplay.duplicate, true);
    assert.equal(lateReplay.item.state, "forwarded");
    assert.throws(() => handover.intake({
      ...message("om_during"), worker: "OpenCode", text: "changed",
    }), /内容冲突/);
    assert.deepEqual(await handover.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);
    assert.equal(JSON.stringify(handover.status()).includes("SPOOL-PRIVATE-BODY"), false);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("two handover instances cannot claim the same spool and the existing process lock fails closed", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-handover-concurrent-"));
  const databasePath = path.join(root, "handover.db");
  const firstDb = new DatabaseSync(databasePath);
  const secondDb = new DatabaseSync(databasePath);
  firstDb.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  secondDb.exec("PRAGMA busy_timeout=5000;");
  const first = openHostHandover({ db: firstDb, now: () => 1000, instanceId: "host-a" });
  const second = openHostHandover({ db: secondDb, now: () => 1000, instanceId: "host-b" });
  try {
    first.freeze({ reason: "concurrent" });
    first.intake({ ...message("om_once"), worker: "OpenCode", text: "only once" });
    let calls = 0;
    const forward = async () => {
      calls += 1;
      return { accepted: true, receipt: "forwarded" };
    };
    await Promise.all([
      first.drainFrozen({ forward }),
      second.drainFrozen({ forward }),
    ]);
    assert.equal(calls, 1);
    assert.equal(first.status().spool.counts.forwarded, 1);
    assert.equal(second.status().spool.counts.forwarded, 1);

    const lockFile = path.join(root, "handover.lock");
    const lease = await acquireHandoverLock({ file: lockFile, instanceId: "host-a" });
    await assert.rejects(
      () => acquireHandoverLock({ file: lockFile, instanceId: "host-b" }),
      (error) => ["PROCESS_LOCK_HELD", "PROCESS_LOCK_IDENTITY_UNKNOWN"].includes(error.code),
    );
    await lease.release();
    const next = await acquireHandoverLock({ file: lockFile, instanceId: "host-b" });
    await next.release();
  } finally {
    firstDb.close();
    secondDb.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function childFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-handover-child-"));
  const script = path.join(root, "child.mjs");
  const moduleUrl = new URL("../experiments/superagent-p0/host-handover.mjs", import.meta.url).href;
  writeFileSync(script, `
import { DatabaseSync } from "node:sqlite";
import { openHostHandover } from ${JSON.stringify(moduleUrl)};
const [databasePath, mode] = process.argv.slice(2);
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
const handover = openHostHandover({ db, now: () => 1000, instanceId: "child-host" });
const message = {
  appId: "cli_test", messageId: "om_child", chatId: "oc_test", ownerId: "ou_test",
  worker: "OpenCode", text: "CHILD-PRIVATE-BODY",
};
if (mode === "spool") {
  handover.freeze({ reason: "child" });
  handover.intake(message);
  process.exit(0);
}
if (mode === "dispatch") {
  handover.freeze({ reason: "child" });
  handover.intake(message);
  handover.claimNextFrozen();
  process.exit(0);
}
if (mode === "sending") {
  await handover.sendReply({
    ...message, text: "CHILD-PRIVATE-REPLY",
    deliver: () => process.exit(0),
  });
  process.exit(2);
}
throw new Error("unknown child mode");
`);
  return { root, script, databasePath: path.join(root, "child.db") };
}

function runChild({ script, databasePath }, mode) {
  const result = spawnSync(process.execPath, [script, databasePath, mode], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
}

test("a persisted frozen spool is dispatched exactly once after a real child process exits", async () => {
  const fixture = childFixture();
  try {
    runChild(fixture, "spool");
    const db = new DatabaseSync(fixture.databasePath);
    db.exec("PRAGMA busy_timeout=5000;");
    const handover = openHostHandover({ db, now: () => 2000, instanceId: "parent-host" });
    try {
      assert.equal(handover.status().spool.counts.frozen, 1);
      assert.equal(handover.status().spool.counts.forwarded, 0);
      const calls = [];
      const outcomes = await handover.drainFrozen({
        forward: async (item) => {
          calls.push(item.messageId);
          return { accepted: true, receipt: "parent-forwarded" };
        },
      });
      assert.deepEqual(outcomes.map((outcome) => outcome.status), ["forwarded"]);
      assert.deepEqual(calls, ["om_child"]);
      assert.equal(handover.status().spool.counts.forwarded, 1);
      assert.deepEqual(await handover.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);
    } finally {
      db.close();
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("dispatching and sending crashes become holds and never auto-replay", async () => {
  const dispatchFixture = childFixture();
  const sendingFixture = childFixture();
  try {
    runChild(dispatchFixture, "dispatch");
    const dispatchDb = new DatabaseSync(dispatchFixture.databasePath);
    dispatchDb.exec("PRAGMA busy_timeout=5000;");
    const dispatching = openHostHandover({ db: dispatchDb, now: () => 2000, instanceId: "parent-host" });
    try {
      const before = dispatching.status();
      assert.equal(before.spool.counts.dispatching, 1);
      assert.equal(before.holdCount, 1);
      assert.equal(before.holds[0].state, "dispatching");
      assert.equal(before.holds[0].autoReplay, false);
      assert.deepEqual(await dispatching.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);
      const recovered = dispatching.recoverInterrupted({ reason: "child exited while dispatching" });
      assert.deepEqual(recovered, { status: "recovered", spool: 1, reply: 0 });
      assert.equal(dispatching.status().spool.counts.hold, 1);
      assert.equal(dispatching.status().holds[0].state, "hold");
      assert.deepEqual(await dispatching.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);
      assert.equal(JSON.stringify(dispatching.status()).includes("CHILD-PRIVATE-BODY"), false);
    } finally {
      dispatchDb.close();
    }

    runChild(sendingFixture, "sending");
    const sendingDb = new DatabaseSync(sendingFixture.databasePath);
    sendingDb.exec("PRAGMA busy_timeout=5000;");
    const sending = openHostHandover({ db: sendingDb, now: () => 2000, instanceId: "parent-host" });
    try {
      const before = sending.status();
      assert.equal(before.replies.counts.sending, 1);
      assert.equal(before.holdCount, 1);
      assert.equal(before.holds[0].state, "sending");
      let deliverCalls = 0;
      const held = await sending.sendReply({
        ...message("om_child"), text: "CHILD-PRIVATE-REPLY",
        deliver: async () => { deliverCalls += 1; return { accepted: true }; },
      });
      assert.equal(held.status, "hold");
      assert.equal(deliverCalls, 0);
      assert.equal(sending.recoverInterrupted().reply, 1);
      assert.equal(sending.status().replies.counts.hold, 1);
      const stillHeld = await sending.sendReply({
        ...message("om_child"), text: "CHILD-PRIVATE-REPLY",
        deliver: async () => { deliverCalls += 1; return { accepted: true }; },
      });
      assert.equal(stillHeld.status, "hold");
      assert.equal(deliverCalls, 0);
      assert.equal(JSON.stringify(sending.status()).includes("CHILD-PRIVATE-REPLY"), false);
    } finally {
      sendingDb.close();
    }
  } finally {
    rmSync(dispatchFixture.root, { recursive: true, force: true });
    rmSync(sendingFixture.root, { recursive: true, force: true });
  }
});

test("a spool is forwarded only on an explicit takeover receipt and never replayed from a hold", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-handover-receipt-"));
  const db = new DatabaseSync(path.join(root, "handover.db"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  const handover = openHostHandover({ db, now: () => 1000, instanceId: "host-a" });
  try {
    handover.freeze({ reason: "receipt-window" });
    const receipts = new Map([
      ["om_no_receipt", () => undefined],
      ["om_null_receipt", () => null],
      ["om_empty_receipt", () => ({})],
      ["om_false_receipt", () => false],
      ["om_refused_receipt", () => ({ accepted: false })],
      ["om_hold_receipt", () => ({ status: "hold" })],
      ["om_unknown_receipt", () => ({ status: "unknown" })],
      ["om_rejected_receipt", () => ({ status: "rejected" })],
      ["om_true_receipt", () => true],
      ["om_accepted_receipt", () => ({ accepted: true, receipt: "task-om_accepted_receipt" })],
      ["om_status_receipt", () => ({ status: "accepted" })],
    ]);
    for (const messageId of receipts.keys()) {
      const spooled = handover.intake({ ...message(messageId), worker: "OpenCode", text: `body-${messageId}` });
      assert.equal(spooled.status, "spooled");
    }

    const calls = [];
    const outcomes = await handover.drainFrozen({
      forward: async (item) => {
        calls.push(item.messageId);
        return receipts.get(item.messageId)();
      },
    });
    assert.equal(calls.length, receipts.size);
    assert.equal(new Set(calls).size, receipts.size, "每个 spool 只能 forward 一次");
    assert.deepEqual(
      new Map(outcomes.map((outcome) => [outcome.item.messageId, outcome.status])),
      new Map([...receipts.keys()].map((messageId) => [
        messageId,
        ["om_true_receipt", "om_accepted_receipt", "om_status_receipt"].includes(messageId) ? "forwarded" : "hold",
      ])),
    );

    const afterDrain = handover.status();
    assert.deepEqual(afterDrain.spool.counts, { frozen: 0, dispatching: 0, forwarded: 3, hold: 8 });
    assert.deepEqual(
      afterDrain.holds.map((row) => row.messageId).sort(),
      [...receipts.keys()].filter((messageId) => !["om_true_receipt", "om_accepted_receipt", "om_status_receipt"].includes(messageId)).sort(),
    );
    assert.equal(afterDrain.holds.every((row) => row.autoReplay === false && row.needsReconciliation === true), true);

    const beforeReplay = factCount(db);
    assert.deepEqual(await handover.drainFrozen({ forward: async () => assert.fail("must not replay") }), []);
    assert.equal(calls.length, receipts.size);
    assert.equal(factCount(db), beforeReplay);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("immediate text reply persists sending before delivery and only accepts an explicit ack", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-reply-"));
  const db = new DatabaseSync(path.join(root, "reply.db"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  const handover = openHostHandover({ db, now: () => 1000, instanceId: "host-a" });
  try {
    let calls = 0;
    const accepted = await handover.sendReply({
      ...message("om_reply"), text: "reply body",
      deliver: async () => {
        calls += 1;
        assert.equal(handover.status().replies.counts.sending, 1);
        return { accepted: true, providerMessageId: "om_reply_accepted" };
      },
    });
    assert.equal(accepted.status, "accepted");
    assert.equal(calls, 1);
    assert.equal(accepted.item.providerMessageId, "om_reply_accepted");
    const duplicate = await handover.sendReply({
      ...message("om_reply"), text: "reply body",
      deliver: async () => { calls += 1; return { accepted: true }; },
    });
    assert.equal(duplicate.status, "accepted");
    assert.equal(calls, 1);

    const failed = await handover.sendReply({
      ...message("om_reply_failed"), text: "failed body",
      deliver: async () => { throw new Error("transport down"); },
    });
    assert.equal(failed.status, "hold");
    assert.equal(failed.item.state, "hold");
    assert.equal(failed.item.attempted, true);
    assert.equal(failed.item.providerMessageId, null);
    const failedAgain = await handover.sendReply({
      ...message("om_reply_failed"), text: "failed body",
      deliver: async () => { calls += 1; return { accepted: true }; },
    });
    assert.equal(failedAgain.status, "hold");
    assert.equal(calls, 1);

    const notAccepted = await handover.sendReply({
      ...message("om_reply_unconfirmed"), text: "unconfirmed",
      deliver: async () => ({ accepted: false }),
    });
    assert.equal(notAccepted.status, "hold");
    assert.equal(notAccepted.item.state, "hold");
    await assert.rejects(() => handover.sendReply({
      ...message("om_reply_failed"), text: "different body",
      deliver: async () => ({ accepted: true }),
    }), /内容冲突/);
    assert.equal(JSON.stringify(handover.status()).includes("reply body"), false);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function snapshotRows() {
  return [
    {
      key: 'inbox:["cli_test","om_done"]', kind: "inbox", id: "om_done", app_id: "cli_test",
      receipt: { contextId: "capture:a", version: 1 },
    },
    {
      key: "task:done", kind: "task", id: "done", context_id: "capture:a", context_version: 1,
      current_attempt: "attempt-done", run_id: 1, state: "completed", acceptance: { hash: "a".repeat(64) },
    },
    {
      key: "task:queued", kind: "task", id: "queued", context_id: "capture:a", context_version: 2,
      current_attempt: "attempt-queued", run_id: 2, state: "queued", acceptance: { hash: "b".repeat(64) },
    },
    {
      key: "task:running", kind: "task", id: "running", context_id: "capture:a", context_version: 3,
      current_attempt: "attempt-running", run_id: 3, state: "running",
      checkpoint: "candidate-written", sourceSha256: "c".repeat(64), acceptance: { hash: "c".repeat(64) },
    },
    {
      key: "decision-record:decision-00000000000000aa", kind: "decision", id: "decision-00000000000000aa",
      decisionId: "decision-00000000000000aa", decisionKind: "memory.confirm",
      originContext: "memory:memory-00000000000000bb", originMessageId: "om_decision_pending",
      status: "pending", binding: { expectedMemoryVersion: 2 },
    },
    {
      key: "decision-record:decision-00000000000000bb", kind: "decision", id: "decision-00000000000000bb",
      decisionId: "decision-00000000000000bb", decisionKind: "memory.confirm",
      originContext: "memory:memory-00000000000000cc", originMessageId: "om_decision_consumed",
      status: "consumed", binding: { expectedMemoryVersion: 2 },
    },
    {
      key: "decision-record:decision-00000000000000cc", kind: "decision", id: "decision-00000000000000cc",
      decisionId: "decision-00000000000000cc", decisionKind: "memory.confirm",
      originContext: "memory:memory-00000000000000dd", originMessageId: "om_decision_cancelled",
      status: "cancelled", binding: { expectedMemoryVersion: 2 },
    },
    {
      key: "delivery:done:result", kind: "delivery", task_id: "done", state: "accepted", may_send: false,
    },
    {
      key: "delivery:queued:result", kind: "delivery", task_id: "queued", state: "queued", may_send: true,
    },
    {
      key: "idea-index:idea-00000000000000aa", kind: "idea_index", id: "idea-00000000000000aa",
      ideaId: "idea-00000000000000aa", contextId: "idea:idea-00000000000000aa", latestVersion: 2,
      versions: [{ version: 1 }, { version: 2 }],
    },
    {
      key: "project-index:project-00000000000000bb", kind: "project_index", id: "project-00000000000000bb",
      projectId: "project-00000000000000bb", contextId: "project:project-00000000000000bb", latestVersion: 3,
      versions: [{ planVersion: 3 }],
    },
    {
      key: "memory-index:memory-00000000000000cc", kind: "memory_index", id: "memory-00000000000000cc",
      memoryId: "memory-00000000000000cc", contextId: "memory:memory-00000000000000cc", scope: "owner",
      currentVersion: 2, versions: [{ preference: "SECRET-MEMORY" }, { preference: "SECRET-MEMORY" }],
    },
  ];
}

function seedRecords(db, rows) {
  commitLatest(db, FORMAT, (current) => [{
    version: 1,
    seq: current.seq + 1,
    at: 1,
    type: "test.p3_cutover_seed",
    changes: rows.map((row) => ({ table: "records", key: row.key, row })),
  }]);
}

function writeSnapshotFixture(root, snapshot) {
  const sourceRoot = path.join(root, "source");
  mkdirSync(path.join(sourceRoot, "vault", "02-Resources"), { recursive: true });
  writeFileSync(path.join(sourceRoot, "vault", "02-Resources", "a.md"), "ALPHA data safety fixture\n");
  writeFileSync(path.join(sourceRoot, "owner-binding.json"), JSON.stringify({
    appId: "cli_test", ownerId: "ou_test",
  }, null, 2));
  writeFileSync(path.join(sourceRoot, "migration-snapshot.json"), JSON.stringify(snapshot, null, 2));
  return sourceRoot;
}

test("migration snapshot is copied with dedupe/version actions, zero external effects and rollback review", () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-snapshot-"));
  const db = new DatabaseSync(path.join(root, "shared.db"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  try {
    seedRecords(db, snapshotRows());
    const beforeFacts = factCount(db);
    const snapshot = buildMigrationSnapshot({ db });
    assert.equal(factCount(db), beforeFacts);
    assert.deepEqual(buildMigrationSnapshot({ db }), snapshot);
    assert.equal(snapshot.schema, 1);
    assert.deepEqual(snapshot.publishing, []);
    assert.equal(JSON.stringify(snapshot).includes("SECRET-MEMORY"), false);

    const plan = planMigration(snapshot);
    assert.equal(plan.cutoverBlocked, false);
    assert.equal(plan.externalEffects, 0);
    const actions = new Map(plan.items.map((item) => [item.targetKey, item.action]));
    assert.equal(actions.get('inbox:om_done'), "dedupe_only");
    assert.equal(actions.get("task:done"), "history_only");
    assert.equal(actions.get("task:queued"), "requeue_after_cutover");
    assert.equal(actions.get("task:running"), "resume_after_verification");
    assert.equal(actions.get("decision:decision-00000000000000aa"), "migrate_exact_version");
    assert.equal(actions.get("decision:decision-00000000000000bb"), "history_only");
    assert.equal(actions.get("decision:decision-00000000000000cc"), "history_only");
    assert.equal(actions.get("delivery:delivery:done:result"), "dedupe_no_resend");
    assert.equal(actions.get("delivery:delivery:queued:result"), "migrate_claimable");
    assert.equal(actions.get("domain:idea-00000000000000aa"), "copy_versioned");
    assert.equal(actions.get("domain:project-00000000000000bb"), "copy_versioned");
    assert.equal(actions.get("domain:memory-00000000000000cc"), "copy_versioned");

    const sourceRoot = writeSnapshotFixture(root, snapshot);
    const targetRoot = path.join(root, "target");
    const baseline = inventoryTree(sourceRoot);
    const receipt = rehearseCopy({ sourceRoot, targetRoot });
    assert.equal(receipt.plan.cutoverBlocked, false);
    assert.equal(receipt.externalEffects, 0);
    assert.deepEqual(receipt.targetInventory, baseline);
    assert.deepEqual(inventoryTree(sourceRoot), baseline);
    assert.deepEqual(inventoryTree(targetRoot).filter((item) => item.path !== "migration-receipt.json"), baseline);

    const sourceBeforeDelta = inventoryTree(sourceRoot);
    writeFileSync(path.join(targetRoot, "vault", "02-Resources", "a.md"), "new Runtime increment\n");
    writeFileSync(path.join(targetRoot, "vault", "02-Resources", "new.md"), "new object\n");
    rmSync(path.join(targetRoot, "owner-binding.json"));
    const delta = rollbackDelta({
      baseline,
      currentRoot: targetRoot,
      exclude: ["migration-receipt.json"],
    });
    assert.deepEqual(delta.changed, ["vault/02-Resources/a.md"]);
    assert.deepEqual(delta.added, ["vault/02-Resources/new.md"]);
    assert.deepEqual(delta.deleted, ["owner-binding.json"]);
    assert.equal(delta.requiresIncrementReview, true);
    assert.deepEqual(inventoryTree(sourceRoot), sourceBeforeDelta);
    assert.throws(
      () => rehearseCopy({ sourceRoot, targetRoot }),
      /EEXIST|already exists|file already exists/iu,
    );
    assert.equal(readFileSync(path.join(targetRoot, "vault", "02-Resources", "a.md"), "utf8"), "new Runtime increment\n");
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown effects and running tasks without a checkpoint block the copy", () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-snapshot-blocked-"));
  try {
    const rows = snapshotRows();
    rows.push({
      key: "task:hold", kind: "task", id: "hold", context_id: "capture:a", context_version: 4,
      current_attempt: "attempt-hold", run_id: 4, state: "running", acceptance: { hash: "d".repeat(64) },
    });
    rows.push({
      key: "delivery:hold:result", kind: "delivery", task_id: "hold", state: "unknown", may_send: false,
    });
    const db = new DatabaseSync(path.join(root, "shared.db"));
    db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    seedRecords(db, rows);
    const snapshot = buildMigrationSnapshot({ db });
    db.close();
    const plan = planMigration(snapshot);
    assert.equal(plan.cutoverBlocked, true);
    assert.equal(plan.items.filter((item) => item.action === "hold_for_reconciliation").length, 2);
    const sourceRoot = writeSnapshotFixture(root, snapshot);
    assert.throws(() => rehearseCopy({ sourceRoot, targetRoot: path.join(root, "target") }), /禁止复制为可切换副本/);
    const reopened = new DatabaseSync(path.join(root, "shared.db"));
    reopened.exec("PRAGMA busy_timeout=5000;");
    try {
      assert.equal(JSON.stringify(buildMigrationSnapshot({ db: reopened })).includes("SECRET-MEMORY"), false);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
