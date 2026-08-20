import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";

function runtimeError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectParams(params) {
  return isRecord(params) ? params : {};
}

function finalResponse(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type !== "assistant/message") continue;
    const content = event?.data?.message?.content;
    if (!Array.isArray(content)) continue;
    return content.filter((block) => block?.type === "text").map((block) => String(block.text || "")).join("");
  }
  return "";
}

function isInboxReceipt(event, messageId) {
  if (!isRecord(event) || event.type !== "agent/inbox/spliced" || !isRecord(event.data)) return false;
  const inserted = event.data.inserted;
  return Array.isArray(inserted) && inserted.some((message) => isRecord(message) && message.id === messageId);
}

class DeepSeekHarnessJsonRpcClient {
  constructor({
    stdin,
    stdout,
    stderr,
    pid = null,
    kill,
    requestTimeoutMs = 180_000,
    initializeTimeoutMs = 30_000,
    turnTimeoutMs,
    stderrTailLimit = 400,
  } = {}) {
    if (!stdin || !stdout) throw new Error("DeepSeekHarnessJsonRpcClient 缺少 stdio");
    this.stdin = stdin;
    this.stdout = stdout;
    this.stderr = stderr;
    this.pid = pid;
    this.kill = typeof kill === "function" ? kill : () => {};
    this.requestTimeoutMs = requestTimeoutMs;
    this.initializeTimeoutMs = initializeTimeoutMs;
    this.turnTimeoutMs = turnTimeoutMs ?? requestTimeoutMs;
    this.stderrTailLimit = stderrTailLimit;
    this.pending = new Map();
    this.openTurns = new Set();
    this.listeners = new Set();
    this.stderrTail = [];
    this.decoder = new StringDecoder("utf8");
    this.buffer = "";
    this.closed = false;
    this.initialized = false;
    this.route = null;
    this.onData = (chunk) => {
      this.buffer += typeof chunk === "string" ? chunk : this.decoder.write(chunk);
      this.#drain();
    };
    this.onEnd = () => {
      this.buffer += this.decoder.end();
      this.#drain();
      this.#failTransport(runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness JSON-RPC 输入已关闭", { retryable: true }));
    };
    this.onError = (error) => {
      this.#failTransport(runtimeError("HARNESS_TRANSPORT_ERROR", error.message || "DeepSeek Harness stdio 错误", { retryable: true }));
    };
    this.stdout.on("data", this.onData);
    this.stdout.on("end", this.onEnd);
    this.stdout.on("error", this.onError);
    this.stdin.on("error", () => {});
    if (this.stderr) {
      this.stderr.setEncoding?.("utf8");
      this.stderr.on("data", (chunk) => {
        for (const line of String(chunk).split(/\r?\n/)) {
          if (!line) continue;
          this.stderrTail.push(line.slice(0, 2_000));
          if (this.stderrTail.length > this.stderrTailLimit) this.stderrTail.shift();
        }
      });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async initialize({ cwd, provider, model, maxTokens } = {}) {
    const result = await this.request("initialize", {
      cwd,
      provider,
      model,
      ...(maxTokens === undefined ? {} : { maxTokens }),
    }, this.initializeTimeoutMs);
    if (!isRecord(result) || !isRecord(result.serverInfo) || result.serverInfo.name !== "deepseek-harness-sdk-runtime") {
      throw runtimeError("HARNESS_PROTOCOL_INVALID", `initialize 返回了无效身份：${JSON.stringify(result)}`, { retryable: true });
    }
    this.initialized = true;
    this.route = { cwd, provider, model };
    return result;
  }

  async prompt(sessionId, contentBlocks) {
    const result = await this.request("session/prompt", { sessionId, contentBlocks });
    if (!isRecord(result) || typeof result.messageId !== "string") {
      throw runtimeError("HARNESS_PROTOCOL_INVALID", `session/prompt 未返回 messageId：${JSON.stringify(result)}`, { retryable: true });
    }
    return result.messageId;
  }

  async runTurn(sessionId, contentBlocks, { signal, onNotification } = {}) {
    const events = [];
    const notifications = [];
    let received = false;
    let messageId = "";
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const result = () => ({ sessionId, finalResponse: finalResponse(events), events, notifications });
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        this.openTurns.delete(turn);
        if (timer) clearTimeout(timer);
        unsubscribe();
        if (signal) signal.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else resolve(value);
      };
      const onAbort = () => {
        finish(signal?.reason || runtimeError("HARNESS_CANCELED", "DeepSeek Harness turn 已取消"));
      };
      const considerIdle = (notification) => notification.method === "session.status"
        && notification.params.sessionId === sessionId
        && notification.params.status === "idle";
      // dsh-jsonrpc-agent 把 agent 生命周期写成 session.status，不把 assistant/message
      // 归属于某次 prompt。成功 settle 必须 inbox receipt + idle；中途 assistant 帧可能只是工具循环的一段。
      const maybeSettle = () => {
        if (!received || !messageId) return;
        if (notifications.some(considerIdle)) finish(null, result());
      };
      const turn = {
        onTransport(error) {
          finish(error);
        },
      };
      const unsubscribe = this.subscribe((notification) => {
        const params = notification.params || {};
        if (params.sessionId !== sessionId) return;
        notifications.push(notification);
        onNotification?.(notification);
        if (notification.method === "session.event") {
          events.push(params.event);
          if (messageId && isInboxReceipt(params.event, messageId)) received = true;
        }
        maybeSettle();
      });
      this.openTurns.add(turn);
      if (this.closed) {
        finish(runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness JSON-RPC 客户端已关闭", { retryable: true }));
        return;
      }
      timer = setTimeout(() => {
        finish(runtimeError("HARNESS_TURN_TIMEOUT", "DeepSeek Harness turn 等待 session.status=idle 超时", { retryable: true }));
      }, this.turnTimeoutMs);
      timer.unref?.();
      if (signal?.aborted) {
        onAbort();
        return;
      }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      this.prompt(sessionId, contentBlocks).then((id) => {
        messageId = id;
        received = events.some((event) => isInboxReceipt(event, id));
        maybeSettle();
      }).catch((error) => finish(error));
    });
  }

