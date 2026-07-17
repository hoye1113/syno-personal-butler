import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const JOBS = Object.freeze([
  { id: "morning", hour: 8, minute: 30 },
  { id: "evening", hour: 22, minute: 0 },
  { id: "weekly", hour: 20, minute: 0, weekday: 0 },
]);

function occurrenceFor(job, now) {
  const due = new Date(now);
  due.setHours(job.hour, job.minute, 0, 0);
  if (job.weekday !== undefined) {
    const distance = (now.getDay() - job.weekday + 7) % 7;
    due.setDate(now.getDate() - distance);
  }
  if (due > now) {
    if (job.weekday === undefined) due.setDate(due.getDate() - 1);
    else due.setDate(due.getDate() - 7);
  }
  return due;
}

class Scheduler {
  constructor({ onDue, stateFile = path.join(PATHS.stateRoot, "schedule.json"), clock = () => new Date() } = {}) {
    this.onDue = onDue;
    this.stateFile = stateFile;
    this.clock = clock;
    this.timer = null;
  }
  async load() {
    try { return JSON.parse(await fs.readFile(this.stateFile, "utf8")); } catch (error) {
      if (error.code === "ENOENT") return { lastRuns: {} };
      throw error;
    }
  }
  async save(state) {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
  }
  async tick(now = this.clock()) {
    const state = await this.load();
    const completed = [];
    for (const job of JOBS) {
      const occurrence = occurrenceFor(job, now);
      if (occurrence.getTime() > now.getTime()) continue;
      const last = state.lastRuns[job.id] ? new Date(state.lastRuns[job.id]) : null;
      if (last && last >= occurrence) continue;
      await this.onDue(job.id, occurrence);
      state.lastRuns[job.id] = now.toISOString();
      await this.save(state);
      completed.push(job.id);
    }
    return completed;
  }
  async start() {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => this.tick().catch(() => {}), 60_000);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

export { JOBS, Scheduler, occurrenceFor };
