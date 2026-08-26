import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DeepSeekHarnessSupervisor,
  harnessChildEnvironment,
  isLoopbackHttpOrigin,
  resolveHarnessLaunch,
  waitForWebReady,
} from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { publicSynoToolName, selectToolDefinitions, toBridgeName } from "../config/deepseek-harness/syno-tool-bridge-plugin.mjs";
import { CORE_CHAT_TOOL_NAMES } from "../config/deepseek-harness/syno-tool-sets.mjs";
import { doctor } from "../scripts/deepseek-harness-runtime.mjs";

const fakeAgent = path.resolve("tests/support/fake-dsh-jsonrpc-agent.mjs");

async function writeRuntimePackage(packageDir, packageName, { runtime = true } = {}) {
  await fs.mkdir(packageDir, { recursive: true });
  await fs.writeFile(path.join(packageDir, "package.json"), JSON.stringify({
    name: packageName,
    version: "0.0.0",
    main: "lib/index.js",
  }));
  if (runtime) {
    await fs.mkdir(path.join(packageDir, "lib"), { recursive: true });
    await fs.writeFile(path.join(packageDir, "lib", "index.js"), "export {};\n");
  }
}

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

test("core chat tool set is shared by the DSH plugin and excludes hidden domain tools", () => {
  const knowledgeLoopTools = [
    "knowledge.fetch_url",
    "learning.due",
    "learning.teach_back",
    "learning.submit",
  ];
  assert.deepEqual(CORE_CHAT_TOOL_NAMES.filter((name) => knowledgeLoopTools.includes(name)), knowledgeLoopTools);
  const definitions = [
    ...CORE_CHAT_TOOL_NAMES.map((name) => ({ name: name.replaceAll(".", "_"), description: name })),
    { name: "claims_propose", description: "hidden" },
    { name: "browser_snapshot", description: "capture-only" },
  ];
  assert.deepEqual(selectToolDefinitions(definitions, "core").map((tool) => tool.name), CORE_CHAT_TOOL_NAMES.map((name) => name.replaceAll(".", "_")));
  assert.throws(() => selectToolDefinitions(definitions, "unknown"), /unknown toolSet/);
});

test("Syno agent instructions match the shared core chat tool set", async () => {
  const instructions = await fs.readFile(path.resolve("config/deepseek-harness/syno-agent.md"), "utf8");
  for (const name of CORE_CHAT_TOOL_NAMES) {
    assert.ok(instructions.includes(`syno_${name.replaceAll(".", "_").replaceAll("-", "_")}`), `提示词缺少 ${name}`);
  }
  assert.doesNotMatch(instructions, /不要通过猜测名称调用 learning/);
  assert.match(instructions, /learning_submit.*待审批/);
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
  assert.match(chat, /id: deepseek-v4-flash-vision-exp[\s\S]*inputModalities:[\s\S]*- image/);
  assert.match(chat, /id: deepseek-v4-flash[\s\S]*contextWindow: 128000/);
  assert.doesNotMatch(chat, /deepseek-chat|deepseek-v4-pro/);
  assert.doesNotMatch(chat, /dsh-web-search-exa|dsh-web-search-perplexity/);
  assert.match(capture, /toolBash: false/);
  assert.match(capture, /id: deepseek-v4-flash-vision-exp[\s\S]*inputModalities:[\s\S]*- image/);
  assert.match(capture, /id: deepseek-v4-flash[\s\S]*contextWindow: 128000/);
  assert.doesNotMatch(capture, /deepseek-chat|deepseek-v4-pro/);
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
  assert.equal(launch.kind, "syno-jsonrpc-adapter");
  assert.equal(launch.runtimeClosure.ok, false);
  assert.ok(launch.runtimeClosure.missing.length > 0);
});

