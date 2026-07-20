import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { serializeRecord } from "./markdown-record.mjs";
import { validateContractRecord } from "./schema-registry.mjs";

const execFileAsync = promisify(execFile);

const CONTENT_ROOTS = new Set(["00-Inbox", "01-Areas", "02-Resources", "03-Archive"]);
const CONTROL_DIRS = new Set([".git", ".obsidian", ".agents", ".claude", ".pytest_cache", ".syno-build", "__pycache__", "tests", "node_modules"]);
const APPROVED_TAGS = new Set([
  "ai_agent", "ai_coding", "ai_evaluation", "ai_safety", "ai_career", "ai_philosophy",
  "article", "video_transcript", "podcast", "course", "moc", "notes", "zhihu", "wechat",
  "bilibili", "youtube", "podcast_rss", "claude_code", "codex", "cursor", "devin", "chatgpt",
  "claude", "openai", "anthropic", "harness_engineering", "loop_engineering", "memory", "multi_agent",
  "context_engineering", "skills", "hooks", "mcp", "prompting", "fde", "web_clipping",
  "content_creation", "text_refinement", "author", "loock_ai", "coding_agent", "chatbot", "column",
  "interview", "nextjs", "frontend_agent_interview", "dialogue", "langgraphjs_tutorial",
  "langgraphjs_quickstart", "ai_native", "lecture", "agent_architecture", "s_tier", "taste",
]);
const TAG_ALIASES = new Map([
  ["langgraphjs-tutorial", "langgraphjs_tutorial"],
  ["langgraphjs-quickstart", "langgraphjs_quickstart"],
  ["frontend-agent-interview", "frontend_agent_interview"],
  ["coding-agent", "coding_agent"],
  ["哲学", "ai_philosophy"], ["自我认知", "ai_philosophy"], ["心理学", "ai_philosophy"],
  ["职业规划", "ai_career"], ["招聘面试", "ai_career"],
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slash(value) { return String(value).replace(/\\/g, "/"); }

function jsonLine(value) { return JSON.stringify(String(value)); }

function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  return match ? { block: match[1], body: text.slice(match[0].length) } : { block: "", body: text };
}

function fieldBlocks(block) {
  const result = [];
  let current = null;
  for (const line of block.split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (field) {
      current = { key: field[1], lines: [line], inline: field[2] };
      result.push(current);
    } else if (current) current.lines.push(line);
  }
  return result;
}

function fieldValue(blocks, key) {
  const candidates = blocks.filter((item) => item.key === key);
  if (!candidates.length) return "";
  return candidates.at(-1).inline.trim().replace(/^['"]|['"]$/g, "");
}

function tagsFrom(blocks, key = "tags") {
  const candidate = blocks.filter((item) => item.key === key).at(-1);
  if (!candidate) return [];
  if (candidate.inline.trim()) {
    return candidate.inline.trim().replace(/^\[|\]$/g, "").split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  return candidate.lines.slice(1).map((line) => /^\s*-\s+(.+)$/.exec(line)?.[1]?.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
}

function titleFrom(body, sourcePath) {
  return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || path.basename(sourcePath, ".md");
}

function descriptionFrom(body) {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/!?(?:\[([^\]]*)\])?\([^\)]*\)/g, "$1")
    .replace(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\s+/g, " ").trim();
  return plain.slice(0, 160) || "从原 Obsidian 知识库迁入，等待后续渐进整理。";
}

function normalizeFilename(name) {
  const extension = path.extname(name);
  const stem = path.basename(name, extension).replace(/[<>:"/\\|?*：]/gu, "-").replace(/\s+/g, " ").trim();
  const safe = (stem || "untitled").slice(0, 50).trimEnd();
  return `${safe}${extension.toLowerCase()}`;
}

function normalizeRelativeTarget(sourcePath) {
  const parts = slash(sourcePath).split("/");
  parts[parts.length - 1] = normalizeFilename(parts.at(-1));
  return `vault/${parts.join("/")}`;
}

function normalizeNote({ text, sourcePath, sourceSha256, migrationId, createdFallback, renameMap }) {
  const { block, body: originalBody } = splitFrontmatter(text);
  const blocks = fieldBlocks(block);
  const originalTags = [...new Set([...tagsFrom(blocks), ...tagsFrom(blocks, "legacy_tags")])];
  const canonicalTags = [...new Set(originalTags.map((tag) => TAG_ALIASES.get(tag) || tag).filter((tag) => APPROVED_TAGS.has(tag)))];
  if (!canonicalTags.length) canonicalTags.push("notes");
  const legacyTags = originalTags.filter((tag) => !APPROVED_TAGS.has(tag) || TAG_ALIASES.has(tag));
  let body = originalBody;
  let linkChanged = false;
  for (const [from, to] of renameMap) {
    const fromStem = path.basename(from, ".md");
    const toStem = path.basename(to, ".md");
    if (fromStem === toStem) continue;
    const pattern = new RegExp(`\\[\\[${fromStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=(?:[#|]|\\]\\]))`, "g");
    const next = body.replace(pattern, `[[${toStem}`);
    linkChanged ||= next !== body;
    body = next;
  }
  const managed = new Set(["title", "tags", "legacy_tags", "created", "source", "description", "knowledge_state", "link_status", "source_path", "source_sha256", "migration_id"]);
  const unknown = [];
  const seenUnknown = new Set();
  for (const item of blocks) {
    if (managed.has(item.key) || seenUnknown.has(item.key)) continue;
    seenUnknown.add(item.key);
    unknown.push(item.lines.join("\n"));
  }
  const title = fieldValue(blocks, "title") || titleFrom(body, sourcePath);
  const created = fieldValue(blocks, "created") || createdFallback.slice(0, 10);
  const source = fieldValue(blocks, "source") || fieldValue(blocks, "source_url") || "obsidian_repository_snapshot";
  const description = fieldValue(blocks, "description") || descriptionFrom(body);
  const linkStatus = /\[\[[^\]]+\]\]/.test(body) ? "connected" : "orphan";
  const lines = [
    "---",
    `title: ${jsonLine(title)}`,
    `tags: [${canonicalTags.map(jsonLine).join(", ")}]`,
    ...(legacyTags.length ? [`legacy_tags: [${legacyTags.map(jsonLine).join(", ")}]`] : []),
    `created: ${jsonLine(created)}`,
    `source: ${jsonLine(source)}`,
    `description: ${jsonLine(description)}`,
    `knowledge_state: ${fieldValue(blocks, "knowledge_state") || "captured"}`,
    `link_status: ${linkStatus}`,
    `source_path: ${jsonLine(slash(sourcePath))}`,
    `source_sha256: ${jsonLine(sourceSha256)}`,
    `migration_id: ${jsonLine(migrationId)}`,
    ...unknown,
    "---",
    "",
  ];
  return { text: `${lines.join("\n")}${body}`, linkChanged, normalizations: {
    addedFrontmatter: !block,
    repairedDuplicateFields: blocks.length !== new Set(blocks.map((item) => item.key)).size,
    canonicalTags,
    legacyTags,
    linkStatus,
    sourceValue: source,
  } };
}

async function walkSource(root) {
  const output = [];
  async function walk(directory, relative = "") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (CONTROL_DIRS.has(entry.name)) continue;
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Object.assign(new Error(`迁移源包含符号链接：${nextRelative}`), { code: "MIGRATION_SYMLINK_DENIED" });
      if (entry.isDirectory()) await walk(absolute, nextRelative);
      else if (entry.isFile()) output.push({ absolute, relative: slash(nextRelative) });
    }
  }
  await walk(root);
  return output;
}

function isKnowledgePath(relative) {
  const normalized = slash(relative);
  if (normalized === "MOC - 知识库导航.md") return true;
  return normalized.endsWith(".md") && CONTENT_ROOTS.has(normalized.split("/")[0]);
}

function isPotentialAttachment(relative) {
  return /^99-System\/Attachments\//.test(slash(relative)) && /\.(?:pdf|png|jpe?g|gif|webp)$/i.test(relative);
}

async function gitSnapshot(sourceRoot) {
  const [{ stdout: head }, { stdout: status }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: sourceRoot, encoding: "utf8", windowsHide: true }),
    execFileAsync("git", ["status", "--porcelain=v1"], { cwd: sourceRoot, encoding: "utf8", windowsHide: true }),
  ]);
  return { gitHead: head.trim(), gitDirty: Boolean(status.trim()), dirtyEntries: status.trim() ? status.trim().split(/\r?\n/).length : 0 };
}

