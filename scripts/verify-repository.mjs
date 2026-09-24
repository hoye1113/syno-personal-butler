import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const textExtensions = new Set([".md", ".mjs", ".js", ".json", ".ps1", ".py", ".toml", ".yml", ".yaml", ".html", ".css"]);
const errors = [];

// 工作区文件以 git 语义枚举：tracked + untracked-non-ignored（= `git status` 可见面）。
// 取代手写 walk 的白名单忽略集：不再随测试产物（*.log、临时夹具等）漂移计数，
// 忽略规则一次维护在 .gitignore；quarantine（历史 ops 内敏感隔离区，仅回滚形态存在）仍显式排除。
function gitFileList() {
  const tracked = execFileSync("git", ["-c", "core.quotepath=false", "ls-files"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  const others = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return [...new Set([...tracked.split(/\r?\n/), ...others.split(/\r?\n/)].filter(Boolean))].sort();
}

const files = gitFileList()
  .filter((relative) => !relative.startsWith("ops/artifacts/quarantine/"))
  .map((relative) => path.join(ROOT, relative));
for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  // A deliberate removal remains in `git ls-files` until it is staged.  Verification must
  // evaluate the working tree that will be committed, rather than treating that deletion as
  // a failed read of an obsolete asset.
  try { await fs.access(file); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
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
  "apps/syno/server.mjs", "packages/syno-core/syno-core.mjs",
  "contracts/job.schema.json", "docs/ARCHITECTURE.md",
];
for (const relative of required) {
  try { await fs.access(path.join(ROOT, relative)); } catch { errors.push(`${relative}: required file missing`); }
}

// D13.8（2026-09-01）：拆库后 vault/ops 归属独立知识仓库（SYNO_KNOWLEDGE_ROOT），
// fresh clone 的代码仓不含知识内容；设置 env 时追加知识仓形态检查。
if (process.env.SYNO_KNOWLEDGE_ROOT) {
  const knowledgeRoot = path.resolve(process.env.SYNO_KNOWLEDGE_ROOT);
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
