import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DeepSeekHarnessSupervisor,
  harnessChildEnvironment,
  resolveHarnessLaunch,
} from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { publicSynoToolName, toBridgeName } from "../config/deepseek-harness/syno-tool-bridge-plugin.mjs";
import { doctor } from "../scripts/deepseek-harness-runtime.mjs";

const fakeAgent = path.resolve("tests/support/fake-dsh-jsonrpc-agent.mjs");

test("Harness child environment is an explicit whitelist and drops host secrets", () => {
  const env = harnessChildEnvironment({
    Path: "C:\\Windows",
    SYSTEMROOT: "C:\\Windows",
    TEMP: "C:\\Temp",
    HTTPS_PROXY: "http://127.0.0.1:7892",
    HTTP_PROXY: "http://user:password@127.0.0.1:7892",
    FEISHU_APP_SECRET: "must-not-leak",
    DEEPSEEK_API_KEY: "must-not-inherit",
    SYNO_OPENCODE_API_KEY: "must-not-inherit",
  });
  assert.deepEqual(env, {
    Path: "C:\\Windows",
    SYSTEMROOT: "C:\\Windows",
    TEMP: "C:\\Temp",
    HTTPS_PROXY: "http://127.0.0.1:7892",
  });
});

test("native syno_* names are used instead of MCP prefixes", () => {
  assert.equal(publicSynoToolName("knowledge_search"), "syno_knowledge_search");
  assert.equal(publicSynoToolName("knowledge.search"), "syno_knowledge_search");
  assert.equal(toBridgeName("syno_knowledge_search"), "knowledge_search");
  assert.notEqual(publicSynoToolName("knowledge_search"), "mcp__syno__knowledge_search");
});

test("cordis configs live in the Syno repo and never inline API keys", async () => {
  const dir = path.resolve("config/deepseek-harness");
  const chat = await fs.readFile(path.join(dir, "syno-chat.cordis.yml"), "utf8");
  const capture = await fs.readFile(path.join(dir, "syno-capture.cordis.yml"), "utf8");
  assert.match(chat, /workspace-write/);
  assert.doesNotMatch(chat, /danger-full-access/);
  assert.match(chat, /syno-tool-bridge-plugin/);
  assert.match(chat, /dsh-tool-bash-persistent|dsh-tool-pwsh-persistent/);
  assert.match(chat, /dsh-web-search-deepseek/);
  assert.match(chat, /searchProvider: deepseek-official/);
  assert.match(chat, /search: true/);
  assert.doesNotMatch(chat, /dsh-web-search-exa|dsh-web-search-perplexity/);
  assert.match(capture, /toolBash: false/);
  assert.doesNotMatch(capture, /dsh-tool-bash|dsh-tool-fs|dsh-tool-web|dsh-web-search/);
  for (const text of [chat, capture]) {
    assert.doesNotMatch(text, /sk-[A-Za-z0-9]/);
    assert.match(text, /apiKeyEnv: DEEPSEEK_API_KEY/);
  }
});

test("launch discovery reports an uninstalled clone as not bootable", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-missing-modules-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "packages", "examples", "jsonrpc-demo", "lib"), { recursive: true });
  await fs.writeFile(path.join(root, "packages", "examples", "jsonrpc-demo", "lib", "packaged-bin.js"), "console.log('unused')\n");
  const launch = await resolveHarnessLaunch({ dshRoot: root, fakeAgent: "" });
  assert.equal(launch.fake, false);
  assert.equal(launch.bootable, false);
  assert.equal(launch.kind, "packaged-bin");
});

test("supervisor refuses to spawn a real sidecar without node_modules", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-uninstalled-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "packages", "examples", "jsonrpc-demo", "lib"), { recursive: true });
  await fs.writeFile(path.join(root, "packages", "examples", "jsonrpc-demo", "lib", "packaged-bin.js"), "console.log('unused')\n");
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot: root,
    fakeAgent: "",
    localRoot: path.join(root, "local"),
  });
  await assert.rejects(() => supervisor.start("chat"), (error) => error.code === "HARNESS_SETUP_REQUIRED");
});

test("DeepSeekHarnessSupervisor injects DEEPSEEK_API_KEY into a replaced child env", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-supervisor-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const saved = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  t.after(() => {
    if (saved === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = saved;
  });
  let spawnedEnv;
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    localRoot: root,
    bridgeOrigin: "http://127.0.0.1:9/api/syno/bridge/mcp",
    bridgeToken: "bridge-token",
    deepseekKeyLoader: async () => "stored-key",
    spawnImpl: (command, args, options) => {
      spawnedEnv = options.env;
      return spawn(command, args, options);
    },
  });
  t.after(() => supervisor.stop());
  await supervisor.start("chat", { model: "deepseek-v4-flash" });
  assert.equal(spawnedEnv.DEEPSEEK_API_KEY, "stored-key");
  assert.equal(spawnedEnv.SYNO_BRIDGE_TOKEN, "bridge-token");
  assert.equal(spawnedEnv.DSH_CWD, path.join(root, "workspace", "chat"));
  assert.notEqual(spawnedEnv.DSH_CWD, supervisor.repoRoot);
  assert.equal(spawnedEnv.FEISHU_APP_SECRET, undefined);
  assert.equal(spawnedEnv.SYNO_OPENCODE_API_KEY, undefined);
  assert.equal(supervisor.status("chat").ready, true);
});

test("launch discovery requires SYNO_DSH_ROOT when not using a fake agent", async () => {
  await assert.rejects(
    () => resolveHarnessLaunch({ dshRoot: "", fakeAgent: "" }),
    (error) => error.code === "HARNESS_SETUP_REQUIRED" && /SYNO_DSH_ROOT/.test(error.message),
  );
});

test("harness doctor reports cordis configs and never dumps keys", async () => {
  const report = await doctor();
  assert.equal(report.checks.find((item) => item.name === "syno-cordis").ok, true);
  assert.equal(report.checks.find((item) => item.name === "sandbox").mode, "workspace-write");
  assert.equal(report.checks.find((item) => item.name === "sandbox").workspace, "isolated-local-root");
  assert.equal(Object.hasOwn(report, "defaultDshRoot"), false);
  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9]/);
  assert.equal(Object.hasOwn(report, "DEEPSEEK_API_KEY"), false);
});
