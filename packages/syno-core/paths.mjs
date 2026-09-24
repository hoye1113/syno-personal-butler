import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.NODE_ENV === "test" && process.env.SYNO_REPO_ROOT
  ? path.resolve(process.env.SYNO_REPO_ROOT)
  : path.resolve(MODULE_DIR, "..", "..");

function localDataRoot() {
  if (process.env.SYNO_LOCAL_DATA) return path.resolve(process.env.SYNO_LOCAL_DATA);
  const base = process.env.LOCALAPPDATA || process.env.HOME || REPO_ROOT;
  return path.resolve(base, "Syno");
}

// D13（2026-09-01）：知识根——vault/ops 的归属仓库。SYNO_KNOWLEDGE_ROOT 设置时指向独立知识仓库
// （拆库形态）；缺省回退 REPO_ROOT（单库模式，测试与 fresh clone 行为与历史逐字节一致）。
const KNOWLEDGE_ROOT = path.resolve(process.env.SYNO_KNOWLEDGE_ROOT || REPO_ROOT);

function resolveInside(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate || ".");
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error(`路径超出允许范围：${candidate}`);
    error.code = "PATH_OUTSIDE_ROOT";
    throw error;
  }
  return resolved;
}

function relativeToRepo(candidate) {
  const absolute = resolveInside(REPO_ROOT, candidate);
  return path.relative(REPO_ROOT, absolute).replace(/\\/g, "/") || ".";
}

// 知识文件的逻辑路径（vault/...、ops/...）永远对知识根求相对；拆库后对 REPO_ROOT 求相对会
// 抛 PATH_OUTSIDE_ROOT（知识文件已在仓外）。
function relativeToKnowledge(candidate) {
  const absolute = resolveInside(KNOWLEDGE_ROOT, candidate);
  return path.relative(KNOWLEDGE_ROOT, absolute).replace(/\\/g, "/") || ".";
}

// 实例根逻辑路径：对调用方给定的仓库根求相对并 confine（越界抛 PATH_OUTSIDE_ROOT）。
// 与 relativeToKnowledge 的区别：根由调用方给出（store 实例根优先于进程级 env，D13.6），
// 且保持 v1 的越界断言——裸 path.relative 会静默产出仓外绝对串，丢防御面。
function relativeToRoot(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const absolute = resolveInside(resolvedRoot, candidate);
  return path.relative(resolvedRoot, absolute).replace(/\\/g, "/") || ".";
}

// Canonical local web port. Host listens here (apps/syno/server.mjs); every probe/script mirrors it.
// PORT env overrides. This is the single JS source of truth — PowerShell scripts mirror with `$env:PORT || 8888`.
const DEFAULT_WEB_PORT = 8888;

const PATHS = Object.freeze({
  repoRoot: REPO_ROOT,
  knowledgeRoot: KNOWLEDGE_ROOT,
  vaultRoot: path.join(KNOWLEDGE_ROOT, "vault"),
  opsRoot: path.join(KNOWLEDGE_ROOT, "ops"),
  runtimeRoot: path.resolve(process.env.SYNO_RUNTIME_ROOT || path.join(REPO_ROOT, ".runtime")),
  worktreeRoot: path.join(REPO_ROOT, ".worktrees"),
  localDataRoot: localDataRoot(),
  credentialsRoot: path.join(localDataRoot(), "credentials"),
  stateRoot: path.join(localDataRoot(), "state"),
});

export { DEFAULT_WEB_PORT, PATHS, relativeToKnowledge, relativeToRepo, relativeToRoot, resolveInside };
