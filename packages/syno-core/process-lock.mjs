import { promises as fs } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// 同一 Node 进程内的等待者不需要反复启动 PowerShell 查询外部进程身份；
// 先按锁路径排队，再用文件锁跨进程互斥。failFast 锁保留原语义，不能排队。
const localLockTails = new Map();

function reserveLocalLock(file) {
  const previous = localLockTails.get(file) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  localLockTails.set(file, current);
  return {
    wait: previous,
    release: () => {
      release();
      if (localLockTails.get(file) === current) localLockTails.delete(file);
    },
  };
}

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

function lockTimeout(file) {
  const error = new Error(`等待跨进程锁超时：${path.basename(file)}`);
  error.code = "PROCESS_LOCK_TIMEOUT";
  return error;
}

function windowsRecoveryMutexName(file) {
  const fingerprint = createHash("sha256").update(path.resolve(file)).digest("hex");
  return `Global\\SynoProcessLockRecovery_${fingerprint}`;
}

function windowsRecoveryMutexScript(name, failFast) {
  const escapedName = name.replace(/'/g, "''");
  const wait = failFast ? "$acquired=$mutex.WaitOne(0)" : "$acquired=$mutex.WaitOne()";
  // 只让 ASCII 的 READY/换行跨过 PowerShell stdio 边界；锁名由 SHA-256 生成，不含用户路径。
  return [
    "$ErrorActionPreference='Stop'",
    "$created=$false",
    `$mutex=[System.Threading.Mutex]::new($false,'${escapedName}',[ref]$created)`,
    "$acquired=$false",
    "try {",
    wait,
    "if(-not $acquired){exit 75}",
    "[Console]::Out.WriteLine('READY')",
    "[Console]::Out.Flush()",
    "[Console]::In.ReadLine() | Out-Null",
    "} finally {",
    "if($acquired){$mutex.ReleaseMutex() | Out-Null}",
    "$mutex.Dispose()",
    "}",
  ].join(";");
}

function acquireWindowsRecoveryMutex(file, { timeoutMs = 0, failFast = false } = {}) {
  if (process.platform !== "win32") return Promise.resolve(null);
  const remaining = Math.max(0, Number(timeoutMs) || 0);
  if (!failFast && remaining <= 0) return Promise.reject(lockTimeout(file));
  const script = windowsRecoveryMutexScript(windowsRecoveryMutexName(file), failFast);
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let ready = false;
    let settled = false;
    let timer = null;
    let released = false;
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
    const kill = () => { try { child.kill(); } catch {} };
    const settleError = (error) => {
      if (settled) return;
      settled = true;
      clearTimer();
      kill();
      reject(error);
    };
    const release = async () => {
      if (released) return;
      released = true;
      try { child.stdin.write("\n"); child.stdin.end(); } catch {}
      if (child.exitCode !== null) return;
      await new Promise((done) => child.once("close", done));
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (ready || !stdout.split(/\r?\n/).includes("READY")) return;
      ready = true;
      settled = true;
      clearTimer();
      resolve({ release });
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdin.on("error", (error) => {
      if (!ready) settleError(Object.assign(new Error("Windows 锁恢复互斥量 stdin 写入失败"), { code: "PROCESS_LOCK_MUTEX_STDIN_ERROR", cause: error }));
    });
    child.on("error", (error) => {
      settleError(Object.assign(new Error("Windows 锁恢复互斥量启动失败"), { code: "PROCESS_LOCK_MUTEX_START_ERROR", cause: error }));
    });
    child.on("close", (code) => {
      if (ready || settled) return;
      if (failFast && code === 75) {
        settled = true;
        clearTimer();
        resolve(null);
        return;
      }
      settleError(Object.assign(new Error(`Windows 锁恢复互斥量失败：${stderr.trim() || `exit ${code}`}`), { code: "PROCESS_LOCK_MUTEX_ERROR" }));
    });
    if (!failFast) {
      timer = setTimeout(() => settleError(lockTimeout(file)), remaining);
    }
  });
}

