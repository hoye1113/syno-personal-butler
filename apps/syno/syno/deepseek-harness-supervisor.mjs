import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { DeepSeekHarnessJsonRpcClient } from "./deepseek-harness-jsonrpc-client.mjs";
import { defaultDeepseekKeyLoader } from "./deepseek-key-loader.mjs";
import { PATHS } from "./paths.mjs";
import { RuntimeJournal } from "./runtime-journal.mjs";

const execFileAsync = promisify(execFile);
const REPO_CONFIG_DIR = path.join(PATHS.repoRoot, "config", "deepseek-harness");
const DEFAULT_DSH_ROOT = "D:\\workSpace\\git_clone_test\\deepseek-harness";
const HARNESS_PROFILES = Object.freeze(["chat", "capture"]);
const CONFIG_FILES = Object.freeze({
  chat: "syno-chat.cordis.yml",
  capture: "syno-capture.cordis.yml",
});

function runtimeError(code, message, details) {
  return Object.assign(new Error(message), { code, ...(details ? { details } : {}) });
}

function defaultDshRoot() {
  return path.resolve(process.env.SYNO_DSH_ROOT || DEFAULT_DSH_ROOT);
}

function defaultKillTree(pid) {
  if (!pid) return Promise.resolve();
  if (process.platform === "win32") {
    return execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }).catch((error) => {
      if (!/not found|没有找到|not running/i.test(String(error.stderr || error.message))) throw error;
    });
  }
  try { process.kill(-pid, "SIGTERM"); } catch {}
  return Promise.resolve();
}

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return Promise.resolve(child?.exitCode ?? 0);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    timer.unref?.();
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function harnessChildEnvironment(source = process.env) {
  const allowed = new Set([
    "APPDATA", "COMSPEC", "HOMEDRIVE", "HOMEPATH", "LOCALAPPDATA", "NODE_EXTRA_CA_CERTS",
    "NO_PROXY", "PATH", "PATHEXT", "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP", "USERPROFILE",
    "WINDIR", "HTTP_PROXY", "HTTPS_PROXY",
  ]);
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => {
    const upper = key.toUpperCase();
    if (!allowed.has(upper)) return false;
    if (!["HTTP_PROXY", "HTTPS_PROXY"].includes(upper)) return true;
    try {
      const url = new URL(String(value));
      return !url.username && !url.password;
    } catch {
      return false;
    }
  }));
}

async function resolveHarnessLaunch({
  dshRoot = defaultDshRoot(),
  fakeAgent = process.env.SYNO_DSH_FAKE_AGENT,
  nodeExecutable = process.execPath,
} = {}) {
  const rejected = [];
  if (fakeAgent) {
    const executable = path.resolve(fakeAgent);
    try {
      await fs.access(executable);
      return {
        command: nodeExecutable,
        argsPrefix: [executable],
        cwd: path.dirname(executable),
        dshRoot,
        bootable: true,
        fake: true,
        kind: "fake-agent",
        rejected,
      };
    } catch {
      rejected.push({ path: executable, reason: "missing" });
    }
  }
  const packaged = path.join(dshRoot, "packages", "examples", "jsonrpc-demo", "lib", "packaged-bin.js");
  const builtBin = path.join(dshRoot, "packages", "examples", "jsonrpc-demo", "lib", "bin.js");
  const sourcePackaged = path.join(dshRoot, "packages", "examples", "jsonrpc-demo", "src", "packaged-bin.ts");
  const sourceBin = path.join(dshRoot, "packages", "examples", "jsonrpc-demo", "src", "bin.ts");
  const nodeModules = path.join(dshRoot, "node_modules");
  const installed = existsSync(nodeModules);
  const tsxCli = path.join(dshRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const candidates = [
    { file: packaged, argsPrefix: [packaged], kind: "packaged-bin", needsInstall: true },
    { file: builtBin, argsPrefix: [builtBin], kind: "jsonrpc-bin", needsInstall: true },
    { file: sourcePackaged, argsPrefix: existsSync(tsxCli) ? [tsxCli, sourcePackaged] : ["--import", "tsx", sourcePackaged], kind: "packaged-src", needsInstall: true },
    { file: sourceBin, argsPrefix: existsSync(tsxCli) ? [tsxCli, sourceBin] : ["--import", "tsx", sourceBin], kind: "jsonrpc-src", needsInstall: true },
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate.file)) {
      rejected.push({ path: candidate.file, reason: "missing" });
      continue;
    }
    return {
      command: nodeExecutable,
      argsPrefix: candidate.argsPrefix,
      cwd: dshRoot,
      dshRoot,
      bootable: installed,
      fake: false,
      kind: candidate.kind,
      rejected,
      missingInstall: !installed,
    };
  }
  throw runtimeError("HARNESS_SETUP_REQUIRED", "未找到 dsh-jsonrpc-agent；设置 SYNO_DSH_ROOT 指向 deepseek-harness 克隆", {
    dshRoot,
    rejected,
  });
}

