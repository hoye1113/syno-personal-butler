import { sourceValidity, scriptResidue } from "./source-validity.mjs";
import { htmlImageReferences } from "./source-resources.mjs";
import { extractReadableText, hasSourceNoise } from "./source-fetcher.mjs";
import { createHash } from "node:crypto";
import net from "node:net";

import { locateCommand, runProcess } from "./process-runner.mjs";
import { isPrivateAddress } from "./source-fetcher.mjs";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1_000;
const MAX_CONTENT_CHARS = 100_000;
const ALLOWED_ACTIONS = Object.freeze(new Set(["navigate", "snapshot", "list_tabs", "close_session"]));

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

// bsk observe 不返回 title 字段（2026-10-22 实证），标题从 get-html 兜底解析：
// 先 <title>，再 og:title（微信等站点 <title> 为空、由 JS 后填）。
function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/giu, " ").replace(/&amp;/giu, "&").replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">").replace(/&quot;/giu, '"').replace(/&#(?:39|x27);/giu, "'");
}
function htmlTitle(html) {
  const source = String(html || "");
  const direct = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/iu.exec(source)?.[1] || "").trim();
  if (direct) return direct;
  for (const match of source.matchAll(/<meta\b[^>]*>/giu)) {
    if (!/property\s*=\s*["']og:title["']/iu.test(match[0])) continue;
    const content = /content\s*=\s*"([^"]*)"/iu.exec(match[0])?.[1] ?? /content\s*=\s*'([^']*)'/iu.exec(match[0])?.[1] ?? "";
    const decoded = decodeEntities(content).trim();
    if (decoded) return decoded;
  }
  return "";
}

// extractReadableText 对部分站点（微信为代表，2026-10-22 实证）会漏剥内联脚本/样式，
// 产出压缩 JS/CSS 垃圾；垃圾不得当正文，由调用方降级到 observe 的 VOM 文本。
function extractionGarbage(value) {
  const body = String(value || "");
  return !body || scriptResidue({ title: "", body }) || hasSourceNoise(body);
}

