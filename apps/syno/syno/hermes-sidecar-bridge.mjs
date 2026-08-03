import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import readline from "node:readline";

import { redactString } from "./runtime-journal.mjs";

function runtimeError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function publicTool(tool) {
  return {
    name: String(tool.name),
    description: String(tool.description || ""),
    inputSchema: tool.inputSchema || { type: "object", properties: {}, additionalProperties: false },
    risk: String(tool.risk || "read"),
    version: String(tool.version || "1"),
  };
}

const SIDECAR_ENV_KEYS = new Set([
  "HERMES_EXPECTED_COMMIT", "HERMES_HOME", "HERMES_SOURCE_ROOT", "HERMES_YOLO_MODE",
  "PYTHONDONTWRITEBYTECODE", "PYTHONPATH",
]);

function processBootstrapEnv(extra) {
  for (const key of Object.keys(extra)) {
    if (!SIDECAR_ENV_KEYS.has(key)) throw new Error(`Hermes sidecar 环境变量不在白名单：${key}`);
  }
  const inherited = {};
  for (const key of ["PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "TEMP", "TMP"]) {
    if (process.env[key] !== undefined) inherited[key] = process.env[key];
  }
  return { ...inherited, ...extra };
}

class HermesSidecarBridge {
  constructor({ command, args = [], cwd, env = {}, tools = [], getProvider, startupTimeoutMs = 10_000, requestTimeoutMs = 120_000 } = {}) {
    if (!command || typeof getProvider !== "function") throw new Error("HermesSidecarBridge 缺少命令或 Provider 解析器");
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.env = processBootstrapEnv(env);
    this.tools = tools.map(publicTool);
    this.allowedToolNames = new Set(this.tools.map((tool) => tool.name));
    this.getProvider = getProvider;
    this.startupTimeoutMs = startupTimeoutMs;
    this.requestTimeoutMs = requestTimeoutMs;
    this.child = null;
    this.pending = new Map();
    this.runs = new Map();
    this.stderrTail = [];
    this.secrets = new Set();
    this.closing = false;
  }

  async capabilities() {
    return this.#request("capabilities", { tools: this.tools }, this.startupTimeoutMs);
  }

  async health() {
    try {
      const result = await this.#request("health", {}, this.startupTimeoutMs);
      return { ...result, stderrLines: this.stderrTail.length };
    } catch (error) {
      return { ready: false, code: error.code || "HERMES_UNAVAILABLE", stderrLines: this.stderrTail.length };
    }
  }

  async run(payload, callbacks = {}) {
    const provider = await this.getProvider();
    if (!provider?.baseUrl || !provider?.apiKey || !provider?.modelId) {
      throw runtimeError("PROVIDER_NOT_CONFIGURED", "Hermes Provider 尚未完整配置", { retryable: true });
    }
    if (provider.modelId !== payload.modelId) throw runtimeError("RUNTIME_MODEL_CHANGED", "Hermes Provider Model ID 与固定运行时不一致");
    this.secrets.add(provider.apiKey);
    this.runs.set(payload.runId, callbacks);
    try {
      return await this.#request("run", {
        ...payload,
        tools: (payload.tools || []).map(publicTool),
        provider: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          modelId: provider.modelId,
          contextLength: provider.contextLength,
        },
      }, this.requestTimeoutMs, { runId: payload.runId });
    } finally {
      this.runs.delete(payload.runId);
    }
  }

  cancel(runId) {
    if (!this.runs.has(runId)) return false;
    // 外科手术式取消：只拒绝该 run 自己的挂起请求，不动共享子进程，也不波及其它 run / health 握手（R4）。
    // 被取消的 run 在子进程侧仍会跑完，但其回包因 pending 已删而被忽略；若子进程真正卡死，下一次 run 的超时仍会触发整体回收。
    this.#rejectRun(runId, runtimeError("AGENT_CANCELED", "Hermes run canceled"));
    this.runs.delete(runId);
    return true;
  }

  async close() {
    this.closing = true;
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    if (!child.killed && child.exitCode === null && !child.stdin.destroyed) this.#writeTo(child, { type: "shutdown" });
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill(); resolve(); }, 1_000);
      timer.unref?.();
      child.once("close", () => { clearTimeout(timer); resolve(); });
    });
  }

  async #ensureProcess() {
    if (this.child && !this.child.killed && this.child.exitCode === null) return this.child;
    this.closing = false;
    const child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;
    child.stdin.on("error", () => {});
    readline.createInterface({ input: child.stdout }).on("line", (line) => this.#receive(line));
    readline.createInterface({ input: child.stderr }).on("line", (line) => {
      // 复用 runtime-journal 的综合 redactString（Bearer/sk-/JWT/PEM/query/token= 等），再叠加实际 apiKey（O6）。
      let sanitized = redactString(String(line));
      for (const secret of this.secrets) sanitized = sanitized.replaceAll(secret, "[REDACTED]");
      sanitized = sanitized.slice(0, 2_000);
      this.stderrTail.push(sanitized);
      if (this.stderrTail.length > 50) this.stderrTail.shift();
    });
    child.on("error", (error) => this.#failProcess(runtimeError("HERMES_PROCESS_ERROR", `Hermes sidecar 无法启动：${error.code || "spawn"}`, { retryable: true })));
    child.on("close", (code) => {
      const wasCurrent = this.child === child;
      if (wasCurrent) this.child = null;
      if (!this.closing && wasCurrent) this.#failProcess(runtimeError("HERMES_PROCESS_EXITED", `Hermes sidecar 异常退出（${code ?? "unknown"}）`, { retryable: true }));
    });
    return child;
  }

  async #request(type, payload, timeoutMs, { runId = null } = {}) {
    await this.#ensureProcess();
    const requestId = `bridge-${randomUUID()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = runtimeError("HERMES_REQUEST_TIMEOUT", `Hermes ${type} 请求超时`, { retryable: true });
        this.#terminate(error);
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(requestId, { resolve, reject, timer, runId });
      try {
        this.#write({ type, requestId, ...payload });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }

  // 只拒绝某个 run 的挂起请求（用于外科手术式 cancel），不影响其它 pending 或子进程。
  #rejectRun(runId, error) {
    for (const [requestId, pending] of this.pending) {
      if (pending.runId !== runId) continue;
      clearTimeout(pending.timer);
      this.pending.delete(requestId);
      pending.reject(error);
    }
  }

  #receive(line) {
    // 子进程已关闭/替换时，丢弃其迟到输出——外科手术式 cancel 不再杀子进程，
    // close() 置空 this.child 后仍可能有缓冲行到达，处理它们会触发对空 child 的写（R4）。
    if (!this.child) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.#terminate(runtimeError("HERMES_PROTOCOL_INVALID_JSON", "Hermes sidecar 返回了无效 JSON", { retryable: true }));
      return;
    }
    if (message.type === "tool_call") {
      if (!this.allowedToolNames.has(String(message.name))) {
        const error = runtimeError("HERMES_TOOL_NOT_ALLOWED", `Hermes 请求了未授权工具：${String(message.name).slice(0, 100)}`);
        this.#writeSafe({ type: "tool_result", callId: message.callId, ok: false, error: { code: error.code, message: error.message } });
        this.#terminate(error);
        return;
      }
      const callbacks = this.runs.get(message.runId);
      if (!callbacks?.onToolCall) {
        this.#writeSafe({ type: "tool_result", callId: message.callId, ok: false, error: { code: "TOOL_PROXY_UNAVAILABLE", message: "工具代理不可用" } });
        return;
      }
      Promise.resolve(callbacks.onToolCall({ name: message.name, arguments: message.arguments || {} }))
        .then((result) => this.#writeSafe({ type: "tool_result", callId: message.callId, ok: true, result }))
        .catch((error) => this.#writeSafe({ type: "tool_result", callId: message.callId, ok: false, error: { code: error.code || "TOOL_PROXY_FAILED", message: String(error.message || "工具调用失败").slice(0, 500) } }));
      return;
    }
    if (message.type === "event") {
      this.runs.get(message.runId)?.onEvent?.(message.event || {});
      return;
    }
    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.requestId);
    if (message.ok === false) {
      pending.reject(runtimeError(message.error?.code || "HERMES_REQUEST_FAILED", message.error?.message || "Hermes 请求失败", { retryable: message.error?.retryable === true }));
    } else {
      pending.resolve(message.result);
    }
  }

  #write(message) {
    if (!this.child) throw runtimeError("HERMES_PROCESS_MISSING", "Hermes sidecar 未运行", { retryable: true });
    this.#writeTo(this.child, message);
  }

  // best-effort 写：用于回传给子进程的 tool_result。子进程已退出/替换时静默丢弃，不抛错（R4）。
  #writeSafe(message) {
    if (!this.child) return;
    this.#writeTo(this.child, message);
  }

  #writeTo(child, message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #failProcess(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.runs.clear();
  }

  #terminate(error) {
    const child = this.child;
    this.child = null;
    this.#failProcess(error);
    if (child && !child.killed && child.exitCode === null) child.kill();
  }
}

export { HermesSidecarBridge, processBootstrapEnv, publicTool };
