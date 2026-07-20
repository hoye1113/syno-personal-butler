import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS, relativeToRepo, resolveInside } from "./paths.mjs";
import { frontmatterData } from "./validator.mjs";

function plainText(markdown) {
  return String(markdown).replace(/^---[\s\S]*?---\s*/m, "").replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#>*_`~|\[\]]/g, " ").replace(/\s+/g, " ").trim();
}
function titleOf(markdown, file) {
  return /^title:\s*["']?(.+?)["']?\s*$/m.exec(markdown)?.[1] || /^#\s+(.+)$/m.exec(markdown)?.[1] || path.basename(file, ".md");
}
function arrayValue(raw) {
  return String(raw || "").replace(/^\[|\]$/g, "").split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
}
function tokens(value) {
  const normalized = String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN");
  const output = new Set(normalized.match(/[a-z0-9_]+/g) || []);
  for (const group of normalized.match(/[\p{Script=Han}]+/gu) || []) {
    if (group.length === 1) output.add(group);
    for (let index = 0; index < group.length - 1; index += 1) output.add(group.slice(index, index + 2));
  }
  return [...output];
}
function isContentNote(vaultRoot, file) {
  const relative = path.relative(vaultRoot, file).replace(/\\/g, "/");
  if (relative === "MOC - 知识库导航.md") return true;
  if (/^(?:00-Inbox|01-Areas|02-Resources|03-Archive)\//.test(relative)) return true;
  if (!relative.includes("/") && !new Set(["AGENTS.md", "CLAUDE.md", "README.md"]).has(relative)) return true;
  return false;
}
async function walkMarkdown(root) {
  const files = [];
  async function walk(directory) {
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(candidate);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(candidate);
    }
  }
  await walk(root); return files;
}
function fingerprintFiles(files) {
  return crypto.createHash("sha256").update(files.map((item) => `${item.path}\0${item.size}\0${item.mtimeMs}`).join("\n")).digest("hex");
}

class KnowledgeStore {
  constructor({ vaultRoot = PATHS.vaultRoot, indexFile = path.join(PATHS.runtimeRoot, "knowledge-index-v1.json") } = {}) {
    this.vaultRoot = path.resolve(vaultRoot); this.indexFile = path.resolve(indexFile); this.cache = null; this.fingerprint = "";
  }
  async #inventory() {
    const files = await walkMarkdown(this.vaultRoot);
    const metadata = await Promise.all(files.map(async (file) => { const stat = await fs.stat(file); return { file, path: path.relative(this.vaultRoot, file).replace(/\\/g, "/"), size: stat.size, mtimeMs: stat.mtimeMs }; }));
    return { metadata, fingerprint: fingerprintFiles(metadata) };
  }
  async rebuild() {
    const { metadata, fingerprint } = await this.#inventory(); const notes = [];
    for (const entry of metadata) {
      const markdown = await fs.readFile(entry.file, "utf8"); const text = plainText(markdown); const frontmatter = frontmatterData(markdown);
      const title = titleOf(markdown, entry.file); const legacyTags = arrayValue(frontmatter.values.legacy_tags);
      const source = frontmatter.values.source_url || frontmatter.values.source || "";
      const stability = frontmatter.values.stability || frontmatter.values.stability_class || "";
      const date = frontmatter.values.updated || frontmatter.values.created || frontmatter.values.date || "";
      notes.push({ path: relativeToRepo(entry.file), title, excerpt: text.slice(0, 280), tags: frontmatter.tags, legacyTags, source, stability, date, searchable: isContentNote(this.vaultRoot, entry.file),
        knowledgeState: frontmatter.values.knowledge_state || "", linkStatus: frontmatter.values.link_status || "",
        qualityStatus: frontmatter.values.quality_status || (frontmatter.values.source || frontmatter.values.source_url ? "traceable" : "needs_source"),
        index: { title: tokens(title), tags: tokens(frontmatter.tags.join(" ")), legacyTags: tokens(legacyTags.join(" ")), body: tokens(text), source: tokens(source) } });
    }
    this.cache = notes; this.fingerprint = fingerprint;
    await fs.mkdir(path.dirname(this.indexFile), { recursive: true });
    await fs.writeFile(this.indexFile, `${JSON.stringify({ schema: "knowledge-index", version: 1, fingerprint, rebuiltAt: new Date().toISOString(), notes }, null, 2)}\n`, "utf8");
    return { notes: notes.length, rebuiltAt: new Date().toISOString(), fingerprint };
  }
  async #ensureCurrent() {
    const inventory = await this.#inventory();
    if (!this.cache || inventory.fingerprint !== this.fingerprint) await this.rebuild();
  }
  invalidate() { this.cache = null; this.fingerprint = ""; }
  async search(query, { limit = 30, tags = [], source = "", stability = "", from = "", to = "" } = {}) {
    await this.#ensureCurrent(); const queryTokens = tokens(query);
    const ranked = this.cache.map((note) => {
      const reasons = []; let score = 0;
      const count = (field) => queryTokens.filter((term) => note.index[field].includes(term)).length;
      for (const [field, weight, reason] of [["title", 8, "title"], ["tags", 6, "tag"], ["legacyTags", 5, "legacy_tag"], ["source", 2, "source"], ["body", 1, "body"]]) {
        const matches = count(field); if (matches) { score += matches * weight; reasons.push(reason); }
      }
      return { note, score, reasons };
    }).filter(({ note, score }) => note.searchable && (!queryTokens.length || score > 0)
      && (!tags.length || tags.every((tag) => [...note.tags, ...note.legacyTags].some((value) => value.toLocaleLowerCase("zh-CN") === tag.toLocaleLowerCase("zh-CN"))))
      && (!source || note.source.toLocaleLowerCase("zh-CN").includes(source.toLocaleLowerCase("zh-CN")))
      && (!stability || note.stability === stability) && (!from || (note.date && note.date >= from)) && (!to || (note.date && note.date <= `${to}T23:59:59`)));
    ranked.sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "zh-CN"));
    return ranked.slice(0, Math.min(100, Number(limit) || 30)).map(({ note, score, reasons }) => ({ ...note, index: undefined, score, matchReasons: reasons }));
  }
  async read(relativePath) {
    const candidate = resolveInside(PATHS.repoRoot, relativePath); const relative = relativeToRepo(candidate);
    if (!relative.startsWith("vault/") || !relative.endsWith(".md")) throw new Error("只允许读取 vault 内 Markdown");
    const markdown = await fs.readFile(candidate, "utf8"); return { path: relative, title: titleOf(markdown, candidate), markdown };
  }
}

export { KnowledgeStore, plainText, titleOf, walkMarkdown };
