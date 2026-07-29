import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const SECRET_KEY = /(?:authorization|cookie|password|secret|token|api[-_]?key|bridge[-_]?token)/i;
const MAX_VALUE_LENGTH = 4_096;

function redactString(value) {
  return String(value)
    .replace(/(authorization\s*:\s*(?:bearer|basic)\s+)[^\s"'\\]+/gi, "$1[REDACTED]")
    .replace(/((?:token|api[-_]?key|secret|password)\s*[=:]\s*)[^\s,;"']+/gi, "$1[REDACTED]")
    .replace(/\b(?:sk-(?:proj-)?|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}\b/gu, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/gu, "[REDACTED]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu, "[REDACTED]")
    .replace(/([?&](?:access_token|api_key|token|secret|password)=)[^&\s]+/giu, "$1[REDACTED]")
    .replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, "$1[REDACTED]@")
    .slice(0, MAX_VALUE_LENGTH);
}

function redact(value, key = "") {
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (value instanceof Error) {
    return {
      code: redactString(value.code || value.name || "ERROR"),
      message: redactString(value.message || String(value)),
    };
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([name, item]) => [name, redact(item, name)]));
  }
  return value;
}

class RuntimeJournal {
  constructor({
    root = path.join(PATHS.localDataRoot, "logs"),
    now = () => new Date(),
    retentionDays = 14,
  } = {}) {
    this.root = root;
    this.now = now;
    this.retentionDays = retentionDays;
    this.queue = Promise.resolve();
    this.cleaned = false;
  }

  fileFor(date = this.now()) {
    return path.join(this.root, `syno-runtime-${date.toISOString().slice(0, 10)}.jsonl`);
  }

  async #cleanup(date) {
    if (this.cleaned) return;
    this.cleaned = true;
    const cutoff = date.getTime() - this.retentionDays * 24 * 60 * 60 * 1_000;
    const entries = await fs.readdir(this.root, { withFileTypes: true }).catch(() => []);
    await Promise.all(entries
      .filter((entry) => entry.isFile() && /^syno-runtime-\d{4}-\d{2}-\d{2}\.jsonl$/.test(entry.name))
      .map(async (entry) => {
        const match = entry.name.match(/(\d{4}-\d{2}-\d{2})/);
        if (match && Date.parse(`${match[1]}T00:00:00.000Z`) < cutoff) {
          await fs.rm(path.join(this.root, entry.name), { force: true });
        }
      }));
  }

  record(event, data = {}, { level = "info" } = {}) {
    const write = async () => {
      const timestamp = this.now();
      await fs.mkdir(this.root, { recursive: true });
      await this.#cleanup(timestamp);
      const entry = {
        timestamp: timestamp.toISOString(),
        level,
        event: redactString(event),
        data: redact(data),
      };
      await fs.appendFile(this.fileFor(timestamp), `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
      return entry;
    };
    this.queue = this.queue.then(write, write);
    return this.queue;
  }
}

export { redact, RuntimeJournal };
