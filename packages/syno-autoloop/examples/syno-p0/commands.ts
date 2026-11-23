// P0 experiment: business commands share the autoloop log and projection transaction.
import type { DatabaseSync } from "node:sqlite";
import type { Environment } from "../../kernel/credentials.ts";
import { decide } from "../../kernel/decide.ts";
import { Conflict, NotFound } from "../../kernel/errors.ts";
import { openView, commitLatest } from "../../kernel/store.ts";
import type { Change, Row, View } from "../../kernel/evolve.ts";

export const FORMAT = "syno-p0-v1";
type Receipt = Row & { duplicate?: boolean };
type CommandResult = { changes: Change[]; receipt: Receipt };
const record = (key: string, row: Row | null): Change => ({ table: "records", key, row });
const required = (view: View, key: string) => {
  const row = view.get("records", key);
  if (!row) throw new NotFound(`缺少业务记录：${key}`);
  return row;
};

export const openBusinessView = (db: DatabaseSync, format = FORMAT) => openView(db, format);

/** P1 host bridge: native run decisions and business commands append to the same fact log. */
export function executeNative(db: DatabaseSync, type: string, args: any[], now: number, environment: Environment) {
  let value: any;
  const view = commitLatest(db, FORMAT, (latest) => {
    const decided = decide(latest, { type, args }, now, environment);
    value = decided.value;
    return decided.facts;
  });
  return { view, value };
}

function command(
  db: DatabaseSync,
  commandId: string,
  now: number,
  request: Row,
  produce: (view: View) => CommandResult,
): { view: View; receipt: Receipt } {
  let receipt: Receipt | undefined;
  const requestJson = JSON.stringify(request);
  const view = commitLatest(db, FORMAT, (latest) => {
    const commandKey = `command:${commandId}`;
    const prior = latest.get("records", commandKey);
    if (prior) {
      if (prior.request_json !== requestJson) throw new Conflict("命令编号已用于不同内容");
      receipt = { ...prior.receipt, duplicate: true };
      return [];
    }
    const result = produce(latest);
    receipt = result.receipt;
    return [
      {
        version: 1,
        seq: latest.seq + 1,
        at: now,
        type: "syno.business_command",
        changes: [
          ...result.changes,
          record(commandKey, {
            key: commandKey,
            kind: "command",
            id: commandId,
            request_json: requestJson,
            receipt: result.receipt,
          }),
        ],
      },
    ];
  });
  if (!receipt) throw new Error("业务命令没有产生回执");
  return { view, receipt };
}

export function applyRoute(
  db: DatabaseSync,
  input: {
    commandId: string;
    appId: string;
    messageId: string;
    contextId: string;
    expectedVersion: number | null;
    ownerId: string;
    replyTo: string;
    now: number;
  },
) {
  const { now, ...request } = input;
  return command(db, input.commandId, now, request, (view) => {
    const inboxKey = `inbox:${JSON.stringify([input.appId, input.messageId])}`;
    const prior = view.get("records", inboxKey);
    if (prior) return { changes: [], receipt: { ...prior.receipt, duplicate: true } };
    const key = `context:${input.contextId}`;
    const context = view.get("records", key);
    const currentVersion = context?.version ?? null;
    if (currentVersion !== input.expectedVersion) throw new Conflict("对象版本已变化，请重读路由提议");
    const version = currentVersion === null ? 1 : currentVersion + 1;
    const next = {
      ...context,
      key,
      kind: "context",
      id: input.contextId,
      owner_id: input.ownerId,
      version,
      reply_to: input.replyTo,
      last_message_id: input.messageId,
    };
    const receipt = { contextId: input.contextId, version };
    return {
      changes: [
        record(key, next),
        record(inboxKey, { key: inboxKey, kind: "inbox", id: input.messageId, app_id: input.appId, receipt }),
      ],
      receipt,
    };
  });
}