function configPathFor(profile, { configDir = REPO_CONFIG_DIR } = {}) {
  const file = CONFIG_FILES[profile];
  if (!file) throw runtimeError("HARNESS_PROFILE_INVALID", `未知 Harness profile：${profile}`);
  return path.join(configDir, file);
}

function personaPath(profile, { configDir = REPO_CONFIG_DIR } = {}) {
  return path.join(configDir, profile === "capture" ? "syno-capture-agent.md" : "syno-agent.md");
}

class DeepSeekHarnessSupervisor {
  constructor({
    dshRoot = defaultDshRoot(),
    repoRoot = PATHS.repoRoot,
    configDir = REPO_CONFIG_DIR,
    localRoot = path.join(PATHS.localDataRoot, "harness"),
    spawnImpl = spawn,
    killTree = defaultKillTree,
    deepseekKeyLoader = defaultDeepseekKeyLoader,
    journal = new RuntimeJournal(),
    bridgeOrigin,
    bridgeToken,
    fakeAgent = process.env.SYNO_DSH_FAKE_AGENT,
    initializeTimeoutMs = 30_000,
  } = {}) {
    this.dshRoot = dshRoot;
    this.repoRoot = repoRoot;
    this.configDir = configDir;
    this.localRoot = localRoot;
    this.spawnImpl = spawnImpl;
    this.killTree = killTree;
    this.deepseekKeyLoader = deepseekKeyLoader;
    this.journal = journal;
    this.bridgeOrigin = bridgeOrigin;
    this.bridgeToken = bridgeToken;
    this.fakeAgent = fakeAgent;
    this.initializeTimeoutMs = initializeTimeoutMs;
    this.launch = null;
    this.slots = new Map();
    this.lastError = null;
  }

