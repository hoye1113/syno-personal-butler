import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  approveP5Plugin,
  canaryP5Plugin,
  discardP5Canary,
} from "../packages/syno-core/plugin-canary.mjs";
import { readActivePlugin } from "../packages/syno-core/plugin-version.mjs";

async function fixture({ invalidAst = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-plugin-canary-"));
  const repo = path.join(root, "repo");
  const source = path.join(root, "source-plugin");
  const p5Home = path.join(root, "p5-home");
  await fs.mkdir(repo);
  await fs.mkdir(p5Home);
  await fs.mkdir(path.join(source, "bin"), { recursive: true });
  const manifest = {
    name: "p5-radar",
    contract: "syno.p5-radar/1",
    version: "9.9.8",
    entry: "bin/plugin.mjs",
    capabilities: ["health", "collect", "renderDailyDoc", "feedback", "status", "preference"],
  };
  const ast = invalidAst
    ? { date: "2026-11-22", items: [], blocks: [] }
    : {
      date: "2026-11-22",
      title: "P5 信息雷达 · 2026-11-22",
      items: [{ index: 1, itemId: 1, title: "x", titleZh: "中文标题", publishedAt: null, kind: "article" }],
      blocks: [{ type: "paragraph", text: "内容" }],
      shortMessage: "今日 1 条",
    };
  await fs.writeFile(path.join(source, "plugin.json"), JSON.stringify(manifest));
  await fs.writeFile(path.join(source, "bin", "plugin.mjs"), `process.stdout.write(JSON.stringify({ ok: true, contract: "syno.p5-radar/1", requestId: "x", data: ${JSON.stringify(ast)} }) + "\\n");\n`);
  execFileSync("git", ["init", "--quiet"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repo });
  execFileSync("git", ["commit", "--allow-empty", "-m", "init", "--quiet"], { cwd: repo });
  return { root, repo, source, p5Home, manifest, registryFile: path.join(root, "active.json"), canaryFile: path.join(root, "canary.json") };
}

test("canary renders AST without activating; approve merges and activates", async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const canary = await canaryP5Plugin({
    sourceDir: f.source,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    canaryFile: f.canaryFile,
    registryFile: f.registryFile,
    p5Home: f.p5Home,
    testCommand: ["node", "-e", "process.exit(0)"],
  });
  assert.equal(canary.report.items, 1);
  assert.equal(await readActivePlugin({ registryFile: f.registryFile }), null);
  await assert.rejects(() => fs.access(path.join(f.repo, "plugins/p5-radar/9.9.8/plugin.json")));
  const approved = await approveP5Plugin({
    canaryFile: f.canaryFile,
    registryFile: f.registryFile,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    expectedCommit: canary.commit,
  });
  assert.equal(approved.active.version, "9.9.8");
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "9.9.8");
  await assert.rejects(() => fs.access(f.canaryFile));
});

test("invalid canary AST never merges or activates and can be discarded", async (t) => {
  const f = await fixture({ invalidAst: true });
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  await assert.rejects(() => canaryP5Plugin({
    sourceDir: f.source,
    repoRoot: f.repo,
    worktreeRoot: path.join(f.repo, ".worktrees"),
    canaryFile: f.canaryFile,
    registryFile: f.registryFile,
    p5Home: f.p5Home,
    testCommand: ["node", "-e", "process.exit(0)"],
  }), /AST|条目|blocks/u);
  assert.equal(await readActivePlugin({ registryFile: f.registryFile }), null);
  await assert.rejects(() => fs.access(path.join(f.repo, "plugins/p5-radar/9.9.8/plugin.json")));
  await discardP5Canary({ canaryFile: f.canaryFile, repoRoot: f.repo, worktreeRoot: path.join(f.repo, ".worktrees") });
});
