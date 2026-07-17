import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
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
  constructor({ credentials = new FeishuCredentialStore(), sdkLoader = officialSdk, channelFactory, onMessage = async () => ({ text: "已收到" }) } = {}) {
    this.credentials = credentials; this.sdkLoader = sdkLoader; this.channelFactory = channelFactory; this.onMessage = onMessage;
    this.channel = null; this.running = false; this.lastError = ""; this.queue = []; this.draining = false; this.seen = new Set();
    this.registration = null; this.registrationState = { status: "idle" };
  }

  async start() {
    if (this.running) return this.status();
    const credential = await this.credentials.load();
    if (!credential) return this.status();
    const sdk = this.channelFactory ? null : await this.sdkLoader();
    const factory = this.channelFactory || ((options) => sdk.createLarkChannel(options));
    this.channel = factory({ appId: credential.appId, appSecret: credential.appSecret, transport: "websocket", policy: { dmMode: "open", requireMention: true, groupAllowlist: [] }, includeRawInMessage: false });
    this.channel.on("message", (message) => this.#enqueue(message, credential));
    this.channel.on?.("error", (error) => { this.lastError = error.message; });
    await this.channel.connect();
    this.running = true;
    return this.status();
  }

  async stop() {
    await this.channel?.disconnect?.();
    this.channel = null; this.running = false;
    return this.status();
  }

  status() {
    return { id: "feishu", running: this.running, available: Boolean(this.channel), registration: this.registrationState.status, lastError: this.lastError };
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
      onQRCodeReady: (info) => { this.registrationState = { status: "waiting_scan", url: info.url, expireIn: info.expireIn }; readyResolve(this.registrationState); },
      onStatusChange: (info) => { this.registrationState = { ...this.registrationState, status: info.status }; },
    }).then(async (result) => {
      await this.credentials.save({ appId: result.client_id, appSecret: result.client_secret, ownerOpenId: result.user_info?.open_id || "" });
      this.registrationState = { status: "confirmed", appId: result.client_id, ownerBound: Boolean(result.user_info?.open_id) };
      return this.registrationState;
    }).catch((error) => {
      this.registrationState = { status: "failed", error: error.code || error.message };
      return this.registrationState;
    }).finally(() => { this.registration = null; });
    return ready;
  }

  registrationStatus() { return this.registrationState; }

  #enqueue(message, credential) {
    if (!message?.messageId || this.seen.has(message.messageId)) return;
    this.seen.add(message.messageId);
    if (this.seen.size > 2_000) this.seen.delete(this.seen.values().next().value);
    if (message.chatType !== "p2p" || !credential.ownerOpenId || message.senderId !== credential.ownerOpenId) return;
    this.queue.push(message);
    queueMicrotask(() => this.#drain());
  }

  async #drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length) {
        const message = this.queue.shift();
        try {
          const response = await this.onMessage({ channel: "feishu", id: message.messageId, senderId: message.senderId, text: message.content, chatId: message.chatId });
          await this.send({ chatId: message.chatId, replyTo: message.messageId, text: response?.text || "任务已记录，请在 Syno 查看状态。" });
        } catch (error) { this.lastError = error.message; }
      }
    } finally { this.draining = false; }
  }
}

export { FeishuChannelAdapter, FeishuCredentialStore, officialSdk };
