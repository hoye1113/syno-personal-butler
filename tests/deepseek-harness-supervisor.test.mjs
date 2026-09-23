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
const testKillTree = async (pid) => {
  if (!pid) return;
  try { process.kill(pid); } catch {}
};

async function writeRuntimePackage(packageDir, packageName, { runtime = true, dependencies = {} } = {}) {
  await fs.mkdir(packageDir, { recursive: true });
  await fs.writeFile(path.join(packageDir, "package.json"), JSON.stringify({
    name: packageName,
    version: "0.0.0",
    main: "lib/index.js",
    dependencies,
  }));
  if (runtime) {
    await fs.mkdir(path.join(packageDir, "lib"), { recursive: true });
    await fs.writeFile(path.join(packageDir, "lib", "index.js"), "export {};\n");
  }
}

async function writeDshLaunchFixture(root, { missingRuntime = [] } = {}) {
  await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
  await fs.mkdir(path.join(root, "apps", "cli", "lib"), { recursive: true });
  await fs.writeFile(path.join(root, "apps", "cli", "lib", "bin.js"), "export {};\n");
  const configDir = path.join(root, "config");
  const packageNames = new Set([
    "@deepseek-ai/dsh-app-boot",
    "@deepseek-ai/cordis",
    "@deepseek-ai/dsh-invariants",
    "@deepseek-ai/dsh-sdk-app",
    "@deepseek-ai/dsh-sdk-jsonrpc-server",
    "@deepseek-ai/dsh-sdk-protocol",
    "@deepseek-ai/dsh-sdk-minimal",
    "@deepseek-ai/dsh-base",
    "@deepseek-ai/dsh-llm-deepseek",
    "@deepseek-ai/dsh-sandbox-policy",
    "@deepseek-ai/dsh-fs-sandbox",
    "@deepseek-ai/dsh-user-approval",
  ]);
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, "syno-capture.cordis.yml"), [
    "- id: llm-deepseek",
    "  config: {}",
    "- id: sandbox-policy",
    "  config: {}",
    "- insert:",
    "    - id: syno-tool-bridge",
    "      name: ./syno-tool-bridge-plugin.mjs",
    "",
  ].join("\n"), "utf8");
  await fs.writeFile(path.join(configDir, "syno-chat.cordis.yml"), [
    "- id: llm-deepseek",
    "  config: {}",
    "- id: sandbox-policy",
    "  config: {}",
    "- insert:",
    "    - id: syno-tool-bridge",
    "      name: ./syno-tool-bridge-plugin.mjs",
    "",
  ].join("\n"), "utf8");

  for (const packageName of packageNames) {
    const directory = packageName === "@deepseek-ai/dsh-base"
      ? path.join(root, "packages", "bundle", "base")
      : packageName === "@deepseek-ai/dsh-sdk-app"
        ? path.join(root, "packages", "bundle", "sdk-app")
        : packageName === "@deepseek-ai/dsh-sdk-minimal"
          ? path.join(root, "packages", "bundle", "sdk-minimal")
          : path.join(root, "packages", "fixture", ...packageName.split("/"));
    await writeRuntimePackage(directory, packageName, {
      runtime: !missingRuntime.includes(packageName),
      dependencies: packageName === "@deepseek-ai/dsh-sdk-jsonrpc-server"
        ? { "@deepseek-ai/dsh-sdk-protocol": "workspace:^" }
        : {},
    });
  }
  return configDir;
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
  // #21（2026-09-03）实证摘除后保留 6 件：知识三件套 + today.read + capture.start + image.read；
  // 已摘工具（capture.list_pending 等）不得回流。
  const knowledgeLoopTools = [
    "knowledge.fetch_url",
  ];
  const evictedTools = [
    "workflow.context",
    "capture.status",
    "capture.list_pending",
    "jobs.list",
    "jobs.submit",
  ];
  assert.deepEqual(CORE_CHAT_TOOL_NAMES.filter((name) => knowledgeLoopTools.includes(name)), knowledgeLoopTools);
  assert.deepEqual(CORE_CHAT_TOOL_NAMES.filter((name) => evictedTools.includes(name)), []);
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
  // D6（2026-09-01）：学习/项目子系统工具已从 core 集物理移除，提示词不得再出现
  assert.doesNotMatch(instructions, /syno_learning_|syno_projects_/);
});

