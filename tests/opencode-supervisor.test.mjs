import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { RuntimeJournal } from "../apps/syno/syno/runtime-journal.mjs";
import {
  discoverOpenCodeCandidates,
  LOCKED_OPENCODE_VERSION,
  minimalChildEnvironment,
  OpenCodeSupervisor,
  resolveOpenCodeBinary,
  secureConfig,
} from "../apps/syno/syno/opencode-supervisor.mjs";

async function temporaryRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-opencode-supervisor-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("OpenCode binary resolver rejects mise shims and resolves a real installation executable", async (t) => {
  const root = await temporaryRoot(t);
  const shim = path.join(root, "mise", "shims", "opencode.exe");
  const cmd = path.join(root, "mise", "installs", "node", "24.13.0", "opencode.cmd");
  const executable = path.join(path.dirname(cmd), "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(shim), { recursive: true });
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(shim, "shim");
  await fs.writeFile(cmd, "@echo off\r\n\"%~dp0\\node_modules\\opencode-ai\\bin\\opencode.exe\" %*\r\n");
  await fs.writeFile(executable, "real");

  const result = await resolveOpenCodeBinary({
    candidates: [shim, cmd],
    versionOf: async (candidate) => candidate === executable ? LOCKED_OPENCODE_VERSION : "unexpected",
  });

  assert.equal(result.executable, executable);
  assert.equal(result.version, "1.18.2");
  assert.equal(result.rejected[0].reason, "mise-shim");
});

test("OpenCode child environment keeps only runtime essentials and drops unrelated host secrets", () => {
  assert.deepEqual(minimalChildEnvironment({
    Path: "C:\\Windows",
    SYSTEMROOT: "C:\\Windows",
    TEMP: "C:\\Temp",
    HTTPS_PROXY: "http://127.0.0.1:7892",
    HTTP_PROXY: "http://user:password@127.0.0.1:7892",
    FEISHU_APP_SECRET: "must-not-leak",
    PROVIDER_TOKEN: "must-not-leak",
  }), {
    Path: "C:\\Windows",
    SYSTEMROOT: "C:\\Windows",
    TEMP: "C:\\Temp",
    HTTPS_PROXY: "http://127.0.0.1:7892",
  });
});

test("OpenCode child environment whitelists only the two model provider keys", () => {
  // 2026-07-31 Owner 决策：DeepSeek 自有 key 主链。key 仅经环境变量注入子进程，
  // 其他主机密钥仍然一律不下发。
  const env = minimalChildEnvironment({
    DEEPSEEK_API_KEY: "ds-key",
    SYNO_OPENCODE_API_KEY: "zen-key",
    FEISHU_APP_SECRET: "must-not-leak",
  });
  assert.equal(env.DEEPSEEK_API_KEY, "ds-key");
  assert.equal(env.SYNO_OPENCODE_API_KEY, "zen-key");
  assert.equal(env.FEISHU_APP_SECRET, undefined);
});

test("secureConfig enables the DeepSeek provider with env-injected keys and keeps the free fallback", () => {
  const config = JSON.parse(secureConfig("C:\\repo", {}));
  assert.deepEqual(config.enabled_providers, ["deepseek", "opencode"]);
  assert.equal(config.provider.deepseek.options.apiKey, "{env:DEEPSEEK_API_KEY}");
  assert.equal(config.provider.opencode.options.apiKey, "{env:SYNO_OPENCODE_API_KEY}");
  assert.equal(config.default_agent, "syno");
});

test("OpenCode binary resolver fails closed for an incompatible version", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");

  await assert.rejects(
    resolveOpenCodeBinary({ candidates: [executable], versionOf: async () => "1.19.0" }),
    (error) => error.code === "OPENCODE_VERSION_MISMATCH",
  );
});

test("OpenCode discovery derives the real executable beside the active mise Node without directory enumeration", async (t) => {
  const root = await temporaryRoot(t);
  const nodeExecutable = path.join(root, "mise", "installs", "node", "24.13.0", "node.exe");
  const candidates = await discoverOpenCodeCandidates({
    nodeExecutable,
    localAppData: "",
    installationFile: path.join(root, "missing-installation.json"),
    exec: async () => { throw Object.assign(new Error("where blocked"), { code: "EPERM" }); },
  });

  assert.deepEqual(candidates, [
    path.join(path.dirname(nodeExecutable), "node_modules", "opencode-ai", "bin", "opencode.exe"),
    path.join(path.dirname(nodeExecutable), "opencode.cmd"),
  ]);
});

test("OpenCode discovery revalidates a persisted installation when PATH and directory enumeration are unavailable", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "mise", "installs", "node", "24.13.0", "node_modules", "opencode-ai", "bin", "opencode.exe");
  const installationFile = path.join(root, "installation.json");
  await fs.writeFile(installationFile, JSON.stringify({ executable, version: "stale-and-untrusted" }));

  const candidates = await discoverOpenCodeCandidates({
    nodeExecutable: "",
    localAppData: "",
    installationFile,
    exec: async () => { throw new Error("where unavailable"); },
  });
  assert.deepEqual(candidates, [executable]);
});

