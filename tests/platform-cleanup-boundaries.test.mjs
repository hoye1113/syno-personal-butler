import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fork } from "node:child_process";
import { once } from "node:events";
import { DeepSeekHarnessSupervisor, killUnixProcessGroup } from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { acquirePosixProcessLock } from "../packages/syno-core/posix-process-lock.mjs";

test("an exited leader's reused PID is never signalled", async () => {
  const signals = [];
  await killUnixProcessGroup(424242, { child: { exitCode: 0, signalCode: null }, signal: (pid, name) => {
    signals.push([pid, name]);
    if (pid < 0) throw Object.assign(new Error("absent group"), { code: "ESRCH" });
    return true;
  } });
  assert.equal(signals.some(([, name]) => name !== 0), false);
});

test("a reused live group leader fails closed without signalling it", async () => {
  const signals = [];
  await assert.rejects(killUnixProcessGroup(424242, { child: { exitCode: 0, signalCode: null }, signal: (pid, name) => {
    signals.push([pid, name]); return true;
  } }), { code: "HARNESS_PROCESS_IDENTITY_UNKNOWN" });
  assert.equal(signals.some(([, name]) => name !== 0), false);
});

test("signal-terminated children are stopped and cannot be handed out as live clients", () => {
  const supervisor = new DeepSeekHarnessSupervisor({ journal: { record: async () => null } });
  supervisor.launch = { bootable: true };
  supervisor.slots.set("capture", { profile: "capture", surface: "jsonrpc", child: { pid: 424242, exitCode: null, signalCode: "SIGTERM" }, client: { initialized: true } });
  assert.equal(supervisor.status("capture").state, "stopped");
  assert.equal(supervisor.status("capture").ready, false);
  assert.throws(() => supervisor.client("capture"), { code: "HARNESS_NOT_RUNNING" });
});

test("failed cleanup retains its slot, reports failure, and permits a later retry", async () => {
  let fail = true;
  const supervisor = new DeepSeekHarnessSupervisor({ journal: { record: async () => null }, killTree: async () => {
    if (fail) throw Object.assign(new Error("fixture failed"), { code: "HARNESS_PROCESS_TREE_ALIVE" });
    child.exitCode = 0;
  } });
  const child = { pid: 424242, exitCode: null, signalCode: null };
  supervisor.launch = { bootable: true };
  supervisor.slots.set("capture", { profile: "capture", surface: "jsonrpc", child, client: { initialized: true }, provider: "kimi-coding", model: "kimi-for-coding" });
  await assert.rejects(supervisor.stop("capture"), { code: "HARNESS_PROCESS_TREE_ALIVE" });
  assert.equal(supervisor.slots.size, 1);
  assert.equal(supervisor.status("capture").ready, false);
  assert.equal(supervisor.status("capture").pid, child.pid);
  assert.throws(() => supervisor.client("capture"), { code: "HARNESS_NOT_RUNNING" });
  await assert.rejects(supervisor.ensure("capture"), { code: "HARNESS_PROCESS_TREE_ALIVE" });
  await assert.rejects(supervisor.start("capture"), { code: "HARNESS_PROCESS_TREE_ALIVE" });
  fail = false;
  await supervisor.stop("capture");
  assert.equal(supervisor.slots.size, 0);
});

test("concurrent stop callers share a cleanup and start cannot overtake it", async () => {
  let release;
  let kills = 0;
  const child = { pid: 424242, exitCode: null, signalCode: null };
  const supervisor = new DeepSeekHarnessSupervisor({ journal: { record: async () => null }, killTree: async () => {
    kills++; await new Promise(resolve => { release = resolve; });
    throw Object.assign(new Error("fixture failed"), { code: "HARNESS_PROCESS_TREE_ALIVE" });
  } });
  supervisor.launch = { bootable: true };
  supervisor.slots.set("capture", { profile: "capture", surface: "jsonrpc", child, client: { initialized: true } });
  const checks = [supervisor.stop("capture"), supervisor.stop("capture"), supervisor.start("capture"), supervisor.ensure("capture")].map(promise => assert.rejects(promise, { code: "HARNESS_PROCESS_TREE_ALIVE" }));
  assert.throws(() => supervisor.client("capture"), { code: "HARNESS_NOT_RUNNING" });
  release(); await Promise.all(checks);
  assert.equal(kills, 1);
  assert.equal(supervisor.slots.size, 1);
});

test("POSIX publish and temporary cleanup failures still release the kernel lease", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-publish-failure-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "lock");
  const rename = fs.rename, rm = fs.rm;
  let releases = 0;
  fs.rename = async (from, to) => { if (to === file) throw Object.assign(new Error("publish"), { code: "EIO" }); return rename(from, to); };
  fs.rm = async (target, options) => { if (String(target).startsWith(file + ".") && String(target).endsWith(".claim")) throw Object.assign(new Error("cleanup"), { code: "EACCES" }); return rm(target, options); };
  try {
    await assert.rejects(acquirePosixProcessLock({ file, owner: { pid: process.pid, instanceId: "fixture" }, lock: async () => ({ release: async () => { releases++; } }) }), { code: "EIO" });
    assert.equal(releases, 1);
  } finally { fs.rename = rename; fs.rm = rm; }
});

test("Mac forced group cleanup removes a TERM-resistant descendant and preserves a sibling", { skip: process.platform !== "darwin", timeout: 30_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-descendant-stop-"));
  const descendant = path.join(root, "descendant.mjs"), leader = path.join(root, "leader.mjs"), siblingFile = path.join(root, "sibling.mjs");
  await fs.writeFile(descendant, 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000); process.send("ready");');
  await fs.writeFile(leader, `import {fork} from "node:child_process"; const child=fork(${JSON.stringify(descendant)},[],{silent:true}); child.once("message",()=>process.send(child.pid)); setInterval(()=>{},1000);`);
  await fs.writeFile(siblingFile, 'setInterval(() => {}, 1000); process.send("ready");');
  const sibling = fork(siblingFile, [], { silent: true });
  const child = fork(leader, [], { silent: true, detached: true });
  const exited = once(child, "exit"), siblingExited = once(sibling, "exit");
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; } };
  t.after(async () => { try { process.kill(-child.pid, "SIGKILL"); } catch {} if (alive(sibling.pid)) sibling.kill("SIGKILL"); await Promise.all([exited,siblingExited]); await fs.rm(root,{recursive:true,force:true}); });
  const [[descendantPid]] = await Promise.all([once(child,"message"),once(sibling,"message")]);
  await killUnixProcessGroup(child.pid, { child });
  await exited;
  assert.equal(alive(descendantPid),false);
  assert.equal(alive(sibling.pid),true);
  sibling.kill("SIGKILL"); await siblingExited;
});
