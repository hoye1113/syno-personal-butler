import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ProcessFileLock } from "./process-lock.mjs";
const hash = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
class RecoveryJournal {
  constructor({ file, clock = () => new Date() }) { this.file = file; this.clock = clock; this.lock = new ProcessFileLock({ file: `${file}.lock` }); }
  async read() {
    const text = await fs.readFile(this.file, "utf8").catch(e => { if (e.code === "ENOENT") return ""; throw e; });
    const lines = text.split("\n"), records = []; let prior = null;
    for (let i = 0; i < lines.length - 1; i++) {
      const r = JSON.parse(lines[i]), { checksum, ...value } = r;
      if (checksum !== hash(value) || value.prior !== prior || value.sequence !== records.length + 1) throw Object.assign(new Error("恢复 journal 校验失败"), { code: "JOURNAL_CORRUPT" });
      records.push(r); prior = checksum;
    }
    return records;
  }
  async append(event, metadata) {
    if (/"(?:statement|body|content|query|message|text|ciphertext|credential)"\s*:/u.test(JSON.stringify(metadata))) throw new Error("恢复 journal 只能记录元数据");
    return this.lock.run(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const records = await this.read(), prior = records.at(-1)?.checksum || null;
      const r = { schemaVersion: 1, sequence: records.length + 1, at: this.clock().toISOString(), event, metadata, prior };
      const handle = await fs.open(this.file, "a+", 0o600);
      try {
        // A process killed during its last write leaves an incomplete tail. Trim
        // only that uncommitted tail before appending the next complete record.
        const bytes = await handle.readFile();
        if (bytes.length && bytes.at(-1) !== 10) await handle.truncate(bytes.lastIndexOf(10) + 1);
        await handle.write(`${JSON.stringify({ ...r, checksum: hash(r) })}\n`);
        await handle.sync();
      } finally { await handle.close(); }
      return r;
    });
  }
}
export { RecoveryJournal };
