import { signalIdentity } from "./proactive-reliability.mjs";

const DEFAULT_SCHEDULE = Object.freeze({ morningHour: 8, eveningHour: 21, weeklyDay: 0, maxDailyNotifications: 3 });

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

  collect({ now = new Date(), lastRuns = {}, lastDeliveredVersions = {}, pendingVersions = {}, highValueEvents = [], notificationsToday = 0, maxDailyNotifications = this.schedule.maxDailyNotifications, returnAllEligible = false } = {}) {
    const maximum = Math.max(0, Math.min(this.schedule.maxDailyNotifications, Number(maxDailyNotifications) || 0));
    const date = localDateKey(now);
    if (notificationsToday >= maximum) return [];
    const weeklyKey = `weekly:${isoWeekKey(now)}`;
    const weekly = now.getDay() === this.schedule.weeklyDay && !lastRuns[weeklyKey] && lastRuns.weekly !== date
      ? [{ kind: "weekly", key: weeklyKey }]
      : [];
    const daily = highValueEvents
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
    const morningKey = `morning:${date}`;
    const eveningKey = `evening:${date}`;
    if (now.getHours() >= this.schedule.morningHour && !lastRuns[morningKey] && lastRuns.morning !== date) daily.push({ kind: "morning", key: morningKey });
    if (now.getHours() >= this.schedule.eveningHour && !lastRuns[eveningKey] && lastRuns.evening !== date) daily.push({ kind: "evening", key: eveningKey });
    return [...daily, ...weekly];
  }
}

export { DEFAULT_SCHEDULE, SignalEngine, isoWeekKey, localDateKey };
