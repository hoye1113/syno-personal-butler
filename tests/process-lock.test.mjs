import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  ProcessFileLock,
  readWindowsProcessStart,
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

test("ProcessFileLock fail-fast refuses an alive owner before side effects", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  // 真实持锁者：身份时间=本进程实际启动时间；仅 PID 存活（无身份或身份不匹配）不再视为有效持锁
  const actualStartedAt = await readWindowsProcessStart(process.pid);
  await fs.writeFile(file, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString(), processStartedAt: actualStartedAt })}\n`);
  const lock = new ProcessFileLock({ file, failFast: true });
  await assert.rejects(lock.acquire(), (error) =>
    error.code === "PROCESS_LOCK_HELD" && error.owner.pid === process.pid && error.owner.instanceId === null);
});

test("legacy lock with recycled PID and createdAt identity is stale (failFast path)", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  // 模拟 2026-09-02 事故：旧世代锁 {pid, createdAt}=本进程 pid 但身份时间早于进程实际启动 1h
  // （= 原持锁进程已死、pid 被本进程复用；Get-Process 对 System/受限进程不可达，用自 pid 精确建模）
  const actualStartedAt = await readWindowsProcessStart(process.pid);
  await fs.writeFile(file, `${JSON.stringify({ pid: process.pid, createdAt: new Date(Date.now() - 3_600_000).toISOString() })}\n`);
  assert.notEqual(actualStartedAt, null);
  const lease = await new ProcessFileLock({ file, failFast: true, metadata: { instanceId: "fresh" } }).acquire();
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).instanceId, "fresh");
  await lease.release();
});

test("plain acquire also treats alive-but-recycled holder as stale", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  // 非 failFast 默认路径（git-guard 锁同款）：PID 复用 + 身份时间不匹配 = 必过期，acquire 必须能接管
  await fs.writeFile(file, `${JSON.stringify({ pid: process.pid, createdAt: new Date(Date.now() - 3_600_000).toISOString() })}\n`);
  const lock = new ProcessFileLock({ file, timeoutMs: 5_000, pollMs: 50 });
  const lease = await lock.acquire();
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).pid, process.pid);
  await lease.release();
  await assert.rejects(fs.stat(file), { code: "ENOENT" });
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

test("ProcessFileLock releases a timed-out local waiter for later callers", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "queued.lock");
  const holder = await new ProcessFileLock({ file, timeoutMs: 1_000, pollMs: 1 }).acquire();
  const timedOut = new ProcessFileLock({ file, timeoutMs: 30, pollMs: 1 }).acquire();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const follower = new ProcessFileLock({ file, timeoutMs: 1_000, pollMs: 1 }).acquire();

  await assert.rejects(timedOut, { code: "PROCESS_LOCK_TIMEOUT" });
  await holder.release();
  const followerLease = await follower;
  await followerLease.release();
  await assert.rejects(fs.stat(file), { code: "ENOENT" });
});

test("Windows stale lock takeover permits only one concurrent winner", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "stale-race.lock");
  await fs.writeFile(file, `${JSON.stringify({ pid: 2_147_483_647, instanceId: "stale" })}\n`);

  const moduleUrl = pathToFileURL(path.resolve("apps/syno/syno/process-lock.mjs")).href;
  const childScript = `
import { ProcessFileLock } from ${JSON.stringify(moduleUrl)};
const file = Buffer.from(process.argv[1], "base64").toString("utf8");
const instanceId = Buffer.from(process.argv[2], "base64").toString("utf8");
try {
  const lease = await new ProcessFileLock({ file, failFast: true, metadata: { instanceId } }).acquire();
  process.stdout.write(JSON.stringify({ status: "acquired", instanceId: lease.owner.instanceId }) + "\\n");
  await new Promise((resolve) => setTimeout(resolve, 250));
  await lease.release();
} catch (error) {
  process.stdout.write(JSON.stringify({ status: "rejected", code: error.code }) + "\\n");
}
`;
  const runChild = (instanceId) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", childScript, Buffer.from(file, "utf8").toString("base64"), Buffer.from(instanceId, "utf8").toString("base64")], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
      resolve({ code, result: line ? JSON.parse(line) : null, stderr });
    });
  });

  const attempts = await Promise.all([
    runChild("winner-a"),
    runChild("winner-b"),
  ]);
  const winners = attempts.filter((attempt) => attempt.result?.status === "acquired");
  const rejected = attempts.filter((attempt) => attempt.result?.status === "rejected");
  assert.equal(winners.length, 1, JSON.stringify(attempts));
  assert.equal(rejected.length, 1, JSON.stringify(attempts));
  assert.equal(rejected[0].result.code, "PROCESS_LOCK_HELD", JSON.stringify(attempts));
  await assert.rejects(fs.stat(file), { code: "ENOENT" });
});
