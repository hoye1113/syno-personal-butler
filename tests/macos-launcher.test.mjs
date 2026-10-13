import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { repoFingerprintFor } from "../packages/syno-core/repo-fingerprint.mjs";
import {
  appleScriptString,
  crashAlertDue,
  crashLoopAlertBody,
  createCrashAlertState,
  handleHostCrash,
  inspectListener,
  launcherLogDue,
  listenerMatchesHost,
  launchdTaskLogFile,
  listListeners,
  makeLauncherLogger,
  purgeExpiredLogs,
  reapOrphanDsh,
  validateHealth,
} from "../scripts/syno-launchd.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("崩溃告警状态机：3 次快速崩溃升级、每小时重告、健康存活重置", () => {
  const state = createCrashAlertState();
  const t0 = new Date("2026-10-14T03:00:00Z");
  assert.equal(crashAlertDue(state, 5, t0), false);
  assert.equal(state.fastCrashStreak, 1);
  assert.equal(crashAlertDue(state, 5, t0), false);
  assert.equal(crashAlertDue(state, 5, t0), true, "第 3 次快速崩溃必须告警");
  assert.equal(state.alertsSent, 1);
  assert.equal(crashAlertDue(state, 5, new Date(t0.getTime() + 10 * 60_000)), false, "1 小时内不重复告警");
  assert.equal(crashAlertDue(state, 5, new Date(t0.getTime() + 61 * 60_000)), true, "超过 1 小时重告");
  assert.equal(state.alertsSent, 2);
  assert.equal(crashAlertDue(state, 65, new Date(t0.getTime() + 90 * 60_000)), false, "存活 ≥60 秒清除事故");
  assert.equal(state.fastCrashStreak, 0);
  assert.equal(state.lastAlertAt, null);
  assert.equal(crashAlertDue(state, 5, t0), false);
  assert.equal(crashAlertDue(state, 5, t0), false);
  assert.equal(crashAlertDue(state, 5, t0), true, "事故清除后下一次连击可立即告警");
  assert.equal(state.alertsSent, 3);
});

test("启动日志节流：health_ok / adopted 每小时最多一条，其余事件直通", () => {
  const state = {};
  const t0 = new Date("2026-10-14T03:00:00Z");
  assert.equal(launcherLogDue(state, "launcher.health_ok", t0), true);
  assert.equal(launcherLogDue(state, "launcher.health_ok", new Date(t0.getTime() + 30 * 60_000)), false);
  assert.equal(launcherLogDue(state, "launcher.health_ok", new Date(t0.getTime() + 61 * 60_000)), true);
  assert.equal(launcherLogDue(state, "launcher.adopted", t0), true);
  assert.equal(launcherLogDue(state, "launcher.adopted", new Date(t0.getTime() + 59 * 60_000)), false);
  assert.equal(launcherLogDue(state, "launcher.host_crashed", t0), true);
  assert.equal(launcherLogDue(state, "launcher.host_crashed", t0), true);
});

test("健康响应校验：只认本仓指纹与协议版本", () => {
  const fingerprint = "a1b2c3d4e5f60718";
  const healthy = { ok: true, product: "syno-personal-butler", protocolVersion: 2, repoFingerprint: fingerprint };
  assert.equal(validateHealth(healthy, fingerprint), true);
  assert.equal(validateHealth({ ...healthy, repoFingerprint: "ffffffffffffffff" }, fingerprint), false);
  assert.equal(validateHealth({ ...healthy, product: "other" }, fingerprint), false);
  assert.equal(validateHealth({ ...healthy, protocolVersion: 1 }, fingerprint), false);
  assert.equal(validateHealth(null, fingerprint), false);
});

test("仓库指纹与 server 使用同一公式（lowercase 后 sha256 前 16 位）", () => {
  const repoRoot = path.resolve("/tmp/Syno Repo");
  const expected = createHash("sha256").update(repoRoot.toLocaleLowerCase("en-US"), "utf8").digest("hex").slice(0, 16);
  assert.equal(repoFingerprintFor(repoRoot), expected);
});

test("server.mjs 与本仓启动器共用 repo-fingerprint 模块（防公式漂移）", async () => {
  const server = await fs.readFile(path.join(root, "apps", "syno", "server.mjs"), "utf8");
  assert.match(server, /repoFingerprintFor\(PATHS\.repoRoot\)/);
  assert.doesNotMatch(server, /createHash\("sha256"\)/);
});

test("崩溃告警文案与日志路径符合 Windows 启动器同款契约", () => {
  const body = crashLoopAlertBody({ fastCrashStreak: 3, exitCode: 1, logRoot: "/data/logs" });
  assert.match(body, /crashed 3 times in a row within seconds of starting \(last exit code 1\)/);
  assert.match(body, /keeps retrying every 60 seconds/);
  assert.match(body, /\/data\/logs\/launchd-task-\*\.jsonl/);
  const file = launchdTaskLogFile("/data/logs", new Date("2026-10-14T05:06:07Z"));
  assert.equal(path.basename(file), "launchd-task-2026-10-14.jsonl");
});

