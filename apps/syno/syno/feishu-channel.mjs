import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

const FAILED_PAYLOAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const STATE_OPERATION_TAILS = new Map();
const SILENT_SDK_LOGGER = Object.freeze({
  error() {},
  warn() {},
  info() {},
  debug() {},
  trace() {},
});

function validateRegistrationUrl(value) {
  const url = new URL(value || "");
  if (url.protocol !== "https:" || url.hostname !== "open.feishu.cn" || url.pathname !== "/page/launcher") {
    throw new Error("飞书注册二维码 URL 不在官方启动页范围");
  }
  return url.toString();
}

async function renderRegistrationQr(value) {
  return QRCode.toDataURL(validateRegistrationUrl(value), {
    type: "image/png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

class FeishuStateStore {
  constructor({ file = path.join(PATHS.stateRoot, "feishu-channel.json"), clock = () => new Date() } = {}) {
    this.file = file;
    this.clock = clock;
  }
  async snapshot() {
    return this.#serialized(async () => {
      const state = await this.#read();
      await this.#write(state);
      return state;
    });
  }
  async reserve(message) {
    return this.#serialized(async () => {
      const state = await this.#read();
      if (state.seenIds.includes(message.messageId) || state.pending.some((item) => item.messageId === message.messageId)) return false;
      state.pending.push({
        messageId: message.messageId,
        chatId: message.chatId,
        chatType: message.chatType,
        senderId: message.senderId,
        content: String(message.content || ""),
        createdAt: this.clock().toISOString(),
      });
      await this.#write(state);
      return true;
    });
  }
  async complete(messageId) {
    return this.#serialized(async () => {
      const state = await this.#read();
      state.pending = state.pending.filter((item) => item.messageId !== messageId);
      state.seenIds = [...state.seenIds.filter((id) => id !== messageId), messageId].slice(-2_000);
      await this.#write(state);
      return state;
    });
  }
  #serialized(operation) {
    const key = path.resolve(this.file).toLocaleLowerCase("en-US");
    const previous = STATE_OPERATION_TAILS.get(key) || Promise.resolve();
    const result = previous.then(operation, operation);
    const tail = result.catch(() => {});
    STATE_OPERATION_TAILS.set(key, tail);
    void tail.then(() => { if (STATE_OPERATION_TAILS.get(key) === tail) STATE_OPERATION_TAILS.delete(key); });
    return result;
  }
  async #read() {
    let parsed = { version: 1, seenIds: [], pending: [] };
    try { parsed = JSON.parse(await fs.readFile(this.file, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    const cutoff = this.clock().getTime() - FAILED_PAYLOAD_RETENTION_MS;
    return {
      version: 1,
      seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds.map(String).slice(-2_000) : [],
      pending: Array.isArray(parsed.pending)
        ? parsed.pending.filter((item) => item?.messageId && Date.parse(item.createdAt) >= cutoff).map((item) => ({
          messageId: String(item.messageId), chatId: String(item.chatId || ""), chatType: String(item.chatType || ""),
          senderId: String(item.senderId || ""), content: String(item.content || ""), createdAt: item.createdAt,
        }))
        : [],
    };
  }
  async #write(state) {
    await atomicWrite(this.file, `${JSON.stringify(state, null, 2)}\n`);
  }
}

