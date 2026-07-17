import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS, relativeToRepo, resolveInside } from "./paths.mjs";

function plainText(markdown) {
  return String(markdown)
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[#>*_`~|\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(markdown, file) {
  return /^title:\s*["']?(.+?)["']?\s*$/m.exec(markdown)?.[1]
    || /^#\s+(.+)$/m.exec(markdown)?.[1]
    || path.basename(file, ".md");
}

async function walkMarkdown(root) {
  const files = [];
  async function walk(directory) {
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(candidate);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(candidate);
    }
  }
  await walk(root);
  return files;
}

class KnowledgeStore {
  constructor({ vaultRoot = PATHS.vaultRoot } = {}) {
    this.vaultRoot = vaultRoot;
    this.cache = null;
  }

  async rebuild() {
    const files = await walkMarkdown(this.vaultRoot);
    const notes = [];
    for (const file of files) {
      const markdown = await fs.readFile(file, "utf8");
      const text = plainText(markdown);
      notes.push({
        path: relativeToRepo(file),
        title: titleOf(markdown, file),
        excerpt: text.slice(0, 280),
        searchText: `${titleOf(markdown, file)} ${text}`.toLocaleLowerCase("zh-CN"),
      });
    }
    this.cache = notes;
    return { notes: notes.length, rebuiltAt: new Date().toISOString() };
  }

  invalidate() { this.cache = null; }

  async search(query, { limit = 30 } = {}) {
    if (!this.cache) await this.rebuild();
    const terms = String(query || "").toLocaleLowerCase("zh-CN").split(/\s+/).filter(Boolean);
    const ranked = this.cache.map((note) => {
      const title = note.title.toLocaleLowerCase("zh-CN");
      const score = terms.reduce((sum, term) => sum + (title.includes(term) ? 5 : 0) + (note.searchText.includes(term) ? 1 : 0), 0);
      return { note, score };
    }).filter(({ score }) => !terms.length || score > 0);
    ranked.sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "zh-CN"));
    return ranked.slice(0, Math.min(100, Number(limit) || 30)).map(({ note, score }) => ({ ...note, score, searchText: undefined }));
  }

  async read(relativePath) {
    const candidate = resolveInside(PATHS.repoRoot, relativePath);
    const relative = relativeToRepo(candidate);
    if (!relative.startsWith("vault/") || !relative.endsWith(".md")) throw new Error("只允许读取 vault 内 Markdown");
    const markdown = await fs.readFile(candidate, "utf8");
    return { path: relative, title: titleOf(markdown, candidate), markdown };
  }
}

export { KnowledgeStore, plainText, titleOf, walkMarkdown };
