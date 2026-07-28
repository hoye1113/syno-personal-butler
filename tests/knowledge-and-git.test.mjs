import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { GitGuard, parsePorcelainZ } from "../apps/syno/syno/git-guard.mjs";
import { KnowledgeStore } from "../apps/syno/syno/knowledge-store.mjs";

const exec = promisify(execFile);

test("knowledge search and full reader work without Obsidian", async () => {
  const knowledge = new KnowledgeStore();
  const rebuilt = await knowledge.rebuild();
  assert.ok(rebuilt.notes > 50);
  const results = await knowledge.search("AI", { limit: 5 });
  assert.ok(results.length > 0);
  const note = await knowledge.read(results[0].path);
  assert.equal(note.path, results[0].path);
  assert.ok(note.markdown.length > 0);
});

test("knowledge search combines tag, source, stability and date filters", async (t) => {
  const testRoot = path.join(path.resolve(import.meta.dirname, ".."), ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const vaultRoot = await fs.mkdtemp(path.join(testRoot, "syno-knowledge-filter-"));
  t.after(() => fs.rm(vaultRoot, { recursive: true, force: true }));
  await fs.writeFile(path.join(vaultRoot, "agent.md"), `---\ntitle: Agent Harness\ntags: [AI, Agent]\nsource: GitHub\nstability: practice\nupdated: 2026-07-20\n---\n# Agent Harness\n\n反馈闭环。`, "utf8");
  await fs.writeFile(path.join(vaultRoot, "philosophy.md"), `---\ntitle: 长期主义\ntags: [人生]\nsource: 书籍\nstability: principle\nupdated: 2025-01-01\n---\n# 长期主义`, "utf8");
  const knowledge = new KnowledgeStore({ vaultRoot });
  const results = await knowledge.search("Agent", { tags: ["AI", "Agent"], source: "git", stability: "practice", from: "2026-01-01", to: "2026-12-31" });
  assert.deepEqual(results.map((item) => item.title), ["Agent Harness"]);
  assert.deepEqual(await knowledge.search("Agent", { stability: "principle" }), []);
});

test("knowledge index never stores a sensitive note excerpt", async (t) => {
  const testRoot = path.join(path.resolve(import.meta.dirname, ".."), ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(testRoot, "syno-sensitive-index-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const indexFile = path.join(root, "index.json");
  await fs.writeFile(path.join(root, "private.md"), "---\ntitle: 私密记录\nprivacy: private\n---\n绝不能发送的正文", "utf8");
  const knowledge = new KnowledgeStore({ vaultRoot: root, indexFile });
  const results = await knowledge.search("私密记录");
  assert.equal(results[0].sensitive, true);
  assert.equal(results[0].excerpt, "");
  assert.doesNotMatch(await fs.readFile(indexFile, "utf8"), /绝不|发送|正文/);
});

test("knowledge index finds Chinese concepts and hides system noise by default", async (t) => {
  const testRoot = path.join(path.resolve(import.meta.dirname, ".."), ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(testRoot, "syno-knowledge-index-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const vaultRoot = path.join(root, "vault");
  const indexFile = path.join(root, "runtime", "knowledge-index-v1.json");
  await writeFixture(path.join(vaultRoot, "01-Areas", "知识闭环.md"), `---\ntitle: 知识闭环私人管家\ntags: [ai_agent]\nlegacy_tags: [agent_runtime]\nsource: personal\nknowledge_state: captured\nlink_status: connected\n---\n# 知识闭环私人管家\n\n输入、整理、学习与输出形成闭环。`);
  await writeFixture(path.join(vaultRoot, "99-System", "audit", "知识管家.md"), "# 知识管家\n\n系统审计噪声。");
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile });
  const chinese = await knowledge.search("知识管家");
  assert.deepEqual(chinese.map((item) => item.title), ["知识闭环私人管家"]);
  assert.ok(chinese[0].matchReasons.includes("title"));
  assert.equal(chinese[0].knowledgeState, "captured");
  const legacy = await knowledge.search("agent_runtime");
  assert.deepEqual(legacy.map((item) => item.title), ["知识闭环私人管家"]);
  assert.ok(legacy[0].matchReasons.includes("legacy_tag"));
  assert.equal((await fs.stat(indexFile)).isFile(), true);
});

async function writeFixture(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, "utf8");
}

test("GitGuard commits only declared paths", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-git-guard-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.name", "Syno Test"], { cwd: root });
  await exec("git", ["config", "user.email", "syno-test@localhost"], { cwd: root });
  await fs.writeFile(path.join(root, "base.md"), "base\n");
  await exec("git", ["add", "--", "base.md"], { cwd: root });
  await exec("git", ["commit", "-m", "base"], { cwd: root });
  await fs.writeFile(path.join(root, "declared.md"), "declared\n");
  await fs.writeFile(path.join(root, "unrelated.md"), "unrelated\n");
  const guard = new GitGuard({ repoRoot: root, worktreeRoot: path.join(root, ".worktrees") });
  assert.equal(guard.writeLock.file, path.join(root, ".runtime", "locks", "repository-git.lock"));
  await fs.mkdir(path.dirname(guard.writeLock.file), { recursive: true });
  await fs.writeFile(guard.writeLock.file, "owned by GitGuard");
  assert.deepEqual((await guard.changedPaths()).sort(), ["declared.md", "unrelated.md"]);
  await fs.rm(guard.writeLock.file, { force: true });
  const result = await guard.commitPaths(["declared.md"], "test: declared only");
  assert.equal(result.committed, true);
  assert.deepEqual(result.paths, ["declared.md"]);
  assert.deepEqual(await guard.changedPaths(), ["unrelated.md"]);
  const tracked = (await exec("git", ["show", "--name-only", "--format="], { cwd: root })).stdout.trim();
  assert.equal(tracked, "declared.md");
});

test("GitGuard commits hundreds of long declared paths without exceeding the Windows command line", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-git-many-paths-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.name", "Syno Test"], { cwd: root });
  await exec("git", ["config", "user.email", "syno-test@localhost"], { cwd: root });
  await fs.writeFile(path.join(root, "base.md"), "base\n");
  await exec("git", ["add", "--", "base.md"], { cwd: root });
  await exec("git", ["commit", "-m", "base"], { cwd: root });

  const declared = Array.from({ length: 426 }, (_, index) => `note-${String(index).padStart(3, "0")}-${"long-path-".repeat(11)}.md`);
  await Promise.all(declared.map((relative) => fs.writeFile(path.join(root, relative), `${relative}\n`)));
  await fs.writeFile(path.join(root, "unrelated.md"), "must remain untracked\n");

  const guard = new GitGuard({ repoRoot: root, worktreeRoot: path.join(root, ".worktrees") });
  const result = await guard.commitPaths(declared, "test: many exact paths");

  assert.equal(result.committed, true);
  assert.equal(result.paths.length, declared.length);
  assert.deepEqual(await guard.changedPaths(), ["unrelated.md"]);
});

