import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

class WindowsServiceManager {
  constructor({ platform = process.platform, repoRoot = PROJECT_ROOT, nodePath = process.execPath, run } = {}) {
    this.platform = platform;
    this.repoRoot = path.resolve(repoRoot);
    this.nodePath = path.resolve(nodePath);
    this.run = run || (async (args) => execFileAsync("powershell.exe", args, { cwd: this.repoRoot, windowsHide: true, timeout: 45_000 }));
  }

  async status() {
    if (this.platform !== "win32") return this.#unsupported();
    return this.#invoke("Status");
  }

  async install() {
    if (this.platform !== "win32") return this.#unsupported();
    return this.#invoke("Install");
  }

  async uninstall() {
    if (this.platform !== "win32") return this.#unsupported();
    return this.#invoke("Uninstall");
  }

  #unsupported() {
    return { supported: false, installed: false, running: false, startup: "unsupported", webUrl: "http://127.0.0.1:4317/", legacyTaskDetected: false, lastTaskResult: null };
  }

  async #invoke(action) {
    const script = path.join(this.repoRoot, "scripts", "manage-windows-task.ps1");
    const { stdout = "" } = await this.run([
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
      "-Action", action, "-RepoRoot", this.repoRoot, "-NodePath", this.nodePath, "-OutputJson",
    ]);
    const line = String(stdout).trim().split(/\r?\n/).filter(Boolean).at(-1);
    if (!line) throw new Error("Windows 服务管理器没有返回状态");
    try { return JSON.parse(line); } catch { throw new Error("Windows 服务管理器返回了无效状态"); }
  }
}

export { WindowsServiceManager };
