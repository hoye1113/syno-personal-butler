import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";

const execFileAsync = promisify(execFile);

async function git(args, { cwd = PATHS.repoRoot, allowExitCodes = [] } = {}) {
  try {
    const result = await execFileAsync("git", args, { cwd, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    return { stdout: result.stdout, stderr: result.stderr, code: 0 };
  } catch (error) {
    if (allowExitCodes.includes(error.code)) return { stdout: error.stdout || "", stderr: error.stderr || "", code: error.code };
    throw new Error(`git ${args[0]} 失败：${String(error.stderr || error.message).trim()}`);
  }
}

function parsePorcelainZ(raw) {
  const entries = String(raw).split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const file = entry.slice(3);
    if (status.includes("R") || status.includes("C")) {
      const source = entries[index + 1];
      paths.push(file.replace(/\\/g, "/"));
      if (source) {
        paths.push(source.replace(/\\/g, "/"));
        index += 1;
      }
    } else {
      paths.push(file.replace(/\\/g, "/"));
    }
  }
  return [...new Set(paths.filter(Boolean))];
}

function parsePorcelainDetails(raw) {
  const entries = String(raw).split("\0").filter(Boolean);
  const changes = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    const file = entry.slice(3).replace(/\\/g, "/");
    const change = { status, path: file, kind: status === "??" || status.includes("A") ? "added" : "existing" };
    if (status.includes("R") || status.includes("C")) {
      change.sourcePath = String(entries[index + 1] || "").replace(/\\/g, "/");
      change.kind = "existing";
      index += 1;
    }
    changes.push(change);
  }
  return changes;
}

function diffHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

class GitGuard {
  constructor({ repoRoot = PATHS.repoRoot, worktreeRoot = PATHS.worktreeRoot, lockFile } = {}) {
    this.repoRoot = repoRoot;
    this.worktreeRoot = worktreeRoot;
    const resolvedLockFile = lockFile || (path.resolve(repoRoot) === path.resolve(PATHS.repoRoot)
      ? path.join(PATHS.runtimeRoot, "locks", "repository-git.lock")
      : path.join(repoRoot, ".runtime", "locks", "repository-git.lock"));
    this.writeLock = new ProcessFileLock({ file: resolvedLockFile, timeoutMs: 120_000 });
  }