test("handleHostCrash：第 3 次快速崩溃才发告警并记录 popupDelivered", async () => {
  const events = [];
  const log = (event, fields) => events.push({ event, fields });
  const alerts = [];
  const sendAlert = async (payload) => { alerts.push(payload); return true; };
  const state = createCrashAlertState();
  const now = new Date("2026-10-14T03:00:00Z");
  assert.equal(await handleHostCrash({ state, uptimeSeconds: 4, exitCode: 1, logRoot: "/data/logs", now, log, sendAlert }), false);
  assert.equal(await handleHostCrash({ state, uptimeSeconds: 4, exitCode: 1, logRoot: "/data/logs", now, log, sendAlert }), false);
  assert.equal(alerts.length, 0);
  assert.equal(await handleHostCrash({ state, uptimeSeconds: 4, exitCode: 137, logRoot: "/data/logs", now, log, sendAlert }), true);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].body, /crashed 3 times in a row/);
  const record = events.find((entry) => entry.event === "launcher.crash_loop");
  assert.ok(record);
  assert.equal(record.fields.consecutiveFastCrashes, 3);
  assert.equal(record.fields.exitCode, 137);
  assert.equal(record.fields.popupDelivered, true);
  assert.equal(record.fields.alertsSent, 1);
});

test("AppleScript 文案转义：引号、反斜杠与换行不破坏 osascript 脚本", () => {
  assert.equal(appleScriptString('say "hi"\\ now\nnext'), '"say \\"hi\\"\\\\ now next"');
});

test("日志清理：只删除超过保留期的 launchd-task 日志", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "syno-mac-logs-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const old = path.join(dir, "launchd-task-2026-09-01.jsonl");
  const fresh = path.join(dir, "launchd-task-2026-10-13.jsonl");
  const foreign = path.join(dir, "syno-runtime-2026-09-01.jsonl");
  for (const file of [old, fresh, foreign]) await fs.writeFile(file, "{}\n");
  const oldTime = new Date(Date.now() - 20 * 24 * 3_600_000);
  await fs.utimes(old, oldTime, oldTime);
  await fs.utimes(foreign, oldTime, oldTime);
  const removed = await purgeExpiredLogs(dir);
  assert.deepEqual(removed, ["launchd-task-2026-09-01.jsonl"]);
  assert.equal(exists(await listNames(dir), "launchd-task-2026-09-01.jsonl"), false);
  assert.equal(exists(await listNames(dir), "launchd-task-2026-10-13.jsonl"), true);
  assert.equal(exists(await listNames(dir), "syno-runtime-2026-09-01.jsonl"), true, "非本启动器日志不清理");
});

test("监听进程校验：只认 node 且命令行指向本仓 server", () => {
  const serverPath = "/repo/apps/syno/server.mjs";
  const context = { serverPath, repoRoot: "/repo" };
  assert.equal(listenerMatchesHost({ pid: 1, comm: "/usr/local/bin/node", command: `/usr/local/bin/node ${serverPath}` }, context), true);
  assert.equal(listenerMatchesHost({ pid: 1, comm: "node", command: `node apps/syno/server.mjs` }, context), true);
  assert.equal(listenerMatchesHost({ pid: 1, comm: "/usr/bin/python3", command: `python3 ${serverPath}` }, context), false);
  assert.equal(listenerMatchesHost({ pid: 1, comm: "/usr/local/bin/node", command: "/usr/local/bin/node other-server.mjs" }, context), false);
  assert.equal(listenerMatchesHost(null, context), false);
});

test("日志写入：真实落盘为 JSONL，节流事件每小时一条（回归 appendFileSync 静默失效）", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "syno-mac-journal-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const log = makeLauncherLogger({ logRoot: dir, fingerprint: "deadbeefdeadbeef" });
  log("launcher.started", { nodePath: "/usr/local/bin/node" });
  log("launcher.health_ok", { listenerPid: 1 });
  log("launcher.health_ok", { listenerPid: 1 });
  const lines = (await fs.readFile(launchdTaskLogFile(dir), "utf8")).trim().split("\n");
  assert.equal(lines.length, 2, "started 一条 + health_ok 节流后一条");
  const events = lines.map((line) => JSON.parse(line));
  assert.equal(events[0].event, "launcher.started");
  assert.equal(events[0].repoFingerprint, "deadbeefdeadbeef");
  assert.equal(events[1].event, "launcher.health_ok");
  assert.equal(events[1].listenerPid, 1);
});