test("cordis configs live in the Syno repo and never inline API keys", async () => {
  const dir = path.resolve("config/deepseek-harness");
  const chat = await fs.readFile(path.join(dir, "syno-chat.cordis.yml"), "utf8");
  const capture = await fs.readFile(path.join(dir, "syno-capture.cordis.yml"), "utf8");
  assert.match(chat, /workspace-write/);
  assert.doesNotMatch(chat, /danger-full-access/);
  assert.match(chat, /syno-tool-bridge-plugin/);
  assert.match(chat, /toolSet: core/);
  assert.match(chat, /id: fs-sandbox[\s\S]*DSH_CWD/);
  assert.match(chat, /id: deepseek-v4-flash-vision-exp[\s\S]*inputModalities:[\s\S]*- image/);
  assert.match(chat, /id: deepseek-v4-flash[\s\S]*contextWindow: 128000/);
  assert.doesNotMatch(chat, /deepseek-chat|deepseek-v4-pro/);
  assert.doesNotMatch(chat, /dsh-web-search-exa|dsh-web-search-perplexity/);
  assert.match(capture, /toolSet: all/);
  assert.match(capture, /id: persistent-bash\s+disabled: true/);
  assert.match(capture, /id: persistent-pwsh\s+disabled: true/);
  assert.match(capture, /id: deepseek-v4-flash-vision-exp[\s\S]*inputModalities:[\s\S]*- image/);
  assert.match(capture, /id: deepseek-v4-flash[\s\S]*contextWindow: 128000/);
  assert.doesNotMatch(capture, /deepseek-chat|deepseek-v4-pro/);
  assert.doesNotMatch(capture, /name:.*dsh-(tool-bash|tool-fs|tool-web)|dsh-web-search/);
  for (const text of [chat, capture]) {
    assert.doesNotMatch(text, /sk-[A-Za-z0-9]/);
    assert.match(text, /apiKeyEnv: DEEPSEEK_API_KEY/);
  }
});

test("launch discovery reports an uninstalled clone as not bootable", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-missing-modules-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const launch = await resolveHarnessLaunch({ dshRoot: root, fakeAgent: "" });
  assert.equal(launch.fake, false);
  assert.equal(launch.bootable, false);
  assert.equal(launch.kind, "dsh-sdk-profile");
  assert.equal(launch.runtimeClosure.ok, false);
  assert.ok(launch.runtimeClosure.missing.length > 0);
});

test("launch discovery selects official DSH SDK profiles only with a complete runtime closure", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-closure-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = await writeDshLaunchFixture(root);
  const baseRoot = path.join(root, "packages", "bundle", "base");

  const launch = await resolveHarnessLaunch({ dshRoot: root, configDir, fakeAgent: "" });

  assert.equal(launch.fake, false);
  assert.equal(launch.bootable, true);
  assert.equal(launch.kind, "dsh-sdk-profile");
  assert.equal(launch.runtimeClosure.ok, true);
  assert.deepEqual(launch.runtimeClosure.required, [...new Set([
    "@deepseek-ai/cordis",
    "@deepseek-ai/dsh-app-boot",
    "@deepseek-ai/dsh-invariants",
    "@deepseek-ai/dsh-sdk-app",
    "@deepseek-ai/dsh-sdk-jsonrpc-server",
    "@deepseek-ai/dsh-sdk-protocol",
    "@deepseek-ai/dsh-sdk-minimal",
    "@deepseek-ai/dsh-base",
  ])].sort());
  assert.equal(launch.runtimeClosure.base, path.join(baseRoot, "lib", "index.js"));
  assert.equal(launch.runtimeClosure.source, "dsh-sdk-profile");
  assert.equal(launch.argsPrefix.at(-1), path.join(root, "apps", "cli", "lib", "bin.js"));
});

test("launch discovery rejects a package manifest without a built runtime entry", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-entry-missing-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = await writeDshLaunchFixture(root, {
    missingRuntime: ["@deepseek-ai/dsh-sdk-jsonrpc-server"],
  });

  const launch = await resolveHarnessLaunch({ dshRoot: root, configDir, fakeAgent: "" });

  assert.equal(launch.bootable, false);
  assert.equal(launch.runtimeClosure.ok, false);
  assert.ok(launch.runtimeClosure.missing.some((item) => item.endsWith("#runtime-entry")));
});

