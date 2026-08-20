import { spawn, execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function locateCommand(name, envName) {
  if (process.env[envName]) return process.env[envName];
  try {
    const matches = execFileSync("where.exe", [name], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const located = matches.find((item) => /\.(?:cmd|exe|bat|com)$/i.test(item)) || matches[0];
    if (located) return located;
  } catch {}
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Local") : "");
    const candidates = base ? [
      path.join(base, "mise", "shims", `${name}.cmd`),
      path.join(base, "mise", "shims", name),
    ] : [];
    const candidate = candidates.find((item) => existsSync(item));
    if (candidate) return candidate;
  }
  return name;
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/[\r\n&|<>^]/.test(text)) throw new Error("执行器参数包含不安全的 shell 字符");
  return `"${text.replaceAll('"', '""')}"`;
}

function spawnPortable(command, args, options = {}) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const commandLine = `"${[quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ")}"`;
    return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], {
      ...options,
      windowsHide: true,
      // cmd.exe must receive the conventional outer quote pair unchanged. Without
      // this flag Node quotes the /c payload again and paths containing spaces fail.
      windowsVerbatimArguments: true,
    });
  }
  return spawn(command, args, { ...options, windowsHide: true });
}

async function runProcess(command, args, { cwd, timeoutMs, signal, env = process.env, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnPortable(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let settled = false;
    let terminationError = null;
    let terminating = false;
    const terminate = (error) => {
      if (settled || terminating) return;
      terminating = true;
      terminationError = error;
      terminateProcessTree(child).catch(() => child.kill());
    };
    const timer = setTimeout(() => {
      const error = new Error(`执行超时（${timeoutMs}ms）`);
      error.failureCode = "timeout";
      terminate(error);
    }, timeoutMs);
    const abort = () => {
      const error = new Error("执行已取消");
      error.failureCode = "canceled";
      terminate(error);
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (terminationError) {
        reject(terminationError);
        return;
      }
      error.failureCode = error.code === "ENOENT" ? "unavailable" : "process_error";
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (settled) return;
      settled = true;
      if (terminationError) {
        reject(terminationError);
        return;
      }
      const output = Buffer.concat(stdout).toString("utf8");
      const errorText = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        const error = new Error(errorText.trim() || `执行器退出码 ${code}`);
        error.failureCode = /model|provider|unavailable|not found/i.test(error.message) ? "unavailable" : "process_error";
        error.stdout = output;
        reject(error);
        return;
      }
      resolve({ stdout: output, stderr: errorText, exitCode: code });
    });
  });
}

async function terminateProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform !== "win32") {
    child.kill("SIGTERM");
    return;
  }
  await new Promise((resolve) => {
    execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
}

export {
  locateCommand,
  quoteCmdArg,
  runProcess,
  spawnPortable,
  terminateProcessTree,
};
