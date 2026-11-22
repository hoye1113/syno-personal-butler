import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { GitGuard } from "./git-guard.mjs";
import { activatePluginVersion, validatePluginManifest } from "./plugin-version.mjs";
import { TaskWorkspaceManager } from "./task-workspace.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_TEST_COMMAND = Object.freeze([
  "node", "--test",
  "tests/p5-plugin-contract.test.mjs",
  "tests/plugin-version.test.mjs",
  "tests/task-workspace.test.mjs",
  "tests/preferences.test.mjs",
]);

async function runCommand(command, { cwd, env = process.env } = {}) {
  const [bin, ...args] = command;
  return execFileAsync(bin, args, { cwd, env, timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
}

/**
 * Isolated plugin release: copy a plugin version into a TaskWorkspace worktree,
 * run tests there, commit, merge, then activate. A failed test never activates.
 */
export async function releaseP5Plugin({
  sourceDir,
  version = null,
  repoRoot = process.cwd(),
  worktreeRoot = path.join(repoRoot, ".worktrees"),
  registryFile,
  activate = true,
  testCommand = DEFAULT_TEST_COMMAND,
  run = runCommand,
  gitGuard = null,
  manager = null,
  now = () => new Date(),
} = {}) {
  if (!sourceDir) throw new Error("releaseP5Plugin 缺少 sourceDir");
  const source = path.resolve(sourceDir);
  const manifest = JSON.parse(await fs.readFile(path.join(source, "plugin.json"), "utf8"));
  const validated = validatePluginManifest(manifest, { pluginDir: source });
  const releaseVersion = String(version || manifest.version);
  if (releaseVersion !== manifest.version) throw new Error("version 参数与 manifest 不一致");
  const targetRelative = path.posix.join("plugins", "p5-radar", releaseVersion);
  const guard = gitGuard || new GitGuard({ repoRoot, worktreeRoot });
  const workspaceManager = manager || new TaskWorkspaceManager({
    gitGuard: guard,
    sharedRoot: repoRoot,
    worktreeRoot,
  });
  const workspace = await workspaceManager.prepare({
    taskId: `p5-plugin-${releaseVersion}`,
    kind: "code_change",
    writePaths: [targetRelative],
  });
  let merged = null;
  try {
    const target = path.join(workspace.directory, targetRelative);
    await fs.rm(target, { recursive: true, force: true });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(source, target, { recursive: true });
    await run(testCommand, {
      cwd: workspace.directory,
      env: { ...process.env, P5_PLUGIN_TEST_DIR: target },
    });
    await run(["git", "add", "--", targetRelative], { cwd: workspace.directory });
    await run(["git", "commit", "-m", `feat: release P5 plugin ${releaseVersion}`], { cwd: workspace.directory });
    const { stdout } = await run(["git", "rev-parse", "HEAD"], { cwd: workspace.directory });
    const commit = stdout.trim();
    merged = await workspaceManager.finalize(workspace, { merge: true, commit });
    await workspaceManager.discard(workspace);
    let active = null;
    if (activate) {
      const installed = path.join(repoRoot, targetRelative);
      const installedManifest = JSON.parse(await fs.readFile(path.join(installed, "plugin.json"), "utf8"));
      active = await activatePluginVersion({
        pluginDir: installed,
        manifest: installedManifest,
        registryFile,
        now,
      });
    }
    return { version: releaseVersion, commit: merged.commit, active, source: targetRelative };
  } catch (error) {
    if (merged === null) await workspaceManager.discard(workspace).catch(() => {});
    throw error;
  }
}

export { DEFAULT_TEST_COMMAND };
