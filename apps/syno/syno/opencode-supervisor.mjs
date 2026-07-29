import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";

import { PATHS } from "./paths.mjs";
import { RuntimeJournal } from "./runtime-journal.mjs";

const execFileAsync = promisify(execFile);
const LOCKED_OPENCODE_VERSION = "1.18.2";
const DEFAULT_OPENCODE_PORT = 4318;

function runtimeError(code, message, details) {
  return Object.assign(new Error(message), { code, ...(details ? { details } : {}) });
}

function isMiseShim(candidate) {
  return /[\\/]mise[\\/]shims[\\/]opencode(?:\.exe|\.cmd|\.bat)?$/i.test(path.resolve(candidate));
}

function isRealOpenCodeExecutable(candidate) {
  return /[\\/]node_modules[\\/]opencode-ai[\\/]bin[\\/]opencode\.exe$/i.test(path.resolve(candidate));
}

async function defaultVersionOf(executable) {
  const { stdout } = await execFileAsync(executable, ["--version"], { windowsHide: true, timeout: 10_000 });
  return String(stdout).trim();
}

async function executableFromLauncher(candidate) {
  const extension = path.extname(candidate).toLowerCase();
  if (![".cmd", ".bat"].includes(extension)) return null;
  const contents = await fs.readFile(candidate, "utf8").catch(() => "");
  const match = contents.match(/(?:"|^)([^"\r\n]*node_modules[\\/]opencode-ai[\\/]bin[\\/]opencode\.exe)(?:"|\s|$)/i);
  const resolved = match?.[1]
    ? path.resolve(path.dirname(candidate), match[1].replace(/^%~dp0[\\/]?/i, ""))
    : path.join(path.dirname(candidate), "node_modules", "opencode-ai", "bin", "opencode.exe");
  try {
    await fs.access(resolved);
    return resolved;
  } catch {
    return null;
  }
}

async function resolveOpenCodeBinary({ candidates, versionOf = defaultVersionOf } = {}) {
  const rejected = [];
  for (const raw of candidates || []) {
    const candidate = path.resolve(String(raw || "").trim());
    if (!candidate) continue;
    if (isMiseShim(candidate)) {
      rejected.push({ path: candidate, reason: "mise-shim" });
      continue;
    }
    let executable = candidate;
    if ([".cmd", ".bat"].includes(path.extname(candidate).toLowerCase())) {
      executable = await executableFromLauncher(candidate);
      if (!executable) {
        rejected.push({ path: candidate, reason: "launcher-target-missing" });
        continue;
      }
    }
    if (!isRealOpenCodeExecutable(executable)) {
      rejected.push({ path: candidate, reason: "untrusted-layout" });
      continue;
    }
    try {
      await fs.access(executable);
    } catch {
      rejected.push({ path: executable, reason: "missing" });
      continue;
    }
    const version = await versionOf(executable);
    if (version !== LOCKED_OPENCODE_VERSION) {
      throw runtimeError("OPENCODE_VERSION_MISMATCH", `OpenCode 版本不兼容：需要 ${LOCKED_OPENCODE_VERSION}，实际 ${version}`, { executable, version });
    }
    return { executable, version, rejected };
  }
  throw runtimeError("OPENCODE_SETUP_REQUIRED", "未找到可信的 OpenCode 实际二进制；拒绝启动 mise shim", { rejected });
}

async function whereOpenCode({ exec = execFileAsync } = {}) {
  const command = process.platform === "win32" ? "where.exe" : "which";
  const { stdout } = await exec(command, ["opencode"], { windowsHide: true, timeout: 10_000 });
  return String(stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function discoverOpenCodeCandidates({
  exec = execFileAsync,
  localAppData = process.env.LOCALAPPDATA,
  nodeExecutable = process.execPath,
  installationFile = path.join(PATHS.localDataRoot, "opencode", "installation.json"),
} = {}) {
  const found = [];
  try {
    const saved = JSON.parse(await fs.readFile(installationFile, "utf8"));
    if (typeof saved.executable === "string") found.push(saved.executable);
  } catch {}
  try { found.push(...await whereOpenCode({ exec })); } catch {}
  if (nodeExecutable) {
    found.push(path.join(path.dirname(nodeExecutable), "node_modules", "opencode-ai", "bin", "opencode.exe"));
    found.push(path.join(path.dirname(nodeExecutable), "opencode.cmd"));
  }
  if (localAppData) {
    const installs = path.join(localAppData, "mise", "installs", "node");
    let versions = [];
    try { versions = await fs.readdir(installs, { withFileTypes: true }); } catch {}
    for (const version of versions.filter((entry) => entry.isDirectory()).sort((a, b) => b.name.localeCompare(a.name, "en"))) {
      found.push(path.join(installs, version.name, "node_modules", "opencode-ai", "bin", "opencode.exe"));
      found.push(path.join(installs, version.name, "opencode.cmd"));
    }
  }
  return [...new Set(found.map((item) => path.resolve(item)))];
}

function probePort(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(300);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

async function defaultKillTree(pid) {
  if (process.platform === "win32") {
    await execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }).catch((error) => {
      if (!/not found|没有找到|not running/i.test(String(error.stderr || error.message))) throw error;
    });
    return;
  }
  process.kill(-pid, "SIGTERM");
}

function secureConfig(repoRoot, { bridgeOrigin, bridgeToken } = {}) {
  const mcp = bridgeOrigin && bridgeToken ? {
    syno: {
      type: "remote",
      url: bridgeOrigin,
      enabled: true,
      headers: { Authorization: `Bearer ${bridgeToken}` },
    },
  } : {};
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    autoupdate: false,
    share: "disabled",
    snapshot: false,
    default_agent: "syno",
    enabled_providers: ["opencode"],
    provider: {
      opencode: {
        options: {
          apiKey: "{env:SYNO_OPENCODE_API_KEY}",
        },
      },
    },
    plugin: [],
    lsp: false,
    formatter: false,
    watcher: { ignore: ["**"] },
    permission: {
      "*": "deny",
      "syno_*": "allow",
      skill: { "*": "deny", "syno-*": "allow" },
    },
    tools: {
      bash: false, edit: false, write: false, read: false, grep: false, glob: false,
      list: false, task: false, question: false, webfetch: false, websearch: false,
      todowrite: false, todoread: false, codesearch: false, batch: false, multiedit: false,
      skill: true,
    },
    mcp,
  });
}

