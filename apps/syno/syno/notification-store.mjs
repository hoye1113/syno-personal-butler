import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { readRecord, writeRecord } from "./markdown-record.mjs";
import { walkRecords } from "./records.mjs";

class NotificationStore {
  constructor({ runtimeRoot = PATHS.runtimeRoot, clock = () => new Date() } = {}) {
    this.runtimeRoot = runtimeRoot;
    this.clock = clock;
  }
  async add({ title, body, level = "info", source = "syno", data = {} }) {
    const now = this.clock().toISOString();
    const key = data.idempotencyKey || (data.reportId ? `report:${data.reportId}:${source}` : "");
    const id = key ? `notice-${createHash("sha256").update(key).digest("hex").slice(0, 12)}` : `notice-${randomUUID().slice(0, 10)}`;
    if (key) {
      for (const existingFile of await walkRecords(path.join(this.runtimeRoot, "notifications"))) {
        if (path.basename(existingFile) !== `${id}.md`) continue;
        const existing = await readRecord(existingFile);
        existing.recordPath = null;
        existing.statePath = `local-state://notifications/${path.relative(path.join(this.runtimeRoot, "notifications"), existingFile).replace(/\\/g, "/")}`;
        return existing;
      }
    }
    const record = { id, title, body, level, source, data, read: false, created: now };
    const file = path.join(this.runtimeRoot, "notifications", now.slice(0, 4), now.slice(5, 7), `${record.id}.md`);
    await writeRecord(file, record, { title, summaryKeys: ["id", "level", "source", "read", "created"] });
    record.recordPath = null;
    record.statePath = `local-state://notifications/${path.relative(path.join(this.runtimeRoot, "notifications"), file).replace(/\\/g, "/")}`;
    return record;
  }
  async list({ limit = 50 } = {}) {
    const files = await walkRecords(path.join(this.runtimeRoot, "notifications"));
    const records = [];
    for (const file of files.slice(-limit * 2)) {
      try { records.push(await readRecord(file)); } catch {
        // README and invalid records are verified separately; they must not break the notification center.
      }
    }
    return records.sort((a, b) => b.created.localeCompare(a.created));
  }
}

export { NotificationStore };
