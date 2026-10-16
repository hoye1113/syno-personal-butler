import { execFile, spawn } from "node:child_process";
import { appendFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { DEFAULT_WEB_PORT, PATHS } from "../packages/syno-core/paths.mjs";
import { repoFingerprintFor } from "../packages/syno-core/repo-fingerprint.mjs";

const execFileAsync = promisify(execFile);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..");

// 与 scripts/start-syno.ps1 同一行为契约：崩溃退避重启、快速崩溃连击触发桌面告警（每小时重告）、
// 一次正常存活 ≥60 秒即重置；health_ok / adopted 日志按小时节流；日志保留 14 天。
const RESTART_BACKOFF_SECONDS = 60;
const FAST_CRASH_SECONDS = 60;
const CRASH_STREAK_THRESHOLD = 3;
const CRASH_ALERT_REARM_MINUTES = 60;
const ALERT_TIMEOUT_SECONDS = 120;
const LOG_RETENTION_DAYS = 14;
const ADOPT_POLL_MS = 5_000;
const STOP_GRACE_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createCrashAlertState() {
  return { fastCrashStreak: 0, alertsSent: 0, lastAlertAt: null };
}

function crashAlertDue(state, uptimeSeconds, now = new Date(), {
  fastCrashSeconds = FAST_CRASH_SECONDS,
  streakThreshold = CRASH_STREAK_THRESHOLD,
  rearmMinutes = CRASH_ALERT_REARM_MINUTES,
} = {}) {
  if (uptimeSeconds >= fastCrashSeconds) {
    // 一次存活越过启动窗口即清除事故，使下一次崩溃循环可以立即告警而不是复用旧的静默窗口。
    state.fastCrashStreak = 0;
    state.lastAlertAt = null;
    return false;
  }
  state.fastCrashStreak += 1;
  if (state.fastCrashStreak < streakThreshold) return false;
  const last = state.lastAlertAt;
  if (last && (now.getTime() - last.getTime()) / 60_000 < rearmMinutes) return false;
  state.lastAlertAt = now;
  state.alertsSent += 1;
  return true;
}

function launcherLogDue(state, event, now = new Date()) {
  if (!["launcher.health_ok", "launcher.adopted"].includes(event)) return true;
  const last = state[event];
  if (last && (now.getTime() - last.getTime()) / 3_600_000 < 1) return false;
  state[event] = now;
  return true;
}

function validateHealth(health, fingerprint) {
  return Boolean(health && health.ok === true && health.product === "syno-personal-butler"
    && health.protocolVersion === 2 && health.repoFingerprint === fingerprint);
}

function crashLoopAlertBody({ fastCrashStreak, exitCode, logRoot }) {
  return `The Syno Host crashed ${fastCrashStreak} times in a row within seconds of starting (last exit code ${exitCode}). The launcher keeps retrying every ${RESTART_BACKOFF_SECONDS} seconds. Check ${logRoot}/launchd-task-*.jsonl and the repository/vault state.`;
}

function launchdTaskLogFile(logRoot, date = new Date()) {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return path.join(logRoot, `launchd-task-${stamp}.jsonl`);
}

function appleScriptString(text) {
  return `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}

async function sendCrashLoopPopup({ title, body, timeoutSeconds = ALERT_TIMEOUT_SECONDS, run = execFileAsync } = {}) {
  try {
    const script = `display dialog ${appleScriptString(body)} with title ${appleScriptString(title)} buttons {"好"} default button 1 giving up after ${Math.round(timeoutSeconds)}`;
    await run("osascript", ["-e", script], { timeout: (Math.round(timeoutSeconds) + 15) * 1_000 });
    return true;
  } catch {
    return false;
  }
}

async function purgeExpiredLogs(logRoot, { now = Date.now(), retentionDays = LOG_RETENTION_DAYS } = {}) {
  const removed = [];
  let entries = [];
  try { entries = await fs.readdir(logRoot); } catch { return removed; }
  for (const name of entries) {
    if (!/^launchd-task-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue;
    const full = path.join(logRoot, name);
    try {
      const stat = await fs.stat(full);
      if (now - stat.mtimeMs <= retentionDays * 24 * 3_600_000) continue;
      await fs.rm(full, { force: true });
      removed.push(name);
    } catch { /* 并发删除或不可读日志不阻塞监督循环 */ }
  }
  return removed;
}

function makeLauncherLogger({ logRoot, fingerprint, policy = {} }) {
  return function log(event, fields = {}) {
    try {
      if (!launcherLogDue(policy, event)) return;
      const record = { ts: new Date().toISOString(), event, repoFingerprint: fingerprint, ...fields };
      appendFileSync(launchdTaskLogFile(logRoot), `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
    } catch (error) {
      // 日志失败不得中断监督循环，但也不能静默：把原因写到 stderr（launchd 重定向为 launchd-agent.err.log）。
      try { process.stderr.write(`syno-launchd log failed: ${event} ${error?.code || ""} ${error?.message || error}\n`); } catch { /* 连 stderr 都不可用时放弃 */ }
    }
  };
}

