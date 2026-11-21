// P3.4 deterministic host operations: read-only unified status, bounded delivery retry and migration data.
import { FORMAT, claimDelivery, openBusinessView } from "../../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { rows } from "../../../syno-autoloop-p0/kernel/evolve.ts";
import { commitLatest } from "../../../syno-autoloop-p0/kernel/store.ts";

export const STATUS_SCHEMA = "syno-host-status-v1";
export const MAX_DELIVERY_RETRY_DELAY_MS = 5 * 60 * 1000;
export const MAX_DELIVERY_RETRY_COUNT = 3;

const DOMAINS = ["capture", "knowledge", "idea", "project", "memory"];
const RULES = {
  "capture.request": { domain: "capture", rule: "公开文章收录" },
  "knowledge.query": { domain: "knowledge", rule: "对象知识查询" },
  "idea.request": { domain: "idea", rule: "想法对象处理" },
  "project.request": { domain: "project", rule: "项目执行" },
  "memory.request": { domain: "memory", rule: "记忆状态变更" },
};

function sanitizeReason(value, fallback = "unspecified") {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return text ? text.slice(0, 160) : fallback;
}

function readDetail(event) {
  try {
    const detail = JSON.parse(event?.detail ?? "{}");
    return detail && typeof detail === "object" ? detail : {};
  } catch {
    return {};
  }
}

function domainOfContext(contextId) {
  if (typeof contextId !== "string") return null;
  const prefix = contextId.slice(0, contextId.indexOf(":"));
  return DOMAINS.includes(prefix) ? prefix : null;
}

function activeTask(row) {
  return {
    taskId: row.id,
    contextId: row.context_id ?? null,
    contextVersion: row.context_version ?? null,
    attemptId: row.current_attempt ?? null,
    runId: row.run_id ?? null,
    state: row.state,
  };
}

function queuedFromFacts(view) {
  const queued = Object.fromEntries(DOMAINS.map((domain) => [domain, []]));
  for (const link of rows(view, "run_events")) {
    const run = view.get("runs", link.run_id);
    if (run?.state !== "queued") continue;
    const event = view.get("events", link.event_id);
    const rule = RULES[event?.type];
    if (!rule || run.rule !== rule.rule) continue;
    const detail = readDetail(event);
    const subject = typeof event.subject === "string" && event.subject ? event.subject : null;
    const objectId = detail.ideaId ?? detail.projectId ?? detail.memoryId ?? detail.documentId
      ?? (subject && subject.includes(":") ? subject : null);
    queued[rule.domain].push({
      messageId: detail.messageId ?? event.key,
      nativeRunId: run.id,
      objectId: objectId ?? null,
      contextId: subject,
      appId: detail.appId ?? null,
      chatId: detail.chatId ?? null,
      ownerId: detail.ownerId ?? null,
      worker: detail.worker ?? null,
      action: detail.action ?? null,
    });
  }
  for (const domain of DOMAINS) {
    queued[domain].sort((left, right) => left.nativeRunId - right.nativeRunId || left.messageId.localeCompare(right.messageId));
  }
  return queued;
}

function pendingDecision(row) {
  return {
    decisionId: row.decisionId ?? row.id,
    kind: row.decisionKind,
    originMessageId: row.originMessageId ?? null,
    expiresAt: row.expiresAt ?? null,
  };
}

function deliveryView(row, now) {
  const notBefore = Number.isFinite(row.not_before) ? row.not_before : null;
  return {
    deliveryKey: row.key,
    taskId: row.task_id ?? null,
    state: row.state,
    may_send: row.may_send === true,
    not_before: notBefore,
    claimable: row.state === "queued" && row.may_send === true && (notBefore === null || now >= notBefore),
    retryCount: Number.isSafeInteger(row.retry_count) ? row.retry_count : 0,
  };
}

/**
 * Read-only status. It never calls a Specialist `get()` (which may seal timed-out Decisions) and never claims,
 * settles or delivers anything. All lists are sorted so the snapshot can be compared byte-for-byte.
 */
