import { createHash } from "node:crypto";
import { promises as fs, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { walkMarkdown, titleOf } from "./knowledge-store.mjs";
import { PATHS } from "./paths.mjs";

const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 86_400_000;
const DAILY_LIMIT = 1;

function fingerprintVault(files) {
  const hash = createHash("sha256");
  for (const file of [...files].sort()) hash.update(file);
  return hash.digest("hex").slice(0, 16);
}

class KnowledgeMaintenanceSource {
  constructor({
    vaultRoot = PATHS.vaultRoot,
    runtimeRoot = PATHS.runtimeRoot,
    clock = () => new Date(),
    cooldownDays = COOLDOWN_DAYS,
    dailyLimit = DAILY_LIMIT,
  } = {}) {
    this.vaultRoot = vaultRoot;
    this.runtimeRoot = runtimeRoot;
    this.clock = clock;
    this.cooldownDays = cooldownDays;
    this.dailyLimit = dailyLimit;
    // 按 fingerprint 缓存
    this._cache = null;
    this._cachedFingerprint = "";
  }

  /**
   * 检查维护候选。返回最多 dailyLimit 个普通维护项。
   * 大批孤岛、死链等进入周摘要，不在日常 inspect 中返回。
   */
  async inspect({ limit = 10 } = {}) {
    const now = this.clock();
    const orphans = await this.#orphansForCurrentVault();
    // 缓存里的 orphan.title 是笔记原标题；inspect 对外给出人类可读前缀
    const labelled = orphans.map((orphan) => ({ ...orphan, title: `关联孤立笔记：${orphan.title}` }));
    return this._filterByCooldown(labelled, now).slice(0, limit);
  }

  // 取当前 vault 的全部孤岛。fingerprint 命中时复用缓存、跳过全量读盘；inspect 与 weeklySummary 共享。
  async #orphansForCurrentVault() {
    const files = await walkMarkdown(this.vaultRoot);
    const fingerprint = fingerprintVault(files.map((f) => path.relative(this.vaultRoot, f)));
    if (this._cache && this._cachedFingerprint === fingerprint) {
      return this._cache;
    }
    const orphans = await this.#collectOrphans(files);
    this._cache = orphans;
    this._cachedFingerprint = fingerprint;
    return orphans;
  }

  // 全量读盘并计算孤岛（排除 README/MOC）。orphan.title 保留笔记原标题，由调用方决定是否加前缀。
  async #collectOrphans(files) {
    const notes = [];
    for (const file of files) {
      const markdown = await fs.readFile(file, "utf8");
      const relative = path.relative(this.vaultRoot, file).replace(/\\/g, "/");
      if (/(?:^|\/)README\.md$|(?:^|\/)MOC\s*-/i.test(relative)) continue;
      notes.push({ file, relative, markdown, title: titleOf(markdown, file), basename: path.basename(file, ".md") });
    }
    const corpus = notes.map((note) => note.markdown).join("\n");
    return notes
      .filter((note) => !/\[\[[^\]]+\]\]/.test(note.markdown) && !corpus.includes(`[[${note.basename}]]`))
      .map((note) => ({
        id: `orphan:${note.relative}`,
        kind: "orphan",
        title: note.title,
        path: `vault/${note.relative}`,
        reason: "没有出站 WikiLink，也没有被其他笔记直接引用",
        topic: this.#extractTopic(note.relative),
      }));
  }

  /**
   * 生成周度摘要（大批候选，不返回日常 inspect）。复用 inspect 预热的孤岛缓存，
   * 避免对同一 vault 重复全量读盘。默认只读。
   */
  async weeklySummary() {
    const orphans = await this.#orphansForCurrentVault();
    const byTopic = new Map();
    for (const orphan of orphans) {
      const topic = orphan.topic || "未分类";
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic).push({ path: orphan.path, title: orphan.title, topic: orphan.topic });
    }
    return {
      generatedAt: this.clock().toISOString(),
      totalOrphans: orphans.length,
      topics: [...byTopic.entries()].map(([topic, items]) => ({ topic, count: items.length, items })),
    };
  }

  /**
   * 按冷却期过滤：同一 path 的普通问题 7 天内不重复推荐。
   * 使用 .runtime/maintenance-history.json 记录推荐历史。
   */
  _filterByCooldown(items, now) {
    const history = this.#loadHistory();
    const cutoff = now.getTime() - this.cooldownDays * 86_400_000;
    const recentPaths = new Set(
      history
        .filter((entry) => entry.recommendedAt > cutoff)
        .map((entry) => entry.path)
    );

    // 按主题轮换：优先推荐冷却期已过的主题
    const available = items.filter((item) => !recentPaths.has(item.path));
    const cooled = items.filter((item) => recentPaths.has(item.path));

    // 轮换：从不同主题中各取一个，避免连续推荐同一主题
    const rotated = this.#rotateByTopic(available);

    // 每日最多 dailyLimit 个普通维护项
    return rotated.slice(0, this.dailyLimit);
  }

  /**
   * 按主题轮换选择：优先从不同主题中各取一个。
   */
  #rotateByTopic(items) {
    const byTopic = new Map();
    for (const item of items) {
      const topic = item.topic || "未分类";
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic).push(item);
    }
    const result = [];
    const topicQueues = [...byTopic.values()];
    let changed = true;
    while (changed) {
      changed = false;
      for (const queue of topicQueues) {
        if (queue.length > 0) {
          result.push(queue.shift());
          changed = true;
        }
      }
    }
    return result;
  }

  /**
   * 从路径中提取主题（第一级目录名）。
   */
  #extractTopic(relative) {
    const parts = relative.split("/");
    if (parts.length > 1) return parts[0];
    return "根目录";
  }

  /**
   * 记录推荐历史。
   */
  recordRecommendation(path) {
    const history = this.#loadHistory();
    const existing = history.find((entry) => entry.path === path);
    if (existing) {
      // 同 path 覆盖推荐时间，避免历史无限膨胀（冷却语义不变：_filterByCooldown 仍按 path 去重）
      existing.recommendedAt = this.clock().getTime();
    } else {
      history.push({ path, recommendedAt: this.clock().getTime() });
    }
    this.#saveHistory(history);
  }

  #historyPath() {
    return path.join(this.runtimeRoot, "maintenance-history.json");
  }

  #loadHistory() {
    try {
      const data = readFileSync(this.#historyPath(), "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  #saveHistory(history) {
    const file = this.#historyPath();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
  }
}

export { KnowledgeMaintenanceSource };