// bsk observe 的 VOM 文本里 RootWebArea 的名字承载页标题：验证墙是短名（"环境异常"），
// 文章页是长名（标题+摘要拼接）。只取短名，喂给 wallTitle 判定，让无 title 字段的
// 验证墙也能被识别（2026-10-22 实证：observe 无 title 字段，锚定正则够不到 VOM 里的墙文案）。
function vomTitle(raw) {
  const text = typeof raw === "string" ? raw : flattenSnapshotTree(raw);
  const match = /RootWebArea\s+"([^"]*)"/u.exec(text);
  const name = match ? match[1].trim() : "";
  return name.length > 0 && name.length <= 60 ? name : "";
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
  return sourceValidity({ url: finalUrl, title, text: content }).code === "SOURCE_VERIFICATION_REQUIRED";
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
      const observed = await this.#run(["observe", "--session", session, "--max-tokens", "25000", "--json"]);
      const raw = observed.observation ?? observed.snapshot ?? observed.content ?? observed.text;
      const finalUrl = firstString(observed, ["url", "final_url", "finalUrl"]) || task.requestedUrl;
      const observedTitle = firstString(observed, ["title", "page_title", "pageTitle"]) || vomTitle(raw);
      if (!requiresInteraction({ finalUrl, title: observedTitle, content: flattenSnapshotTree(raw) })) {
        try { const page = await this.#run(["get-html", "--session", session, "--max-bytes", "2000000", "--json"]); return { ...observed, html: page.html, htmlTruncated: page.truncated }; } catch { /* Unsupported HTML extraction is reported as incomplete resources. */ }
      }
      return observed;
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
      focus: false,
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

  // keepSessionOnBlock（2026-10-16）：命中验证时保留 Agent Window，由调用方决定关闭时机——
  // 活聊天读链接靠它做到「一步到位」：窗口留着、主人就地过验证、程序轮询同一窗口。收录链路保持
  // 默认语义（阻塞即关窗），不让无人值守任务留着窗口。
  // focus：只在调用方确认需要人介入时开启（默认不抢焦点）。
  // 同一 workflowId + 同一地址且会话未过期时复用现有 BSK 会话与窗口（「继续」原地重读的前提）；
  // 地址变了才丢弃旧窗口重开。
  async capture({ workflowId, exactUrl, timeoutMs, keepSessionOnBlock = false, focus = false } = {}) {
    const id = safeWorkflowId(workflowId);
    const requested = assertSafeUrl(exactUrl).toString();
    const existing = this.sessions.get(id);
    const reusable = Boolean(existing)
      && existing.requestedUrl === requested
      && Date.parse(existing.expiresAt) > this.clock().getTime();
    if (!reusable) {
      if (existing) await this.closeSession({ workflowId: id }).catch(() => {});
      this.authorize({ workflowId: id, exactUrl: requested });
    }
    const task = this.sessions.get(id);
    if (focus) task.focus = true;
    const health = await this.health();
    if (!health.available) {
      const observation = { status: "unavailable", requestedUrl: requested, error: health.error || { code: "BROWSER_NOT_CONNECTED", message: "BSK 没有已连接的浏览器" } };
      this.observations.set(id, observation);
      this.sessions.delete(id);
      return observation;
    }
    let blocked = false;
    try {
      await this.#withTimeout(this.navigate({ workflowId: id }), timeoutMs);
      let observation = await this.#snapshot(id, requested, timeoutMs);
      if (observation.error?.code === "BROWSER_BLOCKED_UNATTENDED") {
        await this.#withTimeout(this.navigate({ workflowId: id }), timeoutMs);
        observation = await this.#snapshot(id, requested, timeoutMs);
      }
      blocked = observation.error?.code === "BROWSER_BLOCKED_UNATTENDED";
      return observation;
    } catch (error) {
      const observation = { status: "failed", requestedUrl: requested, error: { code: error.code || "BROWSER_CAPTURE_FAILED", message: error.message } };
      this.observations.set(id, observation);
      return observation;
    } finally {
      if (!(keepSessionOnBlock && blocked)) await this.closeSession({ workflowId: id });
    }
  }

  // 命中验证后在同一 Agent Window 里等人过验证：只轮询 observe，不点击、不填表、不绕验证。
  // 页面对了立即交出正文；超时把最后一次（仍是验证页的）观察还给调用方，由它决定关窗与话术。
  async waitForClearance({ workflowId, timeoutMs = 90_000, intervalMs = 5_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
    const id = safeWorkflowId(workflowId);
    const deadline = this.clock().getTime() + Math.max(1_000, Number(timeoutMs) || 90_000);
    const every = Math.max(500, Math.min(30_000, Number(intervalMs) || 5_000));
    let observation = this.observations.get(id) || null;
    for (;;) {
      try {
        observation = await this.snapshot({ workflowId: id });
      } catch (error) {
        return { status: "failed", requestedUrl: observation?.requestedUrl || "", error: { code: error.code || "BROWSER_CLEARANCE_FAILED", message: error.message } };
      }
      if (observation.status === "completed" || observation.error?.code !== "BROWSER_BLOCKED_UNATTENDED") return observation;
      const remaining = deadline - this.clock().getTime();
      if (remaining <= 0) return observation;
      await sleep(Math.min(every, remaining));
    }
  }

  async continue({ workflowId, timeoutMs, keepSessionOnBlock = false, focus = false } = {}) {
    const id = safeWorkflowId(workflowId);
    const task = this.sessions.get(id);
    const prior = this.observations.get(id);
    const requestedUrl = task?.requestedUrl || prior?.requestedUrl;
    if (!requestedUrl) return { status: "unavailable", error: { code: "BROWSER_SESSION_MISSING", message: "浏览器收录会话已不存在" } };
    return this.capture({ workflowId: id, exactUrl: requestedUrl, timeoutMs, keepSessionOnBlock, focus });
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
    const args = ["session", "start", "--json", task.focus ? "--focus" : "--no-focus", "--name", `Syno ${id.slice(-12)}`];
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
    const images = result.html ? htmlImageReferences(result.html, final.toString()) : null;
    // 正文优先级：extractReadableText 产出干净则用；产出垃圾（或为空）则降级 observe 的
    // VOM 文本（无图时的既有兜底）。两者皆垃圾时 requiresInteraction fail-closed。
    const extracted = images ? extractReadableText(images.html, "text/html") : "";
    const fullContent = images && !extractionGarbage(extracted) ? extracted : flattenSnapshotTree(raw).replace(/\u0000/gu, " ").trim();
    const content = fullContent.slice(0, this.maxContentChars);
    const title = firstString(result, ["title", "page_title", "pageTitle"]) || htmlTitle(result.html) || vomTitle(raw);
    const base = { requestedUrl, finalUrl: final.toString(), title, content, truncated: result.htmlTruncated === true || fullContent.length > this.maxContentChars, resources: images?.refs, resourceDiscoveryComplete: Boolean(images) && result.htmlTruncated !== true, contentDigest: digest(content), usedActions: ["navigate", "observe"], browserSessionId: this.sessions.get(id)?.logicalSession };
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
