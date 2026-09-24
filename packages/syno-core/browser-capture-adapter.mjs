import { createHash } from "node:crypto";
import net from "node:net";

import { locateCommand, runProcess } from "./process-runner.mjs";
import { isPrivateAddress } from "./source-fetcher.mjs";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_CONTENT_CHARS = 100_000;
const ALLOWED_ACTIONS = Object.freeze(new Set(["navigate", "snapshot", "list_tabs", "close_session"]));
const INTERACTION_PATTERN = /(?:请.{0,12}(?:登录|登入|验证)|log\s*in|sign\s*in|验证码|captcha|人机验证|verify\s+(?:you|that)|access\s+denied|访问被拒绝)/iu;
const INTERACTION_URL_PATTERN = /(?:login|signin|captcha|challenge|verify|verification)/iu;

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

function logicalSessionId(workflowId) {
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

function parseJson(text) {
  const source = String(text || "").trim();
  if (!source) return {};
  try { return JSON.parse(source); } catch {
    const lines = source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try { return JSON.parse(lines[index]); } catch {}
    }
    throw adapterError("BROWSER_RESPONSE_INVALID", "BSK 返回了无法解析的 JSON");
  }
}

function firstString(value, keys) {
  if (!value || typeof value !== "object") return "";
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key]) return value[key];
  }
  for (const nested of [value.data, value.session, value.page, value.tab, value.observation]) {
    const found = firstString(nested, keys);
    if (found) return found;
  }
  return "";
}

