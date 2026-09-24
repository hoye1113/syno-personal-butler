import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../../../packages/syno-core/paths.mjs";
import { readRecord, writeRecord } from "../../../packages/syno-core/markdown-record.mjs";
import { ProcessFileLock } from "../../../packages/syno-core/process-lock.mjs";
import { walkRecords } from "./records.mjs";

const SETTLED_NOTIFICATION_STATUSES = new Set(["delivered", "failed_terminal"]);

class NotificationStore {
  constructor({ runtimeRoot = PATHS.runtimeRoot, archiveRoot = path.join(runtimeRoot, "notifications-archive"), clock = () => new Date() } = {}) {
    this.runtimeRoot = runtimeRoot;
    this.archiveRoot = archiveRoot;
    this.clock = clock;
    this.archiveMigration = null;
  }

  #root() {
    return path.join(this.runtimeRoot, "notifications");
  }

  #statePath(file, root) {
    const prefix = root === this.archiveRoot ? "notifications-archive" : "notifications";
    return `local-state://${prefix}/${path.relative(root, file).replace(/\\/g, "/")}`;
  }

  #lock() {
    return new ProcessFileLock({ file: path.join(this.runtimeRoot, "locks", "notifications.lock") });
  }

  #isSettled(record) {
    return record?.source === "proactive-audit"
      && SETTLED_NOTIFICATION_STATUSES.has(String(record.data?.status || ""));
  }

  async #pathExists(file) {
    try {
      await fs.access(file);
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  async #moveToArchive(file, target, record) {
    if (await this.#pathExists(target)) {
      const canonical = await readRecord(target);
      if (String(canonical.id || "") !== String(record.id || "")) {
        throw Object.assign(new Error("通知归档目标存在不同 ID"), { code: "NOTIFICATION_ARCHIVE_TARGET_CONFLICT" });
      }
      await writeRecord(target, record, { title: record.title, summaryKeys: ["id", "level", "source", "read", "created"] });
      await fs.rm(file, { force: true });
      return;
    }
    await fs.rename(file, target);
  }

  async #migrateLegacyArchives() {
    let entries;
    try {
      entries = await fs.readdir(this.runtimeRoot, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    const legacyRoots = entries
      .filter((entry) => entry.isDirectory()
        && /^notifications-archive-.+$/u.test(entry.name)
        && path.resolve(path.join(this.runtimeRoot, entry.name)) !== path.resolve(this.archiveRoot))
      .map((entry) => path.join(this.runtimeRoot, entry.name));
    for (const legacyRoot of legacyRoots) {
      for (const file of await walkRecords(legacyRoot)) {
        const relative = path.relative(legacyRoot, file);
        const target = path.join(this.archiveRoot, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        if (await this.#pathExists(target)) {
          let legacyRecord;
          let canonicalRecord;
          try {
            [legacyRecord, canonicalRecord] = await Promise.all([readRecord(file), readRecord(target)]);
          } catch (error) {
            throw Object.assign(new Error("通知归档迁移遇到无法读取的冲突文件"), {
              code: "NOTIFICATION_ARCHIVE_MIGRATION_CONFLICT",
              statusCode: 409,
              cause: error,
            });
          }
          if (String(legacyRecord.id || "") !== String(canonicalRecord.id || "")) {
            throw Object.assign(new Error("通知归档迁移遇到 ID 冲突"), {
              code: "NOTIFICATION_ARCHIVE_MIGRATION_CONFLICT",
              statusCode: 409,
            });
          }
          await fs.rm(file, { force: true });
          continue;
        }
        await fs.rename(file, target);
      }
    }
  }

  async #ensureArchiveMigration() {
    if (!this.archiveMigration) {
      this.archiveMigration = this.#lock().run(() => this.#migrateLegacyArchives()).catch((error) => {
        this.archiveMigration = null;
        throw error;
      });
    }
    return this.archiveMigration;
  }

  async #findById(id) {
    for (const [root, files] of [
      [this.#root(), await walkRecords(this.#root())],
      [this.archiveRoot, await walkRecords(this.archiveRoot)],
    ]) {
      for (const file of files) {
        if (path.basename(file) !== `${id}.md`) continue;
        const record = await readRecord(file);
        record.recordPath = null;
        record.statePath = this.#statePath(file, root);
        return { file, root, record };
      }
    }
    return null;
  }

  async add({ title, body, level = "info", source = "syno", data = {} }) {
    await this.#ensureArchiveMigration();
    return this.#lock().run(async () => {
      const now = this.clock().toISOString();
      const key = data.idempotencyKey || (data.reportId ? `report:${data.reportId}:${source}` : "");
      const id = key ? `notice-${createHash("sha256").update(key).digest("hex").slice(0, 12)}` : `notice-${randomUUID().slice(0, 10)}`;
      if (key) {
        const existing = await this.#findById(id);
        if (existing) return existing.record;
      }
      const record = { id, title, body, level, source, data, read: false, created: now };
      const root = this.#root();
      const file = path.join(root, now.slice(0, 4), now.slice(5, 7), `${record.id}.md`);
      await writeRecord(file, record, { title, summaryKeys: ["id", "level", "source", "read", "created"] });
      record.recordPath = null;
      record.statePath = this.#statePath(file, root);
      return record;
    });
  }
  async list({ limit = 50, includeSettled = false } = {}) {
    await this.#ensureArchiveMigration();
    return this.#lock().run(async () => {
      const files = await walkRecords(this.#root());
      const records = [];
      for (const file of files) {
        try { records.push(await readRecord(file)); } catch {
          // README and invalid records are verified separately; they must not break the notification center.
        }
      }
      const visible = includeSettled ? records : records.filter((record) => !this.#isSettled(record));
      return visible
        .sort((a, b) => b.created.localeCompare(a.created))
        .slice(0, Math.max(0, Number(limit) || 0));
    });
  }

  async updateDeliveryStatus(idempotencyKey, { status, outboxEventId } = {}) {
    await this.#ensureArchiveMigration();
    return this.#lock().run(async () => {
      const key = String(idempotencyKey || "");
      const allowed = new Set(["pending", "delivered", "delivery_unknown", "failed_retryable", "failed_terminal"]);
      if (!key || !allowed.has(status) || !/^[A-Za-z0-9._:-]{1,200}$/.test(String(outboxEventId || ""))) {
        throw Object.assign(new Error("通知投递状态参数非法"), { code: "NOTIFICATION_DELIVERY_STATUS_INVALID" });
      }
      const id = `notice-${createHash("sha256").update(key).digest("hex").slice(0, 12)}`;
      const existing = await this.#findById(id);
      if (!existing) return null;
      const record = existing.record;
      record.data = { ...(record.data || {}), idempotencyKey: key, outboxEventId: String(outboxEventId), status };
      await writeRecord(existing.file, record, { title: record.title, summaryKeys: ["id", "level", "source", "read", "created"] });
      record.recordPath = null;
      record.statePath = this.#statePath(existing.file, existing.root);
      return record;
    });
  }

  async archive(options = {}) {
    await this.#ensureArchiveMigration();
    return this.#lock().run(async () => {
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw Object.assign(new Error("通知归档参数必须是对象"), { code: "NOTIFICATION_ARCHIVE_INPUT_INVALID", statusCode: 400 });
      }
      const { ids = [], before, limit = 500 } = options;
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id.trim())) {
        throw Object.assign(new Error("通知归档 ids 必须是非空字符串数组"), { code: "NOTIFICATION_ARCHIVE_IDS_INVALID", statusCode: 400 });
      }
      const requestedIds = [...new Set(ids.map((id) => id.trim()))];
      const hasBefore = before !== undefined && before !== null && before !== "";
      if (hasBefore && typeof before !== "string") {
        throw Object.assign(new Error("通知归档 before 必须是时间字符串"), { code: "NOTIFICATION_ARCHIVE_BEFORE_INVALID", statusCode: 400 });
      }
      if (requestedIds.length && hasBefore) {
        throw Object.assign(new Error("通知归档只能指定 ids 或 before 其中一种条件"), { code: "NOTIFICATION_ARCHIVE_SELECTOR_AMBIGUOUS", statusCode: 400 });
      }
      const beforeTime = hasBefore ? Date.parse(before) : null;
      if (hasBefore && !Number.isFinite(beforeTime)) {
        throw Object.assign(new Error("通知归档 before 必须是有效时间"), { code: "NOTIFICATION_ARCHIVE_BEFORE_INVALID", statusCode: 400 });
      }
      if (!requestedIds.length && !hasBefore) {
        throw Object.assign(new Error("归档通知必须指定 ids 或 before"), { code: "NOTIFICATION_ARCHIVE_SELECTOR_REQUIRED", statusCode: 400 });
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 5_000) {
        throw Object.assign(new Error("通知归档 limit 必须是 1 到 5000 的整数"), { code: "NOTIFICATION_ARCHIVE_LIMIT_INVALID", statusCode: 400 });
      }
      const idSet = new Set(requestedIds);
      const archivedIds = [];
      const failed = [];
      let selectedCount = 0;
      for (const file of await walkRecords(this.#root())) {
        if (selectedCount >= limit) break;
        const fallbackId = path.basename(file, ".md");
        let record;
        try {
          record = await readRecord(file);
        } catch (error) {
          if (idSet.has(fallbackId)) {
            selectedCount += 1;
            failed.push({ id: fallbackId, code: error?.code || "NOTIFICATION_RECORD_INVALID" });
          }
          continue;
        }
        const id = String(record.id || fallbackId);
        const selected = idSet.size ? idSet.has(id) : Date.parse(String(record.created || "")) < beforeTime;
        if (!selected) continue;
        selectedCount += 1;
        const relative = path.relative(this.#root(), file);
        const target = path.join(this.archiveRoot, relative);
        try {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await this.#moveToArchive(file, target, record);
          archivedIds.push(id);
        } catch (error) {
          failed.push({ id, code: error?.code || "NOTIFICATION_ARCHIVE_MOVE_FAILED" });
        }
      }
      const completed = new Set([...archivedIds, ...failed.map((item) => item.id)]);
      return {
        archived: archivedIds.length,
        ids: archivedIds,
        failed,
        missing: requestedIds.filter((id) => !completed.has(id)),
      };
    });
  }
}

export { NotificationStore };
