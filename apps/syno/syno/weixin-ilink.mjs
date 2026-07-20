import { createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

import { PATHS, resolveInside } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com/";
const DEFAULT_CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c/";
const CDN_ALLOWLIST = new Set(["novac2c.cdn.weixin.qq.com"]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TIMEOUT_MS = 20_000;
const STALE_SESSION_PAUSE_MS = 60 * 60 * 1_000;

function abortableDelay(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted || ms <= 0) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

function validateIlinkBaseUrl(value) {
  const url = new URL(value || DEFAULT_BASE_URL);
  if (url.protocol !== "https:" || !(url.hostname === "ilinkai.weixin.qq.com" || url.hostname.endsWith(".weixin.qq.com"))) {
    throw new Error("iLink base URL 不在微信官方域名范围");
  }
  return url;
}

function validateLoginQrUrl(value) {
  const url = new URL(value || "");
  if (url.protocol !== "https:" || !(url.hostname === "liteapp.weixin.qq.com" || url.hostname.endsWith(".weixin.qq.com"))) {
    throw new Error("微信登录二维码 URL 不在官方域名范围");
  }
  return url.toString();
}

async function renderLoginQr(value) {
  return QRCode.toDataURL(validateLoginQrUrl(value), {
    type: "image/png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

function randomWechatUin() {
  return Buffer.from(String(randomBytes(4).readUInt32BE(0)), "utf8").toString("base64");
}

async function fetchJson(url, options = {}, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, redirect: "error" });
    const text = await response.text();
    if (!response.ok) throw new Error(`iLink HTTP ${response.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

class WeixinIlinkClient {
  constructor({ baseUrl = DEFAULT_BASE_URL, token = "", fetcher = fetchJson, fetchImpl = fetch } = {}) {
    this.baseUrl = validateIlinkBaseUrl(baseUrl);
    this.token = token;
    this.fetcher = fetcher;
    this.fetch = fetchImpl;
  }
  headers({ authenticated = true } = {}) {
    return {
      "Content-Type": "application/json",
      "AuthorizationType": "ilink_bot_token",
      "X-WECHAT-UIN": randomWechatUin(),
      "iLink-App-Id": "bot",
      "iLink-App-ClientVersion": "65536",
      ...(authenticated && this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }
  url(endpoint) { return new URL(endpoint, this.baseUrl).toString(); }
  async getQrCode() {
    return this.fetcher(this.url("ilink/bot/get_bot_qrcode?bot_type=3"), { headers: this.headers({ authenticated: false }) }, 15_000);
  }
  async getQrStatus(qrcode) {
    return this.fetcher(this.url(`ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`), { headers: this.headers({ authenticated: false }) }, 40_000);
  }
  async getUpdates(cursor = "", signal, timeoutMs = 45_000) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal?.reason || new Error("canceled"));
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(new Error("long-poll timeout")); }, timeoutMs);
    try {
      const response = await this.fetch(this.url("ilink/bot/getupdates"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ get_updates_buf: cursor, base_info: { channel_version: "1.0.0", bot_agent: "Syno/1.0.0" } }),
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) throw new Error(`getUpdates HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      if (timedOut && !signal?.aborted) return { ret: 0, msgs: [], get_updates_buf: cursor };
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  async sendText({ toUserId, contextToken, text }) {
    return this.fetcher(this.url("ilink/bot/sendmessage"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        msg: {
          from_user_id: "",
          to_user_id: toUserId,
          client_id: `syno-${randomUUID()}`,
          context_token: contextToken,
          message_type: 2,
          message_state: 2,
          item_list: [{ type: 1, text_item: { text } }],
        },
        base_info: { channel_version: "1.0.0", bot_agent: "Syno/1.0.0" },
      }),
    }, 20_000);
  }
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

class LocalCredentialStore {
  constructor({ file, root = PATHS.credentialsRoot, stateFile = path.join(PATHS.stateRoot, "weixin-runtime.json"), protect = (value) => runDpapi("protect", value), unprotect = (value) => runDpapi("unprotect", value) } = {}) {
    this.metadataFile = file || path.join(root, "weixin-ilink.json");
    this.secretFile = path.join(path.dirname(this.metadataFile), "weixin-ilink.dpapi");
    this.stateFile = stateFile;
    this.protect = protect;
    this.unprotect = unprotect;
  }
  async load() {
    const metadata = await readJson(this.metadataFile);
    if (!metadata) return null;
    if (metadata.token) {
      const legacy = { ...metadata };
      await this.save(legacy);
      return legacy;
    }
    const protectedValue = await fs.readFile(this.secretFile, "utf8");
    const secret = JSON.parse(await this.unprotect(protectedValue));
    const runtime = await readJson(this.stateFile, {});
    return { ...metadata, token: secret.token, contexts: secret.contexts || {}, cursor: runtime.cursor || "", seenIds: runtime.seenIds || [] };
  }
  async save(value) {
    if (!value?.token) throw new Error("微信 iLink Token 不能为空");
    const secret = await this.protect(JSON.stringify({ token: value.token, contexts: value.contexts || {} }));
    await atomicWrite(this.secretFile, secret);
    await atomicWrite(this.metadataFile, `${JSON.stringify({
      version: 2,
      baseUrl: validateIlinkBaseUrl(value.baseUrl || DEFAULT_BASE_URL).toString(),
      botId: value.botId || "",
      ownerId: value.ownerId || "",
      savedAt: value.savedAt || new Date().toISOString(),
    }, null, 2)}\n`);
    await this.saveRuntime(value);
  }
  async saveRuntime(value, { contextsChanged = false } = {}) {
    if (contextsChanged && value.contexts) {
      const current = await fs.readFile(this.secretFile, "utf8")
        .then(async (protectedValue) => JSON.parse(await this.unprotect(protectedValue)))
        .catch((error) => { if (error.code === "ENOENT") return null; throw error; });
      if (!current) throw new Error("微信加密凭据不存在");
      await atomicWrite(this.secretFile, await this.protect(JSON.stringify({ token: current.token, contexts: value.contexts })));
    }
    await atomicWrite(this.stateFile, `${JSON.stringify({ version: 1, cursor: value.cursor || "", seenIds: (value.seenIds || []).slice(-2_000) }, null, 2)}\n`);
  }
  async clear() {
    await Promise.all([this.metadataFile, this.secretFile, this.stateFile].map((file) => fs.rm(file, { force: true })));
  }
}

class LocalProcessLock {
  constructor({ file = path.join(PATHS.stateRoot, "weixin-poller.lock") } = {}) {
    this.file = file;
    this.handle = null;
  }
  async acquire() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        this.handle = await fs.open(this.file, "wx", 0o600);
        await this.handle.writeFile(`${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`, "utf8");
        return true;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        let owner = null;
        try { owner = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
        let alive = false;
        if (Number.isInteger(owner?.pid)) {
          try { process.kill(owner.pid, 0); alive = true; } catch (probeError) { alive = probeError.code === "EPERM"; }
        }
        if (alive || attempt > 0) return false;
        await fs.rm(this.file, { force: true });
      }
    }
    return false;
  }
  async release() {
    await this.handle?.close().catch(() => {});
    this.handle = null;
    let owner = null;
    try { owner = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
    if (!owner || owner.pid === process.pid) await fs.rm(this.file, { force: true });
  }
}

function sniffMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const sample = bytes.subarray(0, Math.min(bytes.length, 8_192));
  if (sample.length && !sample.includes(0)) {
    const decoded = sample.toString("utf8");
    const replacements = (decoded.match(/\uFFFD/g) || []).length;
    const controls = [...sample].filter((value) => value < 9 || (value > 13 && value < 32)).length;
    if (replacements <= 2 && controls / sample.length < 0.01) return "text/plain";
  }
  return "";
}

function parseAttachmentKey(item) {
  const imageHex = item.image_item?.aeskey;
  if (imageHex !== undefined && imageHex !== "") {
    if (!/^[0-9a-fA-F]{32}$/.test(imageHex)) throw new Error("附件 AES Key 不是 16 字节十六进制值");
    return Buffer.from(imageHex, "hex");
  }
  const encoded = item.image_item?.media?.aes_key || item.file_item?.media?.aes_key;
  if (!encoded) return null;
  const decoded = Buffer.from(encoded, "base64");
  if (decoded.length === 16) return decoded;
  if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString("ascii"))) {
    return Buffer.from(decoded.toString("ascii"), "hex");
  }
  throw new Error("附件 AES Key 必须解码为 16 字节或 32 位十六进制文本");
}

