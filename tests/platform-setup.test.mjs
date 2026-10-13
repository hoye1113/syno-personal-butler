import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { harnessChildEnvironment } from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { locateCommand } from "../packages/syno-core/process-runner.mjs";
import { setupHarness } from "../scripts/setup-harness.mjs";

test("Unix Harness receives home and locale without inherited credentials", () => {
  const env = harnessChildEnvironment({ HOME: "/Users/owner", USER: "owner", SHELL: "/bin/zsh", TMPDIR: "/tmp/test", LANG: "zh_CN.UTF-8", LC_CTYPE: "UTF-8", KIMI_API_KEY: "fixture-secret", LC_SECRET_TOKEN: "fixture-secret" });
  assert.equal(env.HOME, "/Users/owner");
  assert.equal(env.TMPDIR, "/tmp/test");
  assert.equal(env.LC_CTYPE, "UTF-8");
  assert.equal(env.KIMI_API_KEY, undefined);
  assert.equal(env.LC_SECRET_TOKEN, undefined);
});

test("Unix command discovery resolves executable paths containing Chinese and spaces", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-中文 工具-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "bsk");
  await fs.writeFile(file, "#!/bin/sh\n");
  await fs.chmod(file, 0o755);
  assert.equal(locateCommand("bsk", "SYNO_BSK_COMMAND", { env: { PATH: root }, platform: "darwin" }), file);
  assert.equal(locateCommand("missing", "", { env: { PATH: root }, platform: "darwin" }), "missing");
});

test("portable setup initializes the pinned submodule and builds before doctor", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "syno-setup-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  const calls = [];
  await setupHarness({ repoRoot, platform: "darwin", arch: "arm64", run: async (command, args, options) => calls.push({ command, args, cwd: options.cwd }) });
  assert.equal(calls[0].command, "git");
  assert.deepEqual(calls[0].args, ["submodule", "update", "--init", "--recursive", "vendor/deepseek-harness"]);
  assert.deepEqual(calls[1].args, ["install", "--frozen-lockfile", "--ignore-scripts"]);
  assert.deepEqual(calls[2].args, ["run", "build"]);
  assert.equal(calls[3].args[0], path.join(repoRoot, "scripts", "deepseek-harness-runtime.mjs"));
  await assert.rejects(setupHarness({ repoRoot, platform: "darwin", arch: "x64", run: async () => {} }), /arm64/);
});
