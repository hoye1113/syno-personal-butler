import { signalIdentity } from "./proactive-reliability.mjs";

// D12：灵感卡出卡时间默认为 12:30（2026-09-02 Owner 自 16:00 调整——午时阅读更自然）。
const DEFAULT_SCHEDULE = Object.freeze({ morningHour: 8, eveningHour: 21, inspirationHour: 12, inspirationMinute: 30, weeklyDay: 0, maxDailyNotifications: 3 });

// 分钟精度判定：超过整点或等于整点且分钟达到门槛（tick 60s——12:30 首拍即触发）。
function timeReached(now, hour, minute = 0) {
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

function localDateKey(now) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function isoWeekKey(now) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date - first) / 86_400_000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

class SignalEngine {
  constructor({ schedule = DEFAULT_SCHEDULE } = {}) { this.schedule = { ...DEFAULT_SCHEDULE, ...schedule }; }

  collect({ now = new Date(), lastRuns = {}, lastDeliveredVersions = {}, pendingVersions = {}, highValueEvents = [], notificationsToday = 0, maxDailyNotifications = this.schedule.maxDailyNotifications, returnAllEligible = false, onBudgetSuppressed = null } = {}) {
    const maximum = Math.max(0, Math.min(this.schedule.maxDailyNotifications, Number(maxDailyNotifications) || 0));
    const date = localDateKey(now);
    // B1（2026-09-03 验收期缺陷修复）：预算是「事件型推送」的防打扰上限，不是预约信号的闸门——
    // morning/evening/inspiration/weekly 恒 eligible（每日/每周自去重、总量有界），不该被清晨的
    // 维护/待办事件饿死（实证：07:30 孤儿提醒 + 08:01 早报吃光预算，12:30 日卡静默消失）。
    // 预算耗尽只过滤 event 类，且经 onBudgetSuppressed 上报（消灭静默）。
    const budgetExhausted = notificationsToday >= maximum;
    const weeklyKey = `weekly:${isoWeekKey(now)}`;
    const weekly = now.getDay() === this.schedule.weeklyDay && !lastRuns[weeklyKey] && lastRuns.weekly !== date
      ? [{ kind: "weekly", key: weeklyKey }]
      : [];
    const events = highValueEvents
      .map((event) => {
        const signal = { kind: "event", key: `event:${event.id}`, id: String(event.id), event, title: event.title, action: event.action, priority: event.priority, ref: event.ref };
        return { ...signal, identity: signalIdentity(signal) };
      })
      .filter((signal) => {
        const delivered = lastDeliveredVersions[signal.identity.subjectKey];
        const deliveredVersion = typeof delivered === "string" ? delivered : delivered?.businessVersion;
        const deliveredEpisode = typeof delivered === "string" ? signal.identity.episode : delivered?.episode;
        const pending = pendingVersions[signal.identity.subjectKey];
        const pendingVersion = typeof pending === "string" ? pending : pending?.businessVersion;
        const pendingEpisode = typeof pending === "string" ? signal.identity.episode : pending?.episode;
        const sameDelivered = deliveredVersion === signal.identity.businessVersion && Number(deliveredEpisode || signal.identity.episode) === signal.identity.episode;
        const samePending = pendingVersion === signal.identity.businessVersion && Number(pendingEpisode || signal.identity.episode) === signal.identity.episode;
        return (returnAllEligible || lastRuns[signal.key] !== date || (deliveredVersion && !sameDelivered)) && !sameDelivered && !samePending;
      });
    const daily = budgetExhausted ? [] : events;
    if (budgetExhausted && events.length && typeof onBudgetSuppressed === "function") onBudgetSuppressed(events.map((signal) => signal.key));
    const morningKey = `morning:${date}`;
    const eveningKey = `evening:${date}`;
    const inspirationKey = `inspiration:${date}`;
    if (now.getHours() >= this.schedule.morningHour && !lastRuns[morningKey] && lastRuns.morning !== date) daily.push({ kind: "morning", key: morningKey });
    if (now.getHours() >= this.schedule.eveningHour && !lastRuns[eveningKey] && lastRuns.evening !== date) daily.push({ kind: "evening", key: eveningKey });
    // D12（2026-09-01）：今日灵感每日一卡；12:30 后 eligible（2026-09-02 Owner 自 16:00 调整）。
    // 与 morning/evening 同模式；B1 起预约信号不占事件预算（恒 eligible）。生成失败时 lastRuns
    // 不标记（下一 tick 重试，直至编排层当日 maxAttempts 终态）；素材不足/终态由编排层标记。
    if (timeReached(now, this.schedule.inspirationHour, this.schedule.inspirationMinute ?? 0) && !lastRuns[inspirationKey] && lastRuns.inspiration !== date) daily.push({ kind: "inspiration", key: inspirationKey });
    return [...daily, ...weekly];
  }
}

export { DEFAULT_SCHEDULE, SignalEngine, isoWeekKey, localDateKey };
