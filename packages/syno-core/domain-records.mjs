import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseRecord } from "./markdown-record.mjs";
import { frontmatterData } from "./validator.mjs";
import { validateContractRecord } from "./schema-registry.mjs";

const RECORD_KINDS = new Set(["actions", "memory"]);
function recordVersion(record) { return createHash("sha256").update(JSON.stringify(record)).digest("hex"); }
async function listDomainRecords(opsRoot, kind, ownerKey = "local-user") {
  if (!RECORD_KINDS.has(kind)) throw new Error("未知记录类型");
  const records = [];
  async function walk(directory) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") {
        const text = await fs.readFile(file, "utf8");
        // Older memory proposals use frontmatter only; reads leave their bytes unchanged.
        const record = kind === "memory" && !text.includes("<!-- syno:json:")
          ? frontmatterData(text).values
          : parseRecord(text);
        await validateContractRecord(kind === "actions" ? "action" : "memory-proposal", record);
        if ((record.ownerKey || "local-user") === ownerKey) records.push({ record, file, version: recordVersion(record) });
      }
    }
  }
  await walk(path.join(opsRoot, kind));
  return records.sort((a, b) => a.record.id.localeCompare(b.record.id));
}
async function findDomainRecord(opsRoot, kind, id, ownerKey) {
  const found = (await listDomainRecords(opsRoot, kind, ownerKey)).find((item) => item.record.id === id);
  if (!found) throw Object.assign(new Error("记录不存在或不属于当前主人"), { code: "DOMAIN_RECORD_NOT_FOUND" });
  return found;
}
function assertRecordVersion(found, version) {
  if (!version || found.version !== version) throw Object.assign(new Error("记录已变化，请重新查询后再操作"), { code: "DOMAIN_RECORD_VERSION_CHANGED" });
}
export { listDomainRecords, findDomainRecord, recordVersion, assertRecordVersion };
