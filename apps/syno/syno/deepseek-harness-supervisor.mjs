import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { DeepSeekHarnessJsonRpcClient } from "./deepseek-harness-jsonrpc-client.mjs";
import { DeepSeekHarnessWebClient } from "./deepseek-harness-web-client.mjs";
import { defaultDeepseekKeyLoader } from "./deepseek-key-loader.mjs";
import { PATHS } from "./paths.mjs";
import { RuntimeJournal } from "./runtime-journal.mjs";
import {
  DEFAULT_DSH_WEB_PORT,
  SYNO_AGENT_PRESET_NAME,
  SYNO_PROFILE_NAME,
  ensureSynoDshProfiles,
} from "./syno-dsh-profile.mjs";

const execFileAsync = promisify(execFile);
const REPO_CONFIG_DIR = path.join(PATHS.repoRoot, "config", "deepseek-harness");
const HARNESS_PROFILES = Object.freeze(["chat", "capture"]);
const CONFIG_FILES = Object.freeze({
  chat: "syno-chat.cordis.yml",
  capture: "syno-capture.cordis.yml",
});

function runtimeError(code, message, details) {
  return Object.assign(new Error(message), { code, ...(details ? { details } : {}) });
}

function defaultDshRoot() {
  const raw = String(process.env.SYNO_DSH_ROOT || "").trim();
  return raw ? path.resolve(raw) : "";
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

function resolveChatSurface({ fake = false, env = process.env } = {}) {
  if (fake) return "jsonrpc";
  return String(env.SYNO_DSH_CHAT_SURFACE || "").trim() === "jsonrpc" ? "jsonrpc" : "web";
}

function dshWebPort(env = process.env) {
  const raw = Number(env.SYNO_DSH_WEB_PORT || DEFAULT_DSH_WEB_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DSH_WEB_PORT;
}

async function resolveWebLaunch({
  dshRoot = defaultDshRoot(),
  nodeExecutable = process.execPath,
} = {}) {
  const rejected = [];
  if (!dshRoot) {
    throw runtimeError("HARNESS_SETUP_REQUIRED", "未设置 SYNO_DSH_ROOT；请指向本机 deepseek-harness 克隆（见 docs/OPERATIONS.md）", {
      rejected,
    });
  }
  const nodeModules = path.join(dshRoot, "node_modules");
  const tsxCli = path.join(dshRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const cliSrc = path.join(dshRoot, "apps", "cli", "src", "bin.ts");
  const cliJs = path.join(dshRoot, "apps", "cli", "lib", "bin.js");
  if (!existsSync(nodeModules)) {
    return {
      command: nodeExecutable,
      argsPrefix: [],
      cwd: dshRoot,
      dshRoot,
      bootable: false,
      fake: false,
      kind: "dsh-web",
      missingInstall: true,
      rejected: [{ path: nodeModules, reason: "missing" }],
    };
  }
  if (existsSync(cliSrc) && existsSync(tsxCli)) {
    return {
      command: nodeExecutable,
      argsPrefix: [tsxCli, cliSrc],
      cwd: dshRoot,
      dshRoot,
      bootable: true,
      fake: false,
      kind: "dsh-web",
    };
  }
  if (existsSync(cliJs)) {
    return {
      command: nodeExecutable,
      argsPrefix: [cliJs],
      cwd: dshRoot,
      dshRoot,
      bootable: true,
      fake: false,
      kind: "dsh-web",
    };
  }
  rejected.push({ path: cliSrc, reason: "missing" });
  return {
    command: nodeExecutable,
    argsPrefix: [],
    cwd: dshRoot,
    dshRoot,
    bootable: false,
    fake: false,
    kind: "dsh-web",
    rejected,
  };
}

function waitForWebReady(child, { timeoutMs, expectedOrigin }) {
  return new Promise((resolve, reject) => {
    let out = "";
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off?.("exit", onExit);
      child.stdout?.removeListener?.("data", onData);
      child.stderr?.removeListener?.("data", onData);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      finish(runtimeError("HARNESS_NOT_RUNNING", `dsh web 未在 ${timeoutMs}ms 内就绪`));
    }, timeoutMs);
    const onData = (chunk) => {
      out += String(chunk);
      const match = /dsh web: (http:\/\/[^\s]+)/.exec(out);
      if (!match?.[1]) return;
      const advertised = String(match[1]).replace(/\/+$/, "");
      if (!isLoopbackHttpOrigin(advertised, expectedOrigin)) {
        finish(runtimeError("HARNESS_ORIGIN_INVALID", `dsh web 广告了非预期地址：${advertised}`));
        return;
      }
      finish(null, expectedOrigin || advertised);
    };
    const onExit = (code, signalName) => {
      finish(runtimeError("HARNESS_EXITED", `dsh web 已退出（code=${code}, signal=${signalName || "none"}）${out ? `：${out.slice(-400)}` : ""}`));
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", onExit);
  });
}

function isLoopbackHttpOrigin(origin, expectedOrigin) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") return false;
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) return false;
  if (!expectedOrigin) return true;
  let expected;
  try {
    expected = new URL(expectedOrigin);
  } catch {
    return false;
  }
  return url.port === expected.port;
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
  if (!dshRoot) {
    throw runtimeError("HARNESS_SETUP_REQUIRED", "未设置 SYNO_DSH_ROOT；请指向本机 deepseek-harness 克隆（见 docs/OPERATIONS.md）", {
      rejected,
    });
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
    webClientFactory = (options) => new DeepSeekHarnessWebClient(options),
    killTree = defaultKillTree,
    deepseekKeyLoader = defaultDeepseekKeyLoader,
    journal = new RuntimeJournal(),
    bridgeOrigin,
    bridgeToken,
    fakeAgent = process.env.SYNO_DSH_FAKE_AGENT,
    initializeTimeoutMs = 30_000,
    webReadyTimeoutMs = null,
  } = {}) {
    this.dshRoot = dshRoot;
    this.repoRoot = repoRoot;
    this.configDir = configDir;
    this.localRoot = localRoot;
    this.spawnImpl = spawnImpl;
    this.webClientFactory = webClientFactory;
    this.killTree = killTree;
    this.deepseekKeyLoader = deepseekKeyLoader;
    this.journal = journal;
    this.bridgeOrigin = bridgeOrigin;
    this.bridgeToken = bridgeToken;
    this.fakeAgent = fakeAgent;
    this.initializeTimeoutMs = initializeTimeoutMs;
    this.webReadyTimeoutMs = webReadyTimeoutMs;
    this.launch = null;
    this.webLaunch = null;
    this.chatSurface = resolveChatSurface({ fake: Boolean(fakeAgent) });
    this.webPort = dshWebPort();
    this.slots = new Map();
    this.lastError = null;
  }

  #record(event, data = {}, options) {
    return this.journal.record(event, data, options).catch(() => null);
  }

  async discover() {
    this.launch = await resolveHarnessLaunch({ dshRoot: this.dshRoot, fakeAgent: this.fakeAgent });
    this.chatSurface = resolveChatSurface({ fake: this.launch?.fake === true });
    this.webLaunch = this.chatSurface === "web"
      ? await resolveWebLaunch({ dshRoot: this.dshRoot })
      : null;
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
        surface: slot?.surface || (profile === "chat" ? this.chatSurface : "jsonrpc"),
        origin: slot?.origin || null,
        bootable: this.launch?.bootable !== false,
        kind: slot?.kind || (profile === "chat" && this.chatSurface === "web" ? this.webLaunch?.kind : this.launch?.kind) || null,
        lastError: this.lastError ? { code: this.lastError.code || "HARNESS_RUNTIME_FAILED", message: this.lastError.message } : null,
      };
    }
    return {
      state: [...this.slots.values()].some((slot) => slot.child && slot.child.exitCode === null) ? "running" : this.launch ? "stopped" : "setup_required",
      ready: HARNESS_PROFILES.some((name) => this.status(name).ready),
      bootable: this.chatSurface === "web" ? this.webLaunch?.bootable !== false : this.launch?.bootable !== false,
      kind: this.chatSurface === "web" ? this.webLaunch?.kind || this.launch?.kind : this.launch?.kind || null,
      chatSurface: this.chatSurface,
      webOrigin: this.slots.get("chat")?.origin || null,
      webPort: this.webPort,
      dshRoot: this.dshRoot,
      profiles: Object.fromEntries(HARNESS_PROFILES.map((name) => [name, this.status(name)])),
      lastError: this.lastError ? { code: this.lastError.code || "HARNESS_RUNTIME_FAILED", message: this.lastError.message } : null,
    };
  }

  async health() {
    const report = this.status();
    const chat = this.status("chat");
    return {
      ...report,
      healthy: chat.ready === true,
      chatSurface: this.chatSurface,
      webOrigin: chat.origin || null,
    };
  }

  client(profile = "chat") {
    const slot = this.slots.get(profile);
    if (!slot?.client || slot.child?.exitCode !== null) {
      throw runtimeError("HARNESS_NOT_RUNNING", `DeepSeek Harness ${profile} 尚未运行`);
    }
    return slot.client;
  }

  async ensure(profile, { provider = "deepseek-official", model = "deepseek-v4-flash-vision-exp" } = {}) {
    if (!HARNESS_PROFILES.includes(profile)) throw runtimeError("HARNESS_PROFILE_INVALID", `未知 Harness profile：${profile}`);
    const slot = this.slots.get(profile);
    if (slot?.client?.initialized && slot.child?.exitCode === null && slot.provider === provider && slot.model === model) {
      return slot.client;
    }
    if (slot?.child && slot.child.exitCode === null) await this.stop(profile);
    return this.start(profile, { provider, model });
  }

  async start(profile, { provider = "deepseek-official", model = "deepseek-v4-flash-vision-exp" } = {}) {
    if (!this.launch) await this.discover();
    if (profile === "chat" && this.chatSurface === "web") {
      if (this.webLaunch?.bootable === false) {
        const error = runtimeError("HARNESS_SETUP_REQUIRED", "deepseek-harness 尚未安装依赖（缺少 node_modules）；dsh web 无法启动", {
          dshRoot: this.dshRoot,
        });
        this.lastError = error;
        await this.#record("harness.start.failed", { profile, error }, { level: "error" });
        throw error;
      }
      return this.#startWeb(profile, { provider, model });
    }
    if (this.launch.bootable === false && this.launch.fake !== true) {
      const error = runtimeError("HARNESS_SETUP_REQUIRED", "deepseek-harness 尚未安装依赖（缺少 node_modules）；真实 sidecar 无法启动", {
        dshRoot: this.dshRoot,
      });
      this.lastError = error;
      await this.#record("harness.start.failed", { profile, error }, { level: "error" });
      throw error;
    }
    return this.#startJsonRpc(profile, { provider, model });
  }

  async #profileEnv(profile, { includeCordisConfig = true } = {}) {
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
    const workspaceRoot = path.join(this.localRoot, "workspace", profile);
    await Promise.all([sessionRoot, homeRoot, workspaceRoot].map((directory) => fs.mkdir(directory, { recursive: true })));
    if (profile === "chat") await ensureSynoDshProfiles({ homeRoot, repoRoot: this.repoRoot });
    const env = {
      ...harnessChildEnvironment(process.env),
      ...(includeCordisConfig ? { DSH_CORDIS_CONFIG: configPath } : {}),
      DSH_CWD: workspaceRoot,
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
    return { env, configPath, workspaceRoot, homeRoot, sessionRoot };
  }

  async #startJsonRpc(profile, { provider, model } = {}) {
    const { env, configPath, workspaceRoot } = await this.#profileEnv(profile);
    const args = [...this.launch.argsPrefix, configPath];
    await this.#record("harness.start.requested", { profile, model, kind: this.launch.kind, surface: "jsonrpc" });
    let child;
    try {
      child = this.spawnImpl(this.launch.command, args, {
        cwd: this.launch.cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
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
    const slot = { child, client, provider, model, configPath, profile, surface: "jsonrpc", kind: this.launch.kind, origin: null };
    this.slots.set(profile, slot);
    this.lastError = null;
    child.once("exit", (code, signalName) => {
      if (this.slots.get(profile)?.child === child) {
        this.lastError ||= code === 0 ? null : runtimeError("HARNESS_EXITED", `DeepSeek Harness ${profile} 已退出（code=${code}, signal=${signalName || "none"}）`);
      }
      void this.#record("harness.child.exit", { profile, pid: child.pid, code, signal: signalName }, { level: code === 0 ? "info" : "error" });
    });
    try {
      await client.initialize({ cwd: workspaceRoot, provider, model });
      await this.#record("harness.start.completed", { profile, pid: child.pid, model, surface: "jsonrpc" });
      return client;
    } catch (error) {
      this.lastError = error;
      await this.#record("harness.start.failed", { profile, error }, { level: "error" });
      await this.stop(profile).catch(() => {});
      throw error;
    }
  }

  async #startWeb(profile, { provider, model } = {}) {
    const { env, workspaceRoot } = await this.#profileEnv(profile, { includeCordisConfig: false });
    const origin = `http://127.0.0.1:${this.webPort}`;
    const args = [
      ...this.webLaunch.argsPrefix,
      "--profile", SYNO_PROFILE_NAME,
      "--host", "127.0.0.1",
      "--port", String(this.webPort),
      "--no-open",
    ];
    await this.#record("harness.start.requested", { profile, model, kind: this.webLaunch.kind, surface: "web", origin });
    let child;
    try {
      child = this.spawnImpl(this.webLaunch.command, args, {
        cwd: this.webLaunch.cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      this.lastError = error;
      await this.#record("harness.spawn.failed", { profile, error }, { level: "error" });
      throw error;
    }
    child.once("exit", (code, signalName) => {
      if (this.slots.get(profile)?.child === child) {
        this.lastError ||= code === 0 ? null : runtimeError("HARNESS_EXITED", `DeepSeek Harness ${profile} 已退出（code=${code}, signal=${signalName || "none"}）`);
      }
      void this.#record("harness.child.exit", { profile, pid: child.pid, code, signal: signalName }, { level: code === 0 ? "info" : "error" });
    });
    try {
      await waitForWebReady(child, {
        timeoutMs: this.webReadyTimeoutMs ?? Math.max(this.initializeTimeoutMs, 90_000),
        expectedOrigin: origin,
      });
      const client = this.webClientFactory({
        origin,
        cwd: workspaceRoot,
        pid: child.pid,
        kill: () => this.killTree(child.pid),
        initializeTimeoutMs: this.initializeTimeoutMs,
        onNotice: ({ event, data, options }) => {
          void this.#record(event, data, options);
        },
      });
      const slot = {
        child,
        client,
        provider,
        model,
        profile,
        surface: "web",
        kind: this.webLaunch.kind,
        origin,
      };
      this.slots.set(profile, slot);
      this.lastError = null;
      await client.initialize({ cwd: workspaceRoot, provider, model, agentPreset: SYNO_AGENT_PRESET_NAME });
      await this.#record("harness.start.completed", { profile, pid: child.pid, model, surface: "web", origin: slot.origin });
      return client;
    } catch (error) {
      this.lastError = error;
      await this.#record("harness.start.failed", { profile, error }, { level: "error" });
      if (child?.pid) await this.killTree(child.pid).catch(() => {});
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
  DeepSeekHarnessSupervisor,
  HARNESS_PROFILES,
  REPO_CONFIG_DIR,
  configPathFor,
  defaultDshRoot,
  dshWebPort,
  harnessChildEnvironment,
  isLoopbackHttpOrigin,
  resolveChatSurface,
  resolveHarnessLaunch,
  resolveWebLaunch,
  waitForWebReady,
};
