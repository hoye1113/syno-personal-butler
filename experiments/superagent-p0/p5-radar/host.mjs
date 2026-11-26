import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CHINA_TZ = "Asia/Shanghai";

function timeParts(date, timeZone = CHINA_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

async function readState(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

/**
 * Run the P5 CLI as a Host-owned worker. The CLI is deliberately a child process:
 * collection is network-bound and must never block the Feishu event loop.
 */
export function createP5HostRunner({
  cliPath,
  growthCliPath = cliPath ? path.join(path.dirname(cliPath), "p5-radar-growth.mjs") : "",
  polymarketCliPath = cliPath ? path.join(path.dirname(cliPath), "p5-radar-polymarket.mjs") : "",
  home,
  env = process.env,
  execFileImpl = execFileAsync,
  commandTimeoutMs = 120_000,
  collectTimeoutMs = 10 * 60_000,
  maxBuffer = 4 * 1024 * 1024,
} = {}) {
  if (!cliPath) throw new Error("P5 Host runner 缺少 cliPath");
  const run = async (args, { timeout = commandTimeoutMs, file = cliPath } = {}) => {
    const childEnv = { ...env };
    if (home) childEnv.P5_RADAR_HOME = home;
    const { stdout } = await execFileImpl(process.execPath, [file, ...args], {
      cwd: path.dirname(file),
      env: childEnv,
      timeout,
      maxBuffer,
    });
    return String(stdout).trim();
  };
  return {
    collect: () => run(["run"], { timeout: collectTimeoutMs }),
    growth: () => run([], { file: growthCliPath }),
    polymarket: () => run([], { file: polymarketCliPath }),
    digest: async () => (await run(["digest"])).replace(/\n已写入 [^\n]+$/u, "").trim(),
    dailyDoc: () => run(["daily-doc"], { timeout: collectTimeoutMs }),
    status: () => run(["status"]),
    mark: async (action, numbers) => {
      const outputs = [];
      for (const number of numbers) outputs.push(await run([action, String(number)]));
      return outputs;
    },
  };
}

/**
 * Host-owned daily scheduler. Collection at 09:30 and digest at 10:00 China time,
 * with durable same-day idempotency and bounded retry state.
 */
export function createP5Scheduler({
  runner,
  send,
  readChat,
  stateFile,
  now = () => new Date(),
  timeZone = CHINA_TZ,
  collectMinute = 9 * 60 + 30,
  digestMinute = 10 * 60,
  tickMs = 60_000,
  logger = () => {},
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  for (const [name, value] of Object.entries({ runner, send, readChat, stateFile })) {
    if (!value) throw new Error(`P5 Scheduler 缺少 ${name}`);
  }
  let timer = null;
  let stopped = false;
  let current = null;

  const log = (event, detail = {}) => {
    try {
      logger(event, detail);
    } catch {
      // Logging must never take down the scheduler.
    }
  };

  async function doTick() {
    if (stopped) return { skipped: "stopped" };
    const timestamp = now();
    const { date, minutes } = timeParts(timestamp, timeZone);
    const state = await readState(stateFile);

    if (minutes >= collectMinute && state.lastCollectDate !== date) {
      const retryAt = Date.parse(state.collectRetryAt || "");
      if (Number.isFinite(retryAt) && retryAt > timestamp.getTime()) {
        log("p5-collect-retry-wait", { retryAt: state.collectRetryAt });
      } else {
        try {
          await runner.collect();
          state.lastCollectDate = date;
          state.lastCollectAt = timestamp.toISOString();
          delete state.collectRetryAt;
          delete state.lastCollectError;
          log("p5-collect-ok", { date });
        } catch (error) {
          state.collectRetryAt = new Date(timestamp.getTime() + 15 * 60_000).toISOString();
          state.lastCollectError = String(error?.message || error).slice(0, 500);
          log("p5-collect-failed", { error: state.lastCollectError });
        }
      }
    }

    if (typeof runner.growth === "function" && minutes >= collectMinute && state.lastGrowthDate !== date) {
      // Growth has its own per-board stale fallback. One failed attempt must neither retry every tick nor block the digest.
      try {
        await runner.growth();
        state.lastGrowthStatus = "ok";
        delete state.lastGrowthError;
        log("p5-growth-ok", { date });
      } catch (error) {
        state.lastGrowthStatus = "failed";
        state.lastGrowthError = String(error?.message || error).slice(0, 500);
        log("p5-growth-failed", { date, error: state.lastGrowthError });
      }
      state.lastGrowthDate = date;
      state.lastGrowthAt = timestamp.toISOString();
    }

    if (typeof runner.polymarket === "function" && minutes >= collectMinute && state.lastPolymarketDate !== date) {
      // Market snapshots are independently settled and never block the daily HTML link.
      try {
        await runner.polymarket();
        state.lastPolymarketStatus = "ok";
        delete state.lastPolymarketError;
        log("p5-polymarket-ok", { date });
      } catch (error) {
        state.lastPolymarketStatus = "failed";
        state.lastPolymarketError = String(error?.message || error).slice(0, 500);
        log("p5-polymarket-failed", { date, error: state.lastPolymarketError });
      }
      state.lastPolymarketDate = date;
      state.lastPolymarketAt = timestamp.toISOString();
    }

    if (minutes >= digestMinute && state.lastDigestDate !== date) {
      const retryAt = Date.parse(state.digestRetryAt || "");
      if (Number.isFinite(retryAt) && retryAt > timestamp.getTime()) {
        log("p5-digest-retry-wait", { retryAt: state.digestRetryAt });
      } else if (stopped) {
        return { skipped: "stopped" };
      } else {
        try {
          const text = typeof runner.dailyDoc === "function" ? await runner.dailyDoc() : await runner.digest();
          const chat = await readChat();
          if (!chat?.chatId) throw Object.assign(new Error("没有已绑定的 Owner 会话"), { code: "P5_NO_CHAT" });
          let delivery;
          try {
            delivery = await send({ chatId: chat.chatId, text });
          } catch (error) {
            // The transport may have accepted the message. Persist an explicit unknown outcome and
            // require reconciliation instead of regenerating and blindly resending the daily link.
            state.lastDigestDate = date;
            state.lastDigestAt = timestamp.toISOString();
            state.lastDigestDelivery = "unknown";
            state.lastDigestError = String(error?.message || error).slice(0, 500);
            delete state.digestRetryAt;
            log("p5-digest-unknown-no-retry", { date, error: state.lastDigestError });
            await writeState(stateFile, state);
            return state;
          }
          if (delivery?.delivered !== true) throw new Error(delivery?.reason || "飞书未确认送达");
          state.lastDigestDelivery = "accepted";
          state.lastDigestDate = date;
          state.lastDigestAt = timestamp.toISOString();
          delete state.digestRetryAt;
          delete state.lastDigestError;
          log("p5-digest-sent", { date, chars: text.length });
        } catch (error) {
          state.digestRetryAt = new Date(timestamp.getTime() + 10 * 60_000).toISOString();
          state.lastDigestError = String(error?.message || error).slice(0, 500);
          log("p5-digest-failed", { error: state.lastDigestError });
        }
      }
    }

    await writeState(stateFile, state);
    return state;
  }

  const tick = () => {
    if (current) return current;
    current = doTick().finally(() => { current = null; });
    return current;
  };

  const schedule = () => {
    if (stopped) return;
    timer = setTimeoutImpl(async () => {
      try {
        await tick();
      } catch (error) {
        log("p5-tick-failed", { error: String(error?.message || error).slice(0, 500) });
      }
      schedule();
    }, tickMs);
    timer?.unref?.();
  };

  return {
    tick,
    async start() {
      stopped = false;
      try {
        await tick();
      } catch (error) {
        log("p5-start-failed", { error: String(error?.message || error).slice(0, 500) });
      }
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeoutImpl(timer);
      timer = null;
    },
  };
}

export { readState as readSchedulerState, timeParts as schedulerTimeParts, writeState as writeSchedulerState };
