import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import { PATHS } from "../packages/syno-core/paths.mjs";
import { removeConfirmedStaleProcessLock } from "../packages/syno-core/process-lock.mjs";

const TEMP_FILE_SUFFIXES = [".claim", ".tmp"];
const TEMP_FILE_MAX_AGE_MS = 60 * 60 * 1000;

async function sweepStaleTempFiles(root, { olderThanMs = TEMP_FILE_MAX_AGE_MS, now = Date.now(), maxDepth = 3 } = {}) {
  const removed = [];
  async function walk(directory, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) { await walk(full, depth + 1); continue; }
      if (!entry.isFile() || !TEMP_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
      try {
        const stat = await fs.stat(full);
        if (now - stat.mtimeMs < olderThanMs) continue;
        await fs.rm(full, { force: true });
        removed.push(path.relative(root, full).replace(/\\/g, "/"));
      } catch {
        // 并发删除或不可读的临时文件不阻塞 doctor。
      }
    }
  }
  await walk(root, 0);
  return removed;
}

async function doctor() {
  const lockFile = path.join(PATHS.stateRoot, "locks", "syno-host.lock");
  const result = await removeConfirmedStaleProcessLock(lockFile);
  const runtimeSwept = await sweepStaleTempFiles(PATHS.runtimeRoot);
  const stateSwept = await sweepStaleTempFiles(PATHS.stateRoot);
  return {
    ok: ["absent", "stale_removed"].includes(result.status),
    hostLock: {
      status: result.status,
      removed: result.removed === true,
      ...(result.owner ? { owner: result.owner } : {}),
    },
    staleTempFiles: { runtime: runtimeSwept, state: stateSwept },
  };
}

async function main() {
  const result = await doctor();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

export { doctor, main, sweepStaleTempFiles };
