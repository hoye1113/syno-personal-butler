import { createHash } from "node:crypto";
import net from "node:net";

import { isPrivateAddress } from "./source-fetcher.mjs";

const DEFAULT_ENDPOINT = "http://127.0.0.1:10086";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_CONTENT_CHARS = 100_000;
const ALLOWED_ACTIONS = Object.freeze(new Set(["navigate", "snapshot", "list_tabs", "close_session"]));
const INTERACTION_PATTERN = /(?:登录|登入|log\s*in|sign\s*in|验证码|captcha|人机验证|验证后继续|需要授权|同意条款)/iu;

function adapterError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

function safeWorkflowId(value) {
  const id = String(value || "");
  if (!/^workflow-[a-zA-Z0-9-]+$/.test(id)) throw adapterError("BROWSER_WORKFLOW_INVALID", "浏览器收录 Workflow ID 无效");
  return id;
}

function assertSafeUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw adapterError("BROWSER_URL_INVALID", "浏览器收录地址无效"); }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^\[|\]$/gu, "");
  const privateHost = hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || (net.isIP(hostname) > 0 && isPrivateAddress(hostname));
  if (!/^https?:$/u.test(url.protocol) || url.username || url.password || privateHost
    || [...url.searchParams.keys()].some((key) => /^(?:access_token|api_key|token|secret|password)$/iu.test(key))) {
    throw adapterError("BROWSER_URL_UNSAFE", "URL 不安全：浏览器收录只允许公开 HTTP(S) 地址");
  }
  return url;
}

function sessionId(workflowId) {
  return `syno-capture-${safeWorkflowId(workflowId)}`;
}

function flattenSnapshotTree(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(flattenSnapshotTree).filter(Boolean).join("\n");
  const preferred = [value.text, value.name, value.label, value.value].filter((item) => typeof item === "string");
  const children = flattenSnapshotTree(value.children || value.tree || value.nodes || value.root);
  return [...preferred, children].filter(Boolean).join("\n");
}

