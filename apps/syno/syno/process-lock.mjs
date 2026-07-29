import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
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

async function inspectProcessLock(file) {
  const resolved = path.resolve(file);
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(resolved, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { status: "absent", owner: null };
    return { status: "identity_unknown", owner: null };
  }
  if (!Number.isInteger(owner?.pid) || owner.pid <= 0) return { status: "identity_unknown", owner: null };
  return {
    status: processIsAlive(owner.pid) ? "running" : "stale",
    owner: {
      pid: owner.pid,
      instanceId: owner.instanceId || null,
      processStartedAt: owner.processStartedAt || null,
      repoFingerprint: owner.repoFingerprint || null,
      entrypoint: owner.entrypoint || null,
    },
  };
}

async function removeConfirmedStaleProcessLock(file) {
  const inspection = await inspectProcessLock(file);
  if (inspection.status !== "stale") return { ...inspection, removed: false };
  await fs.rm(path.resolve(file), { force: true });
  return { ...inspection, status: "stale_removed", removed: true };
}

class ProcessFileLock {
  constructor({ file, timeoutMs = 30_000, pollMs = 50, failFast = false, metadata = {} } = {}) {
    if (!file) throw new Error("ProcessFileLock 需要锁文件路径");
    this.file = path.resolve(file);
    this.timeoutMs = timeoutMs;
    this.pollMs = pollMs;
    this.failFast = failFast;
    this.owner = Object.freeze({
      pid: process.pid,
      instanceId: String(metadata.instanceId || randomUUID()),
      processStartedAt: String(metadata.processStartedAt || new Date(Date.now() - process.uptime() * 1_000).toISOString()),
      createdAt: new Date().toISOString(),
      ...(metadata.repoFingerprint ? { repoFingerprint: String(metadata.repoFingerprint) } : {}),
      ...(metadata.entrypoint ? { entrypoint: String(metadata.entrypoint) } : {}),
    });
  }

  async acquire() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() <= deadline) {
      try {
        const handle = await fs.open(this.file, "wx", 0o600);
        const owner = this.owner;
        await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
        let released = false;
        return {
          release: async () => {
            if (released) return;
            released = true;
            await handle.close().catch(() => {});
            let current = null;
            try { current = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
            if (current?.pid === owner.pid && current?.instanceId === owner.instanceId) {
              await fs.rm(this.file, { force: true });
            }
          },
          owner,
        };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        let owner = null;
        try { owner = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
        if (!Number.isInteger(owner?.pid) || owner.pid <= 0) {
          if (this.failFast) {
            const unknown = new Error(`跨进程锁身份无法确认：${path.basename(this.file)}`);
            unknown.code = "PROCESS_LOCK_IDENTITY_UNKNOWN";
            throw unknown;
          }
          await fs.rm(this.file, { force: true }).catch(() => {});
          continue;
        }
        if (!processIsAlive(owner.pid)) {
          await fs.rm(this.file, { force: true }).catch(() => {});
          continue;
        }
        if (this.failFast) {
          const held = new Error(`跨进程锁已由运行中的实例持有：${path.basename(this.file)}`);
          held.code = "PROCESS_LOCK_HELD";
          held.owner = {
            pid: owner.pid,
            instanceId: owner.instanceId || null,
            processStartedAt: owner.processStartedAt || null,
            repoFingerprint: owner.repoFingerprint || null,
            entrypoint: owner.entrypoint || null,
          };
          throw held;
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

export { ProcessFileLock, inspectProcessLock, processIsAlive, removeConfirmedStaleProcessLock };