test("OpenCodeSupervisor owns one child, authenticates health, and only stops its own process tree", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");
  const children = [];
  const killed = [];
  const requests = [];
  const spawnImpl = (_file, args, options) => {
    const child = new EventEmitter();
    child.pid = 4242;
    child.exitCode = null;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    children.push({ args, options, child });
    return child;
  };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, async json() { return { healthy: true, version: "1.18.2" }; } };
  };
  const supervisor = new OpenCodeSupervisor({
    localRoot: root,
    repoRoot: root,
    executable,
    versionOf: async () => "1.18.2",
    spawnImpl,
    fetchImpl,
    portProbe: async () => false,
    killTree: async (pid) => killed.push(pid),
    randomSecret: () => "runtime-secret",
    tokenLoader: async () => "zen-secret",
    healthAttempts: 1,
  });

  const started = await supervisor.start();
  assert.equal(started.state, "running");
  assert.equal(started.pid, 4242);
  assert.deepEqual(children[0].args, ["serve", "--pure", "--hostname", "127.0.0.1", "--port", "4318", "--log-level", "ERROR"]);
  assert.equal(children[0].options.env.OPENCODE_DISABLE_AUTOUPDATE, "true");
  assert.equal(children[0].options.env.OPENCODE_API_KEY, undefined);
  assert.equal(children[0].options.env.SYNO_OPENCODE_API_KEY, "zen-secret");
  assert.notEqual(children[0].options.cwd, root);
  assert.match(children[0].options.cwd, /profile[\\/]workspace$/);
  const injected = JSON.parse(children[0].options.env.OPENCODE_CONFIG_CONTENT);
  assert.equal(injected.permission["*"], "deny");
  assert.equal(injected.permission["syno_*"], "allow");
  assert.equal(injected.tools.read, false);
  assert.deepEqual(injected.enabled_providers, ["deepseek", "opencode"]);
  assert.equal(injected.provider.deepseek.options.apiKey, "{env:DEEPSEEK_API_KEY}");
  assert.equal(injected.provider.opencode.options.apiKey, "{env:SYNO_OPENCODE_API_KEY}");
  assert.doesNotMatch(children[0].options.env.OPENCODE_CONFIG_CONTENT, /zen-secret/);
  assert.match(requests[0].options.headers.Authorization, /^Basic /);

  await supervisor.start();
  assert.equal(children.length, 1);
  const stopped = await supervisor.stop();
  assert.equal(stopped.state, "stopped");
  assert.deepEqual(killed, [4242]);
});

test("OpenCodeSupervisor refuses an occupied port that is not its authenticated OpenCode child", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");
  const supervisor = new OpenCodeSupervisor({
    localRoot: root,
    repoRoot: root,
    executable,
    versionOf: async () => "1.18.2",
    portProbe: async () => true,
  });

  await assert.rejects(supervisor.start(), (error) => error.code === "OPENCODE_PORT_OCCUPIED");
});

test("OpenCodeSupervisor never persists child output and records only the structured exit cause", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  const logRoot = path.join(root, "logs");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");
  const child = new EventEmitter();
  child.pid = 4343;
  child.exitCode = null;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const supervisor = new OpenCodeSupervisor({
    localRoot: root,
    repoRoot: root,
    executable,
    versionOf: async () => "1.18.2",
    spawnImpl: () => {
      queueMicrotask(() => {
        child.stderr.write("fatal: Authorization: Bearer must-not-leak\n");
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });
      return child;
    },
    fetchImpl: async () => { throw new Error("not ready"); },
    portProbe: async () => false,
    killTree: async () => {},
    journal: new RuntimeJournal({ root: logRoot, now: () => new Date("2026-07-28T06:00:00.000Z") }),
    healthAttempts: 2,
    healthDelayMs: 0,
  });

  await assert.rejects(supervisor.start(), (error) => error.code === "OPENCODE_EXITED");
  const log = await fs.readFile(path.join(logRoot, "syno-runtime-2026-07-28.jsonl"), "utf8");
  assert.doesNotMatch(log, /opencode\.child\.stderr/);
  assert.match(log, /opencode\.child\.exit/);
  assert.match(log, /opencode\.start\.failed/);
  assert.doesNotMatch(log, /must-not-leak/);
});

test("OpenCodeSupervisor records a delayed owned stop exit as informational", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");
  const entries = [];
  const child = new EventEmitter();
  child.pid = 4444;
  child.exitCode = null;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  const supervisor = new OpenCodeSupervisor({
    localRoot: root,
    repoRoot: root,
    executable,
    versionOf: async () => "1.18.2",
    spawnImpl: () => child,
    fetchImpl: async () => ({ ok: true, async json() { return { healthy: true, version: "1.18.2" }; } }),
    portProbe: async () => false,
    killTree: async () => {
      setTimeout(() => {
        child.exitCode = 1;
        child.emit("exit", 1, null);
      }, 0);
    },
    journal: { async record(event, data, options) { entries.push({ event, data, options }); } },
    healthAttempts: 1,
  });

  await supervisor.start();
  await supervisor.stop();
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(supervisor.status().lastError, null);
  const exit = entries.find((entry) => entry.event === "opencode.child.exit");
  assert.equal(exit.options.level, "info");
  assert.equal(exit.data.expected, true);
});