class FeishuCredentialStore {
  constructor({ root = PATHS.credentialsRoot, protect = (value) => runDpapi("protect", value), unprotect = (value) => runDpapi("unprotect", value) } = {}) {
    this.metadataFile = path.join(root, "feishu.json");
    this.secretFile = path.join(root, "feishu-secret.dpapi");
    this.protect = protect; this.unprotect = unprotect;
  }
  async save(value) {
    if (!value.appId || !value.appSecret) throw new Error("飞书 App ID/App Secret 不完整");
    await atomicWrite(this.secretFile, await this.protect(value.appSecret));
    await atomicWrite(this.metadataFile, JSON.stringify({ appId: value.appId, ownerOpenId: value.ownerOpenId || "", updatedAt: new Date().toISOString() }, null, 2));
    return this.status();
  }
  async load() {
    try {
      const metadata = JSON.parse(await fs.readFile(this.metadataFile, "utf8"));
      return { ...metadata, appSecret: await this.unprotect(await fs.readFile(this.secretFile, "utf8")) };
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  async status() {
    const value = await this.load().catch(() => null);
    return value ? { configured: true, appId: value.appId, ownerBound: Boolean(value.ownerOpenId), updatedAt: value.updatedAt } : { configured: false, ownerBound: false };
  }
}

async function officialSdk() { return import("@larksuiteoapi/node-sdk"); }

class FeishuChannelAdapter {
  constructor({ credentials = new FeishuCredentialStore(), stateStore = new FeishuStateStore(), processLock = new ProcessFileLock({ file: path.join(PATHS.runtimeRoot, "locks", "feishu-channel.lock"), timeoutMs: 250 }), sdkLoader = officialSdk, channelFactory, onMessage = async () => ({ text: "已收到" }), retryDelayMs = 30_000 } = {}) {
    this.credentials = credentials; this.sdkLoader = sdkLoader; this.channelFactory = channelFactory; this.onMessage = onMessage;
    this.stateStore = stateStore; this.processLock = processLock; this.processLease = null; this.retryDelayMs = retryDelayMs;
    this.channel = null; this.running = false; this.ownerBound = false; this.lastError = ""; this.queue = []; this.draining = false; this.drainPromise = null; this.seen = new Set(); this.inflight = new Set(); this.retryTimer = null;
    this.registration = null; this.registrationState = { status: "idle" };
  }

  async start() {
    if (this.running) return this.status();
    const credential = await this.credentials.load();
    this.ownerBound = Boolean(credential?.ownerOpenId);
    if (!credential) return this.status();
    try { this.processLease = await this.processLock.acquire(); }
    catch (error) {
      if (error.code !== "PROCESS_LOCK_TIMEOUT") throw error;
      this.lastError = "FEISHU_PROCESS_LOCKED";
      return this.status();
    }
    try {
      const sdk = this.channelFactory ? null : await this.sdkLoader();
      const factory = this.channelFactory || ((options) => sdk.createLarkChannel(options));
      this.channel = factory({
        appId: credential.appId,
        appSecret: credential.appSecret,
        transport: "websocket",
        policy: { dmMode: "open", requireMention: true, groupAllowlist: [] },
        includeRawInMessage: false,
        logger: SILENT_SDK_LOGGER,
        loggerLevel: 0,
      });
      this.channel.on("message", (message) => this.#enqueue(message, credential).catch((error) => { this.lastError = error.message; }));
      this.channel.on?.("error", (error) => { this.lastError = error.message; });
      await this.channel.connect();
      this.running = true; this.lastError = "";
      await this.#recoverPending(credential);
      return this.status();
    } catch (error) {
      await this.processLease?.release(); this.processLease = null; this.channel = null;
      throw error;
    }
  }

  async stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    await this.drainPromise;
    try { await this.channel?.disconnect?.(); }
    finally { await this.processLease?.release(); this.processLease = null; }
    this.channel = null; this.running = false;
    return this.status();
  }

  status() {
    return { id: "feishu", running: this.running, available: Boolean(this.channel), ownerBound: this.ownerBound, registration: this.registrationState.status, lastError: this.lastError };
  }

  async send(message) {
    const chatId = message.chatId;
    if (!this.running || !chatId) return { delivered: false, reason: !this.running ? "not_connected" : "missing_chat" };
    await this.channel.send(chatId, { markdown: String(message.text || message.body || "") }, message.replyTo ? { replyTo: message.replyTo } : undefined);
    return { delivered: true };
  }

  async beginRegistration() {
    if (this.registration) return this.registrationState;
    const sdk = await this.sdkLoader();
    const controller = new AbortController();
    this.registrationState = { status: "starting" };
    let readyResolve;
    const ready = new Promise((resolve) => { readyResolve = resolve; });
    this.registration = sdk.registerApp({
      signal: controller.signal,
      createOnly: true,
      source: "syno-personal-butler",
      appPreset: { name: "Syno 赛诺", desc: "主动式知识闭环私人管家" },
      addons: { preset: false, scopes: { tenant: ["im:message:send_as_bot", "im:message:readonly"] }, events: { items: { tenant: ["im.message.receive_v1"] } } },
      onQRCodeReady: (info) => {
        renderRegistrationQr(info.url).then((qrDataUrl) => {
          if (this.registrationState.status === "starting") {
            this.registrationState = { status: "waiting_scan", url: validateRegistrationUrl(info.url), qrDataUrl, expireIn: info.expireIn };
          }
          readyResolve(this.registrationState);
        }).catch((error) => {
          this.registrationState = { status: "failed", error: error.code || error.message };
          readyResolve(this.registrationState);
        });
      },
      onStatusChange: (info) => { this.registrationState = { ...this.registrationState, status: info.status }; },
    }).then(async (result) => {
      await this.credentials.save({ appId: result.client_id, appSecret: result.client_secret, ownerOpenId: result.user_info?.open_id || "" });
      this.registrationState = { status: "confirmed", appId: result.client_id, ownerBound: Boolean(result.user_info?.open_id) };
      await this.start();
      return this.registrationState;
    }).catch((error) => {
      this.registrationState = { status: "failed", error: error.code || error.message };
      return this.registrationState;
    }).finally(() => { this.registration = null; });
    return ready;
  }

  registrationStatus() { return this.registrationState; }

  async #enqueue(message, credential) {
    if (!message?.messageId || this.seen.has(message.messageId) || this.inflight.has(message.messageId)) return;
    if (message.chatType !== "p2p" || !credential.ownerOpenId || message.senderId !== credential.ownerOpenId) return;
    if (!await this.stateStore.reserve(message)) return;
    this.#queueReserved(message);
  }

  #queueReserved(message) {
    if (this.seen.has(message.messageId) || this.inflight.has(message.messageId)) return;
    this.inflight.add(message.messageId);
    this.queue.push(message);
    this.#ensureDrain();
  }

