import { randomUUID } from "node:crypto";
import path from "node:path";

import { PATHS, relativeToRepo } from "./paths.mjs";
import { readRecord, writeRecord } from "./markdown-record.mjs";
import { walkRecords } from "./records.mjs";

class NotificationStore {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
    this.opsRoot = opsRoot;
    this.clock = clock;
  }
  async add({ title, body, level = "info", source = "syno", data = {} }) {
    const now = this.clock().toISOString();
    const record = { id: `notice-${randomUUID().slice(0, 10)}`, title, body, level, source, data, read: false, created: now };
    const file = path.join(this.opsRoot, "notifications", now.slice(0, 4), now.slice(5, 7), `${record.id}.md`);
    await writeRecord(file, record, { title, summaryKeys: ["id", "level", "source", "read", "created"] });
    try {
      record.recordPath = relativeToRepo(file);
    } catch {
      // Test/custom adapters may intentionally persist outside the repository.
      record.recordPath = null;
    }
    return record;
  }
  async list({ limit = 50 } = {}) {
    const files = await walkRecords(path.join(this.opsRoot, "notifications"));
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
