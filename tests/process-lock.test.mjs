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
} from "../packages/syno-core/process-lock.mjs";

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
  const holdingMarker = path.join(root, "winner-holding");
  const releaseMarker = path.join(root, "winner-release");
  await fs.writeFile(file, `${JSON.stringify({ pid: 2_147_483_647, instanceId: "stale" })}\n`);

  const moduleUrl = pathToFileURL(path.resolve("packages/syno-core/process-lock.mjs")).href;
  const childScript = `
import { promises as fs } from "node:fs";
import { ProcessFileLock } from ${JSON.stringify(moduleUrl)};
const file = Buffer.from(process.argv[1], "base64").toString("utf8");
const instanceId = Buffer.from(process.argv[2], "base64").toString("utf8");
const holdMarker = process.argv[3] ? Buffer.from(process.argv[3], "base64").toString("utf8") : "";
const releaseMarker = process.argv[4] ? Buffer.from(process.argv[4], "base64").toString("utf8") : "";
try {
  const lease = await new ProcessFileLock({ file, failFast: true, metadata: { instanceId } }).acquire();
  process.stdout.write(JSON.stringify({ status: "acquired", instanceId: lease.owner.instanceId }) + "\\n");
  if (holdMarker) {
    await fs.writeFile(holdMarker, "holding");
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      try { await fs.access(releaseMarker); break; } catch { await new Promise((resolve) => setTimeout(resolve, 25)); }
    }
  }
  await lease.release();
} catch (error) {
  process.stdout.write(JSON.stringify({ status: "rejected", code: error.code }) + "\\n");
}
`;
  const runChild = (instanceId, { hold = false } = {}) => new Promise((resolve, reject) => {
    const args = [
      "--input-type=module", "-e", childScript,
      Buffer.from(file, "utf8").toString("base64"),
      Buffer.from(instanceId, "utf8").toString("base64"),
      hold ? Buffer.from(holdingMarker, "utf8").toString("base64") : "",
      hold ? Buffer.from(releaseMarker, "utf8").toString("base64") : "",
    ];
    const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
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

  // 先让 A 拿到锁并停在不释放状态，再启动 B；两者只要都报告 acquired 就说明没有互斥。
  const winnerRun = runChild("winner-a", { hold: true });
  const holdDeadline = Date.now() + 20_000;
  while (Date.now() < holdDeadline) {
    try { await fs.access(holdingMarker); break; } catch { await new Promise((resolve) => setTimeout(resolve, 25)); }
  }
  const loserRun = await runChild("winner-b");
  await fs.writeFile(releaseMarker, "release");
  const winnerAttempt = await winnerRun;

  const attempts = [winnerAttempt, loserRun];
  assert.equal(winnerAttempt.result?.status, "acquired", JSON.stringify(attempts));
  assert.equal(loserRun.result?.status, "rejected", JSON.stringify(attempts));
  assert.equal(loserRun.result.code, "PROCESS_LOCK_HELD", JSON.stringify(attempts));
  await assert.rejects(fs.stat(file), { code: "ENOENT" });
});

test("fail-fast acquisition waits out a legacy half-written lock instead of reporting unknown identity", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-process-lock-"));
  const file = path.join(root, "slow-writer.lock");
  const readyMarker = path.join(root, "writer-ready");
  const writeMarker = path.join(root, "writer-go");
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  const moduleUrl = pathToFileURL(path.resolve("packages/syno-core/process-lock.mjs")).href;
  const childScript = `
import { promises as fs } from "node:fs";
const file = Buffer.from(process.argv[1], "base64").toString("utf8");
const readyMarker = Buffer.from(process.argv[2], "base64").toString("utf8");
const writeMarker = Buffer.from(process.argv[3], "base64").toString("utf8");
const handle = await fs.open(file, "wx", 0o600);
await fs.writeFile(readyMarker, "ready");
const deadline = Date.now() + 10_000;
while (Date.now() < deadline) {
  try { await fs.access(writeMarker); break; } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
}
await handle.writeFile(JSON.stringify({
  pid: process.pid,
  instanceId: "slow-writer",
  processStartedAt: new Date(Date.now() - process.uptime() * 1_000).toISOString(),
}) + "\\n", "utf8");
await handle.close();
await new Promise((resolve) => setTimeout(resolve, 1_200));
process.stdout.write(JSON.stringify({ status: "written" }) + "\\n");
`;
  const writer = new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--input-type=module", "-e", childScript,
      Buffer.from(file, "utf8").toString("base64"),
      Buffer.from(readyMarker, "utf8").toString("base64"),
      Buffer.from(writeMarker, "utf8").toString("base64"),
    ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stderr }));
  });

  const waitFor = async (target) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try { await fs.access(target); return; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); }
    }
    throw new Error(`等待标记文件超时：${path.basename(target)}`);
  };

  await waitFor(readyMarker);
  const pending = new ProcessFileLock({ file, failFast: true, timeoutMs: 8_000, pollMs: 50 }).acquire();
  const outcome = pending.then(() => null, (error) => error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await fs.writeFile(writeMarker, "go");
  assert.equal((await outcome)?.code, "PROCESS_LOCK_HELD");
  const writerResult = await writer;
  assert.equal(writerResult.code, 0, writerResult.stderr);
  assert.equal(JSON.parse(await fs.readFile(file, "utf8")).instanceId, "slow-writer");
});
