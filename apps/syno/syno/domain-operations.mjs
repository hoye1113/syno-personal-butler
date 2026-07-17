import { randomUUID } from "node:crypto";
import path from "node:path";

import { writeRecord } from "./markdown-record.mjs";

function dateParts(iso) { return [iso.slice(0, 4), iso.slice(5, 7)]; }

async function executeDomainOperation(operation, payload, { workspace, clock = () => new Date() } = {}) {
  const now = clock().toISOString();
  if (operation === "actions.create") {
    const id = `action-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(now);
    const record = { id, title: String(payload.title || payload.text || "").trim(), status: "pending", created: now, ...(payload.scheduledStart ? { scheduledStart: payload.scheduledStart } : {}), sourcePaths: payload.sourcePaths || [] };
    const file = path.join(workspace, "ops", "actions", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "action", title: record.title, summaryKeys: ["id", "title", "status", "created", "scheduledStart"] });
    return { record, changedPaths: [path.relative(workspace, file).replace(/\\/g, "/")] };
  }
  if (operation === "memory.proposals.create") {
    const id = `memory-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const [year, month] = dateParts(now);
    const record = { id, statement: String(payload.statement || "").trim(), reason: String(payload.reason || "由主人明确表达的长期偏好候选").trim(), status: "proposed" };
    const file = path.join(workspace, "ops", "memory", year, month, `${id}.md`);
    await writeRecord(file, record, { schema: "memory-proposal", title: `Memory proposal ${id}`, summaryKeys: ["id", "status", "reason"] });
    return { record, changedPaths: [path.relative(workspace, file).replace(/\\/g, "/")] };
  }
  return null;
}

export { executeDomainOperation };