async function waitForLocalLock(localLease, deadline, file) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw lockTimeout(file);
  let timer = null;
  try {
    await Promise.race([
      localLease.wait,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(lockTimeout(file)), remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function isBlankLockFile(file) {
  try {
    return (await fs.readFile(file, "utf8")).trim() === "";
  } catch {
    return false;
  }
}

async function removeStaleProcessLockIfConfirmed(file, { timeoutMs = 0, failFast = false } = {}) {
  const resolved = path.resolve(file);
  const recoveryLease = await acquireWindowsRecoveryMutex(resolved, { timeoutMs, failFast });
  if (process.platform === "win32" && !recoveryLease) return { status: "recovery_busy", owner: null, removed: false };
  try {
    // 必须在恢复互斥量内重新检查，避免删除互斥量等待期间已经被替换的锁。
    const inspection = await inspectProcessLock(resolved, { verifyIdentity: true });
    if (inspection.status !== "stale") return { ...inspection, removed: false };
    await fs.rm(resolved, { force: true });
    return { ...inspection, status: "stale_removed", removed: true };
  } finally {
    await recoveryLease?.release();
  }
}

async function readWindowsProcessStart(pid) {
  if (process.platform !== "win32") return null;
  const script = `$p=Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue; if($p){$p.StartTime.ToUniversalTime().ToString('o')}`;
  // 负载下 PowerShell 启动可能超过首个预算；身份读取失败会把活锁误判为 identity_unknown（failFast 直接拒绝、
  // 非 failFast 空转等待），因此超时后带更长预算重试一次；两次都失败才按“无法确认身份”返回 null。
  for (const timeout of [2_000, 10_000]) {
    try {
      const result = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout });
      return String(result.stdout || "").trim();
    } catch {
      // 继续用更长预算重试；两次均失败视为身份未知。
    }
  }
  return null;
}

async function inspectProcessLock(file, { verifyIdentity = false } = {}) {
  const resolved = path.resolve(file);
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(resolved, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { status: "absent", owner: null };
    return { status: "identity_unknown", owner: null };
  }
  if (!Number.isInteger(owner?.pid) || owner.pid <= 0) return { status: "identity_unknown", owner: null };
  const alive = processIsAlive(owner.pid);
  if (!alive) return {
    status: "stale",
    owner: {
      pid: owner.pid,
      instanceId: owner.instanceId || null,
      processStartedAt: owner.processStartedAt || null,
      repoFingerprint: owner.repoFingerprint || null,
      entrypoint: owner.entrypoint || null,
    },
  };
  if (verifyIdentity && (owner.processStartedAt || owner.createdAt)) {
    // 身份基准 = processStartedAt（当代格式）；旧世代锁只有 {pid, createdAt}——
    // createdAt 兜底：PID 复用进程启动时间必然晚于锁创建，|实际-锁创建| > 10s → stale。
    const expectedIso = owner.processStartedAt || owner.createdAt;
    const actualStartedAt = await readWindowsProcessStart(owner.pid);
    if (actualStartedAt === "") return {
      status: "stale",
      owner: {
        pid: owner.pid,
        instanceId: owner.instanceId || null,
        processStartedAt: owner.processStartedAt || null,
        repoFingerprint: owner.repoFingerprint || null,
        entrypoint: owner.entrypoint || null,
      },
    };
    if (actualStartedAt === null) return {
      status: "identity_unknown",
      owner: {
        pid: owner.pid,
        instanceId: owner.instanceId || null,
        processStartedAt: owner.processStartedAt || null,
        repoFingerprint: owner.repoFingerprint || null,
        entrypoint: owner.entrypoint || null,
      },
    };
    const expectedMs = Date.parse(expectedIso);
    const actualMs = Date.parse(actualStartedAt);
    if (!Number.isFinite(expectedMs) || !Number.isFinite(actualMs) || Math.abs(expectedMs - actualMs) > 10_000) return {
      status: "stale",
      owner: {
        pid: owner.pid,
        instanceId: owner.instanceId || null,
        processStartedAt: owner.processStartedAt || null,
        repoFingerprint: owner.repoFingerprint || null,
        entrypoint: owner.entrypoint || null,
      },
    };
  }
  return {
    status: "running",
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
  const inspection = await inspectProcessLock(file, { verifyIdentity: true });
  if (inspection.status !== "stale") return { ...inspection, removed: false };
  const result = await removeStaleProcessLockIfConfirmed(path.resolve(file), { failFast: true });
  if (result.status === "recovery_busy") return { ...inspection, removed: false };
  return result;
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

  async #publishLock() {
    const owner = this.owner;
    const temporary = `${this.file}.${process.pid}.${randomUUID()}.claim`;
    await fs.writeFile(temporary, `${JSON.stringify(owner)}\n`, { encoding: "utf8", flag: "wx" });
    try {
      await fs.link(temporary, this.file);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    await fs.rm(temporary, { force: true }).catch(() => {});
    return owner;
  }

  async acquire() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const localLease = this.failFast ? null : reserveLocalLock(this.file);
    const deadline = Date.now() + this.timeoutMs;
    try {
      if (localLease) await waitForLocalLock(localLease, deadline, this.file);
      let unknownRetries = 0;
      while (Date.now() <= deadline) {
        try {
          const owner = await this.#publishLock();
          let released = false;
          return {
            release: async () => {
              if (released) return;
              released = true;
              try {
                let current = null;
                try { current = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
                if (current?.pid === owner.pid && current?.instanceId === owner.instanceId) {
                  await fs.rm(this.file, { force: true });
                }
              } finally {
                localLease?.release();
              }
            },
            owner,
          };
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
          if (this.failFast) {
            const inspection = await inspectProcessLock(this.file, { verifyIdentity: true });
            if (inspection.status === "stale") {
              const result = await removeStaleProcessLockIfConfirmed(this.file, { failFast: true });
              if (result.status === "recovery_busy") {
                const held = new Error(`跨进程锁已由运行中的实例持有：${path.basename(this.file)}`);
                held.code = "PROCESS_LOCK_HELD";
                held.owner = inspection.owner;
                throw held;
              }
              continue;
            }
            if (inspection.status === "identity_unknown") {
              // 版本混跑兜底：旧版写入者是「先独占创建、后写 JSON」，空文件是瞬时态；
              // 有界重试后仍为空/损坏才按身份未知失败关闭。
              if (unknownRetries < 5 && await isBlankLockFile(this.file)) {
                unknownRetries += 1;
                await delay(this.pollMs);
                continue;
              }
              const unknown = new Error(`跨进程锁身份无法确认：${path.basename(this.file)}`);
              unknown.code = "PROCESS_LOCK_IDENTITY_UNKNOWN";
              throw unknown;
            }
            const held = new Error(`跨进程锁已由运行中的实例持有：${path.basename(this.file)}`);
            held.code = "PROCESS_LOCK_HELD";
            held.owner = inspection.owner;
            throw held;
          }
          let owner = null;
          try { owner = JSON.parse(await fs.readFile(this.file, "utf8")); } catch {}
          if (!Number.isInteger(owner?.pid) || owner.pid <= 0) {
            // 创建者可能刚完成 wx、尚未写入 JSON；损坏锁宁可等待至超时并交给 doctor，
            // 不能在没有可验证身份时删除另一个进程刚创建的锁。
            await delay(this.pollMs);
            continue;
          }
          // PID 存活不足以证明持锁者还在（进程被杀/重启后 PID 复用会让死锁误判为活锁）：
          // 一律走进程启动时间身份校验——确定过期（含身份不匹配）才移除，无法确认身份则继续等待。
          const inspection = await inspectProcessLock(this.file, { verifyIdentity: true });
          if (inspection.status === "stale") {
            await removeStaleProcessLockIfConfirmed(this.file, {
              timeoutMs: Math.max(0, deadline - Date.now()),
            });
            continue;
          }
          await delay(this.pollMs);
        }
      }
      throw lockTimeout(this.file);
    } catch (error) {
      localLease?.release();
      throw error;
    }
  }

  async run(operation) {
    const lease = await this.acquire();
    try { return await operation(); }
    finally { await lease.release(); }
  }
}

export { ProcessFileLock, inspectProcessLock, processIsAlive, readWindowsProcessStart, removeConfirmedStaleProcessLock };