// Test setup only: P1 must connect this record to an actually claimed native run.
export function createTask(
  db: DatabaseSync,
  input: {
    taskId: string;
    contextId: string;
    attemptId: string;
    runId?: number;
    runAttempt?: number;
    acceptance: { path: string; hash: string; remoteVersion: string };
    now: number;
  },
): View {
  return commitLatest(db, FORMAT, (view) => {
    const context = required(view, `context:${input.contextId}`);
    if ((input.runId === undefined) !== (input.runAttempt === undefined))
      throw new Conflict("原生 run 与 Attempt 序号必须同时提供");
    if (input.runId !== undefined) {
      const run = view.get("runs", input.runId);
      if (!run || run.state !== "claimed" || run.attempts + 1 !== input.runAttempt)
        throw new Conflict("Task 必须绑定当前已领取的原生 run");
    }
    const taskKey = `task:${input.taskId}`;
    const native = input.runId === undefined ? {} : { run_id: input.runId, run_attempt: input.runAttempt };
    const previous = view.get("records", taskKey);
    const changes: Change[] = [
      record(taskKey, {
        ...previous,
        key: taskKey,
        kind: "task",
        id: input.taskId,
        context_id: input.contextId,
        context_version: context.version,
        current_attempt: input.attemptId,
        ...native,
        acceptance: { ...input.acceptance },
        state: "running",
        cancel_requested: false,
      }),
      record(`attempt:${input.attemptId}`, {
        key: `attempt:${input.attemptId}`,
        kind: "attempt",
        id: input.attemptId,
        task_id: input.taskId,
        ...native,
        state: "running",
      }),
    ];
    return [{ version: 1, seq: view.seq + 1, at: input.now, type: "syno.test_task", changes }];
  });
}

// Host Result Lane only. Worker processes receive no database or host capability.
export function recordVerification(
  db: DatabaseSync,
  input: {
    verificationId: string;
    taskId: string;
    attemptId: string;
    actualPath: string;
    actualHash: string;
    actualRemoteVersion: string;
    actualFileHash?: string;
    qualityScore: number;
    now: number;
  },
): View {
  return commitLatest(db, FORMAT, (view) => {
    const key = `verification:${input.verificationId}`;
    if (view.get("records", key)) throw new Conflict("验收记录不可覆盖");
    const task = required(view, `task:${input.taskId}`);
    const acceptance = task.acceptance;
    const passed =
      acceptance.path === input.actualPath &&
      acceptance.hash === input.actualHash &&
      acceptance.remoteVersion === input.actualRemoteVersion;
    const row = {
      key,
      kind: "verification",
      id: input.verificationId,
      task_id: input.taskId,
      attempt_id: input.attemptId,
      context_version: task.context_version,
      evidence_source: "host_result_lane",
      passed,
      path: input.actualPath,
      hash: input.actualHash,
      remote_version: input.actualRemoteVersion,
      ...(input.actualFileHash === undefined ? {} : { file_hash: input.actualFileHash }),
      quality_score: input.qualityScore,
    };
    return [{ version: 1, seq: view.seq + 1, at: input.now, type: "syno.verification", changes: [record(key, row)] }];
  });
}

export function reportWorkerDone(db: DatabaseSync, input: { taskId: string; attemptId: string; now: number }): View {
  return commitLatest(db, FORMAT, (view) => {
    const attempt = required(view, `attempt:${input.attemptId}`);
    if (attempt.task_id !== input.taskId) throw new Conflict("Attempt 不属于该 Task");
    return [
      {
        version: 1,
        seq: view.seq + 1,
        at: input.now,
        type: "syno.worker_done",
        changes: [record(`attempt:${input.attemptId}`, { ...attempt, state: "done" })],
      },
    ];
  });
}

export function finalizeTask(
  db: DatabaseSync,
  input: {
    commandId: string;
    taskId: string;
    attemptId: string;
    contextVersion: number;
    verificationId: string;
    now: number;
  },
) {
  const { now, ...request } = input;
  return command(db, input.commandId, now, request, (view) => {
    const task = required(view, `task:${input.taskId}`);
    if (task.current_attempt !== input.attemptId) throw new Conflict("不是当前 Attempt");
    if (task.cancel_requested) throw new Conflict("取消已请求，不能再提交成功终态");
    if (task.state !== "running") throw new Conflict("任务状态不允许重复结算");
    const context = required(view, `context:${task.context_id}`);
    if (context.version !== input.contextVersion || task.context_version !== input.contextVersion)
      throw new Conflict("对象版本已变化，请重新验收");
    const verification = required(view, `verification:${input.verificationId}`);
    if (
      verification.task_id !== input.taskId ||
      verification.attempt_id !== input.attemptId ||
      verification.context_version !== input.contextVersion ||
      !verification.passed
    )
      throw new Conflict("必需证据未通过或与当前 Attempt 不匹配");
    const deliveryKey = `delivery:${input.taskId}:result`;
    return {
      changes: [
        record(`task:${input.taskId}`, {
          ...task,
          state: "completed",
          completed_attempt: input.attemptId,
          verification_id: input.verificationId,
        }),
        record(deliveryKey, {
          key: deliveryKey,
          kind: "delivery",
          task_id: input.taskId,
          state: "queued",
          may_send: true,
          provider_message_id: null,
        }),
      ],
      receipt: { taskId: input.taskId, state: "completed", deliveryKey },
    };
  });
}

