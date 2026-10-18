import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { recordVersion } from "./domain-records.mjs";
import { PATHS } from "./paths.mjs";

const DEFAULT_DECISION_TTL_MS = 24 * 60 * 60 * 1_000;
const DECISION_RESERVATION_TTL_MS = 5 * 60 * 1_000;
function decisionVersion(item) {
  return recordVersion({ id: item.id, businessVersion: item.businessVersion, diffDigest: item.diffDigest, summary: item.summary, options: item.options });
}

function decisionError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

class PendingDecisionStore {
  constructor({ file = path.join(PATHS.stateRoot, "pending-decisions.json"), clock = () => new Date() } = {}) {
    this.file = file;
    this.clock = clock;
    this.tail = Promise.resolve();
  }

  async #list() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, "utf8"));
      return Array.isArray(parsed.decisions) ? parsed.decisions : [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async #state() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, "utf8"));
      return {
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        presentations: Array.isArray(parsed.presentations) ? parsed.presentations : [],
      };
    } catch (error) {
      if (error.code === "ENOENT") return { decisions: [], presentations: [] };
      throw error;
    }
  }

  async list({ ownerKey, threadKey, includeConsumed = false } = {}) {
    return (await this.#list()).filter((item) =>
      (!ownerKey || item.ownerKey === ownerKey)
      && (!threadKey || item.threadKey === threadKey)
      && (includeConsumed || !item.consumedAt));
  }

  async #mutate(operation) {
    const current = this.tail.catch(() => {}).then(async () => {
      const state = await this.#state();
      const result = await operation(state.decisions, state);
      await atomicJson(this.file, { version: 1, decisions: state.decisions, presentations: state.presentations });
      return result;
    });
    this.tail = current;
    return current;
  }

  async add(input) {
    return this.#mutate(async (decisions, state) => {
      const now = this.clock();
      const existing = decisions.find((item) =>
        !item.consumedAt
        && item.jobId === String(input.jobId)
        && item.ownerKey === String(input.ownerKey)
        && item.threadKey === String(input.threadKey || "main")
        && item.phase === String(input.phase || "execution"));
      if (existing) return existing;
      const record = {
        id: `decision-${randomUUID().slice(0, 8)}`,
        jobId: String(input.jobId),
        ownerKey: String(input.ownerKey),
        threadKey: String(input.threadKey || "main"),
        kind: input.kind || "single",
        ...(input.plan ? { plan: input.plan, creationMessageId: input.creationMessageId } : {}),
        phase: String(input.phase || "execution"),
        summary: String(input.summary || ""),
        options: Array.isArray(input.options) ? input.options : [],
        diffDigest: input.diffDigest || undefined,
        ...(input.businessVersion ? { businessVersion: String(input.businessVersion) } : {}),
        approvalCode: String(input.approvalCode || "").toUpperCase(),
        ...(input.artifactId ? { artifactId: String(input.artifactId) } : {}),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + Number(input.ttlMs || DEFAULT_DECISION_TTL_MS)).toISOString(),
      };
      decisions.push(record);
      return record;
    });
  }

  async present({ ownerKey, threadKey = "main", channel = "unknown", businessVersion = "1" } = {}) {
    return this.#mutate(async (decisions, state) => {
      // 同一毫秒内创建的两条 decision 的 createdAt 完全相同；此前用随机 id 兜底，present 顺序会
      // 随 id 抖动（2026-10-16 flaky：连加两条时约 1/5 概率顺序反）。改为按存储顺序（插入序）兜底，
      // 既确定性又符合「先来先展示」的语义。
      const active = decisions
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.consumedAt
          && item.ownerKey === String(ownerKey)
          && item.threadKey === String(threadKey))
        .sort((a, b) => a.item.createdAt.localeCompare(b.item.createdAt) || a.index - b.index)
        .map(({ item }) => item);
      const orderedDecisionIds = active.map((item) => item.id);
      const effectiveBusinessVersion = businessVersion === "1"
        ? active.map((item) => item.businessVersion || "1").join("|") || "1"
        : String(businessVersion);
      const existing = state.presentations.find((item) => item.ownerKey === String(ownerKey)
        && item.threadKey === String(threadKey)
        && item.channel === String(channel)
        && item.businessVersion === effectiveBusinessVersion
        && JSON.stringify(item.orderedDecisionIds) === JSON.stringify(orderedDecisionIds));
      const presentation = existing || {
        presentationId: `presentation-${createHash("sha256").update(`${ownerKey}\0${threadKey}\0${channel}\0${effectiveBusinessVersion}\0${orderedDecisionIds.join(",")}`, "utf8").digest("hex").slice(0, 16)}`,
        version: 1,
        ownerKey: String(ownerKey),
        threadKey: String(threadKey),
        channel: String(channel),
        businessVersion: effectiveBusinessVersion,
        orderedDecisionIds,
        createdAt: this.clock().toISOString(),
      };
      if (!existing) state.presentations.push(presentation);
      active.forEach((item, index) => Object.assign(item, { presentationId: presentation.presentationId, presentationIndex: index + 1 }));
      return { ...presentation, decisions: active.map((item, index) => ({ ...item, presentationIndex: index + 1 })) };
    });
  }

  async update(id, patch) {
    return this.#mutate(async (decisions) => {
      const record = decisions.find((item) => item.id === id);
      if (!record) throw decisionError("PENDING_DECISION_NOT_FOUND", "待确认事项不存在");
      for (const [key, value] of Object.entries(patch || {})) {
        if (value === null || value === undefined) delete record[key];
        else record[key] = key === "approvalCode" ? String(value).toUpperCase() : value;
      }
      return record;
    });
  }

  async reserve(id, { ownerKey, threadKey, version } = {}) {
    return this.#mutate(async (decisions) => {
      const item = decisions.find((d) => d.id === id && d.ownerKey === ownerKey && d.threadKey === threadKey && !d.consumedAt);
      if (!item || Date.parse(item.expiresAt) <= this.clock().getTime()) throw decisionError("PENDING_DECISION_EXPIRED", "事项不存在、已处理或已过期");
      if (item.reservedAt && Date.parse(item.reservedAt) > this.clock().getTime() - DECISION_RESERVATION_TTL_MS) throw decisionError("PENDING_DECISION_BUSY", "事项正在处理中");
      const current = decisionVersion(item);
      if (current !== version) throw decisionError("PENDING_DECISION_VERSION_CHANGED", "方案已经变化，请重新查询");
      item.reservedAt = this.clock().toISOString();
      return { ...item };
    });
  }

}

export { DECISION_RESERVATION_TTL_MS, DEFAULT_DECISION_TTL_MS, PendingDecisionStore, decisionVersion };