test("监听进程解析：从 ps args 取可执行路径，避开 macOS comm 16 字符截断", async () => {
  const run = async (command, args) => {
    if (command === "lsof") return { stdout: "516\n" };
    if (command === "ps") {
      assert.deepEqual(args, ["-p", "516", "-o", "args="], "必须只取 args（comm 列会被系统截断）");
      return { stdout: "/usr/local/bin/node /repo/apps/syno/server.mjs\n" };
    }
    throw new Error(`unexpected ${command}`);
  };
  const listener = await inspectListener(8888, run);
  assert.equal(listener.comm, "/usr/local/bin/node");
  assert.equal(listenerMatchesHost(listener, { serverPath: "/repo/apps/syno/server.mjs", repoRoot: "/repo" }), true);
});

test("孤儿 DSH 回收：只清理命令行指向本仓 DSH 的监听者，陌生服务不碰", async () => {
  const dshRoot = "/repo/vendor/deepseek-harness";
  const run = async (command, args) => {
    if (command === "lsof") return { stdout: "111\n999\n", stderr: "" };
    if (command === "ps") {
      return args[1] === "111"
        ? { stdout: `/usr/local/bin/node ${dshRoot}/apps/cli/src/bin.ts --profile syno --port 3088\n`, stderr: "" }
        : { stdout: "/usr/bin/other-service --listen 3088\n", stderr: "" };
    }
    throw new Error(`unexpected ${command}`);
  };
  const calls = [];
  const alive = new Set([111, 999]);
  const kill = (pid, signal) => {
    calls.push([pid, signal]);
    if (signal === "SIGTERM" || signal === "SIGKILL") alive.delete(pid);
    if (signal === 0 && !alive.has(pid)) throw Object.assign(new Error("gone"), { code: "ESRCH" });
  };
  const events = [];
  const reaped = await reapOrphanDsh({ port: 3088, dshRoot, log: (event, fields) => events.push([event, fields]), run, kill, sleepFn: async () => {} });
  assert.deepEqual(reaped, [111]);
  assert.deepEqual(calls.filter(([pid]) => pid === 999), [], "陌生服务不得触碰");
  assert.deepEqual(calls[0], [111, "SIGTERM"]);
  const record = events.find(([event]) => event === "launcher.orphan_reaped");
  assert.ok(record);
  assert.deepEqual(record[1].pids, [111]);
  assert.equal(record[1].port, 3088);
});

test("孤儿 DSH 回收：SIGTERM 无效时升级 SIGKILL；无监听时零动作", async () => {
  const calls = [];
  const kill = (pid, signal) => { calls.push([pid, signal]); };
  const run = async (command) => command === "lsof"
    ? { stdout: "222\n" }
    : { stdout: "/usr/local/bin/node /repo/vendor/deepseek-harness/apps/cli/src/bin.ts\n" };
  const reaped = await reapOrphanDsh({ port: 3088, dshRoot: "/repo/vendor/deepseek-harness", log: () => {}, run, kill, sleepFn: async () => {}, graceMs: 0 });
  assert.deepEqual(reaped, [222]);
  assert.deepEqual(calls, [[222, "SIGTERM"], [222, "SIGKILL"]]);
  const empty = await reapOrphanDsh({
    port: 3088, dshRoot: "/repo/vendor/deepseek-harness", log: () => {},
    run: async () => ({ stdout: "" }), kill: () => { throw new Error("must not kill"); }, sleepFn: async () => {},
  });
  assert.deepEqual(empty, []);
});

test("监督器接线：孵化前先回收孤儿 DSH 端口", async () => {
  const launcher = await fs.readFile(path.join(root, "scripts", "syno-launchd.mjs"), "utf8");
  assert.match(launcher, /reapOrphanDsh/);
  assert.match(launcher, /SYNO_DSH_WEB_PORT/);
  const reapCall = launcher.indexOf("await reapOrphanDsh(");
  const spawnCall = launcher.indexOf("const child = spawn(");
  assert.ok(reapCall >= 0 && spawnCall > reapCall, "回收必须发生在新 Host 孵化之前");
});

test("监督器接线：host_crashed → 告警判定 → 退避休眠 顺序固定（对齐 Windows 启动器）", async () => {
  const launcher = await fs.readFile(path.join(root, "scripts", "syno-launchd.mjs"), "utf8");
  assert.match(launcher, /repoFingerprintFor/);
  assert.match(launcher, /PATHS\.localDataRoot/);
  assert.match(launcher, /"launcher\.host_crashed"/);
  assert.match(launcher, /"launcher\.crash_loop"/);
  assert.match(launcher, /"launcher\.adopt_rejected"/);
  assert.match(launcher, /osascript/);
  assert.match(launcher, /display dialog/);
  assert.match(launcher, /giving up after/);
  const crashedLog = launcher.indexOf('"launcher.host_crashed"');
  const alertCall = launcher.indexOf("await handleHostCrash(");
  const backoffSleep = launcher.indexOf("await sleep(RESTART_BACKOFF_SECONDS * 1_000)");
  assert.ok(crashedLog >= 0 && alertCall > crashedLog && backoffSleep > alertCall, "告警必须在崩溃日志之后、退避休眠之前");
});

function exists(names, name) { return names.includes(name); }
async function listNames(dir) { return (await fs.readdir(dir)).sort(); }
