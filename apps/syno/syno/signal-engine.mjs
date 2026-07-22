const DEFAULT_SCHEDULE = Object.freeze({ morningHour: 8, eveningHour: 21, weeklyDay: 0, maxDailyNotifications: 3 });

function localDateKey(now) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

class SignalEngine {
  constructor({ schedule = DEFAULT_SCHEDULE } = {}) { this.schedule = { ...DEFAULT_SCHEDULE, ...schedule }; }

  collect({ now = new Date(), lastRuns = {}, highValueEvents = [], notificationsToday = 0, maxDailyNotifications = this.schedule.maxDailyNotifications } = {}) {
    const maximum = Math.max(0, Math.min(this.schedule.maxDailyNotifications, Number(maxDailyNotifications) || 0));
    const date = localDateKey(now);
    // weekly 是周度复盘，独立于日常通知配额——不挤占 morning/evening/event
    const weekly = now.getDay() === this.schedule.weeklyDay && lastRuns.weekly !== date
      ? [{ kind: "weekly", key: `weekly:${date}` }]
      : [];
    if (notificationsToday >= maximum) return weekly;
    const daily = highValueEvents
      .map((event) => ({ kind: "event", key: `event:${event.id}`, event }))
      .filter((signal) => lastRuns[signal.key] !== date);
    if (now.getHours() >= this.schedule.morningHour && lastRuns.morning !== date) daily.push({ kind: "morning", key: `morning:${date}` });
    if (now.getHours() >= this.schedule.eveningHour && lastRuns.evening !== date) daily.push({ kind: "evening", key: `evening:${date}` });
    return [...daily.slice(0, maximum - notificationsToday), ...weekly];
  }
}

export { DEFAULT_SCHEDULE, SignalEngine, localDateKey };
