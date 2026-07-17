const DEFAULT_SCHEDULE = Object.freeze({ morningHour: 8, eveningHour: 21, weeklyDay: 0, maxDailyNotifications: 3 });

class SignalEngine {
  constructor({ schedule = DEFAULT_SCHEDULE } = {}) { this.schedule = { ...DEFAULT_SCHEDULE, ...schedule }; }

  collect({ now = new Date(), lastRuns = {}, highValueEvents = [], notificationsToday = 0 } = {}) {
    if (notificationsToday >= this.schedule.maxDailyNotifications) return [];
    const date = now.toISOString().slice(0, 10);
    const signals = highValueEvents.map((event) => ({ kind: "event", key: `event:${event.id}`, event }));
    if (now.getHours() >= this.schedule.morningHour && lastRuns.morning !== date) signals.push({ kind: "morning", key: `morning:${date}` });
    if (now.getHours() >= this.schedule.eveningHour && lastRuns.evening !== date) signals.push({ kind: "evening", key: `evening:${date}` });
    if (now.getDay() === this.schedule.weeklyDay && lastRuns.weekly !== date) signals.push({ kind: "weekly", key: `weekly:${date}` });
    return signals.slice(0, this.schedule.maxDailyNotifications - notificationsToday);
  }
}

export { DEFAULT_SCHEDULE, SignalEngine };
