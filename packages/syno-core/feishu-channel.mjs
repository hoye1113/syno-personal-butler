import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

import { quarantineFeishuResources } from "./feishu-attachments.mjs";
import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";
import { protectSecret, unprotectSecret } from "./secret-protector.mjs";

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
        // 附件消息重试时要能重新下载，所以把资源描述一并留存（老状态缺这两个字段照常工作）
        rawContentType: String(message.rawContentType || ""),
        resources: Array.isArray(message.resources) ? message.resources.map((item) => ({
          type: String(item?.type || ""),
          fileKey: String(item?.fileKey || ""),
          ...(item?.fileName ? { fileName: String(item.fileName) } : {}),
        })) : [],
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
  constructor({ root = PATHS.credentialsRoot, protect = protectSecret, unprotect = unprotectSecret } = {}) {
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
  async updateOwner(ownerOpenId) {
    const current = await this.load();
    if (!current?.appId) throw new Error("飞书凭据未配置");
    await atomicWrite(this.metadataFile, JSON.stringify({ appId: current.appId, ownerOpenId: String(ownerOpenId || ""), updatedAt: new Date().toISOString() }, null, 2));
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

const DEFAULT_FEISHU_QUARANTINE_ROOT = () => path.join(PATHS.runtimeRoot, "quarantine", "feishu");

class FeishuChannelAdapter {
  constructor({ credentials = new FeishuCredentialStore(), stateStore = new FeishuStateStore(), processLock = new ProcessFileLock({ file: `${stateStore.file || path.join(PATHS.runtimeRoot, "locks", "feishu-channel")}.lock`, failFast: true, metadata: { entrypoint: "feishu-channel" } }), sdkLoader = officialSdk, channelFactory, onMessage = async () => ({ text: "已收到" }), typingIndicator = true, retryDelayMs = 30_000, quarantineRoot = DEFAULT_FEISHU_QUARANTINE_ROOT(), quarantineResources = quarantineFeishuResources } = {}) {
    this.credentials = credentials; this.sdkLoader = sdkLoader; this.channelFactory = channelFactory; this.onMessage = onMessage;
    this.quarantineRoot = quarantineRoot; this.quarantineResources = quarantineResources;
    this.stateStore = stateStore; this.processLock = processLock; this.processLease = null; this.retryDelayMs = retryDelayMs;
    this.typingIndicator = typingIndicator !== false;
    this.channel = null; this.running = false; this.ownerBound = false; this.lastError = ""; this.queue = []; this.draining = false; this.drainPromise = null; this.seen = new Set(); this.inflight = new Set(); this.retryTimer = null;
    this.ownerGeneration = 0;
    this.registration = null; this.registrationState = { status: "idle" };
  }

  async start() {
    if (this.running) return this.status();
    const credential = await this.credentials.load();
    this.ownerBound = Boolean(credential?.ownerOpenId);
    if (!credential) return this.status();
    try { this.processLease = await this.processLock.acquire(); }
    catch (error) {
      if (error.code !== "PROCESS_LOCK_TIMEOUT" && error.code !== "PROCESS_LOCK_HELD") throw error;
      this.lastError = "FEISHU_PROCESS_LOCKED";
      return this.status();
    }
    const ownerGeneration = ++this.ownerGeneration;
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
      this.channel.on("message", (message) => this.#enqueue(message, credential, ownerGeneration).catch((error) => { if (ownerGeneration === this.ownerGeneration) this.lastError = error.message; }));
      this.channel.on?.("error", (error) => { if (ownerGeneration === this.ownerGeneration) this.lastError = error.message; });
      await this.channel.connect();
      this.running = true; this.lastError = "";
      await this.#recoverPending(credential, ownerGeneration);
      return this.status();
    } catch (error) {
      this.lastError = error.message;
      await this.#teardown().catch(() => {});
      throw error;
    }
  }

  async stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    await this.drainPromise;
    try { await this.#teardown(); return this.status(); }
    catch (error) { this.lastError = error.message; throw error; }
  }

  async #teardown() {
    let failure = null;
    this.ownerGeneration += 1;
    try { await this.channel?.disconnect?.(); }
    catch (error) { failure = error; }
    finally {
      this.channel = null; this.running = false;
      try { await this.processLease?.release(); }
      catch (error) { failure ||= error; }
      this.processLease = null;
    }
    if (failure) throw failure;
  }

  status() {
    return { id: "feishu", running: this.running, available: Boolean(this.channel), ownerBound: this.ownerBound, registration: this.registrationState.status, lastError: this.lastError };
  }

  async send(message) {
    const chatId = message.chatId;
    if (!this.running || !chatId) return { delivered: false, reason: !this.running ? "not_connected" : "missing_chat" };
    // @larksuiteoapi/node-sdk 1.64.0 does not forward a caller-supplied
    // idempotency key to im.v1.message.create/reply. Keep the key in the
    // local Outbox/audit record, but do not pretend it is a provider key.
    const deliveryKey = message.deliveryKey || message.idempotencyKey || null;
    await this.channel.send(chatId, { markdown: String(message.text || message.body || "") }, message.replyTo ? { replyTo: message.replyTo } : undefined);
    return {
      delivered: true,
      deliveryCapability: "at_least_once",
      ...(deliveryKey ? { deliveryKey: String(deliveryKey), stableProviderIdentity: null } : {}),
    };
  }

  // 飞书没有 typing API：用一条可 patch 的 interactive 卡片承接「正在回复中」，
  // 答复就绪后原位更新同一条消息（im.v1.message.patch），失败则收回占位卡
  // 并退回普通发送。全链路 best-effort，占位失败不阻断正常回复。
  #statusCard(markdown, summary) {
    return {
      schema: "2.0",
      config: { update_multi: true, ...(summary ? { summary: { content: String(summary).slice(0, 80) } } : {}) },
      body: { elements: [{ tag: "markdown", content: String(markdown || "") }] },
    };
  }

  async #openTypingCard(message) {
    if (!this.typingIndicator || !this.running || typeof this.channel?.send !== "function") return null;
    try {
      const result = await this.channel.send(
        message.chatId,
        { card: this.#statusCard("⏳ Syno 正在回复中…", "Syno 正在回复中…") },
        message.messageId ? { replyTo: message.messageId } : undefined,
      );
      return result?.messageId || null;
    } catch {
      return null;
    }
  }

  async #clearTypingCard(messageId) {
    if (!messageId || typeof this.channel?.recallMessage !== "function") return;
    try { await this.channel.recallMessage(messageId); } catch {}
  }

  async #deliverReply(message, text, typingCardId) {
    if (typingCardId && typeof this.channel?.updateCard === "function") {
      try {
        await this.channel.updateCard(typingCardId, this.#statusCard(text, text));
        return { delivered: true, deliveryCapability: "at_least_once", updatedTypingCard: true };
      } catch {
        await this.#clearTypingCard(typingCardId);
      }
    }
    return this.send({ chatId: message.chatId, replyTo: message.messageId, text });
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

  async #enqueue(message, credential, ownerGeneration) {
    if (ownerGeneration !== this.ownerGeneration || !this.running || !this.processLease) return;
    if (!message?.messageId || this.seen.has(message.messageId) || this.inflight.has(message.messageId)) return;
    if (message.chatType !== "p2p" || !message.senderId) return;
    if (!credential.ownerOpenId) {
      credential.ownerOpenId = message.senderId;
      if (typeof this.credentials?.updateOwner === "function") {
        await this.credentials.updateOwner(message.senderId).catch(() => {});
      } else if (typeof this.credentials?.save === "function") {
        await this.credentials.save({
          appId: credential.appId,
          appSecret: credential.appSecret,
          ownerOpenId: message.senderId,
        }).catch(() => {});
      }
      this.ownerBound = true;
    }
    if (message.senderId !== credential.ownerOpenId) return;
    if (!await this.stateStore.reserve(message)) return;
    if (ownerGeneration !== this.ownerGeneration || !this.running || !this.processLease) return;
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

  async #recoverPending(credential, ownerGeneration = this.ownerGeneration) {
    if (ownerGeneration !== this.ownerGeneration || !this.running || !this.processLease) return;
    const state = await this.stateStore.snapshot();
    if (ownerGeneration !== this.ownerGeneration || !this.running || !this.processLease) return;
    this.seen = new Set(state.seenIds);
    for (const message of state.pending) {
      if (message.chatType === "p2p" && credential.ownerOpenId && message.senderId === credential.ownerOpenId) this.#queueReserved(message);
    }
  }

  #scheduleRetry() {
    if (this.retryTimer || !this.running) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      const ownerGeneration = this.ownerGeneration;
      this.credentials.load().then((credential) => credential && this.#recoverPending(credential, ownerGeneration)).catch((error) => { if (ownerGeneration === this.ownerGeneration) this.lastError = error.message; });
    }, this.retryDelayMs);
    this.retryTimer.unref?.();
  }

  // 把消息里的 image/file 资源落到隔离区。失败项以 { rejected } 记录，由 handler 如实回报，
  // 绝不假装收到；文本消息（resources 为空）不产生任何 artifact。
  async #collectArtifacts(message) {
    const resources = Array.isArray(message?.resources) ? message.resources : [];
    if (!resources.length) return [];
    try {
      return await this.quarantineResources({
        rawClient: this.channel?.rawClient,
        messageId: message.messageId,
        resources,
        quarantineRoot: this.quarantineRoot,
      });
    } catch (error) {
      return [{ rejected: true, reason: String(error?.message || error) }];
    }
  }

  async #drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length) {
        const message = this.queue.shift();
        let typingCardId = null;
        try {
          typingCardId = await this.#openTypingCard(message);
          const artifacts = await this.#collectArtifacts(message);
          const response = await this.onMessage({
            channel: "feishu",
            id: message.messageId,
            senderId: message.senderId,
            text: message.content,
            chatId: message.chatId,
            privateConversation: true,
            ...(artifacts.length ? { artifacts } : {}),
          });
          if (response?.deferredDelivery === true) {
            await this.#clearTypingCard(typingCardId);
            await this.stateStore.complete(message.messageId);
            this.seen.add(message.messageId);
            if (this.seen.size > 2_000) this.seen.delete(this.seen.values().next().value);
            this.lastError = "";
            continue;
          }
          const text = response?.text || "任务已记录，请在 Syno 查看状态。";
          const delivery = await this.#deliverReply(message, text, typingCardId);
          if (!delivery?.delivered) throw Object.assign(new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`), { code: "FEISHU_REPLY_UNDELIVERED", retryable: true });
          await this.stateStore.complete(message.messageId);
          this.seen.add(message.messageId);
          if (this.seen.size > 2_000) this.seen.delete(this.seen.values().next().value);
          this.lastError = "";
        } catch (error) {
          await this.#clearTypingCard(typingCardId);
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
