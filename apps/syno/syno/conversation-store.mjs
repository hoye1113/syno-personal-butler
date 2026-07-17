import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const RETENTION = Object.freeze({ completedChatDays: 30, confirmedVoiceDays: 7, failedPayloadDays: 30 });

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

  async create({ channel = "web", ownerId = "local-user", messages = [] } = {}) {
    const now = this.clock().toISOString();
    const conversation = { id: `conversation-${randomUUID()}`, channel, ownerId, status: "active", messages, createdAt: now, updatedAt: now };
    await this.save(conversation);
    return conversation;
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
      if (!["completed", "failed"].includes(value.status)) continue;
      const days = value.status === "failed" ? this.retention.failedPayloadDays : this.retention.completedChatDays;
      if (this.clock().getTime() - new Date(value.updatedAt).getTime() <= days * 86_400_000) continue;
      await fs.rm(file, { force: true });
      removed.push(value.id);
    }
    return removed;
  }
}

export { ConversationStore, RETENTION };