export function buildHostStatus({ db, now = () => Date.now(), handover = null }) {
  const view = openBusinessView(db);
  const records = rows(view, "records");
  const tasks = records.filter((row) => row.kind === "task");
  const activeTasks = tasks.filter((row) => row.state !== "completed").map(activeTask)
    .sort((left, right) => left.taskId.localeCompare(right.taskId));
  const queued = queuedFromFacts(view);
  const domains = Object.fromEntries(DOMAINS.map((domain) => [domain, { activeTasks: [], queued: queued[domain] }]));
  const otherActiveTasks = [];
  for (const task of activeTasks) {
    const domain = domainOfContext(task.contextId);
    if (domain) domains[domain].activeTasks.push(task);
    else otherActiveTasks.push(task);
  }
  for (const domain of DOMAINS) {
    domains[domain].activeTasks.sort((left, right) => left.taskId.localeCompare(right.taskId));
  }

  const decisions = records
    .filter((row) => row.kind === "decision" && row.status === "pending")
    .map(pendingDecision)
    .sort((left, right) => left.decisionId.localeCompare(right.decisionId));

  const deliveries = records.filter((row) => row.kind === "delivery");
  const at = now();
  const queuedDeliveries = deliveries.filter((row) => row.state === "queued").map((row) => deliveryView(row, at))
    .sort((left, right) => left.deliveryKey.localeCompare(right.deliveryKey));
  const unknownDeliveries = deliveries.filter((row) => row.state === "unknown").map((row) => ({
    ...deliveryView(row, at),
    // Unknown may already have reached the provider; it is never advertised as sendable or auto-retried.
    may_send: false,
    claimable: false,
  })).sort((left, right) => left.deliveryKey.localeCompare(right.deliveryKey));
  const acceptedDeliveryCount = deliveries.filter((row) => row.state === "accepted").length;

  const handoverStatus = handover?.status ? handover.status() : null;
  const handoverHolds = handoverStatus?.holds ?? [];
  return {
    schema: STATUS_SCHEMA,
    frozen: handoverStatus?.control?.frozen ?? null,
    domains,
    activeTasks,
    otherActiveTasks,
    queued,
    decisions: { pending: decisions },
    deliveries: {
      queued: queuedDeliveries,
      unknown: unknownDeliveries,
      acceptedCount: acceptedDeliveryCount,
    },
    handover: handoverStatus,
    reconciliation: {
      deliveryUnknown: unknownDeliveries.map((delivery) => delivery.deliveryKey),
      handoverHolds: handoverHolds.map((item) => item.id),
      blocking: unknownDeliveries.length > 0 || handoverHolds.length > 0,
    },
  };
}

/**
 * Build the plain-data body of `migration-snapshot.json` (schema=1). It only reads the supplied shared DB and
 * keeps the safe migration disposition: completed history, queued requeue, verified checkpoints resume,
 * pending Decisions with one exact version, accepted deliveries dedupe and unknown delivery hold.
 */
