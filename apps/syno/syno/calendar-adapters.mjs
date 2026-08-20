import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { locateCommand, runProcess } from "./process-runner.mjs";
import { writeRecord } from "./markdown-record.mjs";

class FakeCalendarAdapter {
  constructor() { this.events = []; }
  async create(event) { const value = { ...event, id: `fake-${this.events.length + 1}` }; this.events.push(value); return value; }
  async remove(id) { this.events = this.events.filter((event) => event.id !== id); return { removed: true }; }
  async status() { return { id: "fake", available: true }; }
}

class MarkdownCalendarAdapter {
  constructor({ opsRoot = PATHS.opsRoot } = {}) { this.opsRoot = opsRoot; }
  async create(event) {
    const id = event.id || `calendar-${Date.now()}`;
    const file = path.join(this.opsRoot, "events", "calendar", `${id}.md`);
    await writeRecord(file, { ...event, id, provider: "markdown" }, { title: event.title || id, summaryKeys: ["id", "provider", "start", "end"] });
    return { ...event, id, provider: "markdown", path: file };
  }
  async remove(id) { await fs.rm(path.join(this.opsRoot, "events", "calendar", `${id}.md`), { force: true }); return { removed: true }; }
  async status() { return { id: "markdown", available: true }; }
}

class LarkCalendarAdapter {
  constructor({ command } = {}) { this.command = command || locateCommand("lark-cli", "LARK_CLI_PATH"); }
  async #json(args) {
    const { stdout } = await runProcess(this.command, args, { timeoutMs: 90_000 });
    return JSON.parse(stdout || "{}");
  }
  async create(event) {
    const data = {
      summary: event.title,
      description: event.description || "由 Syno 赛诺同步",
      start_time: { timestamp: String(Math.floor(new Date(event.start).getTime() / 1000)), timezone: event.timezone || "Asia/Shanghai" },
      end_time: { timestamp: String(Math.floor(new Date(event.end).getTime() / 1000)), timezone: event.timezone || "Asia/Shanghai" },
    };
    const result = await this.#json(["calendar", "events", "create", "--params", JSON.stringify({ calendar_id: event.calendarId }), "--data", JSON.stringify(data)]);
    return { ...event, id: result?.data?.event?.event_id || result?.event?.event_id || result?.event_id || "", provider: "lark" };
  }
  async remove(id, { calendarId } = {}) {
    await this.#json(["calendar", "events", "delete", "--params", JSON.stringify({ calendar_id: calendarId, event_id: id, need_notification: "false" })]);
    return { removed: true };
  }
  async status() {
    try { const value = await this.#json(["auth", "status"]); return { id: "lark", available: true, value }; }
    catch (error) { return { id: "lark", available: false, error: error.message }; }
  }
}

export { FakeCalendarAdapter, LarkCalendarAdapter, MarkdownCalendarAdapter };
