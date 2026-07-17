const GROUPS = Object.freeze({
  agentAdjustable: Object.freeze(["notifications.cadence", "notifications.quietHours", "learning.dailyReviewCount", "ui.displayOrder", "ui.preferences"]),
  confirmationRequired: Object.freeze(["provider.modelId", "budget", "channels", "calendar", "ownerAllowlist", "retention", "actions.allowlist"]),
  immutable: Object.freeze(["provider.baseUrl", "provider.token", "policy", "allowedRoots", "toolRegistry", "approvals", "security", "source", "contracts"]),
});

class SettingsRegistry {
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

  contract() { return { version: 1, ...GROUPS }; }
}

export { GROUPS, SettingsRegistry };