function digest(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

class BrowserCaptureAdapter {
  constructor({ endpoint = DEFAULT_ENDPOINT, fetchImpl = globalThis.fetch, clock = () => new Date(), timeoutMs = DEFAULT_TIMEOUT_MS, maxContentChars = MAX_CONTENT_CHARS, sessionTtlMs = DEFAULT_SESSION_TTL_MS } = {}) {
    this.endpoint = String(endpoint).replace(/\/+$/u, "");
    this.fetchImpl = fetchImpl;
    this.clock = clock;
    this.timeoutMs = timeoutMs;
    this.maxContentChars = Math.min(MAX_CONTENT_CHARS, Math.max(1_000, Number(maxContentChars) || MAX_CONTENT_CHARS));
    this.sessionTtlMs = Math.min(24 * 60 * 60 * 1_000, Math.max(5 * 60 * 1_000, Number(sessionTtlMs) || DEFAULT_SESSION_TTL_MS));
    this.sessions = new Map();
    this.observations = new Map();
  }

  async health() {
    try {
      const result = await this.#request("GET", "/status");
      const daemonVersion = String(result?.version || "").replace(/^v/u, "");
      const extensionVersion = String(result?.extension_version || "");
      return {
        available: result?.running === true && result?.extension_connected === true,
        ...(daemonVersion ? { daemonVersion } : {}),
        ...(extensionVersion ? { extensionVersion } : {}),
      };
    } catch (error) {
      return { available: false, error: { code: error.code || "BROWSER_DAEMON_UNAVAILABLE", message: error.message } };
    }
  }

  async command({ workflowId, action, args = {} } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!ALLOWED_ACTIONS.has(action)) throw adapterError("BROWSER_ACTION_DENIED", `浏览器动作不允许：${action}`);
    const task = this.sessions.get(id);
    if (task && Date.parse(task.expiresAt) <= this.clock().getTime()) {
      throw adapterError("BROWSER_SESSION_EXPIRED", "浏览器收录会话已过期，请重新发送地址");
    }
    if (action === "navigate") {
      const requested = task?.requestedUrl;
      const target = assertSafeUrl(args.url);
      if (!requested || target.toString() !== requested) {
        throw adapterError("BROWSER_URL_NOT_SIGNED", "浏览器只能打开当前 Workflow 已签发的精确地址");
      }
    }
    const session = task?.session || sessionId(id);
    return this.#invoke(action, args, session);
  }

  authorize({ workflowId, exactUrl, browserSessionId } = {}) {
    const id = safeWorkflowId(workflowId);
    const requestedUrl = assertSafeUrl(exactUrl).toString();
    const expectedSession = sessionId(id);
    if (browserSessionId && browserSessionId !== expectedSession) throw adapterError("BROWSER_SESSION_INVALID", "浏览器收录会话标识无效");
    const startedAt = this.clock();
    const task = {
      session: browserSessionId || expectedSession,
      requestedUrl,
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + this.sessionTtlMs).toISOString(),
    };
    this.sessions.set(id, task);
    this.observations.delete(id);
    return { workflowId: id, browserSessionId: task.session, requestedUrl: task.requestedUrl, expiresAt: task.expiresAt };
  }

  async status({ workflowId } = {}) {
    safeWorkflowId(workflowId);
    return this.health();
  }

  async navigate({ workflowId } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.sessions.get(id);
    if (!task) throw adapterError("BROWSER_SESSION_MISSING", "浏览器收录会话已不存在");
    const result = await this.command({ workflowId: id, action: "navigate", args: { url: task.requestedUrl, newTab: true, group_title: `Syno 收录 · ${id.slice(-12)}` } });
    return { ...result, workflowId: id, browserSessionId: task.session };
  }

  async snapshot({ workflowId, timeoutMs } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.sessions.get(id);
    if (!task) throw adapterError("BROWSER_SESSION_MISSING", "浏览器收录会话已不存在");
    return this.#snapshot(id, task.requestedUrl, timeoutMs);
  }

  observation({ workflowId } = {}) {
    return this.observations.get(safeWorkflowId(workflowId)) || null;
  }

  async capture({ workflowId, exactUrl, timeoutMs } = {}) {
    const id = safeWorkflowId(workflowId);
    const requested = assertSafeUrl(exactUrl).toString();
    this.authorize({ workflowId: id, exactUrl: requested });
    const health = await this.health();
    if (!health.available) return { status: "unavailable", requestedUrl: requested, error: health.error };
    try {
      const navigation = await this.#withTimeout(this.navigate({ workflowId: id }), timeoutMs);
      if (navigation?.success === false) throw adapterError("BROWSER_NAVIGATE_FAILED", "浏览器没有打开收录地址");
      return await this.#snapshot(id, requested, timeoutMs);
    } catch (error) {
      return { status: "failed", requestedUrl: requested, error: { code: error.code || "BROWSER_CAPTURE_FAILED", message: error.message } };
    }
  }

  async continue({ workflowId, timeoutMs } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!this.sessions.has(id)) return { status: "unavailable", error: { code: "BROWSER_SESSION_MISSING", message: "浏览器收录会话已不存在" } };
    const health = await this.health();
    if (!health.available) return { status: "unavailable", error: health.error };
    try { return await this.snapshot({ workflowId: id, timeoutMs }); } catch (error) {
      return { status: "failed", error: { code: error.code || "BROWSER_CAPTURE_FAILED", message: error.message } };
    }
  }

  async listTabs({ workflowId } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!this.sessions.has(id)) throw adapterError("BROWSER_SESSION_MISSING", "浏览器收录会话已不存在");
    return this.command({ workflowId: id, action: "list_tabs" });
  }

  async closeSession({ workflowId } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!this.sessions.has(id)) return { closed: 0 };
    let result;
    try {
      result = await this.command({ workflowId: id, action: "close_session" });
    } catch (error) {
      if (error.code !== "BROWSER_SESSION_EXPIRED") throw error;
      result = { closed: 0, expired: true };
    }
    this.sessions.delete(id);
    this.observations.delete(id);
    return result;
  }

  async #snapshot(id, requestedUrl, timeoutMs) {
    const result = await this.#withTimeout(this.command({ workflowId: id, action: "snapshot" }), timeoutMs);
    const finalUrl = String(result?.url || requestedUrl);
    const final = assertSafeUrl(finalUrl);
    const requested = assertSafeUrl(requestedUrl);
    if (final.origin !== requested.origin) throw adapterError("BROWSER_REDIRECT_ORIGIN_DENIED", "浏览器页面跳转到了未签发的站点");
    const content = flattenSnapshotTree(result?.tree ?? result?.content).replace(/\u0000/gu, " ").trim().slice(0, this.maxContentChars);
    const base = { requestedUrl, finalUrl: final.toString(), title: String(result?.title || ""), content, contentDigest: digest(content), usedActions: ["navigate", "snapshot"], browserSessionId: this.sessions.get(id)?.session };
    const requiresInteraction = INTERACTION_PATTERN.test(`${base.title}\n${content}`)
      || (!content && INTERACTION_PATTERN.test(base.finalUrl));
    const observation = requiresInteraction
      ? { ...base, status: "interaction_required", interactionHint: "请在浏览器完成登录或验证后回复“继续刚才的收录”。" }
      : !content
        ? { ...base, status: "failed", error: { code: "BROWSER_EMPTY_CONTENT", message: "浏览器页面没有可读取正文" } }
        : { ...base, status: "completed" };
    this.observations.set(id, observation);
    return observation;
  }

  async #request(method, pathname, body) {
    const response = await this.fetchImpl(`${this.endpoint}${pathname}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response?.ok) throw adapterError("BROWSER_DAEMON_HTTP_FAILED", `Kimi WebBridge 请求失败：${response?.status || "unknown"}`);
    return response.json();
  }

  async #invoke(action, args, session) {
    const result = await this.#request("POST", "/command", { action, args, session });
    // Kimi WebBridge's command endpoint wraps the command result in `data`.
    // Keep accepting the unwrapped shape used by older local daemons and test
    // doubles, but always expose the command payload to the workflow layer.
    if (result && typeof result === "object" && result.data && typeof result.data === "object") return result.data;
    return result;
  }

  async #withTimeout(promise, timeoutMs) {
    if (!timeoutMs) return promise;
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(adapterError("BROWSER_TIMEOUT", "浏览器收录超时")), timeoutMs)),
    ]);
  }
}

export { ALLOWED_ACTIONS, BrowserCaptureAdapter, flattenSnapshotTree, assertSafeUrl };