function resolveAttachmentUrl(media) {
  let url;
  if (media?.full_url) {
    url = new URL(media.full_url);
  } else if (media?.encrypt_query_param) {
    url = new URL("download", DEFAULT_CDN_BASE_URL);
    url.searchParams.set("encrypted_query_param", media.encrypt_query_param);
  } else {
    throw new Error("附件没有可安全验证的 CDN 地址，未下载");
  }
  if (url.protocol !== "https:" || !CDN_ALLOWLIST.has(url.hostname)) throw new Error("附件来源不在腾讯 CDN allowlist");
  return url;
}

function decryptAttachment(bytes, key) {
  if (!key) return bytes;
  if (bytes.length === 0 || bytes.length % 16 !== 0) throw new Error("附件密文长度不符合 AES-128-ECB 协议");
  try {
    const decipher = createDecipheriv("aes-128-ecb", key, null);
    return Buffer.concat([decipher.update(bytes), decipher.final()]);
  } catch {
    throw new Error("附件 AES-128-ECB 解密失败");
  }
}

async function readLimitedBody(response, maxBytes = MAX_ATTACHMENT_BYTES) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("附件响应不可流式验证");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel("attachment too large").catch(() => {});
      throw new Error("附件超过 10 MB");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

function messageKey(message) {
  return String(message.message_id || message.client_id || `${message.from_user_id}:${message.seq}:${message.create_time_ms}`);
}

