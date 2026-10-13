import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locateCommand, runProcess } from "../packages/syno-core/process-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function setupHarness({ repoRoot = ROOT, platform = process.platform, arch = process.arch, buildOnly = false, run = runProcess } = {}) {
  if (platform === "darwin" && arch !== "arm64") throw new Error("Mac 首期需要原生 arm64 Node；请勿使用 Rosetta");
  const harnessRoot = path.join(repoRoot, "vendor", "deepseek-harness");
  const options = { cwd: repoRoot, timeoutMs: 20 * 60_000 };
  if (!existsSync(path.join(harnessRoot, "package.json"))) {
    if (buildOnly) throw new Error("Harness 子模块未初始化");
    await run("git", ["submodule", "update", "--init", "--recursive", "vendor/deepseek-harness"], options);
  }
  const pnpm = locateCommand("pnpm", "SYNO_PNPM_COMMAND");
  for (const args of [["install", "--frozen-lockfile", "--ignore-scripts"], ["run", "build"]]) {
    const result = await run(pnpm, args, { ...options, cwd: harnessRoot });
    if (result?.stdout) process.stdout.write(result.stdout);
  }
  const result = await run(process.execPath, [path.join(repoRoot, "scripts", "deepseek-harness-runtime.mjs"), "doctor"], options);
  if (result?.stdout) process.stdout.write(result.stdout);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await setupHarness({ buildOnly: process.argv.includes("--build-only") });
}
export { setupHarness };
