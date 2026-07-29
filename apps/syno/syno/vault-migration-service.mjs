import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { isMocPath } from "./knowledge-path-policy.mjs";
import { parseRecord, serializeRecord } from "./markdown-record.mjs";
import { validateContractRecord } from "./schema-registry.mjs";
import { APPROVED_TAGS, TAG_ALIASES } from "./canonical-tags.mjs";

const execFileAsync = promisify(execFile);
const CONTENT_ROOTS = ["00-Inbox", "01-Areas", "02-Resources", "03-Archive"];
const ROOT_MOC = "MOC - 知识库导航.md";
const ATTACHMENT_ROOT = "99-System/Attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_BYTES = 50 * 1024 * 1024;
const DENIED_SOURCE_NAMES = new Set([".git", ".obsidian", ".agents", ".claude", ".pytest_cache", ".syno-build", "__pycache__", "node_modules", "tests", "credentials", "credential", "secrets", "secret"]);
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function slash(value) { return String(value).replace(/\\/g, "/"); }
function jsonLine(value) { return JSON.stringify(String(value)); }
function migrationError(code, message) { return Object.assign(new Error(message), { code }); }
function decodeUtf8(buffer) { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }

function safeRelative(value, prefix = "") {
  const normalized = slash(value);
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").some((part) => !part || part === "." || part === "..")) return false;
  return !prefix || normalized.startsWith(prefix);
}

async function assertNoSymlinkPath(root, relative, { allowMissingLeaf = false } = {}) {
  if (!safeRelative(relative)) throw migrationError("MIGRATION_PATH_INVALID", `迁移路径无效：${relative}`);
  const resolvedRoot = path.resolve(root);
  const realRoot = await fs.realpath(resolvedRoot);
  let current = resolvedRoot;
  const parts = slash(relative).split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    let stat;
    try { stat = await fs.lstat(current); } catch (error) {
      if (error.code === "ENOENT" && allowMissingLeaf) break;
      throw error;
    }
    if (stat.isSymbolicLink()) throw migrationError("MIGRATION_SYMLINK_DENIED", `迁移路径包含符号链接：${relative}`);
    const real = await fs.realpath(current);
    if (real !== realRoot && !real.startsWith(`${realRoot}${path.sep}`)) throw migrationError("MIGRATION_PATH_INVALID", `迁移路径越界：${relative}`);
  }
  return path.join(resolvedRoot, ...parts);
}

