import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { findDomainRecord, assertRecordVersion } from "./domain-records.mjs";
import { writeRecord } from "./markdown-record.mjs";

function dateParts(iso) { return [iso.slice(0, 4), iso.slice(5, 7)]; }

async function executeDomainOperation(operation, payload, { workspace, job, clock = () => new Date() } = {}) {
  const now = clock().toISOString();
  const ownerKey = job?.ownerKey || "local-user";
  const opsRoot = path.join(workspace, "ops");
  if (operation === "actions.create") {
    const id = `action-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(now);
    const record = { id, title: String(payload.title || payload.text || "").trim(), status: "pending", ownerKey, created: now, updated: now, ...(payload.scheduledStart ? { scheduledStart: payload.scheduledStart } : {}), sourcePaths: payload.sourcePaths || [] };
    const file = path.join(workspace, "ops", "actions", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "action", title: record.title, summaryKeys: ["id", "title", "status", "created", "scheduledStart"] });
    return { record, changedPaths: [path.relative(workspace, file).replace(/\\/g, "/")] };
  }
  if (operation === "memory.proposals.create") {
    const id = `memory-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(now);
    const record = { id, statement: String(payload.statement || "").trim(), reason: String(payload.reason || "由主人明确表达的长期偏好候选").trim(), status: "proposed", ownerKey, created: now, sourceMessageId: job?.request?.sourceMessageId || "" };
    const file = path.join(workspace, "ops", "memory", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "memory-proposal", title: `Memory proposal ${id}` });
    return { record, changedPaths: [path.relative(workspace, file).replace(/\\/g, "/")] };
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
  if (operation === "memory.promote" || operation === "memory.reject") {
    const found = await findDomainRecord(opsRoot, "memory", payload.id, ownerKey);
    assertRecordVersion(found, payload.version);
    if (found.record.status !== "proposed") throw new Error("记忆候选已经处理");
    if (operation === "memory.promote" && (!payload.confirmationMessageId || payload.confirmationMessageId === found.record.sourceMessageId)) {
      throw new Error("长期记忆需要主人在候选生成后另行确认");
    }
    const record = { ...found.record, status: operation === "memory.promote" ? "approved" : "rejected", updated: now };
    const changedPaths = [path.relative(workspace, found.file).replaceAll("\\", "/")];
    if (operation === "memory.promote") {
      const notePath = `vault/00-Inbox/${record.id}.md`;
      const title = `主人长期记忆·${record.statement.slice(0, 30).replace(/[\r\n]/g, " ")}`;
      const fields = { title, tags: ["memory"], created: now.slice(0, 10), source: "owner", description: record.statement.slice(0, 160), status: "orphan", factual_status: "unverified", memory_proposal: record.id };
      const frontmatter = Object.entries(fields).map(([key, value]) => `${key}: ${key === "status" ? value : JSON.stringify(value)}`).join("\n");
      await fs.mkdir(path.join(workspace, "vault", "00-Inbox"), { recursive: true });
      await fs.writeFile(path.join(workspace, notePath), `---\n${frontmatter}\n---\n\n# ${title}\n\n${record.statement}\n\n来源：主人明确表达并确认。当前尚未建立知识关联。\n`, { flag: "wx" });
      record.notePath = notePath;
      changedPaths.push(notePath);
    }
    await writeRecord(found.file, record, { schema: "memory-proposal", title: `Memory proposal ${record.id}` });
    return { record, changedPaths };
  }
  return null;
}

export { executeDomainOperation };
