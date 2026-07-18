import { promises as fs } from "node:fs";
import path from "node:path";

import { walkMarkdown, titleOf } from "./knowledge-store.mjs";
import { PATHS } from "./paths.mjs";

class KnowledgeMaintenanceSource {
  constructor({ vaultRoot = PATHS.vaultRoot, clock = () => new Date(), ttlMs = 60 * 60 * 1_000 } = {}) {
    this.vaultRoot = vaultRoot; this.clock = clock; this.ttlMs = ttlMs; this.cache = null; this.expiresAt = 0;
  }

  async inspect({ limit = 10 } = {}) {
    if (this.cache && this.clock().getTime() < this.expiresAt) return this.cache.slice(0, limit);
    const files = await walkMarkdown(this.vaultRoot);
    const notes = [];
    for (const file of files) {
      const markdown = await fs.readFile(file, "utf8");
      const relative = path.relative(this.vaultRoot, file).replace(/\\/g, "/");
      if (/(?:^|\/)README\.md$|(?:^|\/)MOC\s*-/i.test(relative)) continue;
      notes.push({ file, relative, markdown, title: titleOf(markdown, file), basename: path.basename(file, ".md") });
    }
    const corpus = notes.map((note) => note.markdown).join("\n");
    this.cache = notes
      .filter((note) => !/\[\[[^\]]+\]\]/.test(note.markdown) && !corpus.includes(`[[${note.basename}]]`))
      .map((note) => ({ id: `orphan:${note.relative}`, title: `关联孤立笔记：${note.title}`, path: `vault/${note.relative}`, reason: "没有出站 WikiLink，也没有被其他笔记直接引用" }));
    this.expiresAt = this.clock().getTime() + this.ttlMs;
    return this.cache.slice(0, limit);
  }
}

export { KnowledgeMaintenanceSource };
