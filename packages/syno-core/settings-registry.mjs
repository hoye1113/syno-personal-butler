import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const GROUPS = Object.freeze({
  agentAdjustable: Object.freeze(["ui.displayOrder", "ui.preferences"]),
  confirmationRequired: Object.freeze(["provider.modelId", "budget", "channels", "calendar", "ownerAllowlist", "retention", "actions.allowlist", "context.thresholds"]),
  immutable: Object.freeze(["provider.baseUrl", "provider.token", "policy", "allowedRoots", "toolRegistry", "approvals", "security", "source", "contracts"]),
});

const DEFAULT_VALUES = Object.freeze({
  "ui.displayOrder": Object.freeze(["today", "capture", "knowledge", "create"]),
  "ui.preferences": Object.freeze({ reducedDensity: false }),
  "context.thresholds": null,
});

function validateValue(key, value) {
  if (key === "ui.displayOrder") {
    const allowed = ["today", "capture", "knowledge", "create"];
    if (!Array.isArray(value) || value.length !== allowed.length || !allowed.every((item) => value.includes(item))) throw new Error("显示顺序必须包含四个主区且不能重复");
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
  constructor({ stateFile = path.join(PATHS.stateRoot, "settings-registry.json"), clock = () => new Date() } = {}) {
    this.stateFile = stateFile;
    this.clock = clock;
    // Serialize the load→modify→write critical section so two concurrent set() calls
    // (e.g. a control-plane enable/disable racing a triggerTest test-event authorization)
    // cannot both load the same state and overwrite each other's key (lost update).
    this.mutationTail = Promise.resolve();
  }

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

  #serialized(operation) {
    const current = this.mutationTail.then(operation, operation);
    this.mutationTail = current.catch(() => {});
    return current;
  }

  async load() {
    try {
      const state = JSON.parse(await fs.readFile(this.stateFile, "utf8"));
      return {
        ...state,
        values: {
          ...structuredClone(DEFAULT_VALUES),
          ...(state.values || {}),
        },
      };
    }
    catch (error) { if (error.code === "ENOENT") return { version: 1, values: structuredClone(DEFAULT_VALUES), updatedAt: null }; throw error; }
  }

  async get(key) { return (await this.load()).values[key]; }

  async set(key, value, options = {}) {
    const group = this.assertChange(key, options);
    validateValue(key, value);
    return this.#serialized(async () => {
      const state = await this.load();
      state.values[key] = value;
      state.updatedAt = this.clock().toISOString();
      state.lastChange = {
        key,
        group,
        actor: options.actor || "user",
        at: state.updatedAt,
        ...(options.evidenceRef ? { evidenceRef: String(options.evidenceRef) } : {}),
      };
      await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
      const temporary = `${this.stateFile}.${process.pid}.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs.rename(temporary, this.stateFile);
      return { key, value, group, updatedAt: state.updatedAt };
    });
  }

  contract() { return { version: 1, ...GROUPS }; }
}

export { DEFAULT_VALUES, GROUPS, SettingsRegistry, validateValue };