function normalizeInbound(message) {
  const items = message.item_list || [];
  const text = items.filter((item) => item.type === 1).map((item) => item.text_item?.text || "").join("\n").trim();
  const voiceText = items.filter((item) => item.type === 3).map((item) => item.voice_item?.text || "").join("\n").trim();
  return {
    id: messageKey(message),
    senderId: message.from_user_id || "",
    contextToken: message.context_token || "",
    text: text || voiceText,
    items,
    raw: message,
  };
}

class WeixinIlinkAdapter {
  constructor({ client, clientFactory, credentialStore = new LocalCredentialStore(), processLock = new LocalProcessLock(), fetchImpl = fetch, qrRenderer = renderLoginQr, onMessage = async () => ({ text: "已收到" }), quarantineRoot = path.join(PATHS.runtimeRoot, "quarantine", "weixin"), staleSessionPauseMs = STALE_SESSION_PAUSE_MS, delay = abortableDelay } = {}) {
    this.credentials = credentialStore;
    this.client = client || new WeixinIlinkClient();
    this.clientFactory = clientFactory || ((credential) => client || new WeixinIlinkClient({ baseUrl: credential.baseUrl, token: credential.token }));
    this.onMessage = onMessage;
    this.processLock = processLock;
    this.fetchImpl = fetchImpl;
    this.qrRenderer = qrRenderer;
    this.quarantineRoot = quarantineRoot;
    this.staleSessionPauseMs = staleSessionPauseMs;
    this.delay = delay;
    this.running = false;
    this.abortController = null;
    this.seen = new Set();
    this.contexts = new Map();
    this.contextsDirty = false;
    this.lastError = null;
  }

  async beginLogin() {
    const result = await this.client.getQrCode();
    if (result.ret && result.ret !== 0) throw new Error(result.errmsg || "获取微信二维码失败");
    this.pendingQr = result.qrcode;
    const loginUrl = validateLoginQrUrl(result.qrcode_img_content);
    return { qrcode: result.qrcode, imageUrl: await this.qrRenderer(loginUrl), expiresInSeconds: result.expire_seconds || 300 };
  }

  async pollLogin() {
    if (!this.pendingQr) throw new Error("请先获取二维码");
    const result = await this.client.getQrStatus(this.pendingQr);
    if (["confirmed", "success"].includes(result.status) || result.bot_token) {
      const credential = {
        token: result.bot_token,
        baseUrl: validateIlinkBaseUrl(result.baseurl || result.base_url || DEFAULT_BASE_URL).toString(),
        botId: result.ilink_bot_id || result.bot_id || "",
        ownerId: result.ilink_user_id || result.user_id || "",
        cursor: "",
        contexts: {},
        seenIds: [],
        savedAt: new Date().toISOString(),
      };
      const wasRunning = this.running;
      if (wasRunning) await this.stop();
      try {
        await this.credentials.save(credential);
      } catch (error) {
        if (wasRunning) await this.start();
        throw error;
      }
      this.pendingQr = null;
      if (wasRunning) await this.start();
      return { status: "confirmed", botId: credential.botId, ownerBound: Boolean(credential.ownerId) };
    }
    return { status: result.status || "waiting" };
  }

