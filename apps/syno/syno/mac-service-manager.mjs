import { execFile } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { DEFAULT_WEB_PORT, PATHS } from "../../../packages/syno-core/paths.mjs";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LABEL = "com.syno.butler.host";
const AGENT_PATH_ENV = "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin";

function xmlEscape(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 登录自启的 LaunchAgent：RunAtLoad + KeepAlive(SuccessfulExit=false) 等价于 Windows 计划任务的
// 「登录触发 + 失败重拉」；监督循环自身负责 60 秒退避与崩溃告警（scripts/syno-launchd.mjs）。
function buildLaunchAgentPlist({ label = LABEL, nodePath, launcherPath, repoRoot, logRoot }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodePath)}</string>
    <string>${xmlEscape(launcherPath)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(repoRoot)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${xmlEscape(path.join(logRoot, "launchd-agent.out.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(path.join(logRoot, "launchd-agent.err.log"))}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xmlEscape(AGENT_PATH_ENV)}</string>
  </dict>
</dict>
</plist>
`;
}

class MacServiceManager {
  constructor({
    platform = process.platform,
    repoRoot = PROJECT_ROOT,
    nodePath = process.execPath,
    home = os.homedir(),
    uid = typeof process.getuid === "function" ? process.getuid() : 501,
    localDataRoot = PATHS.localDataRoot,
    run,
    healthProbe,
    fsImpl = fs,
  } = {}) {
    this.platform = platform;
    this.repoRoot = path.resolve(repoRoot);
    this.nodePath = path.resolve(nodePath);
    this.uid = uid;
    this.label = LABEL;
    this.launchAgentsDir = path.join(home, "Library", "LaunchAgents");
    this.plistPath = path.join(this.launchAgentsDir, `${this.label}.plist`);
    this.launcherPath = path.join(this.repoRoot, "scripts", "syno-launchd.mjs");
    this.logRoot = path.join(path.resolve(localDataRoot), "logs");
    this.webUrl = `http://127.0.0.1:${DEFAULT_WEB_PORT}/`;
    this.run = run || (async (args) => execFileAsync("launchctl", args, { timeout: 45_000 }));
    this.fs = fsImpl;
    this.healthProbe = healthProbe || (async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${DEFAULT_WEB_PORT}/api/syno/health`, { signal: AbortSignal.timeout(2_000) });
        if (!response.ok) return false;
        const health = await response.json();
        return health?.ok === true && health?.product === "syno-personal-butler";
      } catch {
        return false;
      }
    });
  }

  #unsupported() {
    return { supported: false, installed: false, running: false, startup: "unsupported", webUrl: this.webUrl, label: this.label, loaded: false, jobState: null, pid: null, lastExitCode: null, healthOk: false };
  }

  async #print() {
    try {
      const { stdout = "" } = await this.run(["print", `gui/${this.uid}/${this.label}`]);
      return { loaded: true, output: String(stdout) };
    } catch {
      return { loaded: false, output: "" };
    }
  }

  async status() {
    if (this.platform !== "darwin") return this.#unsupported();
    let installed = false;
    try { await this.fs.access(this.plistPath); installed = true; } catch { installed = false; }
    const printed = await this.#print();
    const stateMatch = /^\s*state = (.+)$/m.exec(printed.output);
    const pidMatch = /^\s*pid = (\d+)$/m.exec(printed.output);
    const exitMatch = /^\s*last exit code = (-?\d+)$/m.exec(printed.output);
    const jobState = stateMatch ? stateMatch[1].trim() : null;
    const healthOk = printed.loaded ? await this.healthProbe() : false;
    return {
      supported: true,
      installed,
      running: Boolean(printed.loaded && jobState === "running" && healthOk),
      startup: "at_login",
      webUrl: this.webUrl,
      label: this.label,
      loaded: printed.loaded,
      jobState,
      pid: pidMatch ? Number(pidMatch[1]) : null,
      lastExitCode: exitMatch ? Number(exitMatch[1]) : null,
      healthOk,
    };
  }

  async install() {
    if (this.platform !== "darwin") return this.#unsupported();
    if (!existsSync(this.nodePath)) throw new Error(`Node executable not found: ${this.nodePath}`);
    if (!existsSync(this.launcherPath)) throw new Error(`Syno launcher not found: ${this.launcherPath}`);
    await this.fs.mkdir(this.launchAgentsDir, { recursive: true });
    await this.fs.mkdir(this.logRoot, { recursive: true });
    const plist = buildLaunchAgentPlist({
      label: this.label,
      nodePath: this.nodePath,
      launcherPath: this.launcherPath,
      repoRoot: this.repoRoot,
      logRoot: this.logRoot,
    });
    const temporary = `${this.plistPath}.${process.pid}.tmp`;
    await this.fs.writeFile(temporary, plist, { encoding: "utf8", mode: 0o644 });
    await this.fs.rename(temporary, this.plistPath);
    // 幂等：先卸下旧实例再引导（未加载时 bootout 失败可忽略），保证重复安装不改语义。
    try { await this.run(["bootout", `gui/${this.uid}/${this.label}`]); } catch { /* 未加载 */ }
    await this.run(["bootstrap", `gui/${this.uid}`, this.plistPath]);
    return this.status();
  }

  async restart() {
    if (this.platform !== "darwin") return this.#unsupported();
    await this.run(["kickstart", "-k", `gui/${this.uid}/${this.label}`]);
    return this.status();
  }

  async uninstall() {
    if (this.platform !== "darwin") return this.#unsupported();
    try { await this.run(["bootout", `gui/${this.uid}/${this.label}`]); } catch { /* 未加载 */ }
    await this.fs.rm(this.plistPath, { force: true });
    return this.status();
  }
}

export { AGENT_PATH_ENV, LABEL, MacServiceManager, buildLaunchAgentPlist };
