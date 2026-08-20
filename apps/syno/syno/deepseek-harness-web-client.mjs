import { randomUUID } from "node:crypto";

function runtimeError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assistantText(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type !== "assistant/message") continue;
    const content = event?.data?.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content.filter((block) => block?.type === "text").map((block) => String(block.text || "")).join("");
    if (text.trim()) return text;
  }
  return "";
}

function toPromptContent(contentBlocks) {
  const blocks = Array.isArray(contentBlocks) ? contentBlocks : [];
  const content = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text") content.push({ type: "text", text: String(block.text || "") });
    if (block.type === "image" && block.mediaType && block.data) {
      content.push({
        type: "image",
        mediaType: block.mediaType,
        data: String(block.data),
        ...(block.name ? { name: String(block.name) } : {}),
      });
    }
  }
  if (!content.length) content.push({ type: "text", text: "" });
  return content;
}

function unwrapSseData(raw) {
  const parsed = JSON.parse(raw);
  if (isRecord(parsed) && parsed.type === "server-request" && isRecord(parsed.payload)) return parsed.payload;
  return parsed;
}

class DeepSeekHarnessWebClient {
  constructor({
    origin,
    cwd,
    pid = null,
    kill,
    fetchImpl = fetch,
    requestTimeoutMs = 180_000,
    initializeTimeoutMs = 30_000,
    turnTimeoutMs,
    onNotice = null,
  } = {}) {
    if (!origin) throw new Error("DeepSeekHarnessWebClient 缺少 origin");
    this.origin = String(origin).replace(/\/+$/, "");
    this.cwd = cwd || "";
    this.pid = pid;
    this.kill = typeof kill === "function" ? kill : () => {};
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.initializeTimeoutMs = initializeTimeoutMs;
    this.turnTimeoutMs = turnTimeoutMs ?? requestTimeoutMs;
    this.onNotice = typeof onNotice === "function" ? onNotice : null;
    this.initialized = false;
    this.closed = false;
    this.route = null;
    this.createdSessions = new Set();
    this.listeners = new Set();
    this.streamAbort = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async initialize({ cwd, provider, model } = {}) {
    if (cwd) this.cwd = cwd;
    this.route = { cwd: this.cwd, provider, model };
    await this.#waitReady();
    await this.#ensureStreams();
    this.initialized = true;
    return { serverInfo: { name: "deepseek-harness-web" }, origin: this.origin };
  }

  async runTurn(sessionId, contentBlocks, { signal, onNotification } = {}) {
    if (!this.initialized) throw runtimeError("HARNESS_NOT_RUNNING", "DeepSeek Harness Web 尚未 initialize");
    if (this.closed) throw runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness Web 客户端已关闭", { retryable: true });
    await this.#ensureSession(sessionId);
    const events = [];
    const notifications = [];
    let sawRunning = false;
    let idleAfterRunning = false;
    const result = () => ({ sessionId, finalResponse: assistantText(events), events, notifications });
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      let drainTimer;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (drainTimer) clearTimeout(drainTimer);
        unsubscribe();
        signal?.removeEventListener("abort", onAbort);
        if (error) reject(error);
        else resolve(value);
      };
      const onAbort = () => {
        finish(signal?.reason || runtimeError("HARNESS_CANCELED", "DeepSeek Harness turn 已取消"));
      };
      const maybeSettle = () => {
        if (!idleAfterRunning) return;
        if (assistantText(events)) {
          finish(null, result());
          return;
        }
        if (drainTimer) return;
        drainTimer = setTimeout(() => finish(null, result()), 40);
        drainTimer.unref?.();
      };
      const unsubscribe = this.subscribe((notification) => {
        notifications.push(notification);
        onNotification?.(notification);
        if (notification.method === "session.status" && notification.params.sessionId === sessionId) {
          if (notification.params.status === "running") sawRunning = true;
          if (notification.params.status === "idle" && sawRunning) idleAfterRunning = true;
        }
        if (notification.method === "session.event" && notification.params.sessionId === sessionId) {
          events.push(notification.params.event);
        }
        maybeSettle();
      });
      timer = setTimeout(() => {
        finish(runtimeError("HARNESS_TURN_TIMEOUT", "DeepSeek Harness Web turn 等待 idle 超时", { retryable: true }));
      }, this.turnTimeoutMs);
      timer.unref?.();
      if (signal?.aborted) {
        onAbort();
        return;
      }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      this.rpc("session.prompt", {
        sessionId,
        mode: "queue",
        content: toPromptContent(contentBlocks),
      }, signal).then(() => {
        maybeSettle();
      }).catch((error) => finish(error));
    });
  }

  async abortTurn(sessionId) {
    await this.rpc("session.cancel", { sessionId });
    return { accepted: true };
  }

  async shutdown() {
    try {
      await this.abortOpen?.();
    } catch {}
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.streamAbort?.abort();
    this.initialized = false;
  }

  async rpc(method, payload = {}, signal) {
    const rpcId = randomUUID();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    const onOuter = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onOuter, { once: true });
    }
    let response;
    try {
      response = await this.fetchImpl(`${this.origin}/api/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "client-request", rpcId, method, payload }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) {
        throw runtimeError("HARNESS_REQUEST_TIMEOUT", `${method} 等待 DeepSeek Harness Web 超时`, { retryable: true });
      }
      throw runtimeError("HARNESS_TRANSPORT_ERROR", error.message || "DeepSeek Harness Web 请求失败", { retryable: true });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuter);
    }
    if (!response.ok) {
      throw runtimeError("HARNESS_TRANSPORT_ERROR", `${method} HTTP ${response.status}`, { retryable: response.status >= 500 });
    }
    const body = await response.json();
    if (body?.rpcId && body.rpcId !== rpcId) {
      throw runtimeError("HARNESS_PROTOCOL_INVALID", `${method} rpcId 不匹配`, { retryable: true });
    }
    if (!body?.result?.ok) {
      const err = body?.result?.error || {};
      throw runtimeError("HARNESS_RPC_ERROR", String(err.message || `${method} 失败`), { retryable: true });
    }
    return body.result.value;
  }

  async #ensureSession(sessionId) {
    if (this.createdSessions.has(sessionId)) return;
    try {
      await this.rpc("session.create", {
        sessionId,
        ...(this.cwd ? { cwd: this.cwd } : {}),
      });
    } catch (error) {
      if (!/already|exists|conflict/i.test(error.message)) throw error;
    }
    if (this.route?.provider && this.route?.model) {
      try {
        await this.rpc("session.selectModel", {
          sessionId,
          provider: this.route.provider,
          model: this.route.model,
        });
      } catch (error) {
        this.onNotice?.({
          event: "harness.web.select_model.failed",
          data: { sessionId, provider: this.route.provider, model: this.route.model, error: { code: error.code, message: error.message } },
          options: { level: "error" },
        });
        throw runtimeError("HARNESS_MODEL_SELECT_FAILED", `无法为会话选择 ${this.route.provider}/${this.route.model}：${error.message}`, { retryable: true });
      }
    }
    this.createdSessions.add(sessionId);
  }

  async #waitReady() {
    const deadline = Date.now() + this.initializeTimeoutMs;
    let lastError;
    while (Date.now() < deadline) {
      try {
        await this.rpc("session.list", {});
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    throw lastError || runtimeError("HARNESS_NOT_RUNNING", "DeepSeek Harness Web 未就绪", { retryable: true });
  }

  async #ensureStreams() {
    if (this.streamAbort) return;
    this.streamAbort = new AbortController();
    await Promise.all([
      this.#openSse("/api/events.host", this.streamAbort.signal, (frame) => {
        if (frame?.type === "host/session-status") {
          this.#emit({
            method: "session.status",
            params: { sessionId: frame.sessionId, status: frame.running === true ? "running" : "idle" },
          });
        }
      }),
      this.#openSse("/api/events.mux", this.streamAbort.signal, (frame) => {
        if (frame?.type === "session/event") {
          this.#emit({
            method: "session.event",
            params: { sessionId: frame.sessionId, event: frame.event },
          });
        }
      }),
    ]);
  }

  #emit(notification) {
    for (const listener of this.listeners) listener(notification);
  }

  async #openSse(pathname, signal, onFrame) {
    const connectAbort = new AbortController();
    const timer = setTimeout(() => connectAbort.abort(), this.initializeTimeoutMs);
    timer.unref?.();
    const onOuter = () => connectAbort.abort();
    if (signal.aborted) connectAbort.abort();
    else signal.addEventListener("abort", onOuter, { once: true });
    let response;
    try {
      response = await this.fetchImpl(`${this.origin}${pathname}`, { signal: connectAbort.signal });
      clearTimeout(timer);
    } catch (error) {
      clearTimeout(timer);
      signal.removeEventListener("abort", onOuter);
      if (connectAbort.signal.aborted && !signal.aborted) {
        throw runtimeError("HARNESS_NOT_RUNNING", `${pathname} SSE 连接超时`, { retryable: true });
      }
      throw runtimeError("HARNESS_TRANSPORT_ERROR", error.message || `${pathname} SSE 失败`, { retryable: true });
    }
    if (!response.ok || !response.body) {
      signal.removeEventListener("abort", onOuter);
      throw runtimeError("HARNESS_TRANSPORT_ERROR", `${pathname} SSE HTTP ${response.status || "no-body"}`, { retryable: true });
    }
    void this.#pumpSse(response.body, signal, onFrame);
  }

  async #pumpSse(body, signal, onFrame) {
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = chunk.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("");
          if (!data) continue;
          try {
            onFrame(unwrapSseData(data));
          } catch {
            // One corrupt frame must not kill the stream.
          }
        }
      }
    } catch (error) {
      if (signal.aborted || this.closed) return;
      this.#emit({
        method: "session.status",
        params: { sessionId: "", status: "idle", error: error.message },
      });
    }
  }
}

export { DeepSeekHarnessWebClient, assistantText, toPromptContent };
