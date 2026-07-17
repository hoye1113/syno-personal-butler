import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { PATHS } from "./paths.mjs";

const execFileAsync = promisify(execFile);

function normalizeRelative(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function validateChangedPaths(paths, decision) {
  const normalized = [...new Set((paths || []).map(normalizeRelative).filter(Boolean))];
  const forbidden = normalized.filter((item) => item === ".git" || item.startsWith(".git/") || item.startsWith(".runtime/") || item.includes("../"));
  if (forbidden.length) throw new Error(`检测到禁止变更路径：${forbidden.join(", ")}`);
  const allowed = decision.allowedRoots || [];
  if (!allowed.length && normalized.length) throw new Error("只读 Profile 产生了文件变更");
  const outside = normalized.filter((item) => !allowed.some((root) => item === root || item.startsWith(`${root}/`)));
  if (outside.length) throw new Error(`变更超出 ${decision.profile} 允许范围：${outside.join(", ")}`);
  return normalized;
}

async function validateMarkdown(repoRoot, changedPaths) {
  const errors = [];
  for (const relative of changedPaths.filter((item) => item.endsWith(".md") && item.startsWith("vault/"))) {
    const file = path.join(repoRoot, relative);
    let text;
    try { text = await fs.readFile(file, "utf8"); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) errors.push(`${relative}: 缺少 frontmatter`);
    if (!/^title:\s*.+$/m.test(text)) errors.push(`${relative}: 缺少 title`);
    if (/^tags:\s*\[?[^\n]*#[^\n]*/m.test(text)) errors.push(`${relative}: tag 不应包含 #`);
    try { frontmatterData(text); } catch (error) { errors.push(`${relative}: ${error.message}`); }
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

function frontmatterData(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) return { values: {}, tags: [], body: text };
  const block = match[1];
  const values = {};
  const keys = new Set();
  for (const line of block.split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!field) {
      if (/^\s*<<\s*:/.test(line)) throw new Error("frontmatter 禁止 YAML merge key");
      continue;
    }
    if (keys.has(field[1])) throw new Error(`frontmatter 存在重复字段：${field[1]}`);
    keys.add(field[1]);
    if (/^[&*!]|^[>|]$/.test(field[2].trim())) throw new Error(`frontmatter 字段 ${field[1]} 使用了不受支持的 YAML 特性`);
    values[field[1]] = field[2].trim().replace(/^['"]|['"]$/g, "");
  }
  const tagLine = /^tags:[ \t]*(.*)$/m.exec(block);
  let tags = [];
  if (tagLine?.[1]) {
    tags = tagLine[1].replace(/^\[|\]$/g, "").split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  } else if (tagLine) {
    const tail = block.slice(tagLine.index + tagLine[0].length);
    const tagBlock = tail.split(/\r?\n(?=[A-Za-z_][\w-]*:\s*)/, 1)[0];
    tags = [...tagBlock.matchAll(/^\s+-\s+([^\r\n]+)$/gm)].map((item) => item[1].trim().replace(/^['"]|['"]$/g, ""));
  }
  return { values, tags, body: text.slice(match[0].length) };
}

async function readHeadText(repoRoot, relative) {
  try {
    const { stdout } = await execFileAsync("git", ["show", `HEAD:${relative}`], { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  } catch {
    return null;
  }
}

async function markdownFiles(root) {
  const output = [];
  async function walk(directory) {
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(candidate);
      else if (entry.isFile() && entry.name.endsWith(".md")) output.push(candidate);
    }
  }
  await walk(root);
  return output;
}

async function validateVaultContract(repoRoot, changedPaths, decision) {
  const changedNotes = changedPaths.filter((item) => item.startsWith("vault/") && item.endsWith(".md"));
  if (!changedNotes.length) return;
  const contract = JSON.parse(await fs.readFile(path.join(repoRoot, "config", "vault-contract.json"), "utf8"));
  const approved = new Set(contract.approvedTags || []);
  const errors = [];
  const sourceOwners = new Map();
  for (const file of await markdownFiles(path.join(repoRoot, "vault"))) {
    const relative = path.relative(repoRoot, file).replace(/\\/g, "/");
    const data = frontmatterData(await fs.readFile(file, "utf8"));
    const source = data.values.source_url || data.values.source;
    if (/^https?:\/\//i.test(source || "")) sourceOwners.set(source, [...(sourceOwners.get(source) || []), relative]);
  }

  for (const relative of changedNotes) {
    const absolute = path.join(repoRoot, relative);
    let text;
    try { text = await fs.readFile(absolute, "utf8"); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const current = frontmatterData(text);
    const headText = await readHeadText(repoRoot, relative);
    const previous = headText === null ? null : frontmatterData(headText);
    const filename = path.basename(relative, ".md");
    if (headText === null) {
      for (const field of contract.requiredFrontmatter || []) {
        const missing = field === "tags"
          ? current.tags.length === 0
          : field === "source"
            ? !current.values.source && !current.values.source_url
            : !current.values[field];
        if (missing) errors.push(`${relative}: 新笔记缺少 ${field}`);
      }
      if (filename.length > Number(contract.maxFilenameLength || 50) || /[<>:"/\\|?*：]/u.test(filename)) errors.push(`${relative}: 文件名不符合 Windows/长度约束`);
      if (contract.requireSemanticLinkOrOrphan && !/\[\[[^\]]+\]\]/.test(current.body) && !/^status:\s*orphan\s*$/m.test(text)) {
        errors.push(`${relative}: 新笔记必须包含语义 wikilink 或声明 status: orphan`);
      }
      if (/^MOC\s*-/i.test(filename) && decision.intent !== "new_moc") errors.push(`${relative}: 新 MOC 未通过 new_moc 双审批意图`);
    }
    const oldTags = new Set(previous?.tags || []);
    const addedTags = current.tags.filter((tag) => !oldTags.has(tag));
    const invalidTags = addedTags.filter((tag) => !approved.has(tag) || !/^[a-z0-9_]+$/.test(tag));
    if (invalidTags.length) errors.push(`${relative}: 未批准或非法 tag：${invalidTags.join(", ")}`);
    const source = current.values.source_url || current.values.source;
    const previousSource = previous?.values.source_url || previous?.values.source;
    if (source !== previousSource && /^https?:\/\//i.test(source || "")) {
      const duplicates = (sourceOwners.get(source) || []).filter((item) => item !== relative);
      if (duplicates.length) errors.push(`${relative}: source 已存在于 ${duplicates.join(", ")}`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

async function validateRepositoryChange({ repoRoot = PATHS.repoRoot, changedPaths, decision }) {
  const normalized = validateChangedPaths(changedPaths, decision);
  if (decision.validators?.includes("markdown")) await validateMarkdown(repoRoot, normalized);
  if (decision.validators?.includes("vault-contract")) await validateVaultContract(repoRoot, normalized, decision);
  return { ok: true, changedPaths: normalized };
}

export { frontmatterData, validateChangedPaths, validateMarkdown, validateRepositoryChange, validateVaultContract };
