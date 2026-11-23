import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { executePluginCommand, parsePluginCommand } from "../experiments/superagent-p0/plugin-control.mjs";
import { routeRoot } from "../experiments/superagent-p0/root-router.mjs";
import { canaryP5Plugin } from "../packages/syno-core/plugin-canary.mjs";
import { activatePluginVersion, readActivePlugin } from "../packages/syno-core/plugin-version.mjs";

function git(repo, ...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

async function writePlugin(root, version) {
  const directory = path.join(root, `plugin-${version}`);
  await fs.mkdir(path.join(directory, "bin"), { recursive: true });
  const manifest = {
    name: "p5-radar",
    contract: "syno.p5-radar/1",
    version,
    entry: "bin/plugin.mjs",
    capabilities: ["health", "collect", "renderDailyDoc", "feedback", "status", "preference"],
  };
  const ast = {
    date: "2026-11-23",
    title: "P5 信息雷达 · 2026-11-23",
    items: [{ index: 1, itemId: 1, title: "x", titleZh: "中文标题", publishedAt: null, kind: "article" }],
    blocks: [{ type: "paragraph", text: "内容" }],
    shortMessage: "今日 1 条",
  };
  await fs.writeFile(path.join(directory, "plugin.json"), JSON.stringify(manifest));
  await fs.writeFile(path.join(directory, manifest.entry), `process.stdout.write(JSON.stringify({ ok: true, contract: "syno.p5-radar/1", requestId: "x", data: ${JSON.stringify(ast)} }) + "\\n");\n`);
  return { directory, manifest };
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-plugin-control-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repoRoot = path.join(root, "repo");
  const worktreeRoot = path.join(repoRoot, ".worktrees");
  const registryFile = path.join(root, "runtime", "active.json");
  const canaryFile = path.join(root, "runtime", "canary.json");
  await fs.mkdir(repoRoot);
  git(repoRoot, "init", "--quiet");
  git(repoRoot, "config", "user.email", "test@example.com");
  git(repoRoot, "config", "user.name", "Test");
  git(repoRoot, "commit", "--allow-empty", "-m", "init", "--quiet");
  const previous = await writePlugin(root, "1.0.0");
  const candidate = await writePlugin(root, "2.0.0");
  await activatePluginVersion({ pluginDir: previous.directory, manifest: previous.manifest, registryFile });
  return { root, repoRoot, worktreeRoot, registryFile, canaryFile, candidate };
}

test("plugin control commands are explicit, versioned and do not capture ordinary approval chat", () => {
  assert.deepEqual(parsePluginCommand("插件状态"), { action: "status" });
  assert.deepEqual(parsePluginCommand("P5 插件 批准 版本 2.0.0"), { action: "approve", version: "2.0.0" });
  assert.deepEqual(parsePluginCommand("插件回滚 当前版本 2.0.0"), { action: "rollback", version: "2.0.0" });
  assert.deepEqual(routeRoot({ text: "插件批准 2.0.0" }), {
    status: "routed", domain: "plugin", action: "approve", version: "2.0.0",
  });
  assert.equal(parsePluginCommand("批准这个决定"), null);
  assert.equal(parsePluginCommand("回滚插件"), null);
  assert.equal(parsePluginCommand("插件批准"), null);
});

test("Host plugin control approves only the shown canary, recovers a merged marker and rolls back only the shown active", async (t) => {
  const f = await fixture(t);
  const options = {
    registryFile: f.registryFile,
    canaryFile: f.canaryFile,
    repoRoot: f.repoRoot,
    worktreeRoot: f.worktreeRoot,
  };
  await canaryP5Plugin({
    sourceDir: f.candidate.directory,
    repoRoot: f.repoRoot,
    worktreeRoot: f.worktreeRoot,
    canaryFile: f.canaryFile,
    registryFile: f.registryFile,
    p5Home: path.join(f.root, "p5-home"),
    testCommand: ["node", "-e", "process.exit(0)"],
  });
  const canarySnapshot = await fs.readFile(f.canaryFile, "utf8");
  const status = await executePluginCommand({ action: "status" }, options);
  assert.match(status.text, /当前插件：1\.0\.0/u);
  assert.match(status.text, /待批准 canary：2\.0\.0/u);
  assert.match(status.text, /插件批准 2\.0\.0/u);

  await assert.rejects(
    executePluginCommand({ action: "approve", version: "9.9.9" }, options),
    { code: "P5_CANARY_VERSION_MISMATCH" },
  );
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "1.0.0");
  assert.ok(await fs.readFile(f.canaryFile, "utf8"));

  const approved = await executePluginCommand({ action: "approve", version: "2.0.0" }, options);
  assert.match(approved.text, /2\.0\.0.*批准并激活/u);
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "2.0.0");
  const mergedHead = git(f.repoRoot, "rev-parse", "HEAD");

  // Simulate a crash leaving the canary marker after merge/activation: recovery must not add another merge.
  await fs.writeFile(f.canaryFile, canarySnapshot);
  const recovered = await executePluginCommand({ action: "approve", version: "2.0.0" }, options);
  assert.equal(recovered.result.merged.recovered, true);
  assert.equal(git(f.repoRoot, "rev-parse", "HEAD"), mergedHead);
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "2.0.0");

  await assert.rejects(
    executePluginCommand({ action: "rollback", version: "1.0.0" }, options),
    { code: "P5_PLUGIN_VERSION_MISMATCH" },
  );
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "2.0.0");
  const rolledBack = await executePluginCommand({ action: "rollback", version: "2.0.0" }, options);
  assert.match(rolledBack.text, /从 2\.0\.0 回滚到 1\.0\.0/u);
  assert.equal((await readActivePlugin({ registryFile: f.registryFile })).version, "1.0.0");
  await assert.rejects(
    executePluginCommand({ action: "rollback", version: "1.0.0" }, options),
    { code: "P5_PLUGIN_NO_PREVIOUS" },
  );
});
