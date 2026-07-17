import { promises as fs } from "node:fs";
import path from "node:path";

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ProcessFileLock {
  constructor({ file, timeoutMs = 30_000, pollMs = 50 } = {}) {
    if (!file) throw new Error("ProcessFileLock 需要锁文件路径");
    this.file = path.resolve(file);
    this.timeoutMs = timeoutMs;
    this.pollMs = pollMs;
  }

  async acquire() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() <= deadline) {
      try {
        const handle = await fs.open(this.file, "wx", 0o600);
        const owner = { pid: process.pid, createdAt: new Date().toISOString() };
        await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
        let released = false;
        return {
          release: async () => {
            if (released) return;
            released = true;
            await handle.close().catch(() => {});
            let current = null;
            try { current = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
            if (!current || current.pid === process.pid) await fs.rm(this.file, { force: true });
          },
        };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        let owner = null;
        try { owner = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
        if (!processIsAlive(owner?.pid)) {
          await fs.rm(this.file, { force: true }).catch(() => {});
          continue;
        }
        await delay(this.pollMs);
      }
    }
    const error = new Error(`等待跨进程锁超时：${path.basename(this.file)}`);
    error.code = "PROCESS_LOCK_TIMEOUT";
    throw error;
  }

  async run(operation) {
    const lease = await this.acquire();
    try { return await operation(); }
    finally { await lease.release(); }
  }
}

export { ProcessFileLock, processIsAlive };
