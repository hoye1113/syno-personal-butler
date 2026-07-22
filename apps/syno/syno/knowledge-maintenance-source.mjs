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
    const files = await walkMarkdown(this.vaultRoot);
    const fingerprint = fingerprintVault(files.map((f) => path.relative(this.vaultRoot, f)));

    // 使用 fingerprint 作为缓存键
    if (this._cache && this._cachedFingerprint === fingerprint) {
      return this._filterByCooldown(this._cache, now).slice(0, limit);
    }

    const notes = [];
    for (const file of files) {
      const markdown = await fs.readFile(file, "utf8");
      const relative = path.relative(this.vaultRoot, file).replace(/\\/g, "/");
      if (/(?:^|\/)README\.md$|(?:^|\/)MOC\s*-/i.test(relative)) continue;
      notes.push({ file, relative, markdown, title: titleOf(markdown, file), basename: path.basename(file, ".md") });
    }

    const corpus = notes.map((note) => note.markdown).join("\n");
    const allOrphans = notes
      .filter((note) => !/\[\[[^\]]+\]\]/.test(note.markdown) && !corpus.includes(`[[${note.basename}]]`))
      .map((note) => ({
        id: `orphan:${note.relative}`,
        kind: "orphan",
        title: `关联孤立笔记：${note.title}`,
        path: `vault/${note.relative}`,
        reason: "没有出站 WikiLink，也没有被其他笔记直接引用",
        topic: this.#extractTopic(note.relative),
      }));

    this._cache = allOrphans;
    this._cachedFingerprint = fingerprint;
    return this._filterByCooldown(allOrphans, now).slice(0, limit);
  }

  /**
   * 生成周度摘要（大批候选，不返回日常 inspect）。
   * 返回 { summary, items }，默认只读。
   */
  async weeklySummary() {
    const files = await walkMarkdown(this.vaultRoot);
    const notes = [];
    for (const file of files) {
      const markdown = await fs.readFile(file, "utf8");
      const relative = path.relative(this.vaultRoot, file).replace(/\\/g, "/");
      if (/(?:^|\/)README\.md$|(?:^|\/)MOC\s*-/i.test(relative)) continue;
      notes.push({ file, relative, markdown, title: titleOf(markdown, file), basename: path.basename(file, ".md") });
    }

    const corpus = notes.map((note) => note.markdown).join("\n");
    const orphans = notes
      .filter((note) => !/\[\[[^\]]+\]\]/.test(note.markdown) && !corpus.includes(`[[${note.basename}]]`))
      .map((note) => ({ path: `vault/${note.relative}`, title: note.title, topic: this.#extractTopic(note.relative) }));

    // 按主题分组
    const byTopic = new Map();
    for (const orphan of orphans) {
      const topic = orphan.topic || "未分类";
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic).push(orphan);
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
    history.push({ path, recommendedAt: this.clock().getTime() });
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
