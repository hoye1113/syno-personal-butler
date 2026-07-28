import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const DEFAULT_DECISION_TTL_MS = 24 * 60 * 60 * 1_000;
const DECISION_RESERVATION_TTL_MS = 5 * 60 * 1_000;
const SIMPLE_APPROVAL = new Set(["确认", "同意", "收录", "可以"]);

function decisionError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

function isDecisionReply(text) {
  const normalized = String(text || "").trim();
  return SIMPLE_APPROVAL.has(normalized)
    || /^(?:确认|拒绝)\s+\d+$/u.test(normalized)
    || /^修改：.+$/u.test(normalized)
    || normalized === "确认生成差异"
    || /^确认应用\s+[A-F0-9]{6}$/iu.test(normalized);
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

  async list({ ownerKey, threadKey, includeConsumed = false } = {}) {
    return (await this.#list()).filter((item) =>
      (!ownerKey || item.ownerKey === ownerKey)
      && (!threadKey || item.threadKey === threadKey)
      && (includeConsumed || !item.consumedAt));
  }

  async #mutate(operation) {
    const current = this.tail.catch(() => {}).then(async () => {
      const decisions = await this.#list();
      const result = await operation(decisions);
      await atomicJson(this.file, { version: 1, decisions });
      return result;
    });
    this.tail = current;
    return current;
  }

  async add(input) {
    return this.#mutate(async (decisions) => {
      const now = this.clock();
      const record = {
        id: `decision-${randomUUID().slice(0, 8)}`,
        jobId: String(input.jobId),
        ownerKey: String(input.ownerKey),
        threadKey: String(input.threadKey || "main"),
        kind: input.kind === "double" ? "double" : "single",
        phase: String(input.phase || "execution"),
        summary: String(input.summary || ""),
        options: Array.isArray(input.options) ? input.options : [],
        diffDigest: input.diffDigest || undefined,
        approvalCode: String(input.approvalCode || "").toUpperCase(),
        ...(input.artifactId ? { artifactId: String(input.artifactId) } : {}),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + Number(input.ttlMs || DEFAULT_DECISION_TTL_MS)).toISOString(),
      };
      decisions.push(record);
      return record;
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

  async parse(text, { ownerKey, threadKey = "main", diffDigest, getDiffDigest } = {}) {
    const normalized = String(text || "").trim();
    if (!isDecisionReply(normalized)) throw decisionError("PENDING_DECISION_NOT_A_REPLY", "消息不是确定性审批回复");
    return this.#mutate(async (decisions) => {
      const reservationCutoff = this.clock().getTime() - DECISION_RESERVATION_TTL_MS;
      for (const item of decisions) {
        if (item.reservedAt && new Date(item.reservedAt).getTime() <= reservationCutoff) delete item.reservedAt;
      }
      const allBound = decisions.filter((item) => item.ownerKey === ownerKey && item.threadKey === threadKey);
      let available = allBound.filter((item) => !item.consumedAt && !item.reservedAt);
      if (!available.length) {
        if (allBound.length) throw decisionError("PENDING_DECISION_REPLAYED", "该待确认事项已处理，拒绝重放");
        throw decisionError("PENDING_DECISION_NOT_FOUND", "当前会话没有可处理的待确认事项");
      }
      const numbered = /^(确认|拒绝)\s+(\d+)$/u.exec(normalized);
      let selected;
      if (numbered) {
        selected = available[Number(numbered[2]) - 1];
        if (!selected) throw decisionError("PENDING_DECISION_INDEX_INVALID", "待确认事项编号无效");
      } else if (available.length === 1) {
        selected = available[0];
      } else {
        const explicit = /^确认应用\s+([A-F0-9]{6})$/iu.exec(normalized);
        if (explicit) selected = available.find((item) => item.approvalCode === explicit[1].toUpperCase());
        if (!selected) throw decisionError("PENDING_DECISION_AMBIGUOUS", "存在多个待确认事项，请使用“确认 2”或明确审批码");
      }
      if (new Date(selected.expiresAt).getTime() <= this.clock().getTime()) {
        throw decisionError("PENDING_DECISION_EXPIRED", "待确认事项已过期");
      }
      if (normalized === "确认生成差异" && (selected.kind !== "double" || selected.phase !== "execution")) {
        throw decisionError("PENDING_DECISION_PHASE_INVALID", "当前事项不处于生成差异阶段");
      }
      const final = /^确认应用\s+([A-F0-9]{6})$/iu.exec(normalized);
      if (selected.kind === "double" && selected.phase === "execution" && normalized !== "确认生成差异") {
        throw decisionError("PENDING_DECISION_PHASE_INVALID", "高风险任务只能回复“确认生成差异”进入第一阶段");
      }
      if (selected.kind === "double" && selected.phase === "merge" && !final) {
        throw decisionError("PENDING_DECISION_PHASE_INVALID", "高风险差异只能使用“确认应用 六位码”完成第二阶段");
      }
      if (final) {
        if (selected.kind !== "double" || selected.phase !== "merge") throw decisionError("PENDING_DECISION_PHASE_INVALID", "当前事项不处于应用差异阶段");
        if (final[1].toUpperCase() !== selected.approvalCode) throw decisionError("PENDING_DECISION_CODE_INVALID", "审批码无效");
        const authoritativeDigest = typeof getDiffDigest === "function"
          ? await getDiffDigest(selected.jobId)
          : diffDigest;
        if (!authoritativeDigest || authoritativeDigest !== selected.diffDigest) {
          throw decisionError("PENDING_DECISION_DIGEST_CHANGED", "差异摘要已变化，必须重新确认");
        }
      }
      const modification = /^修改：(.*)$/u.exec(normalized);
      const action = modification ? "modify" : numbered?.[1] === "拒绝" ? "reject" : "approve";
      selected.reservedAt = this.clock().toISOString();
      return {
        action,
        decision: { ...selected },
        code: selected.approvalCode,
        ...(modification ? { modification: modification[1].trim() } : {}),
      };
    });
  }
}

export { DECISION_RESERVATION_TTL_MS, DEFAULT_DECISION_TTL_MS, PendingDecisionStore, isDecisionReply };