test("supervisor refuses to spawn a real sidecar without node_modules", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-uninstalled-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
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
  await writeDshLaunchFixture(root, { missingRuntime: ["@deepseek-ai/dsh-sdk-jsonrpc-server"] });
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
  let spawnedArgs;
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    killTree: testKillTree,
    localRoot: root,
    bridgeOrigin: "http://127.0.0.1:9/api/syno/bridge/mcp",
    bridgeToken: "bridge-token",
    deepseekKeyLoader: async () => "stored-key",
    spawnImpl: (command, args, options) => {
      spawnedEnv = options.env;
      spawnedArgs = args;
      return spawn(command, args, options);
    },
  });
  t.after(() => supervisor.stop());
  await supervisor.start("chat", { model: "deepseek-v4-flash" });
  assert.equal(spawnedEnv.DEEPSEEK_API_KEY, "stored-key");
  assert.equal(spawnedEnv.SYNO_BRIDGE_TOKEN, "bridge-token");
  assert.equal(spawnedEnv.SYNO_DSH_ROOT, supervisor.dshRoot);
  assert.equal(spawnedEnv.DSH_HOME, path.join(root, "home"));
  assert.equal(spawnedEnv.DSH_CWD, path.join(root, "workspace", "chat"));
  assert.notEqual(spawnedEnv.DSH_CWD, supervisor.repoRoot);
  assert.equal(spawnedEnv.FEISHU_APP_SECRET, undefined);
  assert.equal(spawnedEnv.SYNO_OPENCODE_API_KEY, undefined);
  assert.deepEqual(spawnedArgs.slice(-4), [
    "--profile",
    "sdk",
    "--patch",
    path.resolve("config/deepseek-harness/syno-chat.cordis.yml"),
  ]);
  assert.equal(supervisor.status("chat").ready, true);
});

test("capture launches DSH sdk-minimal with its restricted Syno overlay", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-capture-profile-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let spawnedArgs;
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    killTree: testKillTree,
    localRoot: root,
    spawnImpl: (command, args, options) => {
      spawnedArgs = args;
      return spawn(command, args, options);
    },
  });
  t.after(() => supervisor.stop());
  await supervisor.start("capture", { model: "deepseek-v4-flash-vision-exp" });
  assert.deepEqual(spawnedArgs.slice(-4), [
    "--profile",
    "sdk-minimal",
    "--patch",
    path.resolve("config/deepseek-harness/syno-capture.cordis.yml"),
  ]);
  assert.equal(spawnedArgs.includes("apps/syno/syno/deepseek-harness-jsonrpc-launcher.mjs"), false);
});

test("fake chat surface stays jsonrpc and does not spawn dsh web", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-surface-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const supervisor = new DeepSeekHarnessSupervisor({
    fakeAgent,
    killTree: testKillTree,
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
    killTree: testKillTree,
    localRoot: root,
  });
  t.after(() => supervisor.stop().catch(() => {}));
  const client = await supervisor.start("chat", { model: "deepseek-v4-flash" });
  let protocolShutdownCalled = false;
  client.shutdown = async () => { protocolShutdownCalled = true; };
  await supervisor.stop("chat");
  assert.equal(protocolShutdownCalled, false);
});

test("Syno SDK profile discovery keeps the external DSH checkout read-only", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-readonly-") );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const configDir = await writeDshLaunchFixture(root);
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
  assert.deepEqual(await accepted, { origin: "http://127.0.0.1:3088", token: null });

  // DSH 0.1.7 横幅 URL 携带一次性令牌，必须随就绪结果传递给客户端
  const authed = new EventEmitter();
  authed.stdout = new EventEmitter();
  authed.stderr = new EventEmitter();
  const acceptedAuthed = waitForWebReady(authed, { timeoutMs: 1_000, expectedOrigin: "http://127.0.0.1:3088" });
  authed.stdout.emit("data", "dsh web: http://127.0.0.1:3088/?token=abc123_-XYZ\n");
  assert.deepEqual(await acceptedAuthed, { origin: "http://127.0.0.1:3088", token: "abc123_-XYZ" });
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
    killTree: async () => {},
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
