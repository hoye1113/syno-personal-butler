import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";

const STABILITY_CLASSES = Object.freeze(["principle", "model", "practice", "fact", "volatile", "personal"]);
const OUTDATED_DAYS = 180;
const MAINTENANCE_WINDOW_DAYS = 7;
const TOPIC_LIMIT = 80;

// Capture the target of [[target]], [[target|alias]], [[target#heading]] — stop at ] | #
function extractWikilinks(markdown) {
  const links = [];
  for (const match of String(markdown || "").matchAll(/\[\[([^\]\|#]+)/g)) {
    const target = match[1].trim();
    if (target) links.push(target);
  }
  return links;
}

// Strip a leading YAML frontmatter block (--- ... ---). The dead-link scan only
// inspects body wikilinks: frontmatter wikilinks (e.g. `author: [[Name]]`) are
// metadata-aggregation tags, not content links, so they must not count as dead.
function stripFrontmatter(markdown) {
  const text = String(markdown || "");
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== "---") return text;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return lines.slice(i + 1).join("\n");
  }
  return text;
}

function stableBasename(target) {
  return path.basename(String(target).replace(/\\/g, "/"), ".md").trim();
}

class KnowledgeProfileService {
  constructor({
    knowledge,
    maintenance,
    claims,
    learning,
    opsRoot = PATHS.opsRoot,
    repoRoot = PATHS.repoRoot,
    clock = () => new Date(),
    outdatedDays = OUTDATED_DAYS,
    maintenanceWindowDays = MAINTENANCE_WINDOW_DAYS,
  } = {}) {
    this.knowledge = knowledge;
    this.maintenance = maintenance;
    this.claims = claims;
    this.learning = learning;
    this.opsRoot = opsRoot;
    this.repoRoot = repoRoot;
    this.clock = clock;
    this.outdatedDays = outdatedDays;
    this.maintenanceWindowDays = maintenanceWindowDays;
  }

  // ── v2 三接口：inspect / persist / latest ──────────────────────────

  /**
   * 只读计算当前画像，不写任何文件。
   * 返回 { profile } — v2 契约含 scope、excludedSystemNotes。
   */
  async inspect({ opsRoot = this.opsRoot } = {}) {
    const now = this.clock();
    // knowledge.list() runs #ensureCurrent, so fingerprint is fresh afterwards.
    const notes = await this.knowledge.list();
    const vaultFingerprint = this.knowledge.fingerprint || "";
    const withMarkdown = await this.#withMarkdown(notes);
    const searchable = notes.filter((note) => note.searchable);
    const excludedSystemNotes = notes.length - searchable.length;

    const searchableWithMarkdown = withMarkdown.filter((note) => note.searchable);
    const orphanNoteRefs = await this.#orphans();
    const profile = {
      id: `profile-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`,
      scope: "personal-knowledge",
      generatedAt: now.toISOString(),
      vaultFingerprint,
      summary: this.#summary(withMarkdown),
      topics: this.#topics(searchableWithMarkdown),
      sources: this.#sources(searchableWithMarkdown),
      stabilityBreakdown: this.#stabilityBreakdown(searchableWithMarkdown),
      reliabilityBreakdown: this.#reliabilityBreakdown(searchableWithMarkdown),
      orphanNoteRefs,
      deadLinkRefs: this.#deadLinks(searchableWithMarkdown, withMarkdown),
      outdatedNoteRefs: this.#outdated(searchableWithMarkdown, now),
      evidenceGaps: await this.#evidenceGaps({ opsRoot }),
      learningCoverage: await this.#learningCoverage({ opsRoot }, withMarkdown),
      excludedSystemNotes,
      nextMaintenanceWindow: new Date(now.getTime() + this.maintenanceWindowDays * 86_400_000).toISOString(),
    };
    return { profile };
  }

  /**
   * 计算画像并持久化到 ops/knowledge/profiles/。
   * 返回 { profile, changedPaths }。
   */
  async persist({ opsRoot = this.opsRoot } = {}) {
    const { profile } = await this.inspect({ opsRoot });
    const file = path.join(opsRoot, "knowledge", "profiles", `${profile.id}.md`);
    await writeRecord(file, profile, {
      schema: "knowledge-profile",
      title: `知识画像 ${profile.id}`,
      summaryKeys: ["id", "generatedAt", "vaultFingerprint", "scope", "nextMaintenanceWindow"],
    });
    return { profile, changedPaths: [path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")] };
  }

  /**
   * 向后兼容：generate() 等价于 persist()。
   */
  async generate(options) { return this.persist(options); }

  /**
   * 读取最近一次持久化画像，并判断是否与当前 vault 一致。
   * 返回 { profile, fresh, currentVaultFingerprint } 或 null。
   */
  async latest({ opsRoot = this.opsRoot } = {}) {
    const root = path.join(opsRoot, "knowledge", "profiles");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    const profiles = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      profiles.push(parseRecord(await fs.readFile(path.join(root, entry.name), "utf8")));
    }
    if (!profiles.length) return null;
    const latest = profiles.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    // 确保 knowledge index 是最新的，以获取当前 fingerprint
    await this.knowledge.list();
    const currentVaultFingerprint = this.knowledge.fingerprint || "";
    const fresh = latest.vaultFingerprint === currentVaultFingerprint;
    return { profile: latest, fresh, currentVaultFingerprint };
  }

  // notes from knowledge.list() lack raw markdown; read it back for wikilink extraction
  async #withMarkdown(notes) {
    const out = [];
    for (const note of notes) {
      try {
        // note.path is repo-relative (KnowledgeStore stores relativeToRepo). Read directly
        // rather than via knowledge.read(), which restricts to the canonical vault/ prefix
        // and would reject notes indexed from a non-default vault root.
        const markdown = await fs.readFile(path.join(this.repoRoot, note.path), "utf8");
        out.push({ ...note, markdown });
      } catch (error) {
        // Unreadable note: keep metadata, no markdown. Dead-link scan skips it.
        if (error.code !== "ENOENT") throw error;
        out.push({ ...note, markdown: "" });
      }
    }
    return out;
  }

  #summary(notes) {
    const searchableNotes = notes.filter((note) => note.searchable);
    const mocCount = searchableNotes.filter((note) => /(?:^|\/)MOC\s*-/i.test(note.path)).length;
    const tagSet = new Set();
    for (const note of searchableNotes) for (const tag of [...(note.tags || []), ...(note.legacyTags || [])]) if (tag) tagSet.add(tag);
    return { notes: notes.length, searchable: searchableNotes.length, mocCount, tags: tagSet.size };
  }

  #topics(notes) {
    const map = new Map();
    for (const note of notes) {
      const tags = [...new Set([...(note.tags || []), ...(note.legacyTags || [])])].filter(Boolean);
      for (const tag of tags) {
        if (!map.has(tag)) map.set(tag, { notes: new Set(), stability: {} });
        const entry = map.get(tag);
        entry.notes.add(note.path);
        const stability = note.stability || "unknown";
        entry.stability[stability] = (entry.stability[stability] || 0) + 1;
      }
    }
    const searchableTotal = notes.filter((note) => note.searchable).length || 1;
    const topics = [];
    for (const [name, entry] of map) {
      topics.push({
        name,
        noteRefs: entry.notes.size,
        tagRefs: [name],
        stabilityMix: entry.stability,
        coverage: Number((entry.notes.size / searchableTotal).toFixed(3)),
      });
    }
    topics.sort((a, b) => b.noteRefs - a.noteRefs || a.name.localeCompare(b.name, "zh-CN"));
    return topics.slice(0, TOPIC_LIMIT);
  }

  #sources(notes) {
    const map = new Map();
    for (const note of notes) {
      const ref = String(note.source || "").trim();
      if (!ref) continue;
      if (!map.has(ref)) map.set(ref, { count: 0, traceable: 0 });
      const entry = map.get(ref);
      entry.count += 1;
      if (note.qualityStatus === "traceable") entry.traceable += 1;
    }
    const sources = [];
    for (const [ref, entry] of map) {
      sources.push({ ref, count: entry.count, reliability: entry.traceable > 0 ? "traceable" : "needs_source" });
    }
    return sources.sort((a, b) => b.count - a.count || a.ref.localeCompare(b.ref));
  }

  #stabilityBreakdown(notes) {
    const breakdown = Object.fromEntries(STABILITY_CLASSES.map((cls) => [cls, 0]));
    breakdown.unknown = 0;
    for (const note of notes) {
      const stability = note.stability;
      if (stability && STABILITY_CLASSES.includes(stability)) breakdown[stability] += 1;
      else breakdown.unknown += 1;
    }
    return breakdown;
  }

  #reliabilityBreakdown(notes) {
    let traceable = 0;
    let needsSource = 0;
    for (const note of notes) {
      if (note.qualityStatus === "traceable") traceable += 1;
      else needsSource += 1;
    }
    return { traceable, needsSource };
  }

  async #orphans() {
    const findings = await this.maintenance.inspect({ limit: 5_000 });
    return [...new Set(findings.map((finding) => finding.path))].sort();
  }

  #deadLinks(searchableNotes, allNotes) {
    const existing = new Set(allNotes.map((note) => stableBasename(note.path)));
    const dead = [];
    const seen = new Set();
    for (const note of searchableNotes) {
      for (const target of extractWikilinks(stripFrontmatter(note.markdown))) {
        const base = stableBasename(target);
        if (!base || existing.has(base)) continue;
        const key = `${note.path}\0${base}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dead.push({ from: note.path, target: base });
      }
    }
    return dead.sort((a, b) => a.from.localeCompare(b.from) || a.target.localeCompare(b.target));
  }

  #outdated(notes, now) {
    const cutoff = new Date(now.getTime() - this.outdatedDays * 86_400_000);
    const outdated = [];
    for (const note of notes) {
      if (!note.searchable || !note.date) continue;
      const date = new Date(note.date);
      if (Number.isNaN(date.getTime())) continue;
      if (date < cutoff) outdated.push(note.path);
    }
    return [...new Set(outdated)].sort();
  }

  async #evidenceGaps({ opsRoot }) {
    const claims = await this.claims.listClaims({ opsRoot, status: "candidate" });
    return claims
      .filter((claim) => !claim.evidenceRefs || claim.evidenceRefs.length === 0)
      .map((claim) => ({ claimId: claim.id, statement: claim.statement }))
      .sort((a, b) => a.claimId.localeCompare(b.claimId));
  }

  async #learningCoverage({ opsRoot }, notes) {
    const states = await this.learning.listStates({ opsRoot });
    const searchable = notes.filter((note) => note.searchable);
    const refs = new Set(states.map((state) => String(state.knowledgeRef || "")));
    const withState = searchable.filter((note) => refs.has(note.path) || refs.has(stableBasename(note.path))).length;
    const masteries = states.map((state) => Number(state.mastery)).filter((value) => !Number.isNaN(value));
    const avgMastery = masteries.length ? Number((masteries.reduce((sum, value) => sum + value, 0) / masteries.length).toFixed(3)) : 0;
    return { withState, withoutState: Math.max(0, searchable.length - withState), avgMastery };
  }
}

export { KnowledgeProfileService };