  #ensureDrain() {
    if (this.drainPromise) return this.drainPromise;
    const drain = this.#drain();
    this.drainPromise = drain.finally(() => {
      this.drainPromise = null;
      if (this.queue.length) this.#ensureDrain();
    });
    return this.drainPromise;
  }

  async #recoverPending(credential) {
    const state = await this.stateStore.snapshot();
    this.seen = new Set(state.seenIds);
    for (const message of state.pending) {
      if (message.chatType === "p2p" && credential.ownerOpenId && message.senderId === credential.ownerOpenId) this.#queueReserved(message);
    }
  }

  #scheduleRetry() {
    if (this.retryTimer || !this.running) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.credentials.load().then((credential) => credential && this.#recoverPending(credential)).catch((error) => { this.lastError = error.message; });
    }, this.retryDelayMs);
    this.retryTimer.unref?.();
  }

  async #drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length) {
        const message = this.queue.shift();
        try {
          const response = await this.onMessage({ channel: "feishu", id: message.messageId, senderId: message.senderId, text: message.content, chatId: message.chatId });
          const delivery = await this.send({ chatId: message.chatId, replyTo: message.messageId, text: response?.text || "任务已记录，请在 Syno 查看状态。" });
          if (!delivery?.delivered) throw Object.assign(new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`), { code: "FEISHU_REPLY_UNDELIVERED", retryable: true });
          await this.stateStore.complete(message.messageId);
          this.seen.add(message.messageId);
          if (this.seen.size > 2_000) this.seen.delete(this.seen.values().next().value);
          this.lastError = "";
        } catch (error) {
          this.lastError = error.message;
          this.#scheduleRetry();
        } finally {
          this.inflight.delete(message.messageId);
        }
      }
    } finally { this.draining = false; }
  }
}

export { FAILED_PAYLOAD_RETENTION_MS, FeishuChannelAdapter, FeishuCredentialStore, FeishuStateStore, officialSdk, renderRegistrationQr, SILENT_SDK_LOGGER, validateRegistrationUrl };
