import { promises as fs } from "node:fs";
import path from "node:path";

function yamlScalar(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => yamlScalar(String(item))).join(", ")}]`;
  const text = String(value);
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text;
  return JSON.stringify(text);
}

function serializeRecord(record, { title = record.id || "Syno record", summaryKeys = [] } = {}) {
  const keys = summaryKeys.length ? summaryKeys : Object.keys(record).filter((key) => {
    const value = record[key];
    return value === null || ["string", "number", "boolean"].includes(typeof value) || Array.isArray(value);
  });
  const frontmatter = keys
    .filter((key) => record[key] !== undefined)
    .map((key) => `${key}: ${yamlScalar(record[key])}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n# ${title}\n\n<!-- syno:json:start -->\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n<!-- syno:json:end -->\n`;
}

function parseRecord(markdown) {
  const match = String(markdown).match(/<!-- syno:json:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- syno:json:end -->/);
  if (!match) throw new Error("缺少 Syno JSON 数据块");
  return JSON.parse(match[1]);
}

async function writeRecord(filePath, record, options) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, serializeRecord(record, options), "utf8");
  await fs.rename(tempPath, filePath);
  return filePath;
}

async function readRecord(filePath) {
  return parseRecord(await fs.readFile(filePath, "utf8"));
}

export { parseRecord, readRecord, serializeRecord, writeRecord };