  async changedPaths(cwd = this.repoRoot) {
    const { stdout } = await git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd });
    return parsePorcelainZ(stdout).filter((item) => !this.#isManagedPath(item, cwd));
  }

  async changes(cwd = this.repoRoot) {
    const { stdout } = await git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd });
    return parsePorcelainDetails(stdout).filter((item) => !this.#isManagedPath(item.path, cwd));
  }

  async diff(paths = [], cwd = this.repoRoot) {
    if (!paths.length) return "";
    const { stdout } = await git(["diff", "--", ...paths], { cwd });
    const { stdout: untracked } = await git(["ls-files", "--others", "--exclude-standard", "--", ...paths], { cwd });
    return `${stdout}${untracked ? `\n未跟踪文件：\n${untracked}` : ""}`.trim();
  }

  async branchDiff(branch, base = "HEAD") {
    const { stdout } = await git(["diff", `${base}...${branch}`, "--"], { cwd: this.repoRoot });
    return stdout;
  }

  async pinWorktree(worktree) {
    const { stdout: head } = await git(["rev-parse", worktree.branch], { cwd: this.repoRoot });
    const commit = head.trim();
    const { stdout: preview } = await git(["diff", `${worktree.base}...${commit}`, "--"], { cwd: this.repoRoot });
    const { stdout: names } = await git(["diff", "--name-status", "-z", worktree.base, commit, "--"], { cwd: this.repoRoot });
    const parts = names.split("\0").filter(Boolean);
    const changes = [];
    for (let index = 0; index < parts.length; index += 1) {
      const status = parts[index];
      const file = String(parts[index + 1] || "").replace(/\\/g, "/");
      if (!file) break;
      const change = { status, path: file, kind: status === "A" ? "added" : "existing" };
      index += 1;
      if (/^[RC]/.test(status)) {
        change.targetPath = String(parts[index + 1] || "").replace(/\\/g, "/");
        change.kind = "existing";
        index += 1;
      }
      changes.push(change);
    }
    return { commit, preview, diffHash: diffHash(`${names}\n${preview}`), changes };
  }

  async commitPaths(paths, message, cwd = this.repoRoot) {
    return this.writeLock.run(() => this.#commitPaths(paths, message, cwd));
  }

  async #commitPaths(paths, message, cwd) {
    const normalized = [...new Set(paths.map((item) => item.replace(/\\/g, "/")))];
    if (!normalized.length) return { committed: false, reason: "no_changes" };
    await git(["add", "--", ...normalized], { cwd });
    const staged = await git(["diff", "--cached", "--name-only"], { cwd });
    const stagedPaths = staged.stdout.trim().split(/\r?\n/).filter(Boolean);
    const unexpected = stagedPaths.filter((item) => !normalized.includes(item.replace(/\\/g, "/")));
    if (unexpected.length) throw new Error(`暂存区出现未声明路径：${unexpected.join(", ")}`);
    const quiet = await git(["diff", "--cached", "--quiet"], { cwd, allowExitCodes: [1] });
    if (quiet.code === 0) return { committed: false, reason: "no_staged_diff" };
    await git(["commit", "-m", message], { cwd });
    const { stdout } = await git(["rev-parse", "HEAD"], { cwd });
    return { committed: true, commit: stdout.trim(), paths: stagedPaths };
  }

  async prepareWorktree(jobId) {
    return this.writeLock.run(() => this.#prepareWorktree(jobId));
  }

  async #prepareWorktree(jobId) {
    const safeId = String(jobId).replace(/[^a-zA-Z0-9-]/g, "-");
    const branch = `syno/job/${safeId}`;
    const directory = path.join(this.worktreeRoot, `syno-job-${safeId}`);
    await fs.mkdir(this.worktreeRoot, { recursive: true });
    try { await fs.access(directory); throw new Error(`工作树目录已存在：${directory}`); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const { stdout } = await git(["rev-parse", "HEAD"], { cwd: this.repoRoot });
    const base = stdout.trim();
    await git(["worktree", "add", "-b", branch, directory, base], { cwd: this.repoRoot });
    return { branch, directory, base };
  }

  async mergeWorktree({ branch, commit, base, diffHash: expectedDiffHash }) {
    return this.writeLock.run(() => this.#mergeWorktree({ branch, commit, base, diffHash: expectedDiffHash }));
  }

  async #mergeWorktree({ branch, commit, base, diffHash: expectedDiffHash }) {
    const dirty = await this.changedPaths(this.repoRoot);
    if (dirty.length) throw new Error(`主工作区存在未提交变更，拒绝自动合并：${dirty.join(", ")}`);
    const pinned = await this.pinWorktree({ branch, base });
    if (!commit || pinned.commit !== commit || (expectedDiffHash && pinned.diffHash !== expectedDiffHash)) {
      throw new Error("隔离分支在审批后发生变化，拒绝合并");
    }
    try {
      await git(["merge", "--no-ff", commit, "-m", `merge: ${branch}`], { cwd: this.repoRoot });
    } catch (error) {
      await git(["merge", "--abort"], { cwd: this.repoRoot, allowExitCodes: [128] }).catch(() => {});
      throw error;
    }
    const { stdout } = await git(["rev-parse", "HEAD"], { cwd: this.repoRoot });
    return { merged: true, commit: stdout.trim() };
  }


  async removeWorktree({ directory, branch } = {}) {
    return this.writeLock.run(() => this.#removeWorktree({ directory, branch }));
  }

  async #removeWorktree({ directory, branch } = {}) {
    if (directory) await git(["worktree", "remove", "--force", directory], { cwd: this.repoRoot });
    if (branch) await git(["branch", "-D", branch], { cwd: this.repoRoot });
  }

  async isAncestor(commit, ref = "HEAD") {
    if (!commit) return false;
    const result = await git(["merge-base", "--is-ancestor", commit, ref], { cwd: this.repoRoot, allowExitCodes: [1] });
    return result.code === 0;
  }

  async restoreWorktree({ directory } = {}) {
    const resolved = path.resolve(directory || "");
    const relative = path.relative(path.resolve(this.worktreeRoot), resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("只允许重置 Syno 管理的隔离工作区");
    return this.writeLock.run(async () => {
      const changes = await this.changes(resolved);
      const tracked = [];
      const untracked = [];
      for (const change of changes) {
        for (const item of [change.path, change.sourcePath].filter(Boolean)) {
          const exists = await git(["cat-file", "-e", `HEAD:${item}`], { cwd: resolved, allowExitCodes: [128] });
          (exists.code === 0 ? tracked : untracked).push(item);
        }
      }
      if (tracked.length) await git(["restore", "--source=HEAD", "--staged", "--worktree", "--", ...new Set(tracked)], { cwd: resolved });
      for (const item of new Set(untracked)) {
        const target = path.resolve(resolved, item);
        const inside = path.relative(resolved, target);
        if (!inside.startsWith("..") && !path.isAbsolute(inside)) await fs.rm(target, { force: true });
      }
      const remaining = await this.changedPaths(resolved);
      if (remaining.length) throw new Error(`隔离工作区未能恢复干净：${remaining.join(", ")}`);
      return { restored: true };
    });
  }

  #isManagedPath(relative, cwd) {
    if (path.resolve(cwd) !== path.resolve(this.repoRoot)) return false;
    const value = String(relative).replace(/\\/g, "/");
    const runtime = path.relative(this.repoRoot, path.dirname(path.dirname(this.writeLock.file))).replace(/\\/g, "/");
    if (runtime && !runtime.startsWith("../") && !path.isAbsolute(runtime) && (value === runtime || value.startsWith(`${runtime}/`))) return true;
    const managed = path.relative(this.repoRoot, this.worktreeRoot).replace(/\\/g, "/");
    if (!managed || managed.startsWith("../") || path.isAbsolute(managed)) return false;
    return value === managed || value.startsWith(`${managed}/`);
  }
}

export { GitGuard, diffHash, git, parsePorcelainDetails, parsePorcelainZ };
