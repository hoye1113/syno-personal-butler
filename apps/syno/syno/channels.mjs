import { spawn } from "node:child_process";
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
    return { delivered: true, id: record.id };
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
  constructor(adapters = {}) { this.adapters = new Map(Object.entries(adapters)); }
  async start() {
    const results = {};
    for (const [id, adapter] of this.adapters) results[id] = await adapter.start();
    return results;
  }
  async stop() {
    const results = {};
    for (const [id, adapter] of this.adapters) results[id] = await adapter.stop();
    return results;
  }
  async send(message, targets = ["web", "windows"]) {
    const results = {};
    for (const id of targets) {
      const adapter = this.adapters.get(id);
      if (adapter) results[id] = await adapter.send(message);
    }
    return results;
  }
  status() {
    return Object.fromEntries([...this.adapters].map(([id, adapter]) => [id, adapter.status()]));
  }
  get(id) { return this.adapters.get(id); }
}

export { ChannelHub, FakeChannelAdapter, WebChannelAdapter, WindowsNotificationAdapter };
