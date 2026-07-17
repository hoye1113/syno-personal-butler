import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { PATHS } from "./paths.mjs";

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
      const target = entries[index + 1];
      if (target) {
        paths.push(target.replace(/\\/g, "/"));
        index += 1;
      }
    } else {
      paths.push(file.replace(/\\/g, "/"));
    }
  }
  return [...new Set(paths.filter(Boolean))];
}

class GitGuard {
  constructor({ repoRoot = PATHS.repoRoot, worktreeRoot = PATHS.worktreeRoot } = {}) {
    this.repoRoot = repoRoot;
    this.worktreeRoot = worktreeRoot;
  }

  async changedPaths(cwd = this.repoRoot) {
    const { stdout } = await git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd });
    return parsePorcelainZ(stdout);
  }

  async diff(paths = [], cwd = this.repoRoot) {
    if (!paths.length) return "";
    const { stdout } = await git(["diff", "--", ...paths], { cwd });
    const { stdout: untracked } = await git(["ls-files", "--others", "--exclude-standard", "--", ...paths], { cwd });
    return `${stdout}${untracked ? `\n未跟踪文件：\n${untracked}` : ""}`.trim();
  }

  async branchDiff(branch) {
    const { stdout } = await git(["diff", "HEAD..." + branch, "--"], { cwd: this.repoRoot });
    return stdout;
  }

  async commitPaths(paths, message, cwd = this.repoRoot) {
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
    const safeId = String(jobId).replace(/[^a-zA-Z0-9-]/g, "-");
    const branch = `syno/job/${safeId}`;
    const directory = path.join(this.worktreeRoot, `syno-job-${safeId}`);
    await fs.mkdir(this.worktreeRoot, { recursive: true });
    try { await fs.access(directory); throw new Error(`工作树目录已存在：${directory}`); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await git(["worktree", "add", "-b", branch, directory], { cwd: this.repoRoot });
    return { branch, directory };
  }

  async mergeWorktree({ branch }) {
    const dirty = await this.changedPaths(this.repoRoot);
    if (dirty.length) throw new Error("主工作区存在未提交变更，拒绝自动合并");
    await git(["merge", "--no-ff", branch, "-m", `merge: ${branch}`], { cwd: this.repoRoot });
    const { stdout } = await git(["rev-parse", "HEAD"], { cwd: this.repoRoot });
    return { merged: true, commit: stdout.trim() };
  }


  async removeWorktree({ directory, branch } = {}) {
    if (directory) await git(["worktree", "remove", "--force", directory], { cwd: this.repoRoot });
    if (branch) await git(["branch", "-D", branch], { cwd: this.repoRoot });
  }
}

export { GitGuard, git, parsePorcelainZ };
