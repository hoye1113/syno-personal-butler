import { promises as fs } from "node:fs";
import path from "node:path";

import { GitGuard } from "./git-guard.mjs";
import { runPluginEntry } from "./plugin-runner.mjs";
import { activatePluginVersion, rollbackPluginVersion, validatePluginManifest } from "./plugin-version.mjs";
import { TaskWorkspaceManager } from "./task-workspace.mjs";

const CONTRACT = "syno.p5-radar/1";
const DEFAULT_TEST_COMMAND = Object.freeze([
  "node", "--test",
  "tests/p5-plugin-contract.test.mjs",
  "tests/plugin-version.test.mjs",
  "tests/task-workspace.test.mjs",
  "tests/preferences.test.mjs",
]);

function canaryError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

async function runCommand(command, { cwd, env = process.env } = {}) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const [bin, ...args] = command;
  return promisify(execFile)(bin, args, { cwd, env, timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
}

export function validateCanaryAst(ast, { maxItems = 50 } = {}) {
  if (!ast || typeof ast !== "object") throw canaryError("P5_CANARY_AST_INVALID", "canary 没有返回 AST");
  if (!ast.date || !Array.isArray(ast.items) || !Array.isArray(ast.blocks)) throw canaryError("P5_CANARY_AST_INVALID", "AST 缺少 date/items/blocks");
  if (ast.items.length < 1 || ast.items.length > maxItems) throw canaryError("P5_CANARY_ITEM_COUNT_INVALID", `条目数 ${ast.items.length} 超出 1–${maxItems}`);
  if (ast.blocks.length < 1 || ast.blocks.length > maxItems * 20) throw canaryError("P5_CANARY_BLOCK_COUNT_INVALID", `blocks ${ast.blocks.length} 超出合理范围`);
  for (const item of ast.items) {
    if (!Number.isInteger(item.itemId) || !item.titleZh) throw canaryError("P5_CANARY_ITEM_INVALID", "AST item 缺少 itemId/titleZh");
  }
  if (!String(ast.shortMessage || "").trim()) throw canaryError("P5_CANARY_MESSAGE_INVALID", "AST 缺少 shortMessage");
  return {
    date: ast.date,
    items: ast.items.length,
    blocks: ast.blocks.length,
    title: ast.title,
    firstItem: ast.items[0],
  };
}

/**
 * Build an isolated candidate, test it, render a real dry-run AST, and stop.
 * It never merges or changes the active registry.
 */
export async function canaryP5Plugin({
  sourceDir,
  version = null,
  repoRoot = process.cwd(),
  worktreeRoot = path.join(repoRoot, ".worktrees"),
  canaryFile = path.join(repoRoot, ".runtime", "plugins", "p5-radar", "canary.json"),
  registryFile,
  p5Home = process.env.P5_RADAR_HOME,
  maxItems = 50,
  testCommand = DEFAULT_TEST_COMMAND,
  run = runCommand,
  gitGuard = null,
  manager = null,
  now = () => new Date(),
} = {}) {
  if (!sourceDir) throw new Error("canaryP5Plugin 缺少 sourceDir");
  if (!p5Home) throw new Error("canaryP5Plugin 缺少 P5_RADAR_HOME");
  const source = path.resolve(sourceDir);
  const manifest = JSON.parse(await fs.readFile(path.join(source, "plugin.json"), "utf8"));
  validatePluginManifest(manifest, { pluginDir: source });
  const releaseVersion = String(version || manifest.version);
  if (releaseVersion !== manifest.version) throw new Error("version 参数与 manifest 不一致");
  const targetRelative = path.posix.join("plugins", "p5-radar", releaseVersion);
  const guard = gitGuard || new GitGuard({ repoRoot, worktreeRoot });
  const workspaceManager = manager || new TaskWorkspaceManager({ gitGuard: guard, sharedRoot: repoRoot, worktreeRoot });
  const workspace = await workspaceManager.prepare({
    taskId: `p5-plugin-canary-${releaseVersion}`,
    kind: "code_change",
    writePaths: [targetRelative],
  });
  try {
    const target = path.join(workspace.directory, targetRelative);
    await fs.rm(target, { recursive: true, force: true });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(source, target, { recursive: true });
    await run(testCommand, {
      cwd: workspace.directory,
      env: { ...process.env, P5_PLUGIN_TEST_DIR: target },
    });
    const entry = path.join(target, manifest.entry);
    const result = await runPluginEntry({
      entryPath: entry,
      cwd: target,
      env: { ...process.env, P5_RADAR_HOME: p5Home },
      request: { contract: CONTRACT, requestId: `canary-${releaseVersion}`, action: "renderDailyDoc", payload: { maxItems } },
      timeoutMs: 600_000,
    });
    if (!result.ok) throw canaryError(result.code || "P5_CANARY_FAILED", result.message || "canary render 失败");
    const report = validateCanaryAst(result.data, { maxItems });
    await run(["git", "add", "--", targetRelative], { cwd: workspace.directory });
    await run(["git", "commit", "-m", `feat: canary P5 plugin ${releaseVersion}`], { cwd: workspace.directory });
    const { stdout } = await run(["git", "rev-parse", "HEAD"], { cwd: workspace.directory });
    const createdAt = now();
    const canary = {
      version: releaseVersion,
      source: targetRelative,
      manifest,
      workspace: {
        directory: workspace.directory,
        branch: workspace.branch,
        base: workspace.base,
      },
      commit: stdout.trim(),
      report,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60_000).toISOString(),
    };
    await writeJson(canaryFile, canary);
    return canary;
  } catch (error) {
    await workspaceManager.discard(workspace).catch(() => {});
    throw error;
  }
}