  async request(method, params = {}, timeoutMs = this.requestTimeoutMs) {
    if (this.closed) throw runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness JSON-RPC 客户端已关闭", { retryable: true });
    const id = `req_${randomUUID().replaceAll("-", "")}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(runtimeError("HARNESS_REQUEST_TIMEOUT", `${method} 等待 DeepSeek Harness 超时`, { retryable: true }));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this.#write({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async shutdown() {
    try {
      await this.request("shutdown", {}, 1_000);
    } catch {
      // shutdown is best-effort; the supervisor still walks the dispose ladder.
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.stdout.off("data", this.onData);
    this.stdout.off("end", this.onEnd);
    this.stdout.off("error", this.onError);
    this.#failTransport(runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness JSON-RPC 客户端已关闭", { retryable: true }));
    try {
      this.stdin.end();
    } catch {}
  }

  #write(message) {
    this.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #drain() {
    for (;;) {
      const newline = this.buffer.indexOf("\n");
      if (newline < 0) break;
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      this.#receive(line);
    }
  }

  #receive(line) {
    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      this.stderrTail.push(`invalid-json:${line.slice(0, 200)}`);
      if (this.stderrTail.length > this.stderrTailLimit) this.stderrTail.shift();
      return;
    }
    if (!isRecord(frame)) return;
    const id = frame.id;
    const method = frame.method;
    if ((typeof id === "string" || typeof id === "number") && typeof method === "string") {
      return;
    }
    if (typeof id === "string" || typeof id === "number") {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      if (isRecord(frame.error)) {
        pending.reject(runtimeError(
          "HARNESS_RPC_ERROR",
          String(frame.error.message || `${pending.method} 失败`),
          { retryable: true },
        ));
        return;
      }
      pending.resolve(frame.result);
      return;
    }
    if (typeof method === "string") {
      const notification = { method, params: objectParams(frame.params) };
      for (const listener of this.listeners) listener(notification);
    }
  }

  #failPending(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  #failTurns(error) {
    const turns = [...this.openTurns];
    this.openTurns.clear();
    for (const turn of turns) turn.onTransport(error);
  }

  #failTransport(error) {
    this.#failPending(error);
    this.#failTurns(error);
  }
}

export { DeepSeekHarnessJsonRpcClient, finalResponse, isInboxReceipt };
