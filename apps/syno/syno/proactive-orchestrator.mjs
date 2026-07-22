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

function localMessage(signal, snapshot, weeklySummary) {
  const names = { morning: "晨间计划", evening: "晚间复盘", weekly: "每周深度复盘", event: "高价值事件" };
  const title = `Syno · ${names[signal.kind] || "主动提醒"}`;
  const body = bodyFor(signal.kind, snapshot, weeklySummary);
  return {
    title,
    body,
    text: `${title}\n${body}`,
    level: signal.kind === "event" ? "warning" : "info",
    source: "proactive",
    data: { idempotencyKey: `proactive:${signal.key}`, signal: signal.kind },
  };
}

// 按信号种类分化文案：晨间突出计划预算、晚间突出进度与到期复习、周复盘突出孤岛主题
function bodyFor(kind, snapshot, weeklySummary) {
  if (kind === "weekly" && weeklySummary) {
    const topicLines = weeklySummary.topics.slice(0, 3).map((topic) => `· ${topic.topic}（${topic.count} 篇孤岛）`).join("\n");
    return `本周知识库有 ${weeklySummary.totalOrphans} 篇孤岛笔记待整理：\n${topicLines || "暂无孤岛"}\n建议挑一个主题补链或合并。`;
  }
  if (kind === "morning") return morningBody(snapshot);
  if (kind === "evening") return eveningBody(snapshot);
  return prioritiesBody(snapshot);
}

// 晨间：突出今日学习计划预算（消化/收录/维护）与首要行动；缺计划时回退到优先行动
function morningBody(snapshot) {
  const allocation = snapshot?.plan?.allocation;
  const primary = snapshot?.primary;
  const lines = [];
  if (allocation) {
    lines.push(`今日计划：消化 ${allocation.digest ?? 0} / 收录 ${allocation.ingest ?? 0} / 维护 ${allocation.maintenance ?? 0}`);
  }
  if (primary?.title) lines.push(`首要：${primary.title}`);
  return lines.length ? lines.join("\n") : prioritiesBody(snapshot);
}

// 晚间：突出今日完成进度与到期复习；缺进度时回退到优先行动
function eveningBody(snapshot) {
  const progress = snapshot?.progress;
  const due = (snapshot?.dueReviews || []).slice(0, 2);
  const lines = [];
  if (progress) {
    const failed = progress.failed ? `（${progress.failed} 项失败）` : "";
    lines.push(`今日已完成 ${progress.completed ?? 0} 项，待确认 ${progress.waiting ?? 0} 项${failed}`);
  }
  if (due.length) lines.push(`到期复习：${due.map((item) => item.title).join("、")}`);
  return lines.length ? lines.join("\n") : prioritiesBody(snapshot);
}

// 兜底：列出今日优先行动；无行动时显示消化预算（snapshot.allocation 来自 PriorityEngine）
function prioritiesBody(snapshot) {
  const priorities = (snapshot?.priorities || []).slice(0, 3).map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  if (priorities) return priorities;
  const allocation = snapshot?.allocation || {};
  return `今天没有硬性到期事项。建议完成一次真实输出。\n消化 ${allocation.digest ?? 0} / 收录 ${allocation.ingest ?? 0} / 维护 ${allocation.maintenance ?? 0}`;
}

class ProactiveOrchestrator {
  constructor({ host, today, channels, conversations, settingsRegistry, signalSources, maintenance, signalEngine = new SignalEngine(), stateFile = path.join(PATHS.stateRoot, "proactive.json"), clock = () => new Date(), quietHours = DEFAULT_QUIET_HOURS } = {}) {
    if (!host || !today || !channels) throw new Error("ProactiveOrchestrator 缺少 host、today 或 channels");
    this.host = host; this.today = today; this.channels = channels; this.conversations = conversations;
    this.settingsRegistry = settingsRegistry; this.signalSources = signalSources; this.maintenance = maintenance; this.signalEngine = signalEngine; this.stateFile = stateFile; this.clock = clock; this.quietHours = quietHours; this.timer = null;
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

  async tick({ now = this.clock(), highValueEvents } = {}) {
    const state = await this.load();
    const date = localDateKey(now);
    if (state.date !== date) Object.assign(state, { date, notificationsToday: 0 });
    const quietHours = await this.settingsRegistry?.get("notifications.quietHours") || this.quietHours;
    if (isQuietTime(now, quietHours)) return [];
    const events = highValueEvents || await this.signalSources?.collect({ now }) || [];
    const cadence = await this.settingsRegistry?.get("notifications.cadence") || "balanced";
    const cadenceBudget = { minimal: 1, balanced: 2, active: 3 }[cadence] || 2;
    const signals = this.signalEngine.collect({ now, lastRuns: state.lastRuns, highValueEvents: events, notificationsToday: state.notificationsToday, maxDailyNotifications: cadenceBudget });
    const delivered = [];
    for (const signal of signals) {
      const snapshot = await this.today.snapshot();
      const weeklySummary = signal.kind === "weekly" && this.maintenance ? await this.maintenance.weeklySummary() : undefined;
      const fallback = localMessage(signal, snapshot, weeklySummary);
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
      const message = completedText ? { ...fallback, body: completedText, text: `${fallback.title}\n${completedText}` } : fallback;
      await this.channels.send(message, ["web", "windows", "weixin", "feishu"]);
      state.lastRuns[signal.kind] = date;
      state.lastRuns[signal.key] = date;
      // weekly 是周度复盘，不占日常通知配额（与 SignalEngine.collect 的独立配额对齐）
      const consumesBudget = signal.kind !== "weekly";
      if (consumesBudget) state.notificationsToday += 1;
      state.pending[result.job?.id || signal.key] = { signalKey: signal.key, fallbackDelivered: !completedText, status: result.job?.status || "local" };
      delivered.push({ signal: signal.kind, jobId: result.job?.id, providerStatus: result.job?.status, localFallback: !completedText });
      if (consumesBudget && state.notificationsToday >= cadenceBudget) break;
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
