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