test("launch discovery selects the Syno adapter only with a complete DSH bundle closure", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-closure-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = path.join(root, "config");
  const baseRoot = path.join(root, "packages", "bundle", "base");
  const runner = path.join(root, "packages", "examples", "jsonrpc-demo", "src", "runner.ts");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  await fs.mkdir(path.dirname(runner), { recursive: true });
  await fs.mkdir(path.dirname(tsxCli), { recursive: true });
  await fs.mkdir(path.join(baseRoot, "lib"), { recursive: true });
  await fs.writeFile(runner, "export async function runJsonrpcAgent() {}\n");
  await fs.writeFile(tsxCli, "export {};\n");
  await fs.writeFile(path.join(baseRoot, "lib", "index.js"), "export {};\n");
  for (const packageName of ["@deepseek-ai/dsh-app-boot", "@deepseek-ai/cordis", "@deepseek-ai/dsh-invariants"]) {
    const packageDir = path.join(root, "packages", "examples", "jsonrpc-demo", "node_modules", ...packageName.split("/"));
    await writeRuntimePackage(packageDir, packageName);
  }
  const config = [
    "- id: sdk-jsonrpc-server",
    "  name: '@deepseek-ai/dsh-sdk-jsonrpc-server'",
    "- id: compaction-basic",
    "  name: '@deepseek-ai/dsh-compaction-basic'",
    "- id: bridge",
    "  name: ./syno-tool-bridge-plugin.mjs",
    "",
  ].join("\n");
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, "syno-capture.cordis.yml"), config, "utf8");
  await fs.writeFile(path.join(configDir, "syno-chat.cordis.yml"), config, "utf8");
  for (const packageName of ["@deepseek-ai/dsh-sdk-jsonrpc-server", "@deepseek-ai/dsh-compaction-basic"]) {
    const packageDir = path.join(baseRoot, "node_modules", ...packageName.split("/"));
    await writeRuntimePackage(packageDir, packageName);
  }

  const launch = await resolveHarnessLaunch({ dshRoot: root, configDir, fakeAgent: "" });

  assert.equal(launch.fake, false);
  assert.equal(launch.bootable, true);
  assert.equal(launch.kind, "syno-jsonrpc-adapter");
  assert.equal(launch.runtimeClosure.ok, true);
  assert.deepEqual(launch.runtimeClosure.required, [
    "@deepseek-ai/cordis",
    "@deepseek-ai/dsh-compaction-basic",
    "@deepseek-ai/dsh-app-boot",
    "@deepseek-ai/dsh-invariants",
    "@deepseek-ai/dsh-sdk-jsonrpc-server",
  ].sort());
  assert.equal(launch.runtimeClosure.base, path.join(baseRoot, "lib", "index.js"));
  assert.equal(launch.argsPrefix.at(-1), path.resolve("apps/syno/syno/deepseek-harness-jsonrpc-launcher.mjs"));
});

test("launch discovery rejects a package manifest without a built runtime entry", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-entry-missing-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = path.join(root, "config");
  const baseRoot = path.join(root, "packages", "bundle", "base");
  const runner = path.join(root, "packages", "examples", "jsonrpc-demo", "src", "runner.ts");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  await fs.mkdir(path.dirname(runner), { recursive: true });
  await fs.mkdir(path.dirname(tsxCli), { recursive: true });
  await fs.mkdir(path.join(baseRoot, "lib"), { recursive: true });
  await fs.writeFile(runner, "export async function runJsonrpcAgent() {}\n");
  await fs.writeFile(tsxCli, "export {};\n");
  await fs.writeFile(path.join(baseRoot, "lib", "index.js"), "export {};\n");
  for (const packageName of ["@deepseek-ai/dsh-app-boot", "@deepseek-ai/cordis", "@deepseek-ai/dsh-invariants"]) {
    await writeRuntimePackage(path.join(root, "packages", "examples", "jsonrpc-demo", "node_modules", ...packageName.split("/")), packageName);
  }
  const config = "- id: sdk\n  name: '@deepseek-ai/dsh-sdk-jsonrpc-server'\n";
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, "syno-capture.cordis.yml"), config, "utf8");
  await fs.writeFile(path.join(configDir, "syno-chat.cordis.yml"), config, "utf8");
  await writeRuntimePackage(
    path.join(baseRoot, "node_modules", "@deepseek-ai", "dsh-sdk-jsonrpc-server"),
    "@deepseek-ai/dsh-sdk-jsonrpc-server",
    { runtime: false },
  );

  const launch = await resolveHarnessLaunch({ dshRoot: root, configDir, fakeAgent: "" });

  assert.equal(launch.bootable, false);
  assert.equal(launch.runtimeClosure.ok, false);
  assert.ok(launch.runtimeClosure.missing.some((item) => item.endsWith("#runtime-entry")));
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

