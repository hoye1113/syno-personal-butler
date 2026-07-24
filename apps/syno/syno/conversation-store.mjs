import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";

const RETENTION = Object.freeze({ completedChatDays: 30, confirmedVoiceDays: 7, failedPayloadDays: 30, archivedDays: 30, archivedConvDays: 90, compactionLogMax: 200, summariesMax: 50, archiveExternalThreshold: 100 });
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
    const conversation = { id, channel, ownerId, status: "active", messages, archive: [], summaries: [], compactionLog: [], handoffContext: null, createdAt: now, updatedAt: now };
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
    // archive 外置（STORE 3.2）：已外置（archiveRef）或达到阈值时，archive 追加到独立文件，
    // 主文件只留 archiveRef，使 get()/save() 的热路径（messages）保持小而快。外置前内联，与历史一致。
    if (Array.isArray(conversation.archive) && conversation.archive.length) {
      if (conversation.archiveRef || conversation.archive.length >= this.retention.archiveExternalThreshold) {
        await this.#appendArchive(conversation.id, conversation.archive);
        conversation.archiveRef = this.#archiveFile(conversation.id);
        conversation.archive = [];
      }
    }
    await atomicJson(this.file(conversation.id), conversation);
    return conversation;
  }

  async get(id) {
    try { return this.#normalize(JSON.parse(await fs.readFile(this.file(id), "utf8"))); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }

  #normalize(conversation) {
    conversation.messages ??= [];
    conversation.archive ??= [];
    conversation.summaries ??= [];
    conversation.compactionLog ??= [];
    conversation.handoffContext ??= null;
    return conversation;
  }

  async append(id, ...messages) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    conversation.messages.push(...messages);
    return this.save(conversation);
  }

  async archiveMessages(id, messagesToArchive, reason = "compaction", archivedAt = this.clock().toISOString()) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    const stamped = (messagesToArchive || []).map((message) => ({ ...message, archivedAt, archiveReason: reason }));
    conversation.archive.push(...stamped);
    return this.save(conversation);
  }

  async addSummary(id, summary) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    conversation.summaries.push({ at: this.clock().toISOString(), ...summary });
    return this.save(conversation);
  }

  async addCompactionLog(id, log) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    conversation.compactionLog.push({ at: this.clock().toISOString(), ...log });
    return this.save(conversation);
  }

  async setHandoffContext(id, context) {
    const conversation = await this.get(id);
    if (!conversation) throw new Error(`Conversation 不存在：${id}`);
    conversation.handoffContext = context;
    return this.save(conversation);
  }

  // 外置 archive 按需读取（RECOVER/巡检用）；未外置时回退内联 archive。
  async getArchive(id) {
    const conversation = await this.get(id);
    if (!conversation) return null;
    if (conversation.archiveRef) {
      try { return JSON.parse(await fs.readFile(path.join(this.root, conversation.archiveRef), "utf8")); }
      catch (error) { if (error.code === "ENOENT") return []; throw error; }
    }
    return Array.isArray(conversation.archive) ? conversation.archive : [];
  }

  #archiveFile(id) {
    return `${id}.archive.json`;
  }

  async #appendArchive(id, messages) {
    const file = path.join(this.root, this.#archiveFile(id));
    let existing = [];
    try { existing = JSON.parse(await fs.readFile(file, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    await atomicJson(file, [...existing, ...messages]);
  }

  async prune() {
    await fs.mkdir(this.root, { recursive: true });
    const removed = [];
    for (const entry of await fs.readdir(this.root, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const file = path.join(this.root, entry.name);
      if (entry.name.endsWith(".archive.json")) {
        // 外置 archive 的 30 天保留（与内联 archive 同策略）
        let arr;
        try { arr = JSON.parse(await fs.readFile(file, "utf8")); } catch { continue; }
        if (!Array.isArray(arr)) continue;
        const keptExt = arr.filter((message) => !message.archivedAt || this.clock().getTime() - new Date(message.archivedAt).getTime() <= this.retention.archivedDays * DAY_MS);
        if (keptExt.length !== arr.length) {
          if (keptExt.length) await atomicJson(file, keptExt);
          else await fs.rm(file, { force: true });
        }
        continue;
      }
      const value = JSON.parse(await fs.readFile(file, "utf8"));
      let changed = false;
      for (const message of value.messages || []) {
        const voice = message.rawVoice;
        if (!voice || !voice.confirmedAt) continue;
        if (this.clock().getTime() - new Date(voice.confirmedAt).getTime() <= this.retention.confirmedVoiceDays * DAY_MS) continue;
        delete message.rawVoice;
        changed = true;
      }
      const keptArchive = (value.archive || []).filter((message) => {
        if (!message.archivedAt) return true;
        return this.clock().getTime() - new Date(message.archivedAt).getTime() <= this.retention.archivedDays * DAY_MS;
      });
      if (keptArchive.length !== (value.archive || []).length) {
        value.archive = keptArchive;
        changed = true;
      }
      // 元数据滚动上限：长对话的 compactionLog/summaries 有界，避免主文件无限膨胀（STORE 3.2）
      const log = Array.isArray(value.compactionLog) ? value.compactionLog : [];
      if (log.length > this.retention.compactionLogMax) {
        value.compactionLog = log.slice(log.length - this.retention.compactionLogMax);
        changed = true;
      }
      const summaries = Array.isArray(value.summaries) ? value.summaries : [];
      if (summaries.length > this.retention.summariesMax) {
        value.summaries = summaries.slice(summaries.length - this.retention.summariesMax);
        changed = true;
      }
      if (!["completed", "failed", "archived"].includes(value.status)) {
        if (changed) await atomicJson(file, value);
        continue;
      }
      const days = value.status === "failed" ? this.retention.failedPayloadDays
        : value.status === "archived" ? this.retention.archivedConvDays
        : this.retention.completedChatDays;
      if (this.clock().getTime() - new Date(value.updatedAt).getTime() <= days * DAY_MS) {
        if (changed) await atomicJson(file, value);
        continue;
      }
      await fs.rm(file, { force: true });
      await fs.rm(path.join(this.root, this.#archiveFile(value.id)), { force: true }); // 连带删除外置 archive
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
