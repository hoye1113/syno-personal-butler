import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { releaseP5Plugin } from "../packages/syno-core/plugin-release.mjs";
import { readActivePlugin } from "../packages/syno-core/plugin-version.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-plugin-release-"));
  const repo = path.join(root, "repo");
  const source = path.join(root, "source-plugin");
  await fs.mkdir(repo);
  await fs.mkdir(path.join(source, "bin"), { recursive: true });
  const manifest = {
    name: "p5-radar",
    contract: "syno.p5-radar/1",
    version: "9.9.9",
    entry: "bin/plugin.mjs",
    capabilities: ["health", "collect", "renderDailyDoc", "feedback", "status"],
  };
  await fs.writeFile(path.join(source, "plugin.json"), JSON.stringify(manifest));
  await fs.writeFile(path.join(source, "bin", "plugin.mjs"), "process.exit(0);\n");
  execFileSync("git", ["init", "--quiet"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init", "--quiet"], { cwd: repo });
  return { root, repo, source, manifest, registryFile: path.join(root, "active.json") };
}

test("releaseP5Plugin creates a worktree, tests, merges and activates", async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const result = await releaseP5Plugin({
    sourceDir: f.source,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    registryFile: f.registryFile,
    testCommand: ["node", "-e", "process.exit(0)"],
  });
  assert.equal(result.version, "9.9.9");
  assert.equal(result.active.version, "9.9.9");
  const installed = await fs.readFile(path.join(f.repo, "plugins/p5-radar/9.9.9/plugin.json"), "utf8");
  assert.match(installed, /9\.9\.9/);
  const active = await readActivePlugin({ registryFile: f.registryFile });
  assert.equal(active.version, "9.9.9");
  await fs.writeFile(path.join(f.source, "bin/plugin.mjs"), "process.exit(1);\n");
  await assert.rejects(releaseP5Plugin({
    sourceDir: f.source,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    registryFile: f.registryFile,
    testCommand: ["node", "-e", "process.exit(0)"],
  }), { code: "P5_PLUGIN_VERSION_EXISTS" });
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).sha256, active.sha256);
  const worktrees = await fs.readdir(path.join(f.repo, ".worktrees")).catch(() => []);
  assert.deepEqual(worktrees, []);
});

test("failed plugin tests never merge or activate", async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  await assert.rejects(() => releaseP5Plugin({
    sourceDir: f.source,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    registryFile: f.registryFile,
    testCommand: ["node", "-e", "process.exit(1)"],
  }), /Command failed|process\.exit|code 1/u);
  assert.equal(await readActivePlugin({ registryFile: f.registryFile }), null);
  await assert.rejects(() => fs.access(path.join(f.repo, "plugins/p5-radar/9.9.9/plugin.json")));
});
