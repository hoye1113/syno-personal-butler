import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";

const RETENTION = Object.freeze({ completedChatDays: 30, confirmedVoiceDays: 7, failedPayloadDays: 30 });
const DAY_MS = 86_400_000;

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporary, file);
}

class ConversationStore {
  constructor({ root = path.join(PATHS.stateRoot, "conversations"), clock = () => new Date(), retention = RETENTION } = {}) {
    this.root = root;
    this.clock = clock;
    this.retention = { ...RETENTION, ...retention };
  }

  file(id) {
    if (!/^[a-zA-Z0-9-]+$/.test(String(id))) throw new Error("Conversation ID 无效");
    return path.join(this.root, `${id}.json`);
  }

  async create({ id = `conversation-${randomUUID()}`, channel = "web", ownerId = "local-user", messages = [] } = {}) {
    const now = this.clock().toISOString();
    this.file(id);
    const conversation = { id, channel, ownerId, status: "active", messages, createdAt: now, updatedAt: now };
    await this.save(conversation);
    return conversation;
  }

  async runExclusive(id, operation) {
    const lockName = createHash("sha256").update(String(id)).digest("hex");
    const lock = new ProcessFileLock({ file: path.join(this.root, ".locks", `${lockName}.lock`) });
    return lock.run(operation);
  }

  async save(conversation) {
    conversation.updatedAt = this.clock().toISOString();
    await atomicJson(this.file(conversation.id), conversation);
    return conversation;
  }

  async get(id) {
    try { return JSON.parse(await fs.readFile(this.file(id), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }

  async append(id, ...messages) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    conversation.messages.push(...messages);
    return this.save(conversation);
  }

  async prune() {
    await fs.mkdir(this.root, { recursive: true });
    const removed = [];
    for (const entry of await fs.readdir(this.root, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const file = path.join(this.root, entry.name);
      const value = JSON.parse(await fs.readFile(file, "utf8"));
      let changed = false;
      for (const message of value.messages || []) {
        const voice = message.rawVoice;
        if (!voice || !voice.confirmedAt) continue;
        if (this.clock().getTime() - new Date(voice.confirmedAt).getTime() <= this.retention.confirmedVoiceDays * DAY_MS) continue;
        delete message.rawVoice;
        changed = true;
      }
      if (!["completed", "failed"].includes(value.status)) {
        if (changed) await atomicJson(file, value);
        continue;
      }
      const days = value.status === "failed" ? this.retention.failedPayloadDays : this.retention.completedChatDays;
      if (this.clock().getTime() - new Date(value.updatedAt).getTime() <= days * DAY_MS) {
        if (changed) await atomicJson(file, value);
        continue;
      }
      await fs.rm(file, { force: true });
      removed.push(value.id);
      changed = false;
      continue;
    }
    return removed;
  }

  async markVoiceConfirmed(id, messageIndex, confirmedAt = this.clock().toISOString()) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    const message = conversation.messages?.[messageIndex];
    if (!message?.rawVoice) throw new Error("指定消息没有原始语音");
    message.rawVoice.confirmedAt = confirmedAt;
    return this.save(conversation);
  }
}

export { ConversationStore, RETENTION };