test("GitGuard surfaces git add failures as a clean error without crashing the worker", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-git-add-fail-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const guard = new GitGuard({ repoRoot: root, worktreeRoot: path.join(root, ".worktrees") });
  // 非 git 目录：git add 在仓库发现阶段即以 128 退出，根本不读 stdin；超过管道缓冲的 pathspec 经 stdin
  // 写入会触发 EPIPE。真实失败已由 execFile 回调捕获，此处验证对外是干净 reject，而非未捕获 'error' 崩溃 worker。
  const oversized = Array.from({ length: 600 }, (_, index) => `note-${String(index).padStart(4, "0")}-${"x".repeat(120)}.md`);
  await assert.rejects(guard.commitPaths(oversized, "non-repo failure", root), (error) => /git add 失败/.test(error.message));
});

test("GitGuard commits non-ASCII declared paths without quotepath false-positives", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-git-nonascii-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.name", "Syno Test"], { cwd: root });
  await exec("git", ["config", "user.email", "syno-test@localhost"], { cwd: root });
  await fs.writeFile(path.join(root, "base.md"), "base\n");
  await exec("git", ["add", "--", "base.md"], { cwd: root });
  await exec("git", ["commit", "-m", "base"], { cwd: root });
  // 真实迁移内容为中文路径；core.quotepath=true 时 git diff --cached --name-only 会八进制转义，
  // 与 raw 声明路径比对会误判"未声明路径"。此处验证精确暂存对非 ASCII 路径成立。
  const declared = ["vault/01-认知/0-1 前言.md", "vault/01-认知/1-1 搞定 Agent.md", "vault/02-资源/知识图谱.md"];
  for (const relative of declared) {
    await fs.mkdir(path.join(root, path.dirname(relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), `${relative}\n`);
  }
  await fs.writeFile(path.join(root, "unrelated.md"), "must remain untracked\n");
  const guard = new GitGuard({ repoRoot: root, worktreeRoot: path.join(root, ".worktrees") });
  const result = await guard.commitPaths(declared, "test: non-ascii paths");
  assert.equal(result.committed, true);
  assert.deepEqual(result.paths.sort(), [...declared].sort());
  assert.deepEqual(await guard.changedPaths(), ["unrelated.md"]);
});

test("Git porcelain rename parsing keeps both destination and source", () => {
  assert.deepEqual(parsePorcelainZ("R  new.md\0old.md\0"), ["new.md", "old.md"]);
});

test("GitGuard rejects a branch changed after its diff approval", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-git-pin-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.name", "Syno Test"], { cwd: root });
  await exec("git", ["config", "user.email", "syno-test@localhost"], { cwd: root });
  await fs.writeFile(path.join(root, ".gitignore"), ".worktrees/\n");
  await fs.writeFile(path.join(root, "base.md"), "base\n");
  await exec("git", ["add", "--", ".gitignore", "base.md"], { cwd: root });
  await exec("git", ["commit", "-m", "base"], { cwd: root });
  const guard = new GitGuard({ repoRoot: root, worktreeRoot: path.join(root, ".worktrees") });
  const worktree = await guard.prepareWorktree("pin-test");
  await fs.writeFile(path.join(worktree.directory, "new.md"), "approved\n");
  await guard.commitPaths(["new.md"], "approved", worktree.directory);
  const approved = await guard.pinWorktree(worktree);
  await fs.writeFile(path.join(worktree.directory, "later.md"), "not approved\n");
  await exec("git", ["add", "--", "later.md"], { cwd: worktree.directory });
  await exec("git", ["commit", "-m", "mutated after preview"], { cwd: worktree.directory });
  await assert.rejects(guard.mergeWorktree({ ...worktree, commit: approved.commit, diffHash: approved.diffHash }), /审批后发生变化/);
  await guard.removeWorktree(worktree);
});