export async function approveP5Plugin({
  canaryFile,
  registryFile,
  expectedVersion = null,
  repoRoot = process.cwd(),
  worktreeRoot = path.join(repoRoot, ".worktrees"),
  activate = true,
  now = () => new Date(),
  gitGuard = null,
  manager = null,
} = {}) {
  if (!canaryFile) throw new Error("approveP5Plugin 缺少 canaryFile");
  const canary = await readJson(canaryFile);
  if (!canary) throw canaryError("P5_CANARY_NOT_FOUND", "没有可批准的 canary");
  if (expectedVersion && canary.version !== expectedVersion) {
    throw canaryError("P5_CANARY_VERSION_MISMATCH", `待批准插件版本不是 ${expectedVersion}，拒绝操作`);
  }
  if (Date.parse(canary.expiresAt) < now().getTime()) throw canaryError("P5_CANARY_EXPIRED", "canary 已过期，请重新运行");
  const guard = gitGuard || new GitGuard({ repoRoot, worktreeRoot });
  const workspaceManager = manager || new TaskWorkspaceManager({ gitGuard: guard, sharedRoot: repoRoot, worktreeRoot });
  const workspace = { ...canary.workspace, task: { taskId: `p5-plugin-canary-${canary.version}` }, isolated: true };
  // A crash may leave the marker after the pinned commit merged. Reconcile first; never merge that commit twice.
  const alreadyMerged = await workspaceManager.isMerged(workspace, canary.commit);
  const merged = alreadyMerged
    ? { merged: true, commit: await workspaceManager.mergeCommitFor(canary.commit), recovered: true }
    : await workspaceManager.finalize(workspace, { merge: true, commit: canary.commit });
  await workspaceManager.discard(workspace).catch((error) => {
    if (!alreadyMerged) throw error;
  });
  const installed = path.join(repoRoot, canary.source);
  const manifest = JSON.parse(await fs.readFile(path.join(installed, "plugin.json"), "utf8"));
  const active = activate ? await activatePluginVersion({ pluginDir: installed, manifest, registryFile, now }) : null;
  await fs.unlink(canaryFile).catch(() => {});
  return { ...canary, merged, active };
}

export async function discardP5Canary({
  canaryFile,
  repoRoot = process.cwd(),
  worktreeRoot = path.join(repoRoot, ".worktrees"),
  gitGuard = null,
  manager = null,
} = {}) {
  const canary = await readJson(canaryFile);
  if (!canary) return { removed: false };
  const guard = gitGuard || new GitGuard({ repoRoot, worktreeRoot });
  const workspaceManager = manager || new TaskWorkspaceManager({ gitGuard: guard, sharedRoot: repoRoot, worktreeRoot });
  const workspace = { ...canary.workspace, task: { taskId: `p5-plugin-canary-${canary.version}` }, isolated: true };
  await workspaceManager.discard(workspace);
  await fs.unlink(canaryFile).catch(() => {});
  return { removed: true, version: canary.version };
}

export async function rollbackP5Plugin({ registryFile, expectedVersion = null, now = () => new Date() } = {}) {
  return rollbackPluginVersion({ registryFile, expectedVersion, now });
}

export { DEFAULT_TEST_COMMAND };
