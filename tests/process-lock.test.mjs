import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ProcessFileLock,
  removeConfirmedStaleProcessLock,
} from "../apps/syno/syno/process-lock.mjs";

test("ProcessFileLock persists instance identity and only its owner can release it", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  const lock = new ProcessFileLock({
    file,
    metadata: { instanceId: "instance-a", repoFingerprint: "repo-a", entrypoint: "server" },
  });
  const lease = await lock.acquire();
  const owner = JSON.parse(await fs.readFile(file, "utf8"));
  assert.equal(owner.pid, process.pid);
  assert.equal(owner.instanceId, "instance-a");
  assert.equal(owner.repoFingerprint, "repo-a");
  assert.equal(owner.entrypoint, "server");
  assert.ok(owner.processStartedAt);

  await fs.writeFile(file, `${JSON.stringify({ ...owner, instanceId: "instance-b" })}\n`);
  await lease.release();
  assert.equal((await fs.stat(file)).isFile(), true, "a replaced lock must not be removed by the old lease");
});

test("ProcessFileLock fail-fast refuses an alive owner before side effects", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  await fs.writeFile(file, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
  const lock = new ProcessFileLock({ file, failFast: true });
  await assert.rejects(lock.acquire(), (error) =>
    error.code === "PROCESS_LOCK_HELD" && error.owner.pid === process.pid && error.owner.instanceId === null);
});

test("ProcessFileLock removes a confirmed stale owner", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  await fs.writeFile(file, `${JSON.stringify({ pid: 2_147_483_647, instanceId: "stale" })}\n`);
  const lease = await new ProcessFileLock({ file, failFast: true, metadata: { instanceId: "fresh" } }).acquire();
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).instanceId, "fresh");
  await lease.release();
  await assert.rejects(fs.stat(file), { code: "ENOENT" });
});

test("Windows fail-fast locking rejects a PID-reused owner by process start identity", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  await fs.writeFile(file, `${JSON.stringify({ pid: process.pid, instanceId: "old", processStartedAt: "2000-01-01T00:00:00.000Z" })}\n`);
  const lock = new ProcessFileLock({ file, failFast: true, metadata: { instanceId: "fresh" } });
  const lease = await lock.acquire();
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).instanceId, "fresh");
  await lease.release();
});

test("host-style fail-fast locking and doctor fail closed on unknown identity", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  await fs.writeFile(file, "{not-json}\n");
  await assert.rejects(
    new ProcessFileLock({ file, failFast: true }).acquire(),
    { code: "PROCESS_LOCK_IDENTITY_UNKNOWN" },
  );
  const doctor = await removeConfirmedStaleProcessLock(file);
  assert.deepEqual(doctor, { status: "identity_unknown", owner: null, removed: false });
  assert.equal((await fs.stat(file)).isFile(), true);
});