async function readInsideIfPresent(root, relative) {
  try { await fs.realpath(root); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const target = await assertNoSymlinkPath(root, relative, { allowMissingLeaf: true });
  try { return await fs.readFile(target); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  return match ? { block: match[1], body: text.slice(match[0].length) } : { block: "", body: text };
}

function fieldBlocks(block) {
  const result = [];
  let current = null;
  for (const line of block.split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (field) { current = { key: field[1], lines: [line], inline: field[2] }; result.push(current); }
    else if (current) current.lines.push(line);
  }
  return result;
}

function cleanScalar(value) { return value.trim().replace(/^['"]|['"]$/g, ""); }
function fieldValue(blocks, key) { return cleanScalar(blocks.filter((item) => item.key === key).at(-1)?.inline || ""); }
function tagsFrom(blocks, key = "tags") {
  const values = [];
  for (const candidate of blocks.filter((item) => item.key === key)) {
    if (candidate.inline.trim()) values.push(...candidate.inline.trim().replace(/^\[|\]$/g, "").split(",").map(cleanScalar).filter(Boolean));
    else values.push(...candidate.lines.slice(1).map((line) => /^\s*-\s+(.+)$/.exec(line)?.[1]).filter(Boolean).map(cleanScalar));
  }
  return values;
}
function titleFrom(body, sourcePath) { return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() || path.basename(sourcePath, ".md"); }
function descriptionFrom(body) {
  const plain = body.replace(/```[\s\S]*?```/g, " ").replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/!?(?:\[([^\]]*)\])?\([^\)]*\)/g, "$1").replace(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\s+/g, " ").trim();
  return plain.slice(0, 160) || "从原 Obsidian 知识库迁入，等待后续渐进整理。";
}
function normalizeFilename(name) {
  const extension = path.extname(name);
  const stem = path.basename(name, extension).replace(/[<>:"/\\|?*：]/gu, "-").replace(/\s+/g, " ").trim();
  return `${(stem || "untitled").slice(0, 50).trimEnd()}${extension.toLowerCase()}`;
}
function initialTarget(sourcePath) {
  const parts = slash(sourcePath).split("/");
  parts[parts.length - 1] = normalizeFilename(parts.at(-1));
  return parts.join("/");
}
function buildRenameMap(sourceFiles) {
  const initial = sourceFiles.map((item) => [item.relative, initialTarget(item.relative)]);
  const groups = new Map();
  for (const [source, target] of initial) {
    const key = target.toLocaleLowerCase("en-US");
    groups.set(key, [...(groups.get(key) || []), source]);
  }
  return new Map(initial.map(([source, target]) => {
    if ((groups.get(target.toLocaleLowerCase("en-US")) || []).length === 1) return [source, target];
    const extension = path.extname(target);
    const directory = path.posix.dirname(target);
    const stem = path.basename(target, extension).slice(0, 41).trimEnd();
    return [source, `${directory}/${stem}-${sha256(source).slice(0, 8)}${extension}`];
  }));
}

function extractWikiTargets(body) {
  return [...body.matchAll(/!?\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((match) => slash(match[1].trim()));
}
function linkKey(value) { return slash(value).replace(/\.md$/i, "").toLocaleLowerCase("en-US"); }
function linkResolves(target, knownLinks) { return knownLinks.has(linkKey(target)) || knownLinks.has(linkKey(path.posix.basename(target))); }

function rewriteWikilinks(body, renameMap) {
  const replacements = new Map();
  for (const [from, to] of renameMap) {
    if (from === to) continue;
    replacements.set(linkKey(from), to.replace(/\.md$/i, ""));
    replacements.set(linkKey(path.posix.basename(from)), path.posix.basename(to, ".md"));
  }
  let changed = false;
  const text = body.replace(/\[\[([^\]|#]+)([^\]]*)\]\]/g, (full, target, tail) => {
    const replacement = replacements.get(linkKey(target.trim()));
    if (!replacement || replacement === target.trim()) return full;
    changed = true;
    return `[[${replacement}${tail}]]`;
  });
  return { text, changed };
}

function sensitiveReason(text) {
  const value = String(text);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value)) return "private-key-material";
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(value)) return "cloud-access-key";
  const providerToken = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{24,})\b/.exec(value)?.[0] || "";
  if (providerToken && !/(?:x{4,}|placeholder|example|your[-_]?)/i.test(providerToken)) return "provider-token";
  if (/\b(?:xox[baprs]-[A-Za-z0-9-]{20,}|ya29\.[A-Za-z0-9_-]{20,})\b/.test(value)) return "channel-or-oauth-token";
  if (/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(value)) return "jwt-token";
  if (/^\s*Authorization\s*:\s*Bearer\s+(?!<|\$\{|example|placeholder)[A-Za-z0-9._~+\/-]{20,}/im.test(value)) return "authorization-header";
  if (/^\s*(?:Cookie|Set-Cookie)\s*:\s*(?!<|\$\{|example|placeholder)[^\r\n]{16,}/im.test(value)) return "cookie-header";
  const assignment = /["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|bot[_-]?token|app[_-]?secret|client[_-]?secret|cookie|session|password|token)["']?\s*[:=]\s*["']?([A-Za-z0-9+/_=.-]{16,})/ig;
  for (const match of value.matchAll(assignment)) {
    const candidate = match[1];
    if (/^(?:process|import|config|settings|credentials?|response|request|req|ctx|state|props|params|result|data|env|os|Deno)\./i.test(candidate)) continue;
    if (/(?:_token|_key|_secret|password)$/i.test(candidate) || /(?:x{4,}|your|example|placeholder|fake|test)/i.test(candidate)) continue;
    const counts = new Map(); for (const character of candidate) counts.set(character, (counts.get(character) || 0) + 1);
    const entropy = [...counts.values()].reduce((sum, count) => { const probability = count / candidate.length; return sum - probability * Math.log2(probability); }, 0);
    if (entropy >= 3.2) return "credential-assignment";
  }
  return "";
}

function normalizeNote({ text, sourcePath, sourceSha256, migrationId, createdFallback, createdSource, renameMap, connected }) {
  const { block, body: originalBody } = splitFrontmatter(text);
  const blocks = fieldBlocks(block);
  const originalTags = [...new Set([...tagsFrom(blocks), ...tagsFrom(blocks, "legacy_tags")])];
  const canonicalTags = [...new Set(originalTags.map((tag) => TAG_ALIASES.get(tag) || tag).filter((tag) => APPROVED_TAGS.has(tag)))];
  if (!canonicalTags.length) canonicalTags.push("notes");
  const duplicateFields = {};
  for (const key of new Set(blocks.map((item) => item.key))) {
    const values = blocks.filter((item) => item.key === key);
    if (values.length > 1) duplicateFields[key] = values.map((item) => item.inline.trim() ? cleanScalar(item.inline) : tagsFrom([item], key));
  }
  const rewritten = rewriteWikilinks(originalBody, renameMap);
  const body = rewritten.text;
  const managed = new Set(["title", "tags", "legacy_tags", "created", "source", "description", "knowledge_state", "link_status", "source_path", "source_sha256", "migration_id"]);
  const unknown = [];
  const seenUnknown = new Set();
  for (const item of blocks) {
    if (managed.has(item.key) || seenUnknown.has(item.key)) continue;
    seenUnknown.add(item.key); unknown.push(item.lines.join("\n"));
  }
  const existingCreated = fieldValue(blocks, "created");
  const created = existingCreated || createdFallback.slice(0, 10);
  const source = fieldValue(blocks, "source") || fieldValue(blocks, "source_url") || "obsidian_repository_snapshot";
  const linkStatus = connected ? "connected" : "orphan";
  const lines = ["---", `title: ${jsonLine(fieldValue(blocks, "title") || titleFrom(body, sourcePath))}`,
    `tags: [${canonicalTags.map(jsonLine).join(", ")}]`,
    ...(originalTags.length ? [`legacy_tags: [${originalTags.map(jsonLine).join(", ")}]`] : []),
    `created: ${jsonLine(created)}`, `source: ${jsonLine(source)}`,
    `description: ${jsonLine(fieldValue(blocks, "description") || descriptionFrom(body))}`,
    `knowledge_state: ${fieldValue(blocks, "knowledge_state") || "captured"}`, `link_status: ${linkStatus}`,
    `source_path: ${jsonLine(slash(sourcePath))}`, `source_sha256: ${jsonLine(sourceSha256)}`,
    `migration_id: ${jsonLine(migrationId)}`, ...unknown, "---", ""];
  return { text: `${lines.join("\n")}${body}`, linkChanged: rewritten.changed, normalizations: {
    addedFrontmatter: !block, repairedDuplicateFields: Object.keys(duplicateFields).length > 0, duplicateFields,
    canonicalTags, legacyTags: originalTags, linkStatus, sourceValue: source,
    createdSource: existingCreated ? "frontmatter" : createdSource,
  } };
}

async function walkAllowed(root, relativeRoot, predicate) {
  const output = [];
  let base;
  try { base = await assertNoSymlinkPath(root, relativeRoot); } catch (error) { if (error.code === "ENOENT") return output; throw error; }
  async function walk(directory, relative) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || DENIED_SOURCE_NAMES.has(entry.name.toLocaleLowerCase("en-US"))) continue;
      const next = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw migrationError("MIGRATION_SYMLINK_DENIED", `迁移源包含符号链接：${next}`);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute, next);
      else if (entry.isFile() && predicate(next)) output.push({ absolute, relative: slash(next) });
    }
  }
  await walk(base, relativeRoot);
  return output;
}

async function knowledgeSourceFiles(root) {
  const files = [];
  for (const contentRoot of CONTENT_ROOTS) files.push(...await walkAllowed(root, contentRoot, (name) => name.toLowerCase().endsWith(".md")));
  try {
    const absolute = await assertNoSymlinkPath(root, ROOT_MOC);
    const stat = await fs.lstat(absolute);
    if (stat.isFile()) files.push({ absolute, relative: ROOT_MOC });
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  return files.sort((a, b) => a.relative.localeCompare(b.relative, "en"));
}
async function attachmentSourceFiles(root) {
  return walkAllowed(root, ATTACHMENT_ROOT, (name) => /\.(?:pdf|png|jpe?g|gif|webp)$/i.test(name));
}
function sniffMime(buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString())) return "image/gif";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "";
}
function expectedMime(relative) {
  return ({ ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" })[path.extname(relative).toLowerCase()] || "";
}
function attachmentReferences(text) {
  const values = [];
  for (const target of extractWikiTargets(text)) if (/\.(?:pdf|png|jpe?g|gif|webp)$/i.test(target)) values.push(target);
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\)]+\.(?:pdf|png|jpe?g|gif|webp))(?:#[^\)]*)?\)/gi)) values.push(match[1]);
  return values.map((value) => {
    let decoded = value; try { decoded = decodeURIComponent(value); } catch { /* preserve the literal reference for an explicit missing issue */ }
    return decoded.replace(/^\.\//, "").replace(/^(?:\.\.\/)+/, "");
  });
}

async function currentSourceFingerprint(sourceRoot) {
  const knowledgeFiles = await knowledgeSourceFiles(sourceRoot); const attachmentFiles = await attachmentSourceFiles(sourceRoot);
  const entries = []; const references = new Map();
  for (const file of knowledgeFiles) {
    const buffer = await fs.readFile(await assertNoSymlinkPath(sourceRoot, file.relative));
    entries.push({ sourcePath: file.relative, sourceSha256: sha256(buffer), sourcePresent: true });
    let text = ""; try { text = decodeUtf8(buffer); } catch { /* invalid notes remain fingerprinted but cannot introduce attachment references */ }
    if (text && !sensitiveReason(text)) for (const value of attachmentReferences(text)) references.set(linkKey(value), value);
  }
  const attachmentsByName = new Map();
  for (const file of attachmentFiles) {
    for (const key of new Set([linkKey(file.relative), linkKey(path.basename(file.relative)), linkKey(file.relative.replace(/^99-System\/Attachments\//, ""))])) attachmentsByName.set(key, [...(attachmentsByName.get(key) || []), file]);
  }
  const selected = new Map();
  for (const [reference, displayReference] of references) {
    const matches = attachmentsByName.get(reference) || [];
    if (matches.length === 1) selected.set(matches[0].relative, matches[0]);
    else {
      const issuePath = slash(displayReference).startsWith(`${ATTACHMENT_ROOT}/`) ? slash(displayReference) : `${ATTACHMENT_ROOT}/${path.posix.basename(slash(displayReference))}`;
      entries.push({ sourcePath: issuePath, sourcePresent: false, reason: matches.length ? "ambiguous-attachment-reference" : "missing-attachment-reference" });
    }
  }
  for (const file of selected.values()) entries.push({ sourcePath: file.relative, sourceSha256: sha256(await fs.readFile(await assertNoSymlinkPath(sourceRoot, file.relative))), sourcePresent: true });
  return fingerprintForFiles(entries);
}
async function gitSnapshot(sourceRoot) {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };
  const [{ stdout: head }, { stdout: status }] = await Promise.all([
    execFileAsync("git", ["--no-optional-locks", "rev-parse", "HEAD"], { cwd: sourceRoot, encoding: "utf8", windowsHide: true, env }),
    execFileAsync("git", ["--no-optional-locks", "-c", "core.untrackedCache=false", "-c", "core.fsmonitor=false", "status", "--porcelain=v1"], { cwd: sourceRoot, encoding: "utf8", windowsHide: true, env }),
  ]);
  return { gitHead: head.trim(), gitDirty: Boolean(status.trim()), dirtyEntries: status.trim() ? status.trim().split(/\r?\n/).length : 0 };
}
async function gitFirstSeen(sourceRoot) {
  const dates = new Map();
  try {
    const { stdout } = await execFileAsync("git", ["--no-optional-locks", "-c", "core.quotepath=false", "-c", "core.fsmonitor=false", "log", "--reverse", "--format=@@%aI", "--name-only", "--"], { cwd: sourceRoot, encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
    let date = "";
    for (const line of stdout.split(/\r?\n/)) {
      if (line.startsWith("@@")) date = line.slice(2);
      else if (date && line && !dates.has(slash(line))) dates.set(slash(line), date);
    }
  } catch { /* file timestamps remain a deterministic local fallback */ }
  return dates;
}
function conflictSummary(source, target) {
  const left = source.toString("utf8").split(/\r?\n/); const right = target.toString("utf8").split(/\r?\n/);
  let first = 0; while (first < Math.max(left.length, right.length) && left[first] === right[first]) first += 1;
  return `同路径内容不同：源 ${source.length} bytes/${left.length} 行，Syno ${target.length} bytes/${right.length} 行，首个差异在第 ${first + 1} 行；本轮 keep-syno。`;
}

function fingerprintForFiles(files) {
  return sha256(files.map((item) => item.sourcePresent === false
    ? `!${item.sourcePath}\0${item.reason}`
    : `${item.sourcePath}\0${item.sourceSha256}`).sort().join("\n"));
}

function derivedSummary(files) {
  const summary = Object.fromEntries(["import", "conflict", "identical", "excluded"].map((action) => [action, files.filter((item) => item.action === action).length]));
  summary.content = files.filter((item) => item.action === "import" && item.phase === "content").length;
  summary.integration = files.filter((item) => item.action === "import" && item.phase === "integration").length;
  const sourceOwners = new Map();
  for (const item of files.filter((entry) => entry.action === "import" && /^https?:\/\//i.test(entry.normalizations?.sourceValue || ""))) sourceOwners.set(item.normalizations.sourceValue, [...(sourceOwners.get(item.normalizations.sourceValue) || []), item.targetPath]);
  summary.duplicateSourceGroups = [...sourceOwners.values()].filter((owners) => owners.length > 1).length;
  return summary;
}

function assertManifestShape(manifest) {
  if (!manifest || manifest.schema !== "migration-manifest" || manifest.version !== 1 || !Array.isArray(manifest.files)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 结构无效");
  if (!safeRelative(manifest.source?.root ? "source/root" : "")) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 缺少源目录");
  for (const item of manifest.files) {
    if (!new Set(["import", "conflict", "identical", "excluded"]).has(item.action) || !safeRelative(item.sourcePath)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 文件项无效");
    if (item.targetPath && !safeRelative(item.targetPath, "vault/")) throw migrationError("MIGRATION_TARGET_PATH_INVALID", `目标路径越界：${item.targetPath}`);
    if (item.action === "import" && (!new Set(["content", "integration"]).has(item.phase) || !/^[a-f0-9]{64}$/.test(item.stagedSha256 || ""))) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 导入项无效");
    if (item.sourcePresent !== false && !/^[a-f0-9]{64}$/.test(item.sourceSha256 || "")) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 哈希无效");
    if (item.sourcePresent === false && (item.action !== "excluded" || !item.reason)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 虚拟排除项无效");
    if (item.action === "conflict" && (!/^[a-f0-9]{64}$/.test(item.targetSha256 || "") || item.decision !== "keep-syno" || item.phase || item.stagedSha256)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 冲突项无效");
    if (item.action === "identical" && (!/^[a-f0-9]{64}$/.test(item.targetSha256 || "") || item.decision !== "skip" || item.phase || item.stagedSha256)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 相同项无效");
    if (item.action === "import" && (item.decision || item.targetSha256 || item.reason || item.sourcePresent === false)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 导入项语义矛盾");
    if (item.action === "excluded" && (!item.reason || item.phase || item.stagedSha256 || item.decision || item.targetSha256)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 排除项无效");
    if (item.kind === "attachment" && item.sourcePresent !== false && item.sniffedMime !== expectedMime(item.sourcePath)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest 附件类型不一致");
  }
  const calculated = derivedSummary(manifest.files);
  for (const key of ["import", "conflict", "identical", "excluded", "content", "integration", "duplicateSourceGroups"]) if (manifest.summary?.[key] !== calculated[key]) throw migrationError("MIGRATION_MANIFEST_INVALID", `Migration Manifest summary.${key} 不一致`);
  if (manifest.sourceFingerprint !== fingerprintForFiles(manifest.files)) throw migrationError("MIGRATION_MANIFEST_INVALID", "Migration Manifest fingerprint 不一致");
}

class VaultMigrationService {
  constructor({ repoRoot, runtimeRoot, clock = () => new Date() }) {
    this.repoRoot = path.resolve(repoRoot); this.vaultRoot = path.join(this.repoRoot, "vault");
    this.runtimeRoot = path.resolve(runtimeRoot); this.clock = clock;
  }

  async inventory({ sourceRoot }) {
    const resolvedSource = path.resolve(sourceRoot); const sourceRealRoot = await fs.realpath(resolvedSource);
    const stat = await fs.lstat(resolvedSource);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw migrationError("MIGRATION_SOURCE_INVALID", "迁移源必须是普通目录");
    const createdAt = this.clock().toISOString();
    const id = `migration-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8)}`;
    const directory = path.join(this.runtimeRoot, id); const stagedRoot = path.join(directory, "staged");
    const knowledgeFiles = await knowledgeSourceFiles(resolvedSource); const attachmentFiles = await attachmentSourceFiles(resolvedSource);
    const snapshot = await gitSnapshot(resolvedSource); const firstSeen = await gitFirstSeen(resolvedSource);
    const renameMap = buildRenameMap(knowledgeFiles);
    const existingVaultFiles = [];
    try {
      async function walkVault(directory, relative = "") {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
          if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
          const next = relative ? `${relative}/${entry.name}` : entry.name;
          if (entry.isDirectory()) await walkVault(path.join(directory, entry.name), next);
          else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) existingVaultFiles.push(next);
        }
      }
      await walkVault(this.vaultRoot);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const textByPath = new Map(); const sensitiveByPath = new Map(); const invalidEncoding = new Set(); const referenced = new Map();
    for (const file of knowledgeFiles) {
      const buffer = await fs.readFile(await assertNoSymlinkPath(resolvedSource, file.relative));
      let text = ""; try { text = decodeUtf8(buffer); } catch { invalidEncoding.add(file.relative); }
      textByPath.set(file.relative, text);
      const sensitive = sensitiveReason(text); if (sensitive) sensitiveByPath.set(file.relative, sensitive);
      else for (const value of attachmentReferences(text)) referenced.set(linkKey(value), value);
    }
    const knownLinks = new Set(); const linkOwners = new Map();
    function addLink(value, owner) {
      const key = linkKey(value); knownLinks.add(key); linkOwners.set(key, [...new Set([...(linkOwners.get(key) || []), owner])]);
    }
    for (const [source, target] of renameMap) {
      if (sensitiveByPath.has(source) || invalidEncoding.has(source)) continue;
      for (const value of [source, path.basename(source), target, path.basename(target)]) addLink(value, source);
    }
    for (const value of existingVaultFiles) for (const candidate of [value, path.basename(value)]) addLink(candidate, `existing:${value}`);
    const connectedSources = new Set();
    for (const file of knowledgeFiles) {
      const targets = extractWikiTargets(textByPath.get(file.relative)).filter((target) => !/\.(?:pdf|png|jpe?g|gif|webp)$/i.test(target));
      for (const target of targets) {
        if (!linkResolves(target, knownLinks)) continue;
        connectedSources.add(file.relative);
        for (const owner of [...(linkOwners.get(linkKey(target)) || []), ...(linkOwners.get(linkKey(path.posix.basename(target))) || [])]) {
          if (!owner.startsWith("existing:")) connectedSources.add(owner);
        }
      }
    }
    const attachmentsByName = new Map();
    for (const file of attachmentFiles) {
      const keys = new Set([linkKey(file.relative), linkKey(path.basename(file.relative)), linkKey(file.relative.replace(/^99-System\/Attachments\//, ""))]);
      for (const key of keys) attachmentsByName.set(key, [...(attachmentsByName.get(key) || []), file]);
    }
    const selectedAttachments = new Map(); const attachmentIssues = [];
    for (const [reference, displayReference] of referenced) {
      const matches = attachmentsByName.get(reference) || [];
      if (matches.length === 1) selectedAttachments.set(matches[0].relative, matches[0]);
      else {
        const issuePath = slash(displayReference).startsWith(`${ATTACHMENT_ROOT}/`) ? slash(displayReference) : `${ATTACHMENT_ROOT}/${path.posix.basename(slash(displayReference))}`;
        attachmentIssues.push({ sourcePath: issuePath, targetPath: `vault/${issuePath}`, kind: "attachment", action: "excluded", sourcePresent: false, bytes: 0, reason: matches.length ? "ambiguous-attachment-reference" : "missing-attachment-reference" });
      }
    }
    const files = []; let attachmentBytes = 0;
    for (const file of knowledgeFiles) {
      const source = await assertNoSymlinkPath(resolvedSource, file.relative); const sourceBuffer = await fs.readFile(source);
      const sourceSha256 = sha256(sourceBuffer); const targetPath = `vault/${renameMap.get(file.relative)}`;
      if (invalidEncoding.has(file.relative)) {
        files.push({ sourcePath: file.relative, targetPath, kind: "markdown", action: "excluded", sourcePresent: true, sourceSha256, bytes: sourceBuffer.length, reason: "invalid-utf8" });
        continue;
      }
      if (sensitiveByPath.has(file.relative)) {
        files.push({ sourcePath: file.relative, targetPath, kind: "markdown", action: "excluded", sourcePresent: true, sourceSha256, bytes: sourceBuffer.length, reason: `sensitive-content-candidate:${sensitiveByPath.get(file.relative)}` });
        continue;
      }
      const targetBuffer = await readInsideIfPresent(this.repoRoot, targetPath);
      if (targetBuffer) {
        const targetSha256 = sha256(targetBuffer); const action = targetSha256 === sourceSha256 ? "identical" : "conflict";
        files.push({ sourcePath: file.relative, targetPath, kind: "markdown", action, decision: action === "identical" ? "skip" : "keep-syno", sourceSha256, targetSha256, bytes: sourceBuffer.length, ...(action === "conflict" ? { diffSummary: conflictSummary(sourceBuffer, targetBuffer) } : {}) });
        continue;
      }
      const seen = firstSeen.get(file.relative); const sourceStat = await fs.lstat(source);
      const normalized = normalizeNote({ text: textByPath.get(file.relative), sourcePath: file.relative, sourceSha256, migrationId: id,
        createdFallback: seen || sourceStat.mtime.toISOString(), createdSource: seen ? "git-first-seen" : "file-mtime", renameMap, connected: connectedSources.has(file.relative) });
      const staged = Buffer.from(normalized.text, "utf8"); const renamed = renameMap.get(file.relative) !== file.relative;
      const phase = file.relative === ROOT_MOC || isMocPath(targetPath) || renamed || normalized.linkChanged ? "integration" : "content";
      const stagedFile = path.join(stagedRoot, ...targetPath.split("/")); await fs.mkdir(path.dirname(stagedFile), { recursive: true }); await fs.writeFile(stagedFile, staged);
      files.push({ sourcePath: file.relative, targetPath, kind: "markdown", action: "import", phase, sourceSha256, stagedSha256: sha256(staged), bytes: sourceBuffer.length, normalizations: normalized.normalizations });
    }
    for (const file of selectedAttachments.values()) {
      const source = await assertNoSymlinkPath(resolvedSource, file.relative); const buffer = await fs.readFile(source);
      const mime = sniffMime(buffer);
      if (!mime || mime !== expectedMime(file.relative)) throw migrationError("MIGRATION_ATTACHMENT_TYPE_INVALID", `附件扩展名与内容类型不一致：${file.relative}`);
      if (buffer.length > MAX_ATTACHMENT_BYTES || attachmentBytes + buffer.length > MAX_ATTACHMENTS_BYTES) throw migrationError("MIGRATION_ATTACHMENT_TOO_LARGE", `附件超过迁移大小限制：${file.relative}`);
      attachmentBytes += buffer.length; const sourceSha256 = sha256(buffer); const targetPath = `vault/${file.relative}`;
      const targetBuffer = await readInsideIfPresent(this.repoRoot, targetPath);
      if (targetBuffer) {
        const targetSha256 = sha256(targetBuffer); const action = targetSha256 === sourceSha256 ? "identical" : "conflict";
        files.push({ sourcePath: file.relative, targetPath, kind: "attachment", sniffedMime: mime, action, decision: action === "identical" ? "skip" : "keep-syno", sourceSha256, targetSha256, bytes: buffer.length, ...(action === "conflict" ? { diffSummary: conflictSummary(buffer, targetBuffer) } : {}) });
      } else {
        const stagedFile = path.join(stagedRoot, ...targetPath.split("/")); await fs.mkdir(path.dirname(stagedFile), { recursive: true }); await fs.writeFile(stagedFile, buffer);
        files.push({ sourcePath: file.relative, targetPath, kind: "attachment", sniffedMime: mime, isolated: true, action: "import", phase: "content", sourceSha256, stagedSha256: sourceSha256, bytes: buffer.length, normalizations: {} });
      }
    }
    files.push(...attachmentIssues);
    const sourceOwners = new Map();
    for (const item of files.filter((entry) => entry.action === "import" && /^https?:\/\//i.test(entry.normalizations?.sourceValue || ""))) sourceOwners.set(item.normalizations.sourceValue, [...(sourceOwners.get(item.normalizations.sourceValue) || []), item.targetPath]);
    for (const item of files.filter((entry) => entry.action === "import")) {
      const owners = sourceOwners.get(item.normalizations?.sourceValue) || [];
      if (owners.length > 1) item.normalizations.duplicateSourceRefs = owners.filter((owner) => owner !== item.targetPath);
    }
    const summary = derivedSummary(files);
    summary.duplicateSourceGroups = [...sourceOwners.values()].filter((owners) => owners.length > 1).length;
    const manifest = { schema: "migration-manifest", version: 1, id, createdAt, source: { root: resolvedSource, realRoot: sourceRealRoot, ...snapshot },
      sourceFingerprint: fingerprintForFiles(files), files, summary };
    manifest.digest = sha256(JSON.stringify(manifest)); assertManifestShape(manifest); await validateContractRecord("migration-manifest", manifest);
    await fs.mkdir(directory, { recursive: true }); await fs.writeFile(path.join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  }

  async #load(id) {
    if (!/^migration-\d{8}-[a-f0-9]{8}$/.test(String(id))) throw migrationError("MIGRATION_ID_INVALID", "Migration ID 无效");
    const manifest = JSON.parse(await fs.readFile(path.join(this.runtimeRoot, id, "manifest.json"), "utf8"));
    const supplied = manifest.digest; delete manifest.digest; const actual = sha256(JSON.stringify(manifest)); manifest.digest = supplied;
    if (supplied !== actual || manifest.id !== id) throw migrationError("MIGRATION_MANIFEST_TAMPERED", "Migration Manifest 已被修改");
    assertManifestShape(manifest); await validateContractRecord("migration-manifest", manifest); return manifest;
  }
  async preview(id) {
    const manifest = await this.#load(id);
    return { id: manifest.id, createdAt: manifest.createdAt, digest: manifest.digest,
      source: { gitHead: manifest.source.gitHead, gitDirty: manifest.source.gitDirty, dirtyEntries: manifest.source.dirtyEntries, fingerprint: manifest.sourceFingerprint },
      summary: manifest.summary, files: manifest.files.map(({ sourcePath, targetPath, action, phase, kind, decision, reason, bytes, normalizations, sniffedMime, diffSummary }) => ({ sourcePath, targetPath, action, phase, kind, decision, reason, bytes, normalizations, sniffedMime, diffSummary })) };
  }
  async nextPhase(id, { workspace = this.repoRoot } = {}) {
    const manifest = await this.#load(id); const root = path.resolve(workspace);
    const completed = async (phase) => {
      const relative = `ops/artifacts/migrations/${id}-${phase}.md`; let markdown;
      try { markdown = await fs.readFile(await assertNoSymlinkPath(root, relative, { allowMissingLeaf: true }), "utf8"); } catch (error) { if (error.code === "ENOENT") return false; throw error; }
      const record = parseRecord(markdown); await validateContractRecord("migration-result", record);
      if (record.manifestDigest !== manifest.digest || record.phase !== phase) throw migrationError("MIGRATION_REPLAY_INCONSISTENT", "已有迁移审计与当前 Manifest 不一致");
      return true;
    };
    const contentNeeded = manifest.files.some((item) => item.action === "import" && item.phase === "content") || manifest.files.some((item) => item.action === "conflict");
    if (contentNeeded && !await completed("content")) return "content";
    if (manifest.files.some((item) => item.action === "import" && item.phase === "integration") && !await completed("integration")) return "integration";
    return "complete";
  }
  async #validateSnapshot(manifest, workspace) {
    if (await fs.realpath(manifest.source.root) !== manifest.source.realRoot) throw migrationError("MIGRATION_SOURCE_CHANGED", "迁移源目录已变化");
    const snapshot = await gitSnapshot(manifest.source.root);
    if (snapshot.gitHead !== manifest.source.gitHead || snapshot.gitDirty !== manifest.source.gitDirty || snapshot.dirtyEntries !== manifest.source.dirtyEntries) throw migrationError("MIGRATION_SOURCE_CHANGED", "迁移源 Git 快照已变化");
    if (await currentSourceFingerprint(manifest.source.root) !== manifest.sourceFingerprint) throw migrationError("MIGRATION_SOURCE_CHANGED", "迁移源文件集合或内容已变化");
    for (const item of manifest.files.filter((entry) => entry.sourcePresent !== false)) {
      let buffer; try { buffer = await fs.readFile(await assertNoSymlinkPath(manifest.source.root, item.sourcePath)); } catch { throw migrationError("MIGRATION_SOURCE_CHANGED", `迁移源已变化：${item.sourcePath}`); }
      if (sha256(buffer) !== item.sourceSha256) throw migrationError("MIGRATION_SOURCE_CHANGED", `迁移源已变化：${item.sourcePath}`);
    }
    for (const item of manifest.files.filter((entry) => ["conflict", "identical"].includes(entry.action))) {
      let buffer; try { buffer = await fs.readFile(await assertNoSymlinkPath(workspace, item.targetPath)); } catch { throw migrationError("MIGRATION_TARGET_CONFLICT", `迁移目标已变化：${item.targetPath}`); }
      if (sha256(buffer) !== item.targetSha256) throw migrationError("MIGRATION_TARGET_CONFLICT", `迁移目标已变化：${item.targetPath}`);
    }
  }
  async apply(id, { phase, expectedDigest, workspace }) {
    if (!new Set(["content", "integration"]).has(phase)) throw migrationError("MIGRATION_PHASE_INVALID", "迁移阶段无效");
    const manifest = await this.#load(id);
    if (!expectedDigest || expectedDigest !== manifest.digest) throw migrationError("MIGRATION_DIGEST_MISMATCH", "审批锁定的 Manifest digest 与执行内容不一致");
    const root = path.resolve(workspace); await this.#validateSnapshot(manifest, root);
    const selected = manifest.files.filter((item) => item.action === "import" && item.phase === phase); const prepared = [];
    for (const item of selected) {
      const target = await assertNoSymlinkPath(root, item.targetPath, { allowMissingLeaf: true });
      const stagedRelative = `${id}/staged/${item.targetPath}`; const staged = await assertNoSymlinkPath(this.runtimeRoot, stagedRelative);
      const buffer = await fs.readFile(staged); if (sha256(buffer) !== item.stagedSha256) throw migrationError("MIGRATION_STAGED_TAMPERED", `迁移暂存内容已变化：${item.targetPath}`);
      let existing = null; try { existing = await fs.readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (existing && sha256(existing) !== item.stagedSha256) throw migrationError("MIGRATION_TARGET_CONFLICT", `迁移目标已存在且内容不同：${item.targetPath}`);
      prepared.push({ ...item, target, buffer, exists: Boolean(existing) });
    }
    const recordRelative = `ops/artifacts/migrations/${id}-${phase}.md`;
    const recordFile = await assertNoSymlinkPath(root, recordRelative, { allowMissingLeaf: true });
    let previousResult = null;
    try { previousResult = parseRecord(await fs.readFile(recordFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (previousResult) {
      if (previousResult.manifestDigest !== manifest.digest || previousResult.phase !== phase) throw migrationError("MIGRATION_REPLAY_INCONSISTENT", "已有迁移审计与当前 Manifest 不一致");
      if (prepared.some((item) => !item.exists)) throw migrationError("MIGRATION_REPLAY_INCONSISTENT", "已有迁移审计但目标文件缺失");
      return { id, phase, imported: 0, skipped: prepared.length, conflicts: manifest.summary.conflict, changedPaths: [] };
    }
    const imported = prepared.filter((item) => !item.exists);
    for (const item of imported) { await fs.mkdir(path.dirname(item.target), { recursive: true }); await assertNoSymlinkPath(root, path.posix.dirname(item.targetPath)); await fs.writeFile(item.target, item.buffer); }
    const conflictPaths = [];
    const shouldRecord = imported.length > 0 || (phase === "content" && manifest.files.some((item) => item.action === "conflict"));
    if (shouldRecord) {
      const result = { id: `${id}-${phase}`, migrationId: id, manifestDigest: manifest.digest, phase, imported: imported.length, skipped: prepared.length - imported.length,
        conflicts: manifest.summary.conflict, sourceGitHead: manifest.source.gitHead, sourceDirty: manifest.source.gitDirty, completedAt: this.clock().toISOString(), changedPaths: imported.map((item) => item.targetPath) };
      await validateContractRecord("migration-result", result); await fs.mkdir(path.dirname(recordFile), { recursive: true }); await assertNoSymlinkPath(root, path.posix.dirname(recordRelative));
      await fs.writeFile(recordFile, serializeRecord(result, { title: `Vault migration ${id} ${phase}`, summaryKeys: ["id", "migrationId", "phase", "imported", "skipped", "conflicts", "completedAt"] }), "utf8");
      if (phase === "content") for (const conflict of manifest.files.filter((item) => item.action === "conflict")) {
        const record = { sourcePath: conflict.sourcePath, targetPath: conflict.targetPath, sourceSha256: conflict.sourceSha256, targetSha256: conflict.targetSha256, decision: "keep-syno", summary: conflict.diffSummary };
        await validateContractRecord("migration-conflict", record); const relative = `ops/artifacts/migrations/conflicts/${id}-${sha256(conflict.targetPath).slice(0, 12)}.md`; const file = await assertNoSymlinkPath(root, relative, { allowMissingLeaf: true });
        try { await fs.access(file); } catch { await fs.mkdir(path.dirname(file), { recursive: true }); await assertNoSymlinkPath(root, path.posix.dirname(relative)); await fs.writeFile(file, serializeRecord(record, { title: `Migration conflict: ${conflict.targetPath}`, summaryKeys: ["sourcePath", "targetPath", "decision"] }), "utf8"); }
        conflictPaths.push(relative);
      }
    }
    return { id, phase, imported: imported.length, skipped: prepared.length - imported.length, conflicts: manifest.summary.conflict,
      changedPaths: shouldRecord ? [...imported.map((item) => item.targetPath), recordRelative, ...conflictPaths] : [] };
  }
}

export { VaultMigrationService, normalizeNote };