export function buildMigrationSnapshot({ db }) {
  const view = openBusinessView(db);
  const records = rows(view, "records");
  const tasks = records.filter((row) => row.kind === "task");
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const inbox = records.filter((row) => row.kind === "inbox").map((row) => {
    const contextId = row.receipt?.contextId;
    return {
      id: row.id,
      objectId: contextId ?? `inbox:${row.app_id ?? "unknown"}:${row.id}`,
      state: contextId ? "processed" : "unknown",
      appId: row.app_id ?? null,
      messageId: row.id,
    };
  });

  const taskItems = tasks.map((task) => {
    const sourceSha256 = typeof task.sourceSha256 === "string" ? task.sourceSha256
      : typeof task.acceptance?.hash === "string" ? task.acceptance.hash : null;
    const resumable = task.state === "running" && typeof task.checkpoint === "string" && task.checkpoint && sourceSha256;
    return {
      id: task.id,
      objectId: task.context_id ?? `task:${task.id}`,
      state: resumable ? "running" : task.state,
      sourceState: task.state,
      ...(resumable ? { checkpoint: task.checkpoint, sourceSha256 } : {}),
    };
  });

  const decisionItems = records.filter((row) => row.kind === "decision").map((decision) => {
    let state = decision.status;
    let readOnly = false;
    if (decision.status === "consumed") {
      // planMigration's schema only knows pending / accepted / rejected; consumed is read-only history.
      state = "accepted";
      readOnly = true;
    } else if (["cancelled", "expired"].includes(decision.status)) {
      state = "rejected";
      readOnly = true;
    }
    const candidateVersions = (decision.candidates ?? [])
      .map((candidate) => candidate.expectedObjectVersion)
      .filter((version) => Number.isSafeInteger(version));
    const version = Number.isSafeInteger(decision.version) ? decision.version
      : Number.isSafeInteger(decision.binding?.expectedMemoryVersion) ? decision.binding.expectedMemoryVersion
        : candidateVersions.length && candidateVersions.every((value) => value === candidateVersions[0])
          ? candidateVersions[0] : null;
    return {
      id: decision.decisionId ?? decision.id,
      objectId: decision.originContext ?? `decision:${decision.decisionId ?? decision.id}`,
      state,
      sourceState: decision.status,
      readOnly,
      ...(Number.isSafeInteger(version) ? { version } : {}),
    };
  });

  const deliveryItems = records.filter((row) => row.kind === "delivery").map((delivery) => {
    const task = taskById.get(delivery.task_id);
    return {
      id: delivery.key,
      objectId: task?.context_id ?? `task:${delivery.task_id ?? "unknown"}`,
      state: delivery.state,
      taskId: delivery.task_id ?? null,
    };
  });

  const domainKinds = new Set(["idea_index", "project_index", "memory_index"]);
  const domainRecords = records.filter((row) => domainKinds.has(row.kind)).map((row) => {
    const version = row.kind === "memory_index" ? row.currentVersion : row.latestVersion;
    return {
      id: row.id,
      objectId: row.contextId ?? row.scope ?? `domain:${row.id}`,
      kind: row.kind,
      state: row.status ?? "current",
      ...(Number.isSafeInteger(version) ? { version } : {}),
    };
  });

  // Only already-enabled effect mappings are carried; this experiment creates no publishing mapping.
  const publishing = records
    .filter((row) => ["publishing", "publishing_mapping", "external_effect"].includes(row.kind) && row.enabled === true)
    .map((row) => ({
      id: row.id,
      objectId: row.objectId ?? row.contextId ?? row.targetObjectId ?? row.id,
      state: row.state ?? "unknown",
      ...(Number.isSafeInteger(row.version) ? { version: row.version } : {}),
    }));

  const byId = (left, right) => String(left.id).localeCompare(String(right.id));
  return {
    schema: 1,
    inbox: inbox.sort(byId),
    tasks: taskItems.sort(byId),
    decisions: decisionItems.sort(byId),
    deliveries: deliveryItems.sort(byId),
    publishing: publishing.sort(byId),
    domainRecords: domainRecords.sort(byId),
  };
}

