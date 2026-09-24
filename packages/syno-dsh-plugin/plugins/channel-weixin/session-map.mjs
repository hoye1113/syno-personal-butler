import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../../../../packages/syno-core/paths.mjs";
import { ProcessFileLock } from "../../../../packages/syno-core/process-lock.mjs";

const DEFAULT_FILE = path.join(PATHS.stateRoot, "weixin-inprocess-sessions.json");

class WeixinSessionMap {
  constructor({ file = DEFAULT_FILE, lock = null } = {}) {
    this.file = path.resolve(file);
    this.lock = lock || new ProcessFileLock({ file: `${this.file}.lock`, timeoutMs: 5_000 });
  }

  async #read() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, "utf8"));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      if (error.code === "ENOENT") return {};
      throw error;
    }
  }

  async get(key) {
    return (await this.#read())[String(key)] || null;
  }

  async #mutate(mutate) {
    const lease = await this.lock.acquire();
    try {
      const map = await this.#read();
      const next = mutate(map);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      return next;
    } finally {
      await lease.release();
    }
  }

  async set(key, sessionId) {
    await this.#mutate((map) => ({ ...map, [String(key)]: String(sessionId) }));
    return String(sessionId);
  }

  async clear(key) {
    await this.#mutate((map) => {
      const next = { ...map };
      delete next[String(key)];
      return next;
    });
  }
}

export { WeixinSessionMap };