async function fetchHealth(port, timeoutMs = 2_000) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/syno/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function inspectListener(port, run = execFileAsync) {
  try {
    const { stdout } = await run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { timeout: 5_000 });
    const pid = Number(String(stdout).trim().split(/\r?\n/)[0]);
    if (!Number.isInteger(pid) || pid <= 0) return null;
    return listenerFor(pid, run);
  } catch {
    return null;
  }
}

// macOS 的 p_comm 截断为 16 字符（绝对路径启动的 node 会变成 "/usr/local/bin/n"），因此可执行路径
// 从 ps args 的首个 token 取，而不是 comm 列。
async function listenerFor(pid, run = execFileAsync) {
  try {
    const { stdout: psOut } = await run("ps", ["-p", String(pid), "-o", "args="], { timeout: 5_000 });
    const command = String(psOut).trim();
    const comm = command.split(/\s+/)[0] || "";
    return { pid, comm, command };
  } catch {
    return null;
  }
}

async function listListeners(port, run = execFileAsync) {
  try {
    const { stdout } = await run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { timeout: 5_000 });
    const pids = [...new Set(String(stdout).split(/\r?\n/).map((line) => Number(line.trim())).filter((pid) => Number.isInteger(pid) && pid > 0))];
    const listeners = [];
    for (const pid of pids) {
      const listener = await listenerFor(pid, run);
      if (listener) listeners.push(listener);
    }
    return listeners;
  } catch {
    return [];
  }
}

// Host 以 detached 方式孵化 DSH（独立进程组）；Host 被 SIGKILL 类硬崩溃时 DSH 会成为孤儿并占住
// DSH Web 端口，新 Host 永远绑不上（HARNESS_EXITED 恢复循环）。孵化新 Host 前回收命令行指向本仓
// DSH 根的孤儿监听者；只认本仓 DSH，绝不碰陌生服务。
async function reapOrphanDsh({ port, dshRoot, log, run = execFileAsync, kill = (pid, signal) => process.kill(pid, signal), sleepFn = sleep, graceMs = 5_000 }) {
  const listeners = await listListeners(port, run);
  const reaped = [];
  for (const listener of listeners) {
    if (!String(listener.command || "").includes(dshRoot)) continue;
    try { kill(listener.pid, "SIGTERM"); } catch { /* 已退出 */ }
    const deadline = Date.now() + graceMs;
    while (Date.now() < deadline) {
      try { kill(listener.pid, 0); } catch { break; }
      await sleepFn(100);
    }
    try { kill(listener.pid, "SIGKILL"); } catch { /* 已退出 */ }
    reaped.push(listener.pid);
  }
  if (reaped.length) log("launcher.orphan_reaped", { port, pids: reaped, dshRoot });
  return reaped;
}