test("supervisor fails closed on an incomplete runtime closure without selecting another runtime", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-closure-fail-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "examples", "jsonrpc-demo", "src"), { recursive: true });
  await fs.writeFile(path.join(root, "packages", "examples", "jsonrpc-demo", "src", "runner.ts"), "export async function runJsonrpcAgent() {}\n");
  const spawned = [];
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot: root,
    fakeAgent: "",
    localRoot: path.join(root, "local"),
    spawnImpl: (...args) => {
      spawned.push(args);
      throw new Error("spawn must not be reached");
    },
  });
  await assert.rejects(
    () => supervisor.start("capture"),
    (error) => error.code === "HARNESS_RUNTIME_CLOSURE_UNAVAILABLE",
  );
  assert.equal(spawned.length, 0);
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
  assert.equal(spawnedEnv.SYNO_DSH_ROOT, supervisor.dshRoot);
  assert.match(spawnedEnv.SYNO_DSH_JSONRPC_BASE, /jsonrpc-runtime[\\/]chat[\\/]anchor\.mjs$/);
  assert.equal(spawnedEnv.DSH_CWD, path.join(root, "workspace", "chat"));
  assert.notEqual(spawnedEnv.DSH_CWD, supervisor.repoRoot);
  assert.equal(spawnedEnv.FEISHU_APP_SECRET, undefined);
  assert.equal(spawnedEnv.SYNO_OPENCODE_API_KEY, undefined);
  assert.equal(supervisor.status("chat").ready, true);
});

test("fake chat surface stays jsonrpc and does not spawn dsh web", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-surface-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    localRoot: root,
  });
  t.after(() => supervisor.stop());
  await supervisor.discover();
  assert.equal(supervisor.chatSurface, "jsonrpc");
  await supervisor.start("chat", { model: "deepseek-v4-flash" });
  assert.equal(supervisor.status("chat").surface, "jsonrpc");
  assert.equal(supervisor.status("chat").origin, null);
});

test("Web status reports Web launchability independently from JSON-RPC closure", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-web-status-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "node_modules", "tsx", "dist"), { recursive: true });
  await fs.mkdir(path.join(root, "apps", "cli", "src"), { recursive: true });
  await fs.writeFile(path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "export {};\n");
  await fs.writeFile(path.join(root, "apps", "cli", "src", "bin.ts"), "export {};\n");
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot: root,
    fakeAgent: "",
    localRoot: path.join(root, "local"),
  });
  await supervisor.discover();
  assert.equal(supervisor.status("chat").surface, "web");
  assert.equal(supervisor.status("chat").bootable, true);
  assert.equal(supervisor.status("capture").bootable, false);
  assert.equal(supervisor.status().bootable, true);
});

test("JSON-RPC sidecar shutdown terminates the owned process tree instead of racing protocol shutdown", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-eof-shutdown-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    localRoot: root,
  });
  t.after(() => supervisor.stop().catch(() => {}));
  const client = await supervisor.start("chat", { model: "deepseek-v4-flash" });
  let protocolShutdownCalled = false;
  client.shutdown = async () => { protocolShutdownCalled = true; };
  await supervisor.stop("chat");
  assert.equal(protocolShutdownCalled, false);
});

