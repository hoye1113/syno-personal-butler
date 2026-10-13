import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

let nativePromise;
function nativeLock() {
  const root = process.env.SYNO_DSH_ROOT || path.resolve(import.meta.dirname, "../../vendor/deepseek-harness");
  nativePromise ||= import(pathToFileURL(path.join(root, "native/system/packages/entry/lib/flock.js")).href);
  return nativePromise;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const lockError = (code) => Object.assign(new Error(code), { code });
async function readOwner(file) {
  try {
    const owner = JSON.parse(await fs.readFile(file, "utf8"));
    if (!Number.isInteger(owner?.pid) || owner.pid <= 0) return { status: "identity_unknown", owner: null };
    return { status: "stale", owner: { pid: owner.pid, instanceId: owner.instanceId || null, processStartedAt: owner.processStartedAt || null, repoFingerprint: owner.repoFingerprint || null, entrypoint: owner.entrypoint || null } };
  } catch (error) { return { status: error.code === "ENOENT" ? "absent" : "identity_unknown", owner: null }; }
}
async function guard(file, { timeoutMs = 0, pollMs = 50, failFast = true } = {}) {
  const handle = await fs.open(file + ".flock", "a+", 0o600);
  const deadline = Date.now() + timeoutMs;
  try {
    const { tryLockExclusive } = await nativeLock();
    while (true) {
      try { await tryLockExclusive(handle.fd); return { release: () => handle.close() }; }
      catch (error) {
        if (!["EAGAIN", "EWOULDBLOCK"].includes(error.code)) throw error;
        if (failFast) { await handle.close(); return null; }
        if (Date.now() >= deadline) throw lockError("PROCESS_LOCK_TIMEOUT");
        await sleep(Math.min(pollMs, Math.max(1, deadline - Date.now())));
      }
    }
  } catch (error) { await handle.close(); throw error; }
}
async function inspectPosixLock(file) {
  const inspected = await readOwner(file);
  if (inspected.status !== "stale") return inspected;
  const lease = await guard(file);
  if (!lease) return { ...inspected, status: "running" };
  await lease.release();
  return inspected;
}
async function removePosixStaleLock(file) {
  const inspected = await readOwner(file);
  if (inspected.status !== "stale") return { ...inspected, removed: false };
  const lease = await guard(file);
  if (!lease) return { ...inspected, status: "running", removed: false };
  try {
    const current = await readOwner(file);
    if (current.status !== "stale") return { ...current, removed: false };
    await fs.rm(file, { force: true });
    return { ...current, status: "stale_removed", removed: true };
  } finally { await lease.release(); }
}
async function acquirePosixProcessLock({ file, owner, lock = guard, ...options }) {
  const lease = await lock(file, options);
  if (!lease) throw lockError("PROCESS_LOCK_HELD");
  const temporary = file + "." + randomUUID() + ".claim";
  try {
    const inspected = await readOwner(file);
    if (inspected.status === "identity_unknown") throw lockError("PROCESS_LOCK_IDENTITY_UNKNOWN");
    await fs.writeFile(temporary, JSON.stringify(owner) + "\n", { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, file);
  } catch (error) {
    try { await fs.rm(temporary, { force: true }); }
    catch (cleanupError) { error.cleanupError = cleanupError; }
    finally { await lease.release(); }
    throw error;
  }
  let released = false;
  return {
    owner,
    release: async () => {
      if (released) return;
      released = true;
      try {
        const current = await readOwner(file);
        if (current.owner?.pid === owner.pid && current.owner?.instanceId === owner.instanceId) await fs.rm(file, { force: true });
      } finally { await lease.release(); }
    },
  };
}
export { acquirePosixProcessLock, inspectPosixLock, removePosixStaleLock };