// Host 被 SIGKILL 类硬崩溃或被 launchd 强换时会留下「关掉监听但没退出」的孤儿 Host
// （2026-10-16 实测：pid 75683 在 8888 已换主的情况下存活两天，不占端口、不持锁，纯泄漏）。
// 端口扫描找不到它，只能按命令行识别；只认本仓 apps/syno/server.mjs 入口，绝不碰陌生进程。
async function listRepoHostProcesses({ serverPath, repoRoot, run = execFileAsync }) {
  try {
    const { stdout } = await run("ps", ["-ax", "-o", "pid=,args="], { timeout: 5_000 });
    const relative = path.relative(repoRoot, serverPath).replace(/\\/g, "/");
    // 相对路径必须自成一段（前有空白/开头，后有空白/结尾），否则 /elsewhere/apps/syno/server.mjs 会被误认。
    const relativePattern = new RegExp(`(?:^|\\s)(?:\\./)?${relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "u");
    const hosts = [];
    for (const line of String(stdout).split(/\r?\n/)) {
      const match = /^\s*(\d+)\s+(.+)$/u.exec(line);
      if (!match) continue;
      const pid = Number(match[1]);
      const command = match[2];
      if (!Number.isInteger(pid) || pid <= 0) continue;
      if (!command.includes(serverPath) && !relativePattern.test(command)) continue;
      hosts.push({ pid, command });
    }
    return hosts;
  } catch {
    return [];
  }
}

async function hasTcpListener(pid, run = execFileAsync) {
  try {
    // -a 必须有：lsof 的 -p 与 -i 默认是并集，只有 -a 才取交集。
    // 少了它会返回全系统监听者，任何进程都被误判为「还在监听」（2026-10-16 实测：回收整批失效）。
    const { stdout } = await run("lsof", ["-nP", "-a", "-p", String(pid), "-iTCP", "-sTCP:LISTEN", "-t"], { timeout: 5_000 });
    return String(stdout).trim().length > 0;
  } catch {
    return false;
  }
}

// 安全性：候选进程只要还在监听 TCP 就跳过（正在启动的 Host、主人手动起的测试 Host 都算），
// 只回收真正「既没端口也没退出」的残骸；调用方通过 keep 排除自己的子进程。
// 时机很重要：必须在孵化出新 Host 之后调用——半死 Host 会先释放端口、再滞留若干秒，
// 那时候旧端口守卫会把它整批放过（2026-10-16 实测：这样回收等于没做）。
async function reapOrphanHosts({ port, serverPath, repoRoot, log, keep = [], run = execFileAsync, kill = (pid, signal) => process.kill(pid, signal), sleepFn = sleep, graceMs = 5_000 }) {
  const skip = new Set([process.pid, ...keep].filter((pid) => Number.isInteger(pid) && pid > 0));
  const reaped = [];
  for (const host of await listRepoHostProcesses({ serverPath, repoRoot, run })) {
    if (skip.has(host.pid)) continue;
    if (await hasTcpListener(host.pid, run)) continue;
    try { kill(host.pid, "SIGTERM"); } catch { continue; }
    const deadline = Date.now() + graceMs;
    while (Date.now() < deadline) {
      try { kill(host.pid, 0); } catch { break; }
      await sleepFn(100);
    }
    try { kill(host.pid, "SIGKILL"); } catch { /* 已退出 */ }
    reaped.push(host.pid);
  }
  if (reaped.length) log("launcher.orphan_host_reaped", { port, pids: reaped });
  return reaped;
}

function listenerMatchesHost(listener, { serverPath, repoRoot }) {
  if (!listener) return false;
  const comm = String(listener.comm || "");
  if (!/(^|\/)node(?:\.exe)?$/.test(comm)) return false;
  const command = String(listener.command || "");
  const relative = path.relative(repoRoot, serverPath).replace(/\\/g, "/");
  return command.includes(serverPath) || command.includes(relative);
}

async function writeOwnership(pidFile, record) {
  try {
    await fs.mkdir(path.dirname(pidFile), { recursive: true });
    const temporary = `${pidFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, pidFile);
  } catch { /* 所有权记录是诊断信息，失败不阻塞监督 */ }
}

async function clearOwnership(pidFile, pid) {
  try {
    const current = JSON.parse(await fs.readFile(pidFile, "utf8"));
    if (current?.pid === pid) await fs.rm(pidFile, { force: true });
  } catch { /* 已被清理或不可读 */ }
}

async function handleHostCrash({ state, uptimeSeconds, exitCode, logRoot, now = new Date(), log, sendAlert = sendCrashLoopPopup }) {
  const alertSent = crashAlertDue(state, uptimeSeconds, now);
  if (!alertSent) return false;
  const body = crashLoopAlertBody({ fastCrashStreak: state.fastCrashStreak, exitCode, logRoot });
  const popupDelivered = await sendAlert({ title: "Syno Host crash loop", body, timeoutSeconds: ALERT_TIMEOUT_SECONDS });
  log("launcher.crash_loop", {
    consecutiveFastCrashes: state.fastCrashStreak,
    exitCode,
    lastUptimeSeconds: uptimeSeconds,
    alertsSent: state.alertsSent,
    popupDelivered,
  });
  return true;
}

async function main() {
  const repoRoot = REPO_ROOT;
  const nodePath = process.execPath;
  const serverPath = path.join(repoRoot, "apps", "syno", "server.mjs");
  const port = Number(process.env.PORT || DEFAULT_WEB_PORT);
  const dshWebPort = Number(process.env.SYNO_DSH_WEB_PORT || 3088);
  const dshRoot = String(process.env.SYNO_DSH_ROOT || path.join(repoRoot, "vendor", "deepseek-harness"));
  const logRoot = path.join(PATHS.localDataRoot, "logs");
  const pidFile = path.join(PATHS.runtimeRoot, "syno-host.pid");
  const fingerprint = repoFingerprintFor(repoRoot);
  await fs.mkdir(logRoot, { recursive: true });
  await purgeExpiredLogs(logRoot);
  const policy = {};
  const log = makeLauncherLogger({ logRoot, fingerprint, policy });
  const alertState = createCrashAlertState();
  const state = { child: null, stopping: false };

  const stop = async (signal) => {
    if (state.stopping) return;
    state.stopping = true;
    log("launcher.stopping", { signal, childPid: state.child?.pid ?? null });
    const child = state.child;
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      const deadline = Date.now() + STOP_GRACE_MS;
      while (child.exitCode === null && child.signalCode === null && Date.now() < deadline) await sleep(100);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => { void stop("SIGTERM"); });
  process.on("SIGINT", () => { void stop("SIGINT"); });

  log("launcher.started", { nodePath, serverPath, port, parentPid: process.pid });

  // 内层：端口上已有健康的本仓 Host（例如手动启动或上一轮退避窗口内被手动拉起）时收养并看护，
  // 不生成第二个竞争者；直到该 Host 消失才落入外层自行孵化。无法确认归属时先做有界重试
  // （旧 Host 可能正在优雅退出），连续 3 次仍无法确认才安静停下（非零退出会触发 throttle 重启循环）。
  let adoptRejections = 0;
  while (!state.stopping) {
    const health = await fetchHealth(port);
    if (!health) break;
    if (!validateHealth(health, fingerprint)) {
      adoptRejections += 1;
      log("launcher.adopt_rejected", { reason: "foreign_health", attempt: adoptRejections, product: health?.product ?? null, protocolVersion: health?.protocolVersion ?? null });
      if (adoptRejections >= 3) process.exit(0);
      await sleep(15_000);
      continue;
    }
    const listener = await inspectListener(port);
    if (!listenerMatchesHost(listener, { serverPath, repoRoot })) {
      adoptRejections += 1;
      log("launcher.adopt_rejected", { reason: "listener_unverified", attempt: adoptRejections, listenerPid: listener?.pid ?? null, listenerCommand: listener?.command ?? null });
      if (adoptRejections >= 3) process.exit(0);
      await sleep(15_000);
      continue;
    }
    adoptRejections = 0;
    log("launcher.health_ok", { listenerPid: listener.pid });
    log("launcher.adopted", { listenerPid: listener.pid });
    await writeOwnership(pidFile, { version: 1, pid: listener.pid, mode: "adopted", nodePath, serverPath, repoRoot, recordedAt: new Date().toISOString() });
    await sleep(ADOPT_POLL_MS);
  }

  while (!state.stopping) {
    await reapOrphanDsh({ port: dshWebPort, dshRoot, log });
    const child = spawn(nodePath, [serverPath], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    state.child = child;
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    const startedAt = Date.now();
    await writeOwnership(pidFile, { version: 1, pid: child.pid, mode: "owned", nodePath, serverPath, repoRoot, startedAt: new Date(startedAt).toISOString() });
    log("launcher.host_started", { pid: child.pid });
    // 孵化后才收残骸：此刻端口已由我们的子进程接管，「既没端口又没退出」的本仓 Host 只可能是旧残骸。
    await reapOrphanHosts({ port, serverPath, repoRoot, log, keep: [child.pid] });
    const { code, signal } = await new Promise((resolve) => {
      child.once("exit", (exitCode, exitSignal) => resolve({ code: exitCode, signal: exitSignal }));
    });
    state.child = null;
    await clearOwnership(pidFile, child.pid);
    if (state.stopping) break;
    if (code === 0) {
      log("launcher.host_exited", { pid: child.pid });
      process.exit(0);
    }
    const uptimeSeconds = Math.round((Date.now() - startedAt) / 100) / 10;
    log("launcher.host_crashed", { pid: child.pid, exitCode: code, signal, uptimeSeconds, backoffSeconds: RESTART_BACKOFF_SECONDS });
    await handleHostCrash({ state: alertState, uptimeSeconds, exitCode: code ?? 1, logRoot, log });
    await sleep(RESTART_BACKOFF_SECONDS * 1_000);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    try {
      appendFileSync(launchdTaskLogFile(path.join(PATHS.localDataRoot, "logs")), `${JSON.stringify({ ts: new Date().toISOString(), event: "launcher.failed", message: String(error?.message || error) })}\n`);
    } catch { /* 记录失败时仍以非零退出暴露启动器故障 */ }
    process.exitCode = 1;
  });
}

export {
  ALERT_TIMEOUT_SECONDS,
  CRASH_ALERT_REARM_MINUTES,
  CRASH_STREAK_THRESHOLD,
  FAST_CRASH_SECONDS,
  LOG_RETENTION_DAYS,
  RESTART_BACKOFF_SECONDS,
  appleScriptString,
  crashAlertDue,
  crashLoopAlertBody,
  createCrashAlertState,
  handleHostCrash,
  inspectListener,
  launcherLogDue,
  listenerMatchesHost,
  launchdTaskLogFile,
  hasTcpListener,
  listListeners,
  listRepoHostProcesses,
  makeLauncherLogger,
  purgeExpiredLogs,
  reapOrphanDsh,
  reapOrphanHosts,
  sendCrashLoopPopup,
  validateHealth,
};