test("Syno JSON-RPC adapter keeps the external DSH checkout read-only", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-readonly-") );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = path.join(root, "config");
  const baseRoot = path.join(root, "packages", "bundle", "base");
  const runner = path.join(root, "packages", "examples", "jsonrpc-demo", "src", "runner.ts");
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  await fs.mkdir(path.dirname(runner), { recursive: true });
  await fs.mkdir(path.dirname(tsxCli), { recursive: true });
  await fs.mkdir(path.join(baseRoot, "lib"), { recursive: true });
  await fs.writeFile(runner, "export async function runJsonrpcAgent() {}\n");
  await fs.writeFile(tsxCli, "export {};\n");
  await fs.writeFile(path.join(baseRoot, "lib", "index.js"), "export {};\n");
  for (const packageName of ["@deepseek-ai/dsh-app-boot", "@deepseek-ai/cordis", "@deepseek-ai/dsh-invariants", "@deepseek-ai/dsh-sdk-jsonrpc-server"]) {
    const packageDir = packageName === "@deepseek-ai/dsh-sdk-jsonrpc-server"
      ? path.join(baseRoot, "node_modules", ...packageName.split("/"))
      : path.join(root, "packages", "examples", "jsonrpc-demo", "node_modules", ...packageName.split("/"));
    await writeRuntimePackage(packageDir, packageName);
  }
  await fs.mkdir(configDir, { recursive: true });
  const config = "- id: sdk\n  name: '@deepseek-ai/dsh-sdk-jsonrpc-server'\n";
  await fs.writeFile(path.join(configDir, "syno-capture.cordis.yml"), config, "utf8");
  await fs.writeFile(path.join(configDir, "syno-chat.cordis.yml"), config, "utf8");
  const before = await fs.readdir(root, { recursive: true });
  const launch = await resolveHarnessLaunch({ dshRoot: root, configDir, fakeAgent: "" });
  const after = await fs.readdir(root, { recursive: true });
  assert.equal(launch.bootable, true);
  assert.deepEqual(after, before);
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

test("waitForWebReady only accepts the expected loopback origin", async () => {
  assert.equal(isLoopbackHttpOrigin("http://127.0.0.1:3088", "http://127.0.0.1:3088"), true);
  assert.equal(isLoopbackHttpOrigin("http://example.com:3088", "http://127.0.0.1:3088"), false);
  assert.equal(isLoopbackHttpOrigin("http://127.0.0.1:9999", "http://127.0.0.1:3088"), false);

  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  const pending = waitForWebReady(child, { timeoutMs: 1_000, expectedOrigin: "http://127.0.0.1:3088" });
  child.stdout.emit("data", "dsh web: http://example.com:3088\n");
  await assert.rejects(pending, (error) => error.code === "HARNESS_ORIGIN_INVALID");

  const ready = new EventEmitter();
  ready.stdout = new EventEmitter();
  ready.stderr = new EventEmitter();
  const accepted = waitForWebReady(ready, { timeoutMs: 1_000, expectedOrigin: "http://127.0.0.1:3088" });
  ready.stdout.emit("data", "dsh web: http://127.0.0.1:3088\n");
  assert.equal(await accepted, "http://127.0.0.1:3088");
});

test("web start failure kills the process tree", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-web-kill-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "node_modules", "tsx", "dist"), { recursive: true });
  await fs.mkdir(path.join(root, "apps", "cli", "src"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "examples", "jsonrpc-demo", "lib"), { recursive: true });
  await fs.writeFile(path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "export {}\n");
  await fs.writeFile(path.join(root, "apps", "cli", "src", "bin.ts"), "export {}\n");
  await fs.writeFile(path.join(root, "packages", "examples", "jsonrpc-demo", "lib", "packaged-bin.js"), "export {}\n");
  const killed = [];
  let child;
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot: root,
    fakeAgent: "",
    localRoot: path.join(root, "local"),
    webReadyTimeoutMs: 80,
    initializeTimeoutMs: 80,
    killTree: async (pid) => {
      killed.push(pid);
      child.exitCode = 1;
      child.emit("exit", 1, null);
    },
    spawnImpl: () => {
      child = new EventEmitter();
      child.pid = 4242;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { destroyed: true };
      child.exitCode = null;
      child.killed = false;
      child.kill = () => {
        child.killed = true;
        child.exitCode = 1;
        child.emit("exit", 1, null);
      };
      return child;
    },
  });
  t.after(() => supervisor.stop().catch(() => {}));
  await assert.rejects(() => supervisor.start("chat"), (error) => error.code === "HARNESS_NOT_RUNNING");
  assert.deepEqual(killed, [4242]);
});

test("Web supervisor pins the Syno agent preset when initializing the client", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-web-preset-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "node_modules", "tsx", "dist"), { recursive: true });
  await fs.mkdir(path.join(root, "apps", "cli", "src"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "examples", "jsonrpc-demo", "lib"), { recursive: true });
  await fs.writeFile(path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), "export {}\n");
  await fs.writeFile(path.join(root, "apps", "cli", "src", "bin.ts"), "export {}\n");
  await fs.writeFile(path.join(root, "packages", "examples", "jsonrpc-demo", "lib", "packaged-bin.js"), "export {}\n");
  let child;
  let initializeOptions;
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot: root,
    fakeAgent: "",
    localRoot: path.join(root, "local"),
    webReadyTimeoutMs: 1_000,
    webClientFactory: () => ({
      initialized: false,
      async initialize(options) {
        initializeOptions = options;
        this.initialized = true;
      },
      async shutdown() {
        if (child.exitCode === null) {
          child.exitCode = 0;
          child.emit("exit", 0, null);
        }
      },
      async close() {},
    }),
    spawnImpl: () => {
      child = new EventEmitter();
      child.pid = 4343;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { destroyed: true };
      child.exitCode = null;
      child.killed = false;
      child.kill = () => {
        child.killed = true;
        child.exitCode = 0;
        child.emit("exit", 0, null);
      };
      queueMicrotask(() => child.stdout.emit("data", "dsh web: http://127.0.0.1:3088\n"));
      return child;
    },
  });
  t.after(() => supervisor.stop().catch(() => {}));
  await supervisor.start("chat", { model: "deepseek-v4-flash" });
  assert.equal(initializeOptions?.agentPreset, "syno");
});