function minimalChildEnvironment(source = process.env) {
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

class OpenCodeSupervisor {
  constructor({
    localRoot = path.join(PATHS.localDataRoot, "opencode"),
    repoRoot = PATHS.repoRoot,
    executable,
    versionOf = defaultVersionOf,
    spawnImpl = spawn,
    fetchImpl = globalThis.fetch,
    portProbe = () => probePort("127.0.0.1", DEFAULT_OPENCODE_PORT),
    killTree = defaultKillTree,
    randomSecret = () => randomBytes(32).toString("base64url"),
    tokenLoader,
    bridgeOrigin,
    bridgeToken,
    journal = new RuntimeJournal(),
    healthAttempts = 30,
    healthDelayMs = 250,
  } = {}) {
    this.localRoot = localRoot;
    this.repoRoot = repoRoot;
    this.executable = executable;
    this.versionOf = versionOf;
    this.spawnImpl = spawnImpl;
    this.fetchImpl = fetchImpl;
    this.portProbe = portProbe;
    this.killTree = killTree;
    this.randomSecret = randomSecret;
    this.tokenLoader = tokenLoader;
    this.bridgeOrigin = bridgeOrigin;
    this.bridgeToken = bridgeToken;
    this.journal = journal;
    this.healthAttempts = healthAttempts;
    this.healthDelayMs = healthDelayMs;
    this.port = DEFAULT_OPENCODE_PORT;
    this.child = null;
    this.password = "";
    this.installation = null;
    this.lastError = null;
    this.stopping = false;
    this.expectedExitPids = new Set();
  }

  #record(event, data = {}, options) {
    return this.journal.record(event, data, options).catch(() => null);
  }

  async configure() {
    await this.#record("opencode.configure.requested");
    try {
      const candidates = this.executable ? [this.executable] : await discoverOpenCodeCandidates();
      this.installation = await resolveOpenCodeBinary({ candidates, versionOf: this.versionOf });
      await fs.mkdir(this.localRoot, { recursive: true });
      await fs.writeFile(path.join(this.localRoot, "installation.json"), JSON.stringify({
        executable: this.installation.executable,
        version: this.installation.version,
        configuredAt: new Date().toISOString(),
      }, null, 2), { encoding: "utf8", mode: 0o600 });
      await this.#record("opencode.configure.completed", { version: this.installation.version });
      return this.status();
    } catch (error) {
      await this.#record("opencode.configure.failed", { error }, { level: "error" });
      throw error;
    }
  }

  status() {
    const running = Boolean(this.child && this.child.exitCode === null);
    return {
      state: running ? "running" : this.installation ? "stopped" : "setup_required",
      ready: running && !this.lastError,
      pid: running ? this.child.pid : null,
      port: this.port,
      version: this.installation?.version || null,
      executable: this.installation?.executable || null,
      lastError: this.lastError ? { code: this.lastError.code || "OPENCODE_RUNTIME_FAILED", message: this.lastError.message } : null,
    };
  }

  connection() {
    if (!this.password || !this.child || this.child.exitCode !== null) {
      throw runtimeError("OPENCODE_NOT_RUNNING", "OpenCode 尚未运行");
    }
    return { origin: `http://127.0.0.1:${this.port}`, username: "opencode", password: this.password };
  }

  async health() {
    if (!this.password) return { ...this.status(), healthy: false };
    try {
      const response = await this.fetchImpl(`http://127.0.0.1:${this.port}/global/health`, {
        headers: { Authorization: `Basic ${Buffer.from(`opencode:${this.password}`).toString("base64")}` },
        signal: AbortSignal.timeout(2_000),
      });
      if (!response.ok) throw runtimeError("OPENCODE_HEALTH_FAILED", `OpenCode 健康检查返回 ${response.status}`);
      const report = await response.json();
      if (report.version && report.version !== LOCKED_OPENCODE_VERSION) {
        throw runtimeError("OPENCODE_VERSION_DRIFT", `OpenCode 运行版本漂移：${report.version}`);
      }
      return { ...this.status(), healthy: report.healthy === true, remote: { healthy: report.healthy === true, version: report.version || null } };
    } catch (error) {
      return { ...this.status(), healthy: false, error: { code: error.code || "OPENCODE_HEALTH_FAILED", message: error.message } };
    }
  }

  async start() {
    if (this.child && this.child.exitCode === null) return this.status();
    await this.#record("opencode.start.requested", { port: this.port });
    if (await this.portProbe()) {
      const error = runtimeError("OPENCODE_PORT_OCCUPIED", `端口 ${this.port} 已被未知进程占用`);
      await this.#record("opencode.start.failed", { error }, { level: "error" });
      throw error;
    }
    if (!this.installation) await this.configure();
    this.password = this.randomSecret();
    const token = this.tokenLoader ? await this.tokenLoader() : "";
    const profileRoot = path.join(this.localRoot, "profile");
    const isolatedWorkspace = path.join(profileRoot, "workspace");
    const env = {
      ...minimalChildEnvironment(process.env),
      OPENCODE_DISABLE_AUTOUPDATE: "true",
      OPENCODE_SERVER_USERNAME: "opencode",
      OPENCODE_SERVER_PASSWORD: this.password,
      OPENCODE_CONFIG_DIR: path.join(this.repoRoot, ".opencode"),
      OPENCODE_CONFIG_CONTENT: secureConfig(this.repoRoot, { bridgeOrigin: this.bridgeOrigin, bridgeToken: this.bridgeToken }),
      XDG_DATA_HOME: path.join(profileRoot, "data"),
      XDG_CONFIG_HOME: path.join(profileRoot, "config"),
      XDG_CACHE_HOME: path.join(profileRoot, "cache"),
      ...(token ? { SYNO_OPENCODE_API_KEY: token } : {}),
    };
    await Promise.all([env.XDG_DATA_HOME, env.XDG_CONFIG_HOME, env.XDG_CACHE_HOME, isolatedWorkspace].map((directory) => fs.mkdir(directory, { recursive: true })));
    const args = ["serve", "--pure", "--hostname", "127.0.0.1", "--port", String(this.port), "--log-level", "ERROR"];
    try {
      this.child = this.spawnImpl(this.installation.executable, args, {
        cwd: isolatedWorkspace,
        env,
        windowsHide: true,
        detached: process.platform !== "win32",
        // OpenCode/provider output may contain prompts or secrets. Persist only
        // structured lifecycle metadata emitted by the Supervisor itself.
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch (error) {
      this.lastError = error;
      await this.#record("opencode.spawn.failed", { error }, { level: "error" });
      throw error;
    }
    this.lastError = null;
    const childPid = this.child.pid;
    this.child.once("error", (error) => {
      this.lastError = error;
      void this.#record("opencode.child.error", { pid: childPid, error }, { level: "error" });
    });
    this.child.once("exit", (code, signal) => {
      const expected = this.stopping || this.expectedExitPids.delete(childPid);
      if (!expected && code !== 0) this.lastError ||= runtimeError("OPENCODE_EXITED", `OpenCode 已退出（code=${code}, signal=${signal || "none"}）`);
      void this.#record("opencode.child.exit", { pid: childPid, code, signal, expected }, { level: expected || code === 0 ? "info" : "error" });
    });
    await this.#record("opencode.child.spawned", { pid: childPid, port: this.port, version: this.installation.version });
    for (let attempt = 0; attempt < this.healthAttempts; attempt += 1) {
      const report = await this.health();
      if (report.healthy) {
        await this.#record("opencode.start.completed", { pid: this.child.pid, port: this.port, attempt: attempt + 1 });
        return this.status();
      }
      if (this.child.exitCode !== null) break;
      if (this.healthDelayMs) await new Promise((resolve) => setTimeout(resolve, this.healthDelayMs));
    }
    const failure = this.lastError || runtimeError("OPENCODE_START_TIMEOUT", "OpenCode 启动后未通过健康检查");
    await this.#record("opencode.start.failed", { pid: this.child?.pid, error: failure }, { level: "error" });
    await this.stop().catch(() => {});
    throw failure;
  }

  async stop() {
    const owned = this.child;
    if (owned?.pid && owned.exitCode === null) this.expectedExitPids.add(owned.pid);
    await this.#record("opencode.stop.requested", { pid: owned?.pid || null });
    this.child = null;
    this.password = "";
    this.stopping = true;
    try {
      if (owned?.pid && owned.exitCode === null) await this.killTree(owned.pid);
    } finally {
      this.stopping = false;
    }
    await this.#record("opencode.stop.completed", { pid: owned?.pid || null });
    return { ...this.status(), state: "stopped", ready: false, pid: null };
  }

  async restart() {
    await this.stop();
    return this.start();
  }
}

export {
  DEFAULT_OPENCODE_PORT,
  discoverOpenCodeCandidates,
  LOCKED_OPENCODE_VERSION,
  OpenCodeSupervisor,
  isMiseShim,
  resolveOpenCodeBinary,
  secureConfig,
  minimalChildEnvironment,
  whereOpenCode,
};
