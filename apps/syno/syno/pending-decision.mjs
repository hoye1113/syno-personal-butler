import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
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

function matchesProjectScope(item, projectRef) {
  if (projectRef === undefined) return true;
  return String(item?.projectRef || "") === String(projectRef || "");
}

function samePersistedProjectScope(item, projectRef) {
  if (projectRef === undefined) return item?.projectRef === undefined;
  return matchesProjectScope(item, projectRef);
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

  async list({ ownerKey, threadKey, projectRef, includeConsumed = false } = {}) {
    return (await this.#list()).filter((item) =>
      (!ownerKey || item.ownerKey === ownerKey)
      && (!threadKey || item.threadKey === threadKey)
      && matchesProjectScope(item, projectRef)
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
        && item.phase === String(input.phase || "execution")
        && samePersistedProjectScope(item, input.projectRef));
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
        ...(input.businessVersion ? { businessVersion: String(input.businessVersion) } : {}),
        ...(input.projectRef !== undefined ? { projectRef: String(input.projectRef || "") } : {}),
        approvalCode: String(input.approvalCode || "").toUpperCase(),
        ...(input.artifactId ? { artifactId: String(input.artifactId) } : {}),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + Number(input.ttlMs || DEFAULT_DECISION_TTL_MS)).toISOString(),
      };
      decisions.push(record);
      return record;
    });
  }

  async present({ ownerKey, threadKey = "main", channel = "unknown", businessVersion = "1", projectRef } = {}) {
    return this.#mutate(async (decisions, state) => {
      const active = decisions
        .filter((item) => !item.consumedAt
          && item.ownerKey === String(ownerKey)
          && item.threadKey === String(threadKey)
          && matchesProjectScope(item, projectRef))
        .sort((a, b) => `${a.createdAt}\0${a.id}`.localeCompare(`${b.createdAt}\0${b.id}`));
      const orderedDecisionIds = active.map((item) => item.id);
      const effectiveBusinessVersion = businessVersion === "1"
        ? active.map((item) => item.businessVersion || "1").join("|") || "1"
        : String(businessVersion);
      const existing = state.presentations.find((item) => item.ownerKey === String(ownerKey)
        && item.threadKey === String(threadKey)
        && item.channel === String(channel)
        && item.businessVersion === effectiveBusinessVersion
        && matchesProjectScope(item, projectRef)
        && JSON.stringify(item.orderedDecisionIds) === JSON.stringify(orderedDecisionIds));
      const projectScope = projectRef === undefined ? "<all>" : String(projectRef || "<none>");
      const presentation = existing || {
        presentationId: `presentation-${createHash("sha256").update(`${ownerKey}\0${threadKey}\0${channel}\0${effectiveBusinessVersion}\0${projectScope}\0${orderedDecisionIds.join(",")}`, "utf8").digest("hex").slice(0, 16)}`,
        version: 1,
        ownerKey: String(ownerKey),
        threadKey: String(threadKey),
        channel: String(channel),
        businessVersion: effectiveBusinessVersion,
        orderedDecisionIds,
        ...(projectRef !== undefined ? { projectRef: String(projectRef || "") } : {}),
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

  async parse(text, { ownerKey, threadKey = "main", channel = "unknown", projectRef, presentationId, businessVersion, diffDigest, getDiffDigest } = {}) {
    const normalized = String(text || "").trim();
    if (!isDecisionReply(normalized)) throw decisionError("PENDING_DECISION_NOT_A_REPLY", "消息不是确定性审批回复");
    return this.#mutate(async (decisions, state) => {
      const reservationCutoff = this.clock().getTime() - DECISION_RESERVATION_TTL_MS;
      for (const item of decisions) {
        if (item.reservedAt && new Date(item.reservedAt).getTime() <= reservationCutoff) delete item.reservedAt;
      }
      const allBound = decisions.filter((item) => item.ownerKey === ownerKey
        && item.threadKey === threadKey
        && matchesProjectScope(item, projectRef));
      let available = allBound.filter((item) => !item.consumedAt && !item.reservedAt);
      if (!available.length) {
        if (allBound.length) throw decisionError("PENDING_DECISION_REPLAYED", "该待确认事项已处理，拒绝重放");
        throw decisionError("PENDING_DECISION_NOT_FOUND", "当前会话没有可处理的待确认事项");
      }
      const selectedPresentation = presentationId
        ? state.presentations.find((item) => item.presentationId === presentationId
          && item.channel === String(channel)
          && matchesProjectScope(item, projectRef))
        : null;
      if (selectedPresentation) {
        const order = new Map(selectedPresentation.orderedDecisionIds.map((id, index) => [id, index]));
        available = available.sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
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
      if (businessVersion && selected.businessVersion && String(businessVersion) !== String(selected.businessVersion)) {
        throw decisionError("PENDING_DECISION_VERSION_CHANGED", "业务版本已变化，必须重新展示确认事项");
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
