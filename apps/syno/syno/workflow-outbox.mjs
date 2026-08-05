import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { inspectRemoteContent } from "./sensitive-content.mjs";

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

function eventIdFor(key) {
  return `outbox-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

function safePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => key !== "text")) {
    throw Object.assign(new Error("Outbox redactedPayload 只允许 text"), { code: "OUTBOX_PAYLOAD_INVALID" });
  }
  const text = String(payload.text || "");
  if (!text || text.length > 4_000) throw Object.assign(new Error("Outbox 文本必须在 1–4000 字符内"), { code: "OUTBOX_PAYLOAD_INVALID" });
  return inspectRemoteContent(text).safe
    ? { text }
    : { text: "Syno 状态已更新；通知内容包含敏感信息，已隐藏，请在本机控制台查看。" };
}

class WorkflowOutbox {
  constructor({
    root = path.join(PATHS.stateRoot, "workflow-outbox"),
    clock = () => new Date(),
    leaseMs = 5 * 60 * 1_000,
  } = {}) {
    this.root = root;
    this.clock = clock;
    this.leaseMs = Math.max(30_000, Number(leaseMs) || 5 * 60 * 1_000);
    this.tail = Promise.resolve();
  }

  #file(eventId) {
    if (!/^outbox-[a-f0-9]{20}$/.test(eventId)) throw new Error("Outbox Event ID 无效");
    return path.join(this.root, `${eventId}.json`);
  }

  async #get(eventId) {
    try {
      return JSON.parse(await fs.readFile(this.#file(eventId), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  #leaseFile(eventId) {
    return `${this.#file(eventId)}.lease`;
  }

  async #acquireLease(eventId) {
    await fs.mkdir(this.root, { recursive: true });
    const leaseFile = this.#leaseFile(eventId);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const leaseId = randomUUID();
      const now = this.clock();
      try {
        const handle = await fs.open(leaseFile, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({
            leaseId,
            eventId,
            acquiredAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + this.leaseMs).toISOString(),
          }));
        } finally {
          await handle.close();
        }
        return { leaseId, leaseFile };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        let expired = false;
        try {
          const lease = JSON.parse(await fs.readFile(leaseFile, "utf8"));
          expired = new Date(lease.expiresAt).getTime() <= now.getTime();
        } catch {
          const stat = await fs.stat(leaseFile).catch(() => null);
          expired = Boolean(stat && stat.mtimeMs + this.leaseMs <= now.getTime());
        }
        if (!expired) return null;
        await fs.rm(leaseFile, { force: true });
      }
    }
    return null;
  }

  async #releaseLease(lease) {
    if (!lease) return;
    try {
      const current = JSON.parse(await fs.readFile(lease.leaseFile, "utf8"));
      if (current.leaseId === lease.leaseId) await fs.rm(lease.leaseFile, { force: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async enqueue(input) {
    const idempotencyKey = String(input.idempotencyKey || `${input.workflowId}:${input.eventType}:${input.targetChannel}`);
    const eventId = eventIdFor(idempotencyKey);
    const existing = await this.#get(eventId);
    if (existing) return existing;
    const now = this.clock().toISOString();
    const record = {
      eventId,
      workflowId: String(input.workflowId),
      eventType: String(input.eventType),
      ownerKey: String(input.ownerKey),
      targetChannel: String(input.targetChannel),
      threadKey: String(input.threadKey || "main"),
      redactedPayload: safePayload(input.redactedPayload),
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      ...(input.deliveryTarget ? { deliveryTarget: input.deliveryTarget } : {}),
      idempotencyKey,
    };
    await atomicJson(this.#file(eventId), record);
    return record;
  }

  async list({ includeDelivered = true } = {}) {
    let entries;
    try {
      entries = await fs.readdir(this.root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const records = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/^outbox-[a-f0-9]{20}\.json$/.test(entry.name)) continue;
      // C2: per-file tolerance — a single corrupt/half-written .json must not abort the whole
      // directory (which would stall ALL pending events). Skip the bad file; delivery continues.
      let item;
      try {
        item = JSON.parse(await fs.readFile(path.join(this.root, entry.name), "utf8"));
      } catch {
        continue;
      }
      if (!includeDelivered && item.status === "delivered") continue;
      records.push(item);
    }
    return records.sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  }

  async deliverDue(deliver, { limit = 50, onFailedRetryable, onFailedTerminal } = {}) {
    const operation = this.tail.catch(() => {}).then(async () => {
      const now = this.clock();
      const due = (await this.list({ includeDelivered: false }))
        .filter((item) => item.status !== "failed_terminal"
          && (!item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now.getTime()))
        .slice(0, Math.max(1, Number(limit) || 50));
      let delivered = 0;
      let retryable = 0;
      let terminal = 0;
      for (const item of due) {
        const lease = await this.#acquireLease(item.eventId);
        if (!lease) continue;
        try {
          const current = await this.#get(item.eventId);
          if (!current || current.status === "delivered" || current.status === "failed_terminal") continue;
          // 镜像 ChannelDeliveryOutbox：deliver 抛错按 retryable（默认）归类，除非显式 retryable:false。
          let result;
          try {
            result = await deliver(current);
          } catch (error) {
            result = { delivered: false, retryable: error?.retryable !== false, reason: error?.code || "OUTBOX_DELIVERY_FAILED" };
          }
          if (result?.delivered) {
            await atomicJson(this.#file(item.eventId), { ...current, status: "delivered", deliveredAt: now.toISOString(), attempts: current.attempts + 1 });
            delivered += 1;
          } else if (result?.retryable !== false) {
            // 瞬时失败：退避后重试（不再无条件回 pending 静默无限重试），经 onFailedRetryable 可观测。
            const attempts = current.attempts + 1;
            const delayMs = Math.min(60 * 60 * 1_000, 30_000 * (2 ** Math.min(7, attempts - 1)));
            const settled = { ...current, status: "failed_retryable", attempts, nextAttemptAt: new Date(now.getTime() + delayMs).toISOString(), lastError: { code: String(result?.reason || "OUTBOX_DELIVERY_FAILED"), message: String(result?.reason || "渠道未确认投递") } };
            await atomicJson(this.#file(item.eventId), settled);
            try { await onFailedRetryable?.(settled); } catch { /* best-effort：落盘已持久，勿中断批次 */ }
            retryable += 1;
          } else {
            // 结构性失败（目标渠道永久缺失、重试耗尽等）：终态，停止重试，经 onFailedTerminal 告警。
            const settled = { ...current, status: "failed_terminal", attempts: current.attempts + 1, lastError: { code: String(result?.reason || "OUTBOX_TERMINAL"), message: String(result?.reason || "渠道投递终态失败") } };
            await atomicJson(this.#file(item.eventId), settled);
            try { await onFailedTerminal?.(settled); } catch { /* best-effort：落盘已持久，勿中断批次 */ }
            terminal += 1;
          }
        } finally {
          await this.#releaseLease(lease);
        }
      }
      return { processed: delivered + retryable + terminal, delivered, retryable, terminal };
    });
    this.tail = operation;
    return operation;
  }
}

export { WorkflowOutbox, eventIdFor };
