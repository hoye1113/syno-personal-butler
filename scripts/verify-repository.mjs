import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set([
  ".git",
  ".runtime",
  ".worktrees",
  ".pnpm-store",
  ".playwright-cli",
  ".pytest_cache",
  "__pycache__",
  "node_modules",
  // 测试产物日志（*.log 已被 .gitignore 忽略；计数不应随本机残留浮动）
  ".runtime-test-mobile-mode.log",
]);
const ignoredRelativeDirectories = new Set(["ops/artifacts/quarantine"]);
const textExtensions = new Set([".md", ".mjs", ".js", ".json", ".ps1", ".py", ".toml", ".yml", ".yaml", ".html", ".css"]);
const errors = [];

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const candidate = path.join(directory, entry.name);
    const relativeCandidate = path.relative(ROOT, candidate).replace(/\\/g, "/");
    if (entry.isDirectory() && ignoredRelativeDirectories.has(relativeCandidate)) continue;
    if (!entry.isDirectory() && /^apps\/syno\/public\/assets\/syno\/[^/]+-key\.png$/.test(relativeCandidate)) continue;
    if (entry.isDirectory()) files.push(...await walk(candidate));
    else files.push(candidate);
  }
  return files;
}

const files = await walk(ROOT);
for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  if (path.extname(file) === ".json") {
    try { JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { errors.push(`${relative}: invalid JSON (${error.message})`); }
  }
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const text = await fs.readFile(file, "utf8");
  // vault/ 是主人的知识库（教程代码示例、溯源路径等合法内容），ops/ 的 Job/事件/产物记录
  // 会引用并记录这些内容（如迁移 diff 预览）；其敏感内容由迁移 sensitiveReason + 主人批准的
  // 排除项把关。密钥/路径卫生启发式只对 Syno 源码生效。
  const isUserContent = relative.startsWith("vault/") || relative.startsWith("ops/");
  if (!isUserContent) {
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) errors.push(`${relative}: private key material`);
    if (/\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/.test(text)) errors.push(`${relative}: probable credential`);
    if (/C:\\Users\\[^\\\s]+\\\.(?:openclaw|ssh)|%LOCALAPPDATA%\\Syno\\credentials/i.test(text) && !relative.startsWith("docs/")) {
      errors.push(`${relative}: local credential path must only appear in documentation`);
    }
    if (!relative.startsWith("docs/") && /(?:[A-Za-z]:[\\/](?:Users|workSpace)[\\/]|D:[\\/]workSpace[\\/])/i.test(text)) {
      errors.push(`${relative}: hard-coded personal absolute path`);
    }
  }
  if ((relative.startsWith("apps/") || relative.startsWith("config/")) && /macOS|AppleScript|osascript|com\.apple\.iCal/i.test(text)) {
    errors.push(`${relative}: unsupported Apple implementation reference`);
  }
}

const required = [
  "apps/syno/server.mjs", "apps/syno/syno/syno-core.mjs",
  "contracts/job.schema.json", "docs/ARCHITECTURE.md",
];
for (const relative of required) {
  try { await fs.access(path.join(ROOT, relative)); } catch { errors.push(`${relative}: required file missing`); }
}

// D13.8（2026-09-01）：拆库后 vault/ops 归属独立知识仓库（SYNO_KNOWLEDGE_ROOT），
// fresh clone 的代码仓不含知识内容；设置 env 时追加知识仓形态检查。
if (process.env.SYNO_KNOWLEDGE_ROOT) {
  const knowledgeRoot = path.resolve(process.env.SYNO_KNOWLEDGE_ROOT);
  const { execFileSync } = await import("node:child_process");
  for (const entry of ["vault", "ops", ".git", "vault/AGENTS.md", "ops/README.md"]) {
    try { await fs.access(path.join(knowledgeRoot, entry)); } catch { errors.push(`知识仓库缺少：${entry}`); }
  }
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: knowledgeRoot, encoding: "utf8" }).trim();
    if (branch !== "main") errors.push(`知识仓库当前分支应为 main，实际：${branch}`);
  } catch (error) { errors.push(`知识仓库 git 检查失败：${error.message}`); }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Repository verification passed (${files.length} files).`);
}
