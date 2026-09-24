import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";

const MOBILE_DELIVERY_MODE_VERSION = 1;
const MOBILE_DELIVERY_MODES = Object.freeze(["legacy", "shadow", "v2"]);

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

class MobileDeliveryMode {
  constructor({
    mode = "legacy",
    stateFile = path.join(PATHS.stateRoot, "mobile-delivery-mode.json"),
    processLock,
    clock = () => new Date(),
  } = {}) {
    this.mode = this.#assert(mode);
    this.stateFile = path.resolve(stateFile);
    this.processLock = processLock || new ProcessFileLock({
      file: `${this.stateFile}.lock`,
      timeoutMs: 30_000,
    });
    this.clock = clock;
    this.loaded = false;
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

  async #readPersisted() {
    try {
      const record = JSON.parse(await fs.readFile(this.stateFile, "utf8"));
      if (record?.version !== MOBILE_DELIVERY_MODE_VERSION) {
        throw Object.assign(new Error("移动投递模式状态版本不受支持"), { code: "MOBILE_DELIVERY_STATE_INVALID" });
      }
      return {
        ...record,
        mode: this.#assert(record.mode),
      };
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      if (error?.code === "MOBILE_DELIVERY_MODE_INVALID") {
        throw Object.assign(new Error("移动投递模式状态包含未知模式"), { code: "MOBILE_DELIVERY_STATE_INVALID" });
      }
      throw error;
    }
  }

  async load() {
    const persisted = await this.#readPersisted();
    if (persisted) this.mode = persisted.mode;
    this.loaded = true;
    return this.snapshot();
  }

  async persist(mode = this.mode, metadata = {}) {
    const next = this.#assert(mode);
    return this.processLock.run(async () => {
      const record = {
        version: MOBILE_DELIVERY_MODE_VERSION,
        mode: next,
        updatedAt: this.clock().toISOString(),
        ...(metadata && typeof metadata === "object" ? metadata : {}),
      };
      await atomicWrite(this.stateFile, `${JSON.stringify(record, null, 2)}\n`);
      this.mode = next;
      this.loaded = true;
      return this.snapshot();
    });
  }

  async commit(mode, {
    ownerAcceptance = false,
    ingressFrozen = false,
    legacyNonTerminal = 0,
    evidenceRef = null,
  } = {}) {
    const next = this.#assert(mode);
    if (next === "v2" && (!ownerAcceptance || !ingressFrozen || Number(legacyNonTerminal) !== 0)) {
      throw Object.assign(new Error("切换移动 v2 前必须完成 Owner 验收、冻结 ingress 且 legacy 无非终态消息"), {
        code: "MOBILE_V2_CUTOVER_BLOCKED",
      });
    }
    return this.persist(next, {
      transition: { from: this.mode, to: next },
      ...(evidenceRef ? { evidenceRef: String(evidenceRef) } : {}),
    });
  }

  snapshot() {
    return { mode: this.mode, supportedModes: [...MOBILE_DELIVERY_MODES] };
  }
}

export { MOBILE_DELIVERY_MODE_VERSION, MOBILE_DELIVERY_MODES, MobileDeliveryMode };