  #record(event, data = {}, options) {
    return this.journal.record(event, data, options).catch(() => null);
  }

  async discover() {
    this.launch = await resolveHarnessLaunch({ dshRoot: this.dshRoot, fakeAgent: this.fakeAgent });
    return this.status();
  }

  status(profile) {
    if (profile) {
      const slot = this.slots.get(profile);
      const running = Boolean(slot?.child && slot.child.exitCode === null);
      return {
        profile,
        state: running ? "running" : this.launch ? "stopped" : "setup_required",
        ready: running && slot?.client?.initialized === true && !this.lastError,
        pid: running ? slot.child.pid : null,
        model: slot?.model || null,
        bootable: this.launch?.bootable !== false,
        kind: this.launch?.kind || null,
        lastError: this.lastError ? { code: this.lastError.code || "HARNESS_RUNTIME_FAILED", message: this.lastError.message } : null,
      };
    }
    return {
      state: [...this.slots.values()].some((slot) => slot.child && slot.child.exitCode === null) ? "running" : this.launch ? "stopped" : "setup_required",
      ready: HARNESS_PROFILES.some((name) => this.status(name).ready),
      bootable: this.launch?.bootable !== false,
      kind: this.launch?.kind || null,
      dshRoot: this.dshRoot,
      profiles: Object.fromEntries(HARNESS_PROFILES.map((name) => [name, this.status(name)])),
      lastError: this.lastError ? { code: this.lastError.code || "HARNESS_RUNTIME_FAILED", message: this.lastError.message } : null,
    };
  }

  async health() {
    const report = this.status();
    const chat = this.status("chat");
    return { ...report, healthy: chat.ready === true };
  }

  client(profile = "chat") {
    const slot = this.slots.get(profile);
    if (!slot?.client || slot.child?.exitCode !== null) {
      throw runtimeError("HARNESS_NOT_RUNNING", `DeepSeek Harness ${profile} sidecar 尚未运行`);
    }
    return slot.client;
  }

  async ensure(profile, { provider = "deepseek-official", model = "deepseek-v4-flash" } = {}) {
    if (!HARNESS_PROFILES.includes(profile)) throw runtimeError("HARNESS_PROFILE_INVALID", `未知 Harness profile：${profile}`);
    const slot = this.slots.get(profile);
    if (slot?.client?.initialized && slot.child?.exitCode === null && slot.provider === provider && slot.model === model) {
      return slot.client;
    }
    if (slot?.child && slot.child.exitCode === null) await this.stop(profile);
    return this.start(profile, { provider, model });
  }

  async start(profile, { provider = "deepseek-official", model = "deepseek-v4-flash" } = {}) {
    if (!this.launch) await this.discover();
    if (this.launch.bootable === false && this.launch.fake !== true) {
      const error = runtimeError("HARNESS_SETUP_REQUIRED", "deepseek-harness 尚未安装依赖（缺少 node_modules）；真实 sidecar 无法启动", {
        dshRoot: this.dshRoot,
      });
      this.lastError = error;
      await this.#record("harness.start.failed", { profile, error }, { level: "error" });
      throw error;
    }
    const configPath = configPathFor(profile, { configDir: this.configDir });
    await fs.access(configPath);
    const pluginPath = path.join(this.configDir, "syno-tool-bridge-plugin.mjs");
    const personaFile = personaPath(profile, { configDir: this.configDir });
    const persona = await fs.readFile(personaFile, "utf8").catch(() => (profile === "capture"
      ? "You are Syno's capture analyzer. Output only one JSON object. Do not use tools."
      : "You are Syno."));
    const deepseekKey = process.env.DEEPSEEK_API_KEY || (this.deepseekKeyLoader ? await this.deepseekKeyLoader() : "");
    const sessionRoot = path.join(this.localRoot, "sessions", profile);
    const homeRoot = path.join(this.localRoot, "home");
    await Promise.all([sessionRoot, homeRoot].map((directory) => fs.mkdir(directory, { recursive: true })));
    const env = {
      ...harnessChildEnvironment(process.env),
      DSH_CORDIS_CONFIG: configPath,
      DSH_CWD: this.repoRoot,
      DSH_HOME: homeRoot,
      DSH_SESSION_ROOT: sessionRoot,
      DSH_SYSTEM_PROMPT: persona,
      SYNO_REPO_ROOT: this.repoRoot,
      SYNO_SKILL_ROOT: path.join(this.configDir, "skills"),
      SYNO_HARNESS_PLUGIN: pluginPath,
      ...(this.bridgeOrigin ? { SYNO_BRIDGE_ORIGIN: this.bridgeOrigin } : {}),
      ...(this.bridgeToken ? { SYNO_BRIDGE_TOKEN: this.bridgeToken } : {}),
      ...(deepseekKey ? { DEEPSEEK_API_KEY: deepseekKey } : {}),
    };
    const args = [...this.launch.argsPrefix, configPath];
    await this.#record("harness.start.requested", { profile, model, kind: this.launch.kind });
    let child;
    try {
      child = this.spawnImpl(this.launch.command, args, {
        cwd: this.launch.cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        // env replaces the parent environment entirely (HarnessClient contract).
      });
    } catch (error) {
      this.lastError = error;
      await this.#record("harness.spawn.failed", { profile, error }, { level: "error" });
      throw error;
    }
    const client = new DeepSeekHarnessJsonRpcClient({
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      pid: child.pid,
      kill: () => this.killTree(child.pid),
      initializeTimeoutMs: this.initializeTimeoutMs,
    });
    const slot = { child, client, provider, model, configPath, profile };
    this.slots.set(profile, slot);
    this.lastError = null;
    child.once("exit", (code, signalName) => {
      if (this.slots.get(profile)?.child === child) {
        this.lastError ||= code === 0 ? null : runtimeError("HARNESS_EXITED", `DeepSeek Harness ${profile} 已退出（code=${code}, signal=${signalName || "none"}）`);
      }
      void this.#record("harness.child.exit", { profile, pid: child.pid, code, signal: signalName }, { level: code === 0 ? "info" : "error" });
    });
    try {
      await client.initialize({
        cwd: this.repoRoot,
        provider,
        model,
      });
      await this.#record("harness.start.completed", { profile, pid: child.pid, model });
      return client;
    } catch (error) {
      this.lastError = error;
      await this.#record("harness.start.failed", { profile, error }, { level: "error" });
      await this.stop(profile).catch(() => {});
      throw error;
    }
  }

  async stop(profile) {
    if (profile) {
      const slot = this.slots.get(profile);
      this.slots.delete(profile);
      await this.#disposeSlot(slot);
      return this.status(profile);
    }
    const slots = [...this.slots.values()];
    this.slots.clear();
    await Promise.all(slots.map((slot) => this.#disposeSlot(slot)));
    return this.status();
  }

  async restart(profile = "chat", route = {}) {
    await this.stop(profile);
    return this.start(profile, route);
  }

  async #disposeSlot(slot) {
    if (!slot) return;
    try {
      await slot.client?.shutdown?.();
    } catch {}
    try {
      await slot.client?.close?.();
    } catch {}
    const child = slot.child;
    if (!child || child.exitCode !== null) return;
    if (!child.killed && child.stdin && !child.stdin.destroyed) {
      try { child.stdin.end(); } catch {}
    }
    if (await waitForExit(child, 6_000) !== null) return;
    try { child.kill(); } catch {}
    if (await waitForExit(child, 3_000) !== null) return;
    if (child.pid) await this.killTree(child.pid).catch(() => {});
    await waitForExit(child, 3_000);
  }
}

export {
  CONFIG_FILES,
  DEFAULT_DSH_ROOT,
  DeepSeekHarnessSupervisor,
  HARNESS_PROFILES,
  REPO_CONFIG_DIR,
  configPathFor,
  defaultDshRoot,
  harnessChildEnvironment,
  resolveHarnessLaunch,
};
