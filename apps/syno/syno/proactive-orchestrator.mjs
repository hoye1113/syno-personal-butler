import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { SignalEngine, localDateKey } from "./signal-engine.mjs";

const DEFAULT_QUIET_HOURS = Object.freeze({ start: "22:30", end: "07:30" });

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function isQuietTime(now, quietHours = DEFAULT_QUIET_HOURS) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(quietHours.start);
  const end = minutes(quietHours.end);
  return start > end ? current >= start || current < end : current >= start && current < end;
}

function localMessage(signal, snapshot) {
  const names = { morning: "晨间计划", evening: "晚间复盘", weekly: "每周深度复盘", event: "高价值事件" };
  const priorities = snapshot.priorities.slice(0, 3).map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  const allocation = snapshot.allocation;
  return {
    title: `Syno · ${names[signal.kind] || "主动提醒"}`,
    body: priorities || `今天没有硬性到期事项。建议完成一次真实输出。\n消化 ${allocation.digest} / 收录 ${allocation.capture} / 维护 ${allocation.maintenance}`,
    level: signal.kind === "event" ? "warning" : "info",
    source: "proactive",
    data: { idempotencyKey: `proactive:${signal.key}`, signal: signal.kind },
  };
}

class ProactiveOrchestrator {
  constructor({ host, today, channels, conversations, settingsRegistry, signalEngine = new SignalEngine(), stateFile = path.join(PATHS.stateRoot, "proactive.json"), clock = () => new Date(), quietHours = DEFAULT_QUIET_HOURS } = {}) {
    if (!host || !today || !channels) throw new Error("ProactiveOrchestrator 缺少 host、today 或 channels");
    this.host = host; this.today = today; this.channels = channels; this.conversations = conversations;
    this.settingsRegistry = settingsRegistry; this.signalEngine = signalEngine; this.stateFile = stateFile; this.clock = clock; this.quietHours = quietHours; this.timer = null;
  }

  async load() {
    try { return JSON.parse(await fs.readFile(this.stateFile, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { date: "", notificationsToday: 0, lastRuns: {}, pending: {} }; throw error; }
  }

  async save(state) {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
  }

  async tick({ now = this.clock(), highValueEvents = [] } = {}) {
    const state = await this.load();
    const date = localDateKey(now);
    if (state.date !== date) Object.assign(state, { date, notificationsToday: 0 });
    const quietHours = await this.settingsRegistry?.get("notifications.quietHours") || this.quietHours;
    if (isQuietTime(now, quietHours)) return [];
    const signals = this.signalEngine.collect({ now, lastRuns: state.lastRuns, highValueEvents, notificationsToday: state.notificationsToday });
    const delivered = [];
    for (const signal of signals) {
      const snapshot = await this.today.snapshot();
      const fallback = localMessage(signal, snapshot);
      const prompt = `这是由确定性 SignalEngine 触发的${fallback.title}。请基于 today.read 工具，用不超过 180 字给出主人今天的优先行动；不要扩大权限，不要创建写任务。`;
      let result;
      try {
        result = await this.host.receive({ text: prompt, intent: "chat" }, {
          channel: "scheduler", senderId: "syno-worker", messageId: signal.key, trustedAutomation: true,
        });
      } catch (error) {
        result = { job: { id: signal.key, status: "local-fallback" }, error: { code: error.code || "AGENT_UNAVAILABLE" } };
      }
      const completedText = result.job?.status === "completed" ? result.job.result?.text : "";
      const message = completedText ? { ...fallback, body: completedText } : fallback;
      await this.channels.send(message);
      state.lastRuns[signal.kind] = date;
      state.notificationsToday += 1;
      state.pending[result.job?.id || signal.key] = { signalKey: signal.key, fallbackDelivered: !completedText, status: result.job?.status || "local" };
      delivered.push({ signal: signal.kind, jobId: result.job?.id, providerStatus: result.job?.status, localFallback: !completedText });
      if (state.notificationsToday >= this.signalEngine.schedule.maxDailyNotifications) break;
    }
    if (this.conversations && state.lastPruned !== date) {
      await this.conversations.prune();
      state.lastPruned = date;
    }
    state.pending = Object.fromEntries(Object.entries(state.pending).slice(-200));
    await this.save(state);
    return delivered;
  }

  async start() {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => this.tick().catch(() => {}), 60_000);
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

export { DEFAULT_QUIET_HOURS, ProactiveOrchestrator, isQuietTime, localMessage };
