import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(MODULE_DIR, "..");
const REPO_ROOT = process.env.NODE_ENV === "test" && process.env.SYNO_REPO_ROOT
  ? path.resolve(process.env.SYNO_REPO_ROOT)
  : path.resolve(APP_ROOT, "..", "..");

function localDataRoot() {
  if (process.env.SYNO_LOCAL_DATA) return path.resolve(process.env.SYNO_LOCAL_DATA);
  const base = process.env.LOCALAPPDATA || process.env.HOME || REPO_ROOT;
  return path.resolve(base, "Syno");
}

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

// Canonical local web port. Host listens here (apps/syno/server.mjs); every probe/script mirrors it.
// PORT env overrides. This is the single JS source of truth — PowerShell scripts mirror with `$env:PORT || 8888`.
const DEFAULT_WEB_PORT = 8888;

const PATHS = Object.freeze({
  repoRoot: REPO_ROOT,
  appRoot: APP_ROOT,
  vaultRoot: path.join(REPO_ROOT, "vault"),
  opsRoot: path.join(REPO_ROOT, "ops"),
  runtimeRoot: path.resolve(process.env.SYNO_RUNTIME_ROOT || path.join(REPO_ROOT, ".runtime")),
  worktreeRoot: path.join(REPO_ROOT, ".worktrees"),
  localDataRoot: localDataRoot(),
  credentialsRoot: path.join(localDataRoot(), "credentials"),
  stateRoot: path.join(localDataRoot(), "state"),
});

export { DEFAULT_WEB_PORT, PATHS, relativeToRepo, resolveInside };
