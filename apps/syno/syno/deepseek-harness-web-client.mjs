import { randomUUID } from "node:crypto";

function runtimeError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
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

function wsUrl(origin, pathname) {
  const url = new URL(pathname, `${String(origin).replace(/\/+$/, "")}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

class DeepSeekHarnessWebClient {
  constructor({
    origin,
    cwd,
    pid = null,
    token = null,
    kill,
    fetchImpl = fetch,
    webSocketImpl = globalThis.WebSocket,
    requestTimeoutMs = 180_000,
    initializeTimeoutMs = 30_000,
    turnTimeoutMs,
    turnSettleQuietMs = 400,
    onNotice = null,
  } = {}) {
    if (!origin) throw new Error("DeepSeekHarnessWebClient 缺少 origin");
    this.origin = String(origin).replace(/\/+$/, "");
    this.cwd = cwd || "";
    this.pid = pid;
    this.token = token || null;
    this.cookie = null;
    this.kill = typeof kill === "function" ? kill : () => {};
    this.fetchImpl = fetchImpl;
    this.webSocketImpl = webSocketImpl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.initializeTimeoutMs = initializeTimeoutMs;
    this.turnTimeoutMs = turnTimeoutMs ?? requestTimeoutMs;
    this.turnSettleQuietMs = turnSettleQuietMs;
    this.onNotice = typeof onNotice === "function" ? onNotice : null;
    this.initialized = false;
    this.closed = false;
    this.route = null;
    this.createdSessions = new Set();
    this.followedSessions = new Set();
    this.listeners = new Set();
    this.mux = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async initialize({ cwd, provider, model, agentPreset } = {}) {
    if (cwd) this.cwd = cwd;
    this.route = {
      cwd: this.cwd,
      provider,
      model,
      ...(agentPreset ? { agentPreset: String(agentPreset) } : {}),
    };
    if (this.token && !this.cookie) await this.#exchangeToken();
    await this.#waitReady();
    await this.#ensureMux();
    this.initialized = true;
    return { serverInfo: { name: "deepseek-harness-web" }, origin: this.origin };
  }

  // DSH 0.1.7 起 dsh web 强制浏览器令牌认证：启动横幅 URL 携带一次性进程令牌，
  // GET /?token=... 换回 HttpOnly 会话 cookie（303 + set-cookie）。Node 的
  // undici fetch 在 redirect:"manual" 下以 type:"basic" 暴露 set-cookie
  //（已实证），无需 node:http 兜底。
  async #exchangeToken() {
    const url = `${this.origin}/?token=${encodeURIComponent(this.token)}`;
    let response;
    try {
      response = await this.fetchImpl(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(this.initializeTimeoutMs, 5_000)),
      });
    } catch (error) {
      throw runtimeError("HARNESS_AUTH_FAILED", `dsh web 令牌换取会话 cookie 失败：${error.message || error}`, { retryable: true });
    }
    const setCookies = typeof response.headers?.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    const header = setCookies[0] ?? response.headers?.get?.("set-cookie") ?? "";
    const pair = String(header).split(";", 1)[0];
    if (!pair.includes("=")) {
      throw runtimeError("HARNESS_AUTH_FAILED", `dsh web 令牌换取会话 cookie 被拒（HTTP ${response.status}）`, { retryable: true });
    }
    this.cookie = pair;
  }

  async runTurn(sessionId, contentBlocks, { signal, onNotification } = {}) {
    if (!this.initialized) throw runtimeError("HARNESS_NOT_RUNNING", "DeepSeek Harness Web 尚未 initialize");
    if (this.closed) throw runtimeError("HARNESS_TRANSPORT_CLOSED", "DeepSeek Harness Web 客户端已关闭", { retryable: true });
    await this.#ensureSession(sessionId);
    const events = [];
    const notifications = [];
    let sawRunning = false;
    let idleAfterRunning = false;
    let promptAccepted = false;
    // 本轮 turn 号（取自 turn/start）；true = 见过 turn/start 但未带 turn 号。
    // turn/end 必须与它配对才采信——若上一轮因竞态被提前结算，其迟到的
    // turn/end 会落进本轮事件列表，只有配对能挡住这种自我污染。
    let activeTurn = null;
    let turnEnded = false;
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
      // 兜底结算（兼容面）：未发 turn/start 的对端（旧版/假面）没有权威终态
      // 事件，沿用 idle + 静默期结算，期间每个新帧重置计时，让晚到的事件帧
      // 落定后再取文本——host 状态流与 mux 事件流是两条独立连接，idle 可能
      // 先于最终 assistant/message 到达（2026-09-03 生产实证：抢先 21ms，
      // 工具轮次的 step-1 预告文本被当作最终答复投递，step-2 答案被丢弃）。
      // 正常 turn 不走这里：见过 turn/start 后只认 turn/end 或超时。
      const armQuietPeriod = () => {
        if (drainTimer) clearTimeout(drainTimer);
        drainTimer = setTimeout(() => finish(null, result()), this.turnSettleQuietMs);
        drainTimer.unref?.();
      };
      const maybeSettle = () => {
        // 主信号：本轮 turn/end 是权威终态——mux 流 seq 有序，turn/end 必排
        // 在最终 assistant/message 之后，不受双流竞速影响。
        if (turnEnded) {
          finish(null, result());
          return;
        }
        if (!idleAfterRunning) return;
        // turn 活跃中（已见 turn/start、未见 turn/end）：只认 turn/end 或超
        // 时，idle 一律不结算——它与最终答案之间没有顺序保证。
        if (activeTurn !== null) return;
        armQuietPeriod();
      };
      const unsubscribe = this.subscribe((notification) => {
        notifications.push(notification);
        onNotification?.(notification);
        if (notification.method === "session.status" && notification.params.sessionId === sessionId) {
          if (notification.params.status === "running") sawRunning = true;
          if (notification.params.status === "idle" && sawRunning) idleAfterRunning = true;
        }
        if (notification.method === "session.event" && notification.params.sessionId === sessionId) {
          const event = notification.params.event;
          events.push(event);
          if (promptAccepted && event?.type === "turn/start") {
            activeTurn = typeof event?.data?.turn === "number" ? event.data.turn : true;
            // turn 有了权威终态信号，idle 静默期兜底即刻作废（竞态下它可能
            // 已在计时——idle 先于 turn/start 到达的病态帧序）。
            if (drainTimer) {
              clearTimeout(drainTimer);
              drainTimer = null;
            }
          }
          if (promptAccepted && activeTurn !== null && event?.type === "turn/end") {
            const endedTurn = event?.data?.turn;
            if (activeTurn === true || typeof endedTurn !== "number" || endedTurn === activeTurn) turnEnded = true;
          }
        }
        maybeSettle();
      });
      timer = setTimeout(() => {
        finish(runtimeError("HARNESS_TURN_TIMEOUT", "DeepSeek Harness Web turn 等待 turn/end 或 idle 静默超时", { retryable: true }));
      }, this.turnTimeoutMs);
      timer.unref?.();
      if (signal?.aborted) {
        onAbort();
        return;
      }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      this.rpc("session/prompt", {
        request: {
          requestId: randomUUID(),
          sessionId,
          mode: "queue",
          content: toPromptContent(contentBlocks),
        },
      }, signal).then(() => {
        promptAccepted = true;
        maybeSettle();
      }).catch((error) => finish(error));
    });
  }

  async abortTurn(sessionId) {
    await this.rpc("session/cancel", { request: { sessionId } });
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
    this.#closeSockets();
    this.initialized = false;
  }

  async rpc(method, args = {}, signal) {
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
        headers: {
          "content-type": "application/json",
          ...(this.cookie ? { cookie: this.cookie } : {}),
        },
        body: JSON.stringify({ type: "client-request", rpcId, method, payload: { args } }),
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
    if (!this.createdSessions.has(sessionId)) {
      try {
        await this.rpc("session/create", {
          request: {
            sessionId,
            ...(this.cwd ? { cwd: this.cwd } : {}),
            ...(this.route?.agentPreset ? { agentPreset: this.route.agentPreset } : {}),
          },
        });
      } catch (error) {
        if (!/already|exists|conflict/i.test(error.message)) throw error;
      }
      if (this.route?.provider && this.route?.model) {
        try {
          await this.rpc("session/selectModel", {
            request: {
              sessionId,
              provider: this.route.provider,
              model: this.route.model,
            },
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
    await this.#ensureFollow(sessionId);
  }

  async #waitReady() {
    const deadline = Date.now() + this.initializeTimeoutMs;
    let lastError;
    while (Date.now() < deadline) {
      try {
        await this.rpc("session/list", { _request: {} });
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    throw lastError || runtimeError("HARNESS_NOT_RUNNING", "DeepSeek Harness Web 未就绪", { retryable: true });
  }

  #closeSockets() {
    const mux = this.mux;
    this.mux = null;
    if (mux) {
      for (const stream of mux.streams.values()) {
        stream.onOpenError?.(runtimeError("HARNESS_TRANSPORT_CLOSED", "remote.mux WebSocket 已关闭", { retryable: true }));
      }
      mux.streams.clear();
      try { mux.socket.close(); } catch {}
    }
  }

  // DSH 0.1.7 事件面：单条 /api/remote.mux WebSocket 承载多条逻辑流；会话事件
  // 走每会话一条的 session/follow 逻辑流（snapshot 之后按 seq 追加 durable
  // 事件帧）。旧版 events.host/events.mux 双流与 server-request 信封已不存在。
  async #ensureMux() {
    if (this.mux) return;
    if (typeof this.webSocketImpl !== "function") {
      throw runtimeError("HARNESS_TRANSPORT_ERROR", "当前运行时没有 WebSocket，无法连接 dsh web 事件流");
    }
    // Node 全局 WebSocket（undici）支持 ws 风格的第二参 options.headers——
    // 已在本机 Node 24 实证 cookie 头随 upgrade 送达；DSH 自身测试同用法。
    const options = this.cookie ? { headers: { cookie: this.cookie } } : undefined;
    const ws = options ? new this.webSocketImpl(wsUrl(this.origin, "/api/remote.mux"), options)
      : new this.webSocketImpl(wsUrl(this.origin, "/api/remote.mux"));
    const mux = { socket: ws, streams: new Map() };
    ws.addEventListener("message", (event) => {
      let frame;
      try {
        frame = JSON.parse(String(event.data ?? ""));
      } catch {
        return; // One corrupt frame must not kill the mux.
      }
      const stream = mux.streams.get(frame?.streamId);
      if (!stream) return;
      try {
        if (frame.type === "item") {
          stream.onValue?.(frame.value);
        } else if (frame.type === "error") {
          const failure = runtimeError("HARNESS_RPC_ERROR", String(frame.error?.message || "remote stream error"), { retryable: true });
          stream.onOpenError?.(failure);
          stream.onStreamError?.(failure);
        } else if (frame.type === "end") {
          stream.onEnd?.();
        }
      } catch {
        // A consumer fault must not kill the mux.
      }
    });
    ws.addEventListener("close", () => {
      if (this.mux === mux) this.mux = null;
      this.followedSessions.clear();
      for (const stream of mux.streams.values()) {
        stream.onOpenError?.(runtimeError("HARNESS_TRANSPORT_CLOSED", "remote.mux WebSocket 已关闭", { retryable: true }));
      }
      mux.streams.clear();
      if (!this.closed) {
        this.#emit({
          method: "session.status",
          params: { sessionId: "", status: "idle", error: "remote.mux WebSocket closed" },
        });
      }
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(runtimeError("HARNESS_NOT_RUNNING", "remote.mux WebSocket 连接超时", { retryable: true }));
      }, this.initializeTimeoutMs);
      timer.unref?.();
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(runtimeError("HARNESS_TRANSPORT_ERROR", "remote.mux WebSocket 失败", { retryable: true }));
      }, { once: true });
    });
    this.mux = mux;
  }

  // 每个会话首条 turn 前开一条 follow 逻辑流。snapshot 帧只确认流已建立——
  // 不回放其中历史事件，否则领养会话的旧 turn/start/turn/end 会污染 runTurn
  // 的配对结算。follow 先于 prompt 打开，本轮事件必然以 live item 到达。
  async #ensureFollow(sessionId) {
    await this.#ensureMux();
    if (this.followedSessions.has(sessionId)) return;
    const streamId = `follow:${sessionId}`;
    const mux = this.mux;
    const opened = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        mux.streams.delete(streamId);
        reject(runtimeError("HARNESS_NOT_RUNNING", `session/follow 等待快照超时（${sessionId}）`, { retryable: true }));
      }, this.initializeTimeoutMs);
      timer.unref?.();
      mux.streams.set(streamId, {
        onValue: (value) => {
          if (value?.type === "snapshot") {
            clearTimeout(timer);
            resolve();
            return;
          }
          if (value?.type === "event" && value.event) {
            this.#emit({
              method: "session.event",
              params: { sessionId, event: value.event },
            });
          }
        },
        onOpenError: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        onStreamError: (error) => {
          this.onNotice?.({
            event: "harness.web.follow.failed",
            data: { sessionId, error: { code: error.code, message: error.message } },
            options: { level: "error" },
          });
        },
      });
    });
    mux.socket.send(JSON.stringify({
      type: "open",
      streamId,
      endpoint: "session/follow",
      payload: { args: { request: { address: { kind: "session", sessionId } } } },
    }));
    try {
      await opened;
    } catch (error) {
      mux.streams.delete(streamId);
      throw error;
    }
    this.followedSessions.add(sessionId);
  }

  #emit(notification) {
    for (const listener of this.listeners) listener(notification);
  }
}

export { DeepSeekHarnessWebClient, assistantText, toPromptContent };