export function requestCancel(db: DatabaseSync, input: { taskId: string; now: number }): View {
  return commitLatest(db, FORMAT, (view) => {
    const task = required(view, `task:${input.taskId}`);
    if (task.state === "completed") throw new Conflict("任务已完成，不能倒退为取消");
    return [
      {
        version: 1,
        seq: view.seq + 1,
        at: input.now,
        type: "syno.cancel_requested",
        changes: [record(`task:${input.taskId}`, { ...task, state: "cancel_requested", cancel_requested: true })],
      },
    ];
  });
}

export function markDeliveryUnknown(db: DatabaseSync, input: { deliveryKey: string; now: number }): View {
  return commitLatest(db, FORMAT, (view) => {
    const delivery = required(view, input.deliveryKey);
    if (delivery.state === "accepted" || delivery.state === "unknown") return [];
    return [
      {
        version: 1,
        seq: view.seq + 1,
        at: input.now,
        type: "syno.delivery_unknown",
        changes: [record(input.deliveryKey, { ...delivery, state: "unknown", may_send: false })],
      },
    ];
  });
}

export function claimDelivery(db: DatabaseSync, input: { deliveryKey: string; now: number }) {
  let claimed = false;
  const view = commitLatest(db, FORMAT, (current) => {
    const delivery = required(current, input.deliveryKey);
    if (delivery.state !== "queued" || delivery.may_send !== true) return [];
    claimed = true;
    return [
      {
        version: 1,
        seq: current.seq + 1,
        at: input.now,
        type: "syno.delivery_claimed",
        changes: [record(input.deliveryKey, { ...delivery, state: "unknown", may_send: false })],
      },
    ];
  });
  return { view, claimed };
}

export function acceptDelivery(
  db: DatabaseSync,
  input: { deliveryKey: string; providerMessageId: string | null; capability: string; now: number },
): View {
  return commitLatest(db, FORMAT, (view) => {
    const delivery = required(view, input.deliveryKey);
    if (delivery.state === "accepted") {
      if (delivery.provider_message_id === input.providerMessageId && delivery.capability === input.capability)
        return [];
      throw new Conflict("投递已被接受，不能覆盖回执");
    }
    if (delivery.state !== "unknown" && delivery.state !== "queued") throw new Conflict("投递状态不允许确认");
    return [
      {
        version: 1,
        seq: view.seq + 1,
        at: input.now,
        type: "syno.delivery_accepted",
        changes: [
          record(input.deliveryKey, {
            ...delivery,
            state: "accepted",
            may_send: false,
            provider_message_id: input.providerMessageId,
            capability: input.capability,
          }),
        ],
      },
    ];
  });
}

export function reconcileDelivery(
  db: DatabaseSync,
  input: { deliveryKey: string; providerMessageId: string; now: number },
): View {
  return commitLatest(db, FORMAT, (view) => {
    const delivery = required(view, input.deliveryKey);
    if (delivery.state === "accepted") {
      if (delivery.provider_message_id === input.providerMessageId) return [];
      throw new Conflict("投递回执冲突，不能覆盖已接受的编号");
    }
    if (delivery.state !== "unknown" && delivery.state !== "queued") throw new Conflict("投递状态不允许对账");
    return [
      {
        version: 1,
        seq: view.seq + 1,
        at: input.now,
        type: "syno.delivery_reconciled",
        changes: [
          record(input.deliveryKey, {
            ...delivery,
            state: "accepted",
            may_send: false,
            provider_message_id: input.providerMessageId,
          }),
        ],
      },
    ];
  });
}
