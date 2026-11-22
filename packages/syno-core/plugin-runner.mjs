import { spawn } from "node:child_process";

import { readActivePlugin } from "./plugin-version.mjs";

function runError(code, message) {
  return Object.assign(new Error(message), { code });
}

/**
 * Invoke one plugin entry with one JSON request over stdin/stdout.
 * The plugin is a child process: a crash or timeout cannot take down the Host.
 */
export async function runPluginEntry({
  entryPath,
  cwd,
  request,
  timeoutMs = 600_000,
  env = process.env,
  spawnImpl = spawn,
} = {}) {
  if (!entryPath) throw runError("P5_PLUGIN_ENTRY_MISSING", "缺少插件 entry");
  const child = spawnImpl(process.execPath, [entryPath], {
    cwd,
    env: { ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-8_000); });
  const timer = setTimeout(() => {
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 2_000).unref?.();
  }, timeoutMs);
  timer.unref?.();
  try {
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode) => resolve(exitCode));
      child.stdin.end(`${JSON.stringify(request)}\n`);
    });
    let response;
    try {
      response = JSON.parse(stdout.trim());
    } catch {
      throw runError("P5_PLUGIN_PROTOCOL_INVALID", `插件未返回 JSON（exit=${code}）：${stderr.slice(-500)}`);
    }
    if (response.contract !== "syno.p5-radar/1") throw runError("P5_PLUGIN_PROTOCOL_INVALID", "插件响应 contract 不匹配");
    if (code !== 0 || response.ok !== true) {
      const error = response.error || {};
      return {
        ok: false,
        code: error.code || "P5_PLUGIN_FAILED",
        message: error.message || stderr.slice(-500) || `插件退出 ${code}`,
        response,
      };
    }
    return { ok: true, response, data: response.data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Invoke the active P5 plugin through the active registry.
 */
export async function runActivePlugin({
  registryFile,
  request,
  timeoutMs = 600_000,
  env = process.env,
  spawnImpl = spawn,
} = {}) {
  const active = await readActivePlugin({ registryFile });
  if (!active) return { ok: false, code: "P5_PLUGIN_NOT_ACTIVE", message: "没有激活的 P5 插件版本" };
  const result = await runPluginEntry({
    entryPath: active.entryPath,
    cwd: active.path,
    request,
    timeoutMs,
    env,
    spawnImpl,
  });
  return { ...result, active };
}