  async start() {
    if (this.running) return this.status();
    const credential = await this.credentials.load();
    if (!credential?.token) return this.status();
    this.credential = credential;
    if (!await this.processLock.acquire()) {
      this.lastError = "微信轮询器已由另一个 Syno 进程持有";
      return this.status();
    }
    try {
      this.contexts = new Map(Object.entries(credential.contexts || {}));
      this.contextsDirty = false;
      this.seen = new Set((credential.seenIds || []).slice(-2_000));
      this.client = this.clientFactory(credential);
      this.lastError = null;
      this.running = true;
      this.abortController = new AbortController();
      this.pollPromise = this.#pollLoop(this.abortController.signal)
        .catch((error) => { this.lastError = error.message; })
        .finally(async () => { this.running = false; await this.processLock.release(); });
      return this.status();
    } catch (error) {
      await this.processLock.release();
      throw error;
    }
  }

  async stop() {
    this.abortController?.abort();
    await this.pollPromise?.catch(() => {});
    this.running = false;
    return this.status();
  }

  status() {
    return { id: "weixin", running: this.running, available: Boolean(this.credential?.token), ownerBound: Boolean(this.credential?.ownerId), lastError: this.lastError };
  }

  async send(message) {
    const toUserId = message.toUserId || this.credential?.ownerId;
    const contextToken = message.contextToken || this.contexts.get(toUserId);
    if (!toUserId || !contextToken) return { delivered: false, reason: "no_active_context" };
    const result = await this.client.sendText({ toUserId, contextToken, text: String(message.text || message.body || "") });
    const explicitFailure = (result.ret !== undefined && Number(result.ret) !== 0)
      || (result.errcode !== undefined && Number(result.errcode) !== 0);
    const accepted = result.message_id !== undefined || Number(result.ret) === 0;
    return { delivered: !explicitFailure && accepted, ...(!explicitFailure && accepted ? {} : { reason: "provider_rejected" }) };
  }