class VaultMigrationService {
  constructor({ repoRoot, runtimeRoot, clock = () => new Date() }) {
    this.repoRoot = path.resolve(repoRoot);
    this.vaultRoot = path.join(this.repoRoot, "vault");
    this.runtimeRoot = path.resolve(runtimeRoot);
    this.clock = clock;
  }

  async inventory({ sourceRoot }) {
    const resolvedSource = path.resolve(sourceRoot);
    const stat = await fs.lstat(resolvedSource);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("迁移源必须是普通目录");
    const createdAt = this.clock().toISOString();
    const id = `migration-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8)}`;
    const directory = path.join(this.runtimeRoot, id);
    const stagedRoot = path.join(directory, "staged");
    const sourceFiles = await walkSource(resolvedSource);
    const snapshot = await gitSnapshot(resolvedSource);
    const renameMap = new Map();
    for (const file of sourceFiles.filter((item) => isKnowledgePath(item.relative))) {
      renameMap.set(file.relative, normalizeRelativeTarget(file.relative).replace(/^vault\//, ""));
    }
    const files = [];
    const referencedAttachments = new Set();
    for (const file of sourceFiles.filter((item) => isKnowledgePath(item.relative))) {
      const text = await fs.readFile(file.absolute, "utf8");
      for (const match of text.matchAll(/!?\[\[[^\]]*?(99-System\/Attachments\/[^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) referencedAttachments.add(match[1]);
      for (const match of text.matchAll(/!?\[[^\]]*\]\((?:\.\.\/)*?(99-System\/Attachments\/[^\)]+)\)/g)) referencedAttachments.add(match[1]);
    }
    for (const file of sourceFiles) {
      const allowedKnowledge = isKnowledgePath(file.relative);
      const allowedAttachment = isPotentialAttachment(file.relative) && (referencedAttachments.has(file.relative) || file.relative.endsWith("Loop-Engineering橙皮书-v260615.pdf"));
      if (!allowedKnowledge && !allowedAttachment) {
        if (!file.relative.startsWith("99-System/Attachments/") || isPotentialAttachment(file.relative)) {
          const sourceBuffer = await fs.readFile(file.absolute);
          files.push({ sourcePath: file.relative, action: "excluded", reason: "outside-migration-scope", sourceSha256: sha256(sourceBuffer), bytes: sourceBuffer.length });
        }
        continue;
      }
      const sourceBuffer = await fs.readFile(file.absolute);
      const sourceSha256 = sha256(sourceBuffer);
      const targetPath = allowedKnowledge ? normalizeRelativeTarget(file.relative) : `vault/${file.relative}`;
      const target = path.join(this.repoRoot, targetPath);
      let targetBuffer = null;
      try { targetBuffer = await fs.readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (targetBuffer) {
        const targetSha256 = sha256(targetBuffer);
        files.push({ sourcePath: file.relative, targetPath, kind: allowedKnowledge ? "markdown" : "attachment", action: targetSha256 === sourceSha256 ? "identical" : "conflict", decision: targetSha256 === sourceSha256 ? "skip" : "keep-syno", sourceSha256, targetSha256, bytes: sourceBuffer.length });
        continue;
      }
      let staged = sourceBuffer;
      let phase = /^MOC\s*-/i.test(path.basename(file.relative)) || targetPath !== `vault/${file.relative}` ? "integration" : "content";
      let normalizations = {};
      if (allowedKnowledge) {
        const normalized = normalizeNote({ text: sourceBuffer.toString("utf8"), sourcePath: file.relative, sourceSha256, migrationId: id, createdFallback: createdAt, renameMap });
        staged = Buffer.from(normalized.text, "utf8");
        normalizations = normalized.normalizations;
        if (normalized.linkChanged) phase = "integration";
      }
      const stagedSha256 = sha256(staged);
      const stagedFile = path.join(stagedRoot, targetPath);
      await fs.mkdir(path.dirname(stagedFile), { recursive: true });
      await fs.writeFile(stagedFile, staged);
      files.push({ sourcePath: file.relative, targetPath, kind: allowedKnowledge ? "markdown" : "attachment", action: "import", phase, sourceSha256, stagedSha256, bytes: sourceBuffer.length, normalizations });
    }
    const sourceOwners = new Map();
    for (const item of files.filter((entry) => entry.action === "import" && /^https?:\/\//i.test(entry.normalizations?.sourceValue || ""))) {
      const source = item.normalizations.sourceValue;
      sourceOwners.set(source, [...(sourceOwners.get(source) || []), item.targetPath]);
    }
    for (const item of files.filter((entry) => entry.action === "import")) {
      const owners = sourceOwners.get(item.normalizations?.sourceValue) || [];
      if (owners.length > 1) item.normalizations.duplicateSourceRefs = owners.filter((owner) => owner !== item.targetPath);
    }
    const summary = Object.fromEntries(["import", "conflict", "identical", "excluded"].map((action) => [action, files.filter((item) => item.action === action).length]));
    summary.content = files.filter((item) => item.action === "import" && item.phase === "content").length;
    summary.integration = files.filter((item) => item.action === "import" && item.phase === "integration").length;
    summary.duplicateSourceGroups = [...sourceOwners.values()].filter((owners) => owners.length > 1).length;
    const manifest = { schema: "migration-manifest", version: 1, id, createdAt, source: { root: resolvedSource, ...snapshot }, sourceFingerprint: sha256(files.filter((item) => item.sourceSha256).map((item) => `${item.sourcePath}\0${item.sourceSha256}`).join("\n")), files, summary };
    manifest.digest = sha256(JSON.stringify(manifest));
    await validateContractRecord("migration-manifest", manifest);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  }

  async #load(id) {
    if (!/^migration-\d{8}-[a-f0-9]{8}$/.test(String(id))) throw Object.assign(new Error("Migration ID 无效"), { code: "MIGRATION_ID_INVALID" });
    const file = path.join(this.runtimeRoot, id, "manifest.json");
    const manifest = JSON.parse(await fs.readFile(file, "utf8"));
    const supplied = manifest.digest;
    delete manifest.digest;
    const actual = sha256(JSON.stringify(manifest));
    manifest.digest = supplied;
    if (supplied !== actual || manifest.id !== id) throw Object.assign(new Error("Migration Manifest 已被修改"), { code: "MIGRATION_MANIFEST_TAMPERED" });
    return manifest;
  }

  async preview(id) {
    const manifest = await this.#load(id);
    return {
      id: manifest.id,
      createdAt: manifest.createdAt,
      digest: manifest.digest,
      source: { gitHead: manifest.source.gitHead, gitDirty: manifest.source.gitDirty, dirtyEntries: manifest.source.dirtyEntries, fingerprint: manifest.sourceFingerprint },
      summary: manifest.summary,
      files: manifest.files.map(({ sourcePath, targetPath, action, phase, kind, decision, reason, bytes, normalizations }) => ({ sourcePath, targetPath, action, phase, kind, decision, reason, bytes, normalizations })),
    };
  }

  async #validateSnapshot(manifest) {
    for (const item of manifest.files.filter((entry) => entry.sourceSha256)) {
      const source = path.resolve(manifest.source.root, item.sourcePath);
      if (source !== path.join(path.resolve(manifest.source.root), ...item.sourcePath.split("/"))) {
        throw Object.assign(new Error(`迁移源路径越界：${item.sourcePath}`), { code: "MIGRATION_SOURCE_PATH_INVALID" });
      }
      let buffer;
      try { buffer = await fs.readFile(source); } catch {
        throw Object.assign(new Error(`迁移源已变化：${item.sourcePath}`), { code: "MIGRATION_SOURCE_CHANGED" });
      }
      if (sha256(buffer) !== item.sourceSha256) throw Object.assign(new Error(`迁移源已变化：${item.sourcePath}`), { code: "MIGRATION_SOURCE_CHANGED" });
    }
  }

  async apply(id, { phase, workspace }) {
    if (!new Set(["content", "integration"]).has(phase)) throw Object.assign(new Error("迁移阶段无效"), { code: "MIGRATION_PHASE_INVALID" });
    const manifest = await this.#load(id);
    await this.#validateSnapshot(manifest);
    const root = path.resolve(workspace);
    const selected = manifest.files.filter((item) => item.action === "import" && item.phase === phase);
    const prepared = [];
    for (const item of selected) {
      if (!item.targetPath?.startsWith("vault/")) throw Object.assign(new Error(`目标路径越界：${item.targetPath}`), { code: "MIGRATION_TARGET_PATH_INVALID" });
      const target = path.resolve(root, ...item.targetPath.split("/"));
      if (target !== path.join(root, ...item.targetPath.split("/"))) throw Object.assign(new Error(`目标路径越界：${item.targetPath}`), { code: "MIGRATION_TARGET_PATH_INVALID" });
      const staged = path.join(this.runtimeRoot, id, "staged", ...item.targetPath.split("/"));
      const buffer = await fs.readFile(staged);
      if (sha256(buffer) !== item.stagedSha256) throw Object.assign(new Error(`迁移暂存内容已变化：${item.targetPath}`), { code: "MIGRATION_STAGED_TAMPERED" });
      let existing = null;
      try { existing = await fs.readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (existing && sha256(existing) !== item.stagedSha256) throw Object.assign(new Error(`迁移目标已存在且内容不同：${item.targetPath}`), { code: "MIGRATION_TARGET_CONFLICT" });
      prepared.push({ ...item, target, buffer, exists: Boolean(existing) });
    }
    const imported = prepared.filter((item) => !item.exists);
    for (const item of imported) {
      await fs.mkdir(path.dirname(item.target), { recursive: true });
      await fs.writeFile(item.target, item.buffer);
    }
    const recordRelative = `ops/artifacts/migrations/${id}-${phase}.md`;
    const recordFile = path.join(root, ...recordRelative.split("/"));
    const conflictPaths = [];
    if (imported.length) {
      const result = {
        id: `${id}-${phase}`,
        migrationId: id,
        manifestDigest: manifest.digest,
        phase,
        imported: imported.length,
        skipped: prepared.length - imported.length,
        conflicts: manifest.summary.conflict,
        sourceGitHead: manifest.source.gitHead,
        sourceDirty: manifest.source.gitDirty,
        completedAt: this.clock().toISOString(),
        changedPaths: imported.map((item) => item.targetPath),
      };
      await validateContractRecord("migration-result", result);
      await fs.mkdir(path.dirname(recordFile), { recursive: true });
      await fs.writeFile(recordFile, serializeRecord(result, { title: `Vault migration ${id} ${phase}`, summaryKeys: ["id", "migrationId", "phase", "imported", "skipped", "conflicts", "completedAt"] }), "utf8");
      if (phase === "content") {
        for (const conflict of manifest.files.filter((item) => item.action === "conflict")) {
          const record = {
            sourcePath: conflict.sourcePath,
            targetPath: conflict.targetPath,
            sourceSha256: conflict.sourceSha256,
            targetSha256: conflict.targetSha256,
            decision: "keep-syno",
            summary: "同路径内容不同；本轮保留 Syno 版本，等待后续固定差异审批。",
          };
          await validateContractRecord("migration-conflict", record);
          const relative = `ops/artifacts/migrations/conflicts/${id}-${sha256(conflict.targetPath).slice(0, 12)}.md`;
          const file = path.join(root, ...relative.split("/"));
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, serializeRecord(record, { title: `Migration conflict: ${conflict.targetPath}`, summaryKeys: ["sourcePath", "targetPath", "decision"] }), "utf8");
          conflictPaths.push(relative);
        }
      }
    }
    return {
      id,
      phase,
      imported: imported.length,
      skipped: prepared.length - imported.length,
      conflicts: manifest.summary.conflict,
      changedPaths: imported.length ? [...imported.map((item) => item.targetPath), recordRelative, ...conflictPaths] : [],
    };
  }
}

export { VaultMigrationService, normalizeNote };
