import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fork } from "node:child_process";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { ProcessFileLock, inspectProcessLock } from "../packages/syno-core/process-lock.mjs";

test("Mac concurrent stale recovery grants exactly one cross-process lease", { skip: process.platform !== "darwin", timeout: 30_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-lock-race-"));
  const file = path.join(root, "host.lock");
  const module = pathToFileURL(path.resolve("packages/syno-core/process-lock.mjs")).href;
  const worker = path.join(root, "race.mjs");
  await fs.writeFile(file, JSON.stringify({ pid: process.pid, instanceId: "stale-diagnostic" }));
  await fs.writeFile(worker, `import { ProcessFileLock } from ${JSON.stringify(module)};
process.once("message", async () => {
  try {
    const lease = await new ProcessFileLock({file:process.argv[2],failFast:true}).acquire();
    process.send({held:true});
    process.once("message", async () => { await lease.release(); process.disconnect(); });
  } catch (error) { process.send({held:false,code:error.code}); process.disconnect(); }
});`);
  const children = [fork(worker, [file], { silent: true }), fork(worker, [file], { silent: true })];
  const exits = children.map(child => once(child, "exit"));
  t.after(async () => { for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await Promise.all(exits); await fs.rm(root, { recursive: true, force: true }); });
  const results = children.map(child => once(child, "message"));
  for (const child of children) child.send("acquire");
  const owners = (await Promise.all(results)).map(([message]) => message);
  assert.equal(owners.filter(owner => owner.held).length, 1);
  assert.equal(owners.find(owner => !owner.held).code, "PROCESS_LOCK_HELD");
  children[owners.findIndex(owner => owner.held)].send("release");
  await Promise.all(exits);
  const lease = await new ProcessFileLock({ file, failFast: true }).acquire();
  await lease.release();
});

test("Mac kernel lease refuses a live holder and keeps the stable guard inode", { skip: process.platform !== "darwin", timeout: 30_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-锁 中文-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "owner.lock");
  const lease = await new ProcessFileLock({ file, failFast: true }).acquire();
  t.after(() => lease.release());
  const inode = (await fs.stat(file + ".flock")).ino;
  assert.equal((await inspectProcessLock(file, { verifyIdentity: true })).status, "running");
  await assert.rejects(new ProcessFileLock({ file, failFast: true }).acquire(), { code: "PROCESS_LOCK_HELD" });
  await lease.release();
  const next = await new ProcessFileLock({ file, failFast: true }).acquire();
  try { assert.equal((await fs.stat(file + ".flock")).ino, inode); } finally { await next.release(); }
});

test("Mac process crash releases the kernel lease even when diagnostic PID has been reused", { skip: process.platform !== "darwin", timeout: 30_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-crash-lock-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "host.lock");
  const module = pathToFileURL(path.resolve("packages/syno-core/process-lock.mjs")).href;
  const worker = path.join(root, "worker.mjs");
  await fs.writeFile(worker, `import { ProcessFileLock } from ${JSON.stringify(module)}; const lease = await new ProcessFileLock({file:process.argv[2],failFast:true}).acquire(); process.on("message", () => lease.release()); process.send("held");`);
  const child = fork(worker, [file], { silent: true });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  await Promise.race([once(child, "message"), once(child, "exit").then(([code]) => { throw new Error("lock worker exited: " + code); })]);
  await assert.rejects(new ProcessFileLock({ file, failFast: true }).acquire(), { code: "PROCESS_LOCK_HELD" });
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
  await fs.writeFile(file, JSON.stringify({ pid: process.pid, instanceId: "reused", processStartedAt: "2000-01-01T00:00:00.000Z" }));
  const lease = await new ProcessFileLock({ file, failFast: true }).acquire();
  try { assert.notEqual(lease.owner.instanceId, "reused"); } finally { await lease.release(); }
});
