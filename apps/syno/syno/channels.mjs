import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

class FakeChannelAdapter {
  constructor() { this.messages = []; this.running = false; }
  async start() { this.running = true; return this.status(); }
  async stop() { this.running = false; return this.status(); }
  async send(message) { this.messages.push(message); return { delivered: true, id: `fake-${this.messages.length}` }; }
  status() { return { id: "fake", running: this.running, available: true }; }
}

class WebChannelAdapter {
  constructor({ notifications }) { this.notifications = notifications; this.running = false; }
  async start() { this.running = true; return this.status(); }
  async stop() { this.running = false; return this.status(); }
  async send(message) {
    const record = await this.notifications.add({
      title: message.title || "赛诺通知",
      body: message.body || message.text || "",
      level: message.level,
      source: message.source || "web",
      data: message.data,
    });
    return { delivered: true, id: record.id, recordPath: record.recordPath };
  }
  status() { return { id: "web", running: this.running, available: true }; }
}

class WindowsNotificationAdapter {
  constructor({ script = path.join(PATHS.repoRoot, "scripts", "show-toast.ps1"), command = "powershell.exe" } = {}) {
    this.script = script;
    this.command = command;
    this.running = false;
  }
  async start() { this.running = process.platform === "win32"; return this.status(); }
  async stop() { this.running = false; return this.status(); }
  async send(message) {
    if (!this.running) return { delivered: false, reason: "windows_only" };
    const title = String(message.title || "赛诺").slice(0, 120);
    const body = String(message.body || message.text || "").slice(0, 500);
    const child = spawn(this.command, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.script, "-Title", title, "-Body", body], {
      windowsHide: true,
      stdio: "ignore",
    });
    child.unref();
    return { delivered: true };
  }
  status() { return { id: "windows", running: this.running, available: process.platform === "win32" }; }
}

class ChannelHub {
  constructor(adapters = {}, { stateFile = path.join(PATHS.stateRoot, "channels.json") } = {}) {
    this.adapters = new Map(Object.entries(adapters));
    this.stateFile = stateFile;
    this.homeChannel = "web";
  }
  async start() {
    try {
      const state = JSON.parse(await fs.readFile(this.stateFile, "utf8"));
      if (this.adapters.has(state.homeChannel)) this.homeChannel = state.homeChannel;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const results = {};
    await Promise.allSettled([...this.adapters].map(async ([id, adapter]) => {
      try { results[id] = await adapter.start(); }
      catch (error) { results[id] = { delivered: false, error: String(error?.message || error) }; }
    }));
    return results;
  }
  async stop() {
    const results = {};
    for (const [id, adapter] of this.adapters) results[id] = await adapter.stop();
    return results;
  }
  async send(message, targets) {
    const selected = targets || [...new Set(["web", "windows", this.homeChannel])];
    const results = {};
    for (const id of selected) {
      const adapter = this.adapters.get(id);
      if (adapter) {
        try { results[id] = await adapter.send(message); }
        catch (error) { results[id] = { delivered: false, error: error.message }; }
      }
    }
    return results;
  }
  status() {
    return Object.fromEntries([...this.adapters].map(([id, adapter]) => [id, { ...adapter.status(), home: id === this.homeChannel }]));
  }
  async setHome(id) {
    if (!this.adapters.has(id)) throw new Error(`未知渠道：${id}`);
    this.homeChannel = id;
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify({ homeChannel: id }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
    return this.status();
  }
  get(id) { return this.adapters.get(id); }
}

export { ChannelHub, FakeChannelAdapter, WebChannelAdapter, WindowsNotificationAdapter };
