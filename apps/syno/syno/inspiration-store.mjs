import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";

const INSPIRATION_ID_PATTERN = /^inspiration-\d{8}-[a-f0-9]{8}$/;
const FEEDBACK_VALUES = new Set(["useful", "neutral", "not_useful"]);
const FEEDBACK_TTL_MS = 24 * 60 * 60 * 1000;
const SAMPLED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// D12（2026-09-01）：今日灵感卡片的独立持久仓（ops/content/inspirations/）。
// 不复用 OutputOpportunity：其契约 additionalProperties:false、status/format 是创作生命周期枚举，
// 且 isActionableOutput 会把 suggested 记录错报为「推进创作」信号（实证见产品精简计划 D12）。
// 本仓同时是采样记忆：近 30 天记录的 sampledRefs 即「已回访」集合，不另建索引。
class InspirationStore {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
    this.opsRoot = opsRoot;
    this.clock = clock;
  }

  #file(id, opsRoot) {
    if (!INSPIRATION_ID_PATTERN.test(String(id || ""))) throw new Error("Inspiration ID 无效");
    return path.join(opsRoot, "content", "inspirations", `${id}.md`);
  }

  async list({ opsRoot = this.opsRoot } = {}) {
    const root = path.join(opsRoot, "content", "inspirations");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const records = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      try {
        records.push(parseRecord(await fs.readFile(path.join(root, entry.name), "utf8")));
      } catch {
        // 跳过损坏记录，不阻断整体列举（与既有 ops 读取方一致）
      }
    }
    return records.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
  }

  async create({ date, sampledRefs, text, attempts = 1 }, { opsRoot = this.opsRoot } = {}) {
    const refs = [...new Set(sampledRefs)];
    // 契约的 minItems 由仓层强制（validateValue 不检查 minItems）
    if (refs.length < 2) throw new Error("sampledRefs 至少需要 2 篇笔记");
    const now = this.clock().toISOString();
    const record = {
      id: `inspiration-${String(date).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`,
      date: String(date),
      sampledRefs: refs,
      text: String(text),
      status: "generated",
      attempts,
      created: now,
    };
    await writeRecord(this.#file(record.id, opsRoot), record, {
      schema: "inspiration",
      title: `今日灵感 ${record.date}`,
      summaryKeys: ["id", "date", "sampledRefs", "status", "attempts", "created"],
    });
    return record;
  }

  async #update(id, mutate, { opsRoot = this.opsRoot } = {}) {
    const file = this.#file(id, opsRoot);
    const current = parseRecord(await fs.readFile(file, "utf8"));
    const updated = { ...mutate(current), updated: this.clock().toISOString() };
    await writeRecord(file, updated, {
      schema: "inspiration",
      title: `今日灵感 ${updated.date}`,
      summaryKeys: ["id", "date", "sampledRefs", "status", "attempts", "created", "updated"],
    });
    return updated;
  }

  async markDelivered(id, eventId, options = {}) {
    return this.#update(id, (current) => ({
      ...current,
      status: "delivered",
      deliveryEventId: String(eventId || ""),
      deliveredAt: this.clock().toISOString(),
    }), options);
  }

  async recordFeedback(id, feedback, options = {}) {
    if (!FEEDBACK_VALUES.has(feedback)) throw new Error("灵感反馈取值无效");
    return this.#update(id, (current) => {
      if (current.status !== "delivered") throw new Error("灵感卡片尚未投递，不能回填反馈");
      return { ...current, status: "feedback", feedback, feedbackAt: this.clock().toISOString() };
    }, options);
  }

  async latestAwaitingFeedback({ now = this.clock(), ttlMs = FEEDBACK_TTL_MS } = {}) {
    const cutoff = now.getTime() - ttlMs;
    return (await this.list()).find((record) => record.status === "delivered"
      && !record.feedback
      && Number.isFinite(new Date(record.deliveredAt).getTime())
      && new Date(record.deliveredAt).getTime() >= cutoff) || null;
  }

  async recentSampledRefs({ now = this.clock(), windowMs = SAMPLED_WINDOW_MS } = {}) {
    const cutoff = now.getTime() - windowMs;
    const refs = new Set();
    for (const record of await this.list()) {
      if (new Date(record.created).getTime() < cutoff) continue;
      for (const ref of record.sampledRefs || []) refs.add(ref);
    }
    return refs;
  }
}

export { FEEDBACK_TTL_MS, FEEDBACK_VALUES, InspirationStore, SAMPLED_WINDOW_MS };