  async #pollLoop(signal) {
    let backoff = 1_000;
    let longPollingTimeoutMs = 45_000;
    while (!signal.aborted && this.running) {
      try {
        const result = await this.client.getUpdates(this.credential.cursor || "", signal, longPollingTimeoutMs);
        if (Number(result.errcode) === -14 || Number(result.ret) === -14) {
          throw Object.assign(new Error("微信会话暂时冷却，将自动恢复"), { code: "STALE_SESSION" });
        }
        if (result.ret && result.ret !== 0) throw new Error(result.errmsg || `getUpdates ret=${result.ret}`);
        for (const message of result.msgs || []) await this.handleInbound(message);
        this.credential.cursor = result.get_updates_buf || this.credential.cursor || "";
        await this.#persistRuntimeState();
        if (Number.isFinite(Number(result.longpolling_timeout_ms))) {
          longPollingTimeoutMs = Math.min(120_000, Math.max(15_000, Number(result.longpolling_timeout_ms) + 5_000));
        }
        this.lastError = null;
        backoff = 1_000;
      } catch (error) {
        if (signal.aborted || error.name === "AbortError") break;
        this.lastError = error.message;
        if (error.code === "STALE_SESSION") {
          await this.delay(this.staleSessionPauseMs, signal);
          continue;
        }
        await this.delay(backoff, signal);
        backoff = Math.min(30_000, backoff * 2);
      }
    }
  }

  async #persistRuntimeState() {
    if (!this.credential) return;
    this.credential.contexts = Object.fromEntries(this.contexts);
    this.credential.seenIds = [...this.seen].slice(-2_000);
    if (this.credentials.saveRuntime) await this.credentials.saveRuntime(this.credential, { contextsChanged: this.contextsDirty });
    else await this.credentials.save(this.credential);
    this.contextsDirty = false;
  }

  async handleInbound(raw) {
    if (raw.message_type && raw.message_type !== 1) return;
    const message = normalizeInbound(raw);
    if (this.seen.has(message.id)) return;

    if (!this.credential.ownerId) {
      await this.client.sendText({ toUserId: message.senderId, contextToken: message.contextToken, text: "扫码结果没有绑定所有者，请回到 Syno Web 重新扫码。" });
      await this.#markProcessed(message.id);
      return;
    }
    if (message.senderId !== this.credential.ownerId) {
      await this.client.sendText({ toUserId: message.senderId, contextToken: message.contextToken, text: "赛诺当前仅允许扫码者本人使用。" });
      await this.#markProcessed(message.id);
      return;
    }
    if (this.contexts.get(message.senderId) !== message.contextToken) {
      this.contexts.set(message.senderId, message.contextToken);
      this.contextsDirty = true;
    }
    const video = message.items.some((item) => item.type === 5);
    if (video) {
      await this.send({ toUserId: message.senderId, contextToken: message.contextToken, text: "当前版本暂不处理视频，请发送文字、语音、链接、图片或文件。" });
      await this.#markProcessed(message.id);
      return;
    }
    const media = message.items.filter((item) => item.type === 2 || item.type === 4);
    const artifacts = [];
    for (const item of media) {
      try { artifacts.push(await this.#quarantine(item)); } catch (error) { artifacts.push({ rejected: true, reason: error.message }); }
    }
    if (!message.text && !artifacts.length) { await this.#markProcessed(message.id); return; }
    const response = await this.onMessage({ channel: "weixin", ...message, artifacts });
    const delivery = await this.send({ toUserId: message.senderId, contextToken: message.contextToken, text: response?.text || response?.job?.result?.text || "任务已记录，请在 Syno 查看状态。" });
    if (!delivery.delivered) throw new Error(`微信回复未送达：${delivery.reason || "unknown"}`);
    await this.#markProcessed(message.id);
    return delivery;
  }

  async #markProcessed(id) {
    this.seen.add(id);
    if (this.seen.size > 2_000) this.seen.delete(this.seen.values().next().value);
    await this.#persistRuntimeState();
  }

  async #quarantine(item) {
    const media = item.image_item?.media || item.file_item?.media;
    const url = resolveAttachmentUrl(media);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTACHMENT_TIMEOUT_MS);
    const key = parseAttachmentKey(item);
    let contentType;
    let bytes;
    try {
      const response = await this.fetchImpl(url, { redirect: "error", signal: controller.signal });
      if (!response.ok) throw new Error(`附件下载 HTTP ${response.status}`);
      const maxWireBytes = MAX_ATTACHMENT_BYTES + (key ? 16 : 0);
      const length = Number(response.headers.get("content-length") || 0);
      if (length > maxWireBytes) throw new Error("附件超过 10 MB");
      contentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].toLowerCase();
      if (!/^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/plain|text\/markdown|application\/octet-stream)$/.test(contentType)) throw new Error(`附件 MIME 不受支持：${contentType}`);
      bytes = decryptAttachment(await readLimitedBody(response, maxWireBytes), key);
      if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error("附件超过 10 MB");
    } finally {
      clearTimeout(timer);
    }
    const sniffed = sniffMime(bytes);
    if (!sniffed) throw new Error("附件内容无法识别为受支持格式");
    if (key || contentType === "application/octet-stream") {
      if (!sniffed) throw new Error("二进制附件缺少可验证格式");
    } else if (contentType.startsWith("image/") || contentType === "application/pdf") {
      if (contentType !== sniffed) throw new Error(`附件声明 MIME 与内容不符：${contentType} / ${sniffed}`);
    } else if (contentType.startsWith("text/") && sniffed !== "text/plain") {
      throw new Error("文本附件内容验证失败");
    }
    const verifiedMime = key || contentType === "application/octet-stream" || contentType.startsWith("text/") ? sniffed : contentType;
    await fs.mkdir(this.quarantineRoot, { recursive: true });
    const supplied = path.basename(item.file_item?.file_name || "attachment.bin").replace(/[^\p{L}\p{N}._-]/gu, "_");
    const file = resolveInside(this.quarantineRoot, `${randomUUID().slice(0, 10)}-${supplied}`);
    await fs.writeFile(file, bytes, { mode: 0o600 });
    return { path: file, size: bytes.length, mime: verifiedMime, isolated: true, autoRead: false };
  }
}

export {
  CDN_ALLOWLIST,
  DEFAULT_BASE_URL,
  DEFAULT_CDN_BASE_URL,
  LocalCredentialStore,
  LocalProcessLock,
  MAX_ATTACHMENT_BYTES,
  WeixinIlinkAdapter,
  WeixinIlinkClient,
  fetchJson,
  normalizeInbound,
  parseAttachmentKey,
  readLimitedBody,
  resolveAttachmentUrl,
  renderLoginQr,
  sniffMime,
  validateIlinkBaseUrl,
  validateLoginQrUrl,
};
