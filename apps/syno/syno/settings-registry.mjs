import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const GROUPS = Object.freeze({
  agentAdjustable: Object.freeze(["notifications.cadence", "notifications.quietHours", "learning.dailyReviewCount", "ui.displayOrder", "ui.preferences"]),
  confirmationRequired: Object.freeze(["provider.modelId", "budget", "channels", "calendar", "ownerAllowlist", "retention", "actions.allowlist", "context.thresholds", "policy.allowSelfModify", "policy.allowSystemControl"]),
  immutable: Object.freeze(["provider.baseUrl", "provider.token", "policy", "allowedRoots", "toolRegistry", "approvals", "security", "source", "contracts"]),
});

const DEFAULT_VALUES = Object.freeze({
  "notifications.cadence": "balanced",
  "notifications.quietHours": Object.freeze({ start: "22:30", end: "07:30" }),
  "learning.dailyReviewCount": 5,
  "ui.displayOrder": Object.freeze(["today", "capture", "knowledge", "learn", "create"]),
  "ui.preferences": Object.freeze({ reducedDensity: false }),
  "context.thresholds": null,
  // trust-but-clarify 安全开关：默认关。仅用户（带 confirmed）可翻；Agent 永不可改。
  "policy.allowSelfModify": false,
  "policy.allowSystemControl": false,
});

function validateValue(key, value) {
  if ((key === "policy.allowSelfModify" || key === "policy.allowSystemControl") && typeof value !== "boolean") throw new Error(`${key} 必须为布尔值`);
  if (key === "notifications.cadence" && !["minimal", "balanced", "active"].includes(value)) throw new Error("通知节奏无效");
  if (key === "notifications.quietHours") {
    const valid = (item) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item || "");
    if (!valid(value?.start) || !valid(value?.end)) throw new Error("安静时间无效");
  }
  if (key === "learning.dailyReviewCount" && (!Number.isInteger(value) || value < 1 || value > 20)) throw new Error("每日复习数量必须为 1–20");
  if (key === "ui.displayOrder") {
    const allowed = ["today", "capture", "knowledge", "learn", "create"];
    if (!Array.isArray(value) || value.length !== allowed.length || !allowed.every((item) => value.includes(item))) throw new Error("显示顺序必须包含五个主区且不能重复");
  }
  if (key === "ui.preferences" && (value === null || typeof value !== "object" || Array.isArray(value))) throw new Error("界面偏好必须为对象");
  if (key === "context.thresholds" && value !== null) {
    if (typeof value !== "object" || Array.isArray(value)) throw new Error("压缩阈值必须为对象或 null");
    for (const [name, ratio] of Object.entries(value)) {
      if (!["light", "moderate", "heavy", "overflow"].includes(name)) throw new Error(`未知压缩阈值：${name}`);
      if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) throw new Error(`压缩阈值 ${name} 必须为 (0,1) 区间数值`);
    }
  }
  return value;
}

class SettingsRegistry {
  constructor({ stateFile = path.join(PATHS.stateRoot, "settings-registry.json"), clock = () => new Date() } = {}) { this.stateFile = stateFile; this.clock = clock; }

  classify(key) {
    for (const [group, keys] of Object.entries(GROUPS)) if (keys.includes(key)) return group;
    return "immutable";
  }

  assertChange(key, { actor = "user", confirmed = false } = {}) {
    const group = this.classify(key);
    if (group === "immutable" && actor === "agent") throw Object.assign(new Error(`Agent 不得修改设置：${key}`), { code: "SETTING_IMMUTABLE" });
    if (group === "confirmationRequired" && (!confirmed || actor === "agent")) throw Object.assign(new Error(`设置需要用户确认：${key}`), { code: "SETTING_CONFIRMATION_REQUIRED" });
    return group;
  }

  async load() {
    try { return JSON.parse(await fs.readFile(this.stateFile, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { version: 1, values: structuredClone(DEFAULT_VALUES), updatedAt: null }; throw error; }
  }

  async get(key) { return (await this.load()).values[key]; }

  async set(key, value, options = {}) {
    const group = this.assertChange(key, options);
    validateValue(key, value);
    const state = await this.load();
    state.values[key] = value;
    state.updatedAt = this.clock().toISOString();
    state.lastChange = { key, group, actor: options.actor || "user", at: state.updatedAt };
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
    return { key, value, group, updatedAt: state.updatedAt };
  }

  contract() { return { version: 1, ...GROUPS }; }
}

export { DEFAULT_VALUES, GROUPS, SettingsRegistry, validateValue };
