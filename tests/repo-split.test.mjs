import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// 拆库（D13）探针：本文件进程内先固定 SYNO_KNOWLEDGE_ROOT，再动态 import paths.mjs
// （paths 在模块加载时解析 env；静态 import 会先于赋值执行，必须动态）。
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "syno-repo-split-"));
const knowledgeRoot = path.join(scratch, "knowledge");
const contractRoot = path.join(scratch, "code");
await fs.mkdir(path.join(knowledgeRoot, "vault"), { recursive: true });
await fs.mkdir(path.join(knowledgeRoot, "ops"), { recursive: true });
await fs.mkdir(path.join(contractRoot, "config"), { recursive: true });
process.env.SYNO_KNOWLEDGE_ROOT = knowledgeRoot;

const { PATHS, relativeToKnowledge, relativeToRepo, relativeToRoot } = await import("../apps/syno/syno/paths.mjs");
const { GitGuard } = await import("../apps/syno/syno/git-guard.mjs");
const { validateVaultContract } = await import("../apps/syno/syno/validator.mjs");

function git(cwd, args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", windowsHide: true }).trim();
}

async function initRepo(root) {
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "split@test.local"]);
  git(root, ["config", "user.name", "split-test"]);
  git(root, ["config", "commit.gpgsign", "false"]);
}

test("PATHS 拆库解析：知识根派生 vault/ops，逻辑路径对知识根求相对", async () => {
  assert.equal(PATHS.knowledgeRoot, path.resolve(knowledgeRoot));
  assert.equal(PATHS.vaultRoot, path.join(path.resolve(knowledgeRoot), "vault"));
  assert.equal(PATHS.opsRoot, path.join(path.resolve(knowledgeRoot), "ops"));
  const noteFile = path.join(PATHS.vaultRoot, "02-Resources", "x.md");
  assert.equal(relativeToKnowledge(noteFile), "vault/02-Resources/x.md");
  // 知识文件已在代码仓外：对 repoRoot 求相对必须结构性拒绝（防复活通道）
  assert.throws(() => relativeToRepo(noteFile), /PATH_OUTSIDE_ROOT|路径超出允许范围/);
  // 实例根逻辑路径（D13.6 修正三处 store 的公共原语）：仓内 OK、越界仍抛（防御面不因实例根丢失）
  const instanceRoot = path.dirname(PATHS.vaultRoot);
  assert.equal(relativeToRoot(instanceRoot, noteFile), "vault/02-Resources/x.md");
  assert.throws(() => relativeToRoot(instanceRoot, path.join(contractRoot, "config", "vault-contract.json")), /PATH_OUTSIDE_ROOT|路径超出允许范围/);
});

test("GitGuard 拆库形态：知识仓提交、D10 闸门与 productBranch 断言", async (t) => {
  await initRepo(knowledgeRoot);
  const lockFile = path.join(scratch, "locks", "knowledge-git.lock");
  const worktreeRoot = path.join(scratch, "worktrees");
  const guard = new GitGuard({ repoRoot: knowledgeRoot, worktreeRoot, lockFile, productBranch: "main" });

  const note = path.join(knowledgeRoot, "vault", "note.md");
  await fs.writeFile(note, "---\ntags: [x]\n---\n正文\n", "utf8");
  const committed = await guard.commitPaths(["vault/note.md"], "syno: test commit");
  assert.equal(committed.committed, true);
  assert.equal(git(knowledgeRoot, ["log", "--oneline"]).split("\n").length, 1);

  // D10 硬闸门不变：源码根路径永远被拒
  await assert.rejects(guard.commitPaths(["apps/syno/x.mjs"], "nope"), /只允许 vault/);

  // productBranch：主检出切到功能分支后产品提交被拒（堵 host 误提交到功能分支的实证类）
  git(knowledgeRoot, ["checkout", "-q", "-b", "feature-x"]);
  await fs.writeFile(note, "---\ntags: [x]\n---\n改动\n", "utf8");
  await assert.rejects(guard.commitPaths(["vault/note.md"], "nope"), /只允许在 main 分支/);
  git(knowledgeRoot, ["checkout", "-q", "main"]);
  git(knowledgeRoot, ["restore", "vault/note.md"]);
  const worktree = await guard.prepareWorktree("job-split-1");
  assert.equal(worktree.branch, "syno/job/job-split-1");
  assert.equal(path.dirname(worktree.directory), path.resolve(worktreeRoot));
  const worktreeNote = path.join(worktree.directory, "vault", "worktree-note.md");
  await fs.writeFile(worktreeNote, "---\ntags: [y]\n---\n隔离写入\n", "utf8");
  const worktreeCommit = await guard.commitPaths(["vault/worktree-note.md"], "syno: execute job-split-1", worktree.directory);
  assert.equal(worktreeCommit.committed, true);

  // 合回同一闸门：主检出在功能分支时 mergeWorktree 同样被拒（堵合入旁路），回 main 后放行
  const mergeArgs = { branch: worktree.branch, commit: worktreeCommit.commit, base: worktree.base };
  git(knowledgeRoot, ["checkout", "-q", "-b", "feature-merge"]);
  await assert.rejects(guard.mergeWorktree(mergeArgs), /只允许在 main 分支/);
  git(knowledgeRoot, ["checkout", "-q", "main"]);
  git(knowledgeRoot, ["branch", "-q", "-D", "feature-merge"]);
  const merged = await guard.mergeWorktree(mergeArgs);
  assert.equal(merged.merged, true);
  // merge 提交的 combined diff 为空；直接比第二父引入的文件（merge 提交 git show 不适用）
  assert.equal(git(knowledgeRoot, ["diff", "--name-only", "HEAD^1", "HEAD"]).trim(), "vault/worktree-note.md");

  await guard.removeWorktree(worktree);
  t.after(() => fs.rm(worktreeRoot, { recursive: true, force: true }));
});

test("validator 双根：vault/HEAD 取自知识仓，vault-contract 取自代码仓", async () => {
  // 代码仓夹具：只允许 tag alpha
  await fs.writeFile(path.join(contractRoot, "config", "vault-contract.json"), JSON.stringify({
    requiredFrontmatter: ["tags"],
    approvedTags: ["alpha"],
  }), "utf8");

  const fresh = path.join(scratch, "k2");
  await fs.mkdir(path.join(fresh, "vault"), { recursive: true });
  await fs.mkdir(path.join(fresh, "ops"), { recursive: true });
  await initRepo(fresh);
  const note = path.join(fresh, "vault", "Note.md");
  await fs.writeFile(note, "---\ntags:\n  - alpha\n---\n正文\n", "utf8");
  // 第四参 contractRoot 显式分离：vault 扫描/HEAD 比对在知识仓，契约在代码仓
  await validateVaultContract(fresh, ["vault/Note.md"], { intent: "curate_note" }, contractRoot);

  // 换用不在代码仓契约白名单的 tag → 契约拒绝（证明契约确实来自 contractRoot 而非知识仓）
  await fs.writeFile(note, "---\ntags:\n  - beta\n---\n正文\n", "utf8");
  await assert.rejects(
    validateVaultContract(fresh, ["vault/Note.md"], { intent: "curate_note" }, contractRoot),
    /beta|tag/i,
  );
});