function browserList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["browsers", "items", "data"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function requiresInteraction({ finalUrl, title, content }) {
  const body = `${title || ""}\n${content || ""}`;
  return INTERACTION_URL_PATTERN.test(String(finalUrl || ""))
    || (body.length < 4_000 && INTERACTION_PATTERN.test(body));
}

class BrowserCaptureAdapter {
  constructor({ command = locateCommand("bsk", "SYNO_BSK_COMMAND"), runner = runProcess, clock = () => new Date(), timeoutMs = DEFAULT_TIMEOUT_MS, maxContentChars = MAX_CONTENT_CHARS, sessionTtlMs = DEFAULT_SESSION_TTL_MS, browser = process.env.SYNO_BSK_BROWSER || "" } = {}) {
    this.commandPath = command;
    this.runner = runner;
    this.clock = clock;
    this.timeoutMs = timeoutMs;
    this.maxContentChars = Math.min(MAX_CONTENT_CHARS, Math.max(1_000, Number(maxContentChars) || MAX_CONTENT_CHARS));
    this.sessionTtlMs = Math.min(24 * 60 * 60 * 1_000, Math.max(5 * 60 * 1_000, Number(sessionTtlMs) || DEFAULT_SESSION_TTL_MS));
    this.browser = String(browser || "");
    this.sessions = new Map();
    this.observations = new Map();
  }

  async health() {
    try {
      const status = await this.#run(["status", "--json"]);
      const browsers = browserList(await this.#run(["browsers", "--json"]));
      const explicitlyDisconnected = status.extension_connected === false
        || status.extensionConnected === false
        || status.browser_connected === false
        || status.browserConnected === false;
      return {
        available: !explicitlyDisconnected && browsers.length > 0,
        provider: "bsk",
        connectedBrowsers: browsers.length,
        ...(firstString(status, ["version", "daemon_version", "daemonVersion"]) ? { daemonVersion: firstString(status, ["version", "daemon_version", "daemonVersion"]).replace(/^v/u, "") } : {}),
      };
    } catch (error) {
      return { available: false, provider: "bsk", error: { code: error.code || "BROWSER_DAEMON_UNAVAILABLE", message: error.message } };
    }
  }

  async command({ workflowId, action, args = {} } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!ALLOWED_ACTIONS.has(action)) throw adapterError("BROWSER_ACTION_DENIED", `浏览器动作不允许：${action}`);
    const task = this.#task(id);
    if (action === "navigate") {
      const target = assertSafeUrl(args.url);
      if (target.toString() !== task.requestedUrl) throw adapterError("BROWSER_URL_NOT_SIGNED", "浏览器只能打开当前 Workflow 已签发的精确地址");
      const session = await this.#ensureSession(id, task);
      return this.#run(["navigate", target.toString(), "--session", session, "--wait-until", "domcontentloaded", "--timeout", `${this.timeoutMs}ms`, "--json"]);
    }
    if (action === "snapshot") {
      const session = await this.#ensureSession(id, task);
      return this.#run(["observe", "--session", session, "--max-tokens", "25000", "--json"]);
    }
    if (action === "list_tabs") {
      const session = await this.#ensureSession(id, task);
      return this.#run(["tab", "list", "--session", session, "--scope", "agent", "--json"]);
    }
    return this.#stopSession(task);
  }

  authorize({ workflowId, exactUrl } = {}) {
    const id = safeWorkflowId(workflowId);
    const requestedUrl = assertSafeUrl(exactUrl).toString();
    const startedAt = this.clock();
    const task = {
      logicalSession: logicalSessionId(id),
      requestedUrl,
      startedAt: startedAt.toISOString(),
      expiresAt: new Date(startedAt.getTime() + this.sessionTtlMs).toISOString(),
      bskSession: "",
    };
    this.sessions.set(id, task);
    this.observations.delete(id);
    return { workflowId: id, browserSessionId: task.logicalSession, requestedUrl, expiresAt: task.expiresAt };
  }

  async status({ workflowId } = {}) {
    safeWorkflowId(workflowId);
    return this.health();
  }

  async navigate({ workflowId } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.#task(id);
    const result = await this.command({ workflowId: id, action: "navigate", args: { url: task.requestedUrl } });
    return { ...result, workflowId: id, browserSessionId: task.logicalSession };
  }

  async snapshot({ workflowId, timeoutMs } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.#task(id);
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
    if (!health.available) {
      const observation = { status: "unavailable", requestedUrl: requested, error: health.error || { code: "BROWSER_NOT_CONNECTED", message: "BSK 没有已连接的浏览器" } };
      this.observations.set(id, observation);
      this.sessions.delete(id);
      return observation;
    }
    try {
      await this.#withTimeout(this.navigate({ workflowId: id }), timeoutMs);
      let observation = await this.#snapshot(id, requested, timeoutMs);
      if (observation.error?.code === "BROWSER_BLOCKED_UNATTENDED") {
        await this.#withTimeout(this.navigate({ workflowId: id }), timeoutMs);
        observation = await this.#snapshot(id, requested, timeoutMs);
      }
      return observation;
    } catch (error) {
      const observation = { status: "failed", requestedUrl: requested, error: { code: error.code || "BROWSER_CAPTURE_FAILED", message: error.message } };
      this.observations.set(id, observation);
      return observation;
    } finally {
      await this.closeSession({ workflowId: id });
    }
  }

  async continue({ workflowId, timeoutMs } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.sessions.get(id);
    const prior = this.observations.get(id);
    const requestedUrl = task?.requestedUrl || prior?.requestedUrl;
    if (!requestedUrl) return { status: "unavailable", error: { code: "BROWSER_SESSION_MISSING", message: "浏览器收录会话已不存在" } };
    return this.capture({ workflowId: id, exactUrl: requestedUrl, timeoutMs });
  }

  async listTabs({ workflowId } = {}) {
    return this.command({ workflowId, action: "list_tabs" });
  }

  async closeSession({ workflowId } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.sessions.get(id);
    if (!task) return { closed: 0 };
    const result = await this.#stopSession(task);
    this.sessions.delete(id);
    return result;
  }

  #task(id) {
    const task = this.sessions.get(id);
    if (!task) throw adapterError("BROWSER_SESSION_MISSING", "浏览器收录会话已不存在");
    if (Date.parse(task.expiresAt) <= this.clock().getTime()) throw adapterError("BROWSER_SESSION_EXPIRED", "浏览器收录会话已过期，请重新发送地址");
    return task;
  }

  async #ensureSession(id, task) {
    if (task.bskSession) return task.bskSession;
    const args = ["session", "start", "--json", "--no-focus", "--name", `Syno ${id.slice(-12)}`];
    if (this.browser) args.push("--browser", this.browser);
    const result = await this.#run(args);
    const session = firstString(result, ["session_id", "sessionId", "id"]);
    if (!session) throw adapterError("BROWSER_SESSION_START_INVALID", "BSK 未返回 Session ID");
    task.bskSession = session;
    return session;
  }

  async #stopSession(task) {
    if (!task.bskSession) return { closed: 0 };
    const session = task.bskSession;
    await this.#run(["session", "stop", session, "--json"]);
    task.bskSession = "";
    return { closed: 1 };
  }

  async #snapshot(id, requestedUrl, timeoutMs) {
    const result = await this.#withTimeout(this.command({ workflowId: id, action: "snapshot" }), timeoutMs);
    const finalUrl = firstString(result, ["url", "final_url", "finalUrl"]) || requestedUrl;
    const final = assertSafeUrl(finalUrl);
    const requested = assertSafeUrl(requestedUrl);
    if (final.origin !== requested.origin) throw adapterError("BROWSER_REDIRECT_ORIGIN_DENIED", "浏览器页面跳转到了未签发的站点");
    const raw = result?.observation ?? result?.snapshot ?? result?.tree ?? result?.content ?? result?.text ?? result?.data;
    const content = flattenSnapshotTree(raw).replace(/\u0000/gu, " ").trim().slice(0, this.maxContentChars);
    const title = firstString(result, ["title", "page_title", "pageTitle"]);
    const base = { requestedUrl, finalUrl: final.toString(), title, content, contentDigest: digest(content), usedActions: ["navigate", "observe"], browserSessionId: this.sessions.get(id)?.logicalSession };
    const observation = requiresInteraction(base)
      ? { ...base, status: "failed", blocked: "unattended_auth", error: { code: "BROWSER_BLOCKED_UNATTENDED", message: "页面要求登录或人机验证；无人值守读取已停止，且不会绕过验证" } }
      : !content
        ? { ...base, status: "failed", error: { code: "BROWSER_EMPTY_CONTENT", message: "浏览器页面没有可读取正文" } }
        : { ...base, status: "completed" };
    this.observations.set(id, observation);
    return observation;
  }

  async #run(args) {
    const options = {
      timeoutMs: this.timeoutMs,
      env: { ...process.env, BSK_AUTO_START: "0", PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    };
    try {
      const result = await this.runner(this.commandPath, args, options);
      return parseJson(result?.stdout);
    } catch (error) {
      let payload = {};
      try { payload = parseJson(error.stdout); } catch {}
      const code = firstString(payload, ["code"]) || (error.failureCode === "unavailable" ? "BROWSER_BSK_UNAVAILABLE" : "BROWSER_BSK_COMMAND_FAILED");
      const message = firstString(payload, ["message"]) || error.message || "BSK 命令失败";
      throw adapterError(code, message, { cause: error });
    }
  }

  async #withTimeout(promise, timeoutMs) {
    if (!timeoutMs) return promise;
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(adapterError("BROWSER_TIMEOUT", "浏览器收录超时")), timeoutMs)),
    ]);
  }
}

export { ALLOWED_ACTIONS, BrowserCaptureAdapter, flattenSnapshotTree, assertSafeUrl, parseJson, requiresInteraction };