export function openHostOperations({ db, now = () => Date.now(), handover = null, claim = claimDelivery }) {
  openBusinessView(db);
  const commit = (type, produce) => commitLatest(db, FORMAT, (current) => {
    const changes = produce(current);
    if (!changes.length) return [];
    return [{ version: 1, seq: current.seq + 1, at: now(), type, changes }];
  });
  const record = (key, row) => ({ table: "records", key, row });

  /**
   * The caller must explicitly prove the previous attempt never left the host (`attempted === false`).
   * The retry is bounded in both delay and count, stores a sanitized reason and is idempotent per command ID.
   */
  function scheduleDeliveryRetry({ deliveryKey, attempted, delayMs, reason = "unattempted-transport-failure", commandId }) {
    if (typeof deliveryKey !== "string" || !deliveryKey) throw new Error("退避必须指定 deliveryKey");
    if (typeof commandId !== "string" || !commandId) throw new Error("退避必须携带命令回执 ID");
    const requestedDelayMs = Number(delayMs);
    if (!Number.isFinite(requestedDelayMs) || requestedDelayMs < 0) throw new Error("退避延迟必须是非负数");
    const effectiveDelayMs = Math.min(Math.floor(requestedDelayMs), MAX_DELIVERY_RETRY_DELAY_MS);
    const at = now();
    const commandKey = `host-delivery-retry:${commandId}`;
    let outcome = null;
    commit("syno.delivery_retry", (current) => {
      const priorCommand = current.get("records", commandKey);
      if (priorCommand) {
        if (priorCommand.request_json !== JSON.stringify({
          deliveryKey, attempted, requestedDelayMs, reason, commandId,
        })) {
          throw new Error("同一退避命令编号已用于不同请求");
        }
        outcome = { status: "duplicate", duplicate: true, receipt: priorCommand.receipt };
        return [];
      }
      const delivery = current.get("records", deliveryKey);
      if (!delivery) throw new Error(`未知 delivery：${deliveryKey}`);
      if (delivery.state === "accepted") {
        outcome = { status: "accepted", duplicate: true, deliveryKey };
        return [];
      }
      if (delivery.state === "queued") {
        outcome = { status: "already_queued", duplicate: true, deliveryKey, may_send: delivery.may_send === true };
        return [];
      }
      if (attempted !== false) {
        outcome = { status: "held_unknown", may_send: false, deliveryKey, reason: "attempt_not_proven" };
        return [];
      }
      if (delivery.provider_message_id != null) {
        // A stable provider ID means reconcile, never resend.
        outcome = { status: "held_unknown", may_send: false, deliveryKey, reason: "provider_id_present" };
        return [];
      }
      if (!["unknown", "claimed"].includes(delivery.state)) {
        outcome = { status: "not_retryable", may_send: false, deliveryKey, reason: `state:${delivery.state}` };
        return [];
      }
      const retryCount = Number.isSafeInteger(delivery.retry_count) ? delivery.retry_count : 0;
      if (retryCount >= MAX_DELIVERY_RETRY_COUNT) {
        outcome = { status: "retry_exhausted", may_send: false, deliveryKey, retryCount };
        return [];
      }
      const sanitized = sanitizeReason(reason);
      const receipt = {
        commandId,
        deliveryKey,
        retryCount: retryCount + 1,
        notBefore: at + effectiveDelayMs,
        delayMs: effectiveDelayMs,
        reason: sanitized,
        at,
      };
      const retries = [...(Array.isArray(delivery.retries) ? delivery.retries : []), receipt]
        .slice(-MAX_DELIVERY_RETRY_COUNT);
      outcome = { status: "queued", duplicate: false, receipt, may_send: true };
      return [
        record(deliveryKey, {
          ...delivery,
          state: "queued",
          may_send: true,
          not_before: receipt.notBefore,
          retry_count: receipt.retryCount,
          retry_reason: sanitized,
          retry_receipt: receipt,
          retries,
        }),
        record(commandKey, {
          key: commandKey,
          kind: "host_retry_command",
          id: commandId,
          request_json: JSON.stringify({ deliveryKey, attempted, requestedDelayMs, reason, commandId }),
          receipt,
        }),
      ];
    });
    if (!outcome) throw new Error("退避命令没有产生结果");
    return outcome;
  }

  /** A not-yet-due retry never reaches the Specialist claim; an atomic claim stays the bottom layer's job. */
  function claimDueDelivery({ deliveryKey }) {
    if (typeof deliveryKey !== "string" || !deliveryKey) throw new Error("领取必须指定 deliveryKey");
    const delivery = openBusinessView(db).get("records", deliveryKey);
    if (!delivery) throw new Error(`未知 delivery：${deliveryKey}`);
    if (delivery.state === "accepted") return { status: "accepted", claimed: false, deliveryKey };
    if (delivery.state !== "queued" || delivery.may_send !== true) {
      return { status: "not_claimable", claimed: false, deliveryKey, state: delivery.state };
    }
    if (Number.isFinite(delivery.not_before) && now() < delivery.not_before) {
      return { status: "not_due", claimed: false, deliveryKey, notBefore: delivery.not_before };
    }
    const result = claim(db, { deliveryKey, now: now() });
    if (!result?.claimed) return { status: "not_claimed", claimed: false, deliveryKey };
    return { status: "claimed", claimed: true, deliveryKey };
  }

  return {
    status: (options = {}) => buildHostStatus({ db, now, handover: options.handover ?? handover }),
    migrationSnapshot: () => buildMigrationSnapshot({ db }),
    scheduleDeliveryRetry,
    claimDueDelivery,
  };
}
