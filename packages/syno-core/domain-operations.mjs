import { randomUUID } from "node:crypto";
import path from "node:path";

import { listDomainRecords, findDomainRecord, assertRecordVersion } from "./domain-records.mjs";
import { writeRecord } from "./markdown-record.mjs";

function businessDate(iso) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date(iso)); }
function dateParts(iso) { const date = businessDate(iso); return [date.slice(0, 4), date.slice(5, 7)]; }

async function executeDomainOperation(operation, payload, { workspace, job, clock = () => new Date() } = {}) {
  const now = clock().toISOString();
  const ownerKey = job?.ownerKey || "local-user";
  const opsRoot = path.join(workspace, "ops");
  if (operation === "actions.create") {
    const id = `action-${businessDate(now).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(now);
    const record = { id, title: String(payload.title || payload.text || "").trim(), status: "pending", ownerKey, created: now, updated: now, ...(payload.scheduledStart ? { scheduledStart: payload.scheduledStart } : {}), sourcePaths: payload.sourcePaths || [] };
    const file = path.join(workspace, "ops", "actions", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "action", title: record.title, summaryKeys: ["id", "title", "status", "created", "scheduledStart"] });
    return { record, changedPaths: [path.relative(workspace, file).replace(/\\/g, "/")] };
  }
  if (["memory.proposals.create", "memory.proposals.correct"].includes(operation)) {
    let previous;
    if (operation === "memory.proposals.correct") {
      previous = await findDomainRecord(opsRoot, "memory", payload.id, ownerKey);
      assertRecordVersion(previous, payload.version);
      if (previous.record.schemaVersion !== 2 || previous.record.status !== "active") throw new Error("只能纠正有效个人记忆");
    }
    const id = `memory-${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date(now)).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date(now)));
    const record = { schemaVersion: 2, id, ownerKey, kind: payload.kind || previous?.record.kind || "preference", scope: payload.scope || previous?.record.scope || "global", triggers: payload.triggers || previous?.record.triggers || [], statement: String(payload.statement || "").trim(), reason: String(payload.reason || "主人明确提出长期保存").trim(), status: "proposed", created: now, updated: now, sourceMessageId: job?.request?.sourceMessageId || "", ...(previous ? { supersedes: previous.record.id, supersedesVersion: previous.version } : {}) };
    if (!record.statement || !record.sourceMessageId) throw new Error("缺少记忆原文或主人来源消息");
    const file = path.join(opsRoot, "memory", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "personal-memory", title: `Memory ${id}` });
    return { record, changedPaths: [path.relative(workspace, file).replaceAll("\\", "/")] };
  }
  if (operation === "actions.update") {
    const found = await findDomainRecord(opsRoot, "actions", payload.id, ownerKey);
    assertRecordVersion(found, payload.version);
    const record = { ...found.record, updated: now };
    for (const key of ["title", "status", "scheduledStart"]) if (payload[key] !== undefined) record[key] = payload[key];
    if (payload.scheduledStart === null) delete record.scheduledStart;
    await writeRecord(found.file, record, { schema: "action", title: record.title });
    return { record, changedPaths: [path.relative(workspace, found.file).replaceAll("\\", "/")] };
  }
  if (["memory.promote", "memory.reject", "memory.forget"].includes(operation)) {
    const found = await findDomainRecord(opsRoot, "memory", payload.id, ownerKey);
    assertRecordVersion(found, payload.version);
    const record = { ...found.record, updated: now };
    const changedPaths = [path.relative(workspace, found.file).replaceAll("\\", "/")];
    if (operation === "memory.forget") {
      if (record.schemaVersion !== 2) throw new Error("旧记录需先经迁移审核");
      for (const key of ["statement", "triggers", "reason"]) delete record[key];
      Object.assign(record, { status: "forgotten", reason: "Owner requested forgetting", triggers: [], invalidatedAt: now, forgottenVersion: found.version });
    } else {
      if (record.status !== "proposed") throw new Error("记忆候选已经处理");
      if (operation === "memory.promote") {
        if (record.schemaVersion !== 2) throw new Error("旧提案不能直接激活；请先审核迁移清单");
        if (!payload.confirmationMessageId || payload.confirmationMessageId === record.sourceMessageId) throw new Error("长期记忆需要主人在候选生成后另行确认");
        if (record.supersedes) {
          const previous = await findDomainRecord(opsRoot, "memory", record.supersedes, ownerKey);
          assertRecordVersion(previous, record.supersedesVersion);
          if (previous.record.status !== "active") throw new Error("被替换的记忆已失效");
        }
        Object.assign(record, { status: "active", confirmationMessageId: payload.confirmationMessageId, confirmedAt: now });
      } else record.status = "rejected";
    }
    await writeRecord(found.file, record, { schema: record.schemaVersion === 2 ? "personal-memory" : "memory-proposal", title: `Memory ${record.id}` });
    if (operation === "memory.promote" && record.supersedes) {
      const previous = await findDomainRecord(opsRoot, "memory", record.supersedes, ownerKey);
      await writeRecord(previous.file, { ...previous.record, status: "superseded", invalidatedAt: now, updated: now }, { schema: "personal-memory", title: `Memory ${previous.record.id}` });
      changedPaths.push(path.relative(workspace, previous.file).replaceAll("\\", "/"));
    }
    const forgottenIds = [record.id];
    if (operation === "memory.forget") {
      const items = await listDomainRecords(opsRoot, "memory", ownerKey);
      const ids = new Set([record.id]); let changed = true;
      while (changed) { const size = ids.size; for (const {record: r} of items) if (r.schemaVersion === 2 && (ids.has(r.id) || ids.has(r.supersedes))) { ids.add(r.id); if(r.supersedes)ids.add(r.supersedes); } changed = ids.size !== size; }
      for (const item of items) if (ids.has(item.record.id) && item.record.id !== record.id && item.record.schemaVersion === 2) {
        const { statement: _statement, triggers: _triggers, reason: _reason, ...rest } = item.record;
        const tombstone = { ...rest, status: "forgotten", triggers: [], reason: "Owner requested forgetting", invalidatedAt: now, updated: now, forgottenVersion: item.version };
        await writeRecord(item.file, tombstone, { schema: "personal-memory", title: `Memory ${rest.id}` });
        changedPaths.push(path.relative(workspace, item.file).replaceAll("\\", "/")); forgottenIds.push(rest.id);
      }
    }
    return { record, changedPaths, ...(operation === "memory.forget" ? { forgottenIds } : {}) };
  }
  return null;
}

export { executeDomainOperation };
