const MOBILE_DELIVERY_MODES = Object.freeze(["legacy", "shadow", "v2"]);

class MobileDeliveryMode {
  constructor({ mode = "legacy" } = {}) {
    this.mode = this.#assert(mode);
  }

  #assert(mode) {
    const normalized = String(mode || "legacy");
    if (!MOBILE_DELIVERY_MODES.includes(normalized)) {
      throw Object.assign(new Error(`未知移动投递模式：${normalized}`), { code: "MOBILE_DELIVERY_MODE_INVALID" });
    }
    return normalized;
  }

  current() {
    return this.mode;
  }

  is(mode) {
    return this.mode === mode;
  }

  set(mode, {
    ownerAcceptance = false,
    ingressFrozen = false,
    legacyNonTerminal = 0,
  } = {}) {
    const next = this.#assert(mode);
    if (next === "v2" && (!ownerAcceptance || !ingressFrozen || Number(legacyNonTerminal) !== 0)) {
      throw Object.assign(new Error("切换移动 v2 前必须完成 Owner 验收、冻结 ingress 且 legacy 无非终态消息"), {
        code: "MOBILE_V2_CUTOVER_BLOCKED",
      });
    }
    this.mode = next;
    return this.mode;
  }

  snapshot() {
    return { mode: this.mode, supportedModes: [...MOBILE_DELIVERY_MODES] };
  }
}

export { MOBILE_DELIVERY_MODES, MobileDeliveryMode };
