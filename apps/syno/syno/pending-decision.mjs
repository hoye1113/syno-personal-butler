import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const DEFAULT_DECISION_TTL_MS = 24 * 60 * 60 * 1_000;
const DECISION_RESERVATION_TTL_MS = 5 * 60 * 1_000;
// trust-but-clarify：这些回复只用于"系统歧义澄清"（收录撞重复/多方案/信息不足），
// 不再承载审批/双审批语义。SIMPLE_APPROVAL 即"按当前方案执行"。
const SIMPLE_APPROVAL = new Set(["确认", "同意", "收录", "可以"]);
const OPTION_REPLIES = new Map([
  ["新建笔记", "create"],
  ["分开保存", "keep-separate"],
  ["追加来源", "append-source"],
  ["仅关联", "link-only"],
]);

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
    || OPTION_REPLIES.has(normalized)
    || /^(?:确认|拒绝)\s+\d+$/u.test(normalized)
    || /^修改：.+$/u.test(normalized);
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
        kind: "single",
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
        throw decisionError("PENDING_DECISION_AMBIGUOUS", "存在多个待确认事项，请使用“确认 2”指明");
      }
      if (new Date(selected.expiresAt).getTime() <= this.clock().getTime()) {
        throw decisionError("PENDING_DECISION_EXPIRED", "待确认事项已过期");
      }
      // D2 防伪：仅当该澄清事项绑定了差异指纹时，确认前核对权威 diff 未变。当前收录冲突
      // 澄清在执行前暂停（digest 为空→跳过）；保留此校验是为了任何会预先生成差异摘要的
      // 澄清流仍受防伪保护。
      if (selected.diffDigest) {
        const authoritativeDigest = typeof getDiffDigest === "function"
          ? await getDiffDigest(selected.jobId)
          : diffDigest;
        if (!authoritativeDigest || authoritativeDigest !== selected.diffDigest) {
          throw decisionError("PENDING_DECISION_DIGEST_CHANGED", "差异摘要已变化，必须重新确认");
        }
      }
      const modification = /^修改：(.*)$/u.exec(normalized);
      const option = OPTION_REPLIES.get(normalized);
      if (option && !selected.options.includes(option)) {
        throw decisionError("PENDING_DECISION_OPTION_INVALID", "当前方案不支持该处理方式");
      }
      const action = option ? "select" : modification ? "modify" : numbered?.[1] === "拒绝" ? "reject" : "approve";
      selected.reservedAt = this.clock().toISOString();
      return {
        action,
        decision: { ...selected },
        code: selected.approvalCode,
        ...(option ? { option } : {}),
        ...(modification ? { modification: modification[1].trim() } : {}),
      };
    });
  }
}

export { DECISION_RESERVATION_TTL_MS, DEFAULT_DECISION_TTL_MS, PendingDecisionStore, isDecisionReply };
