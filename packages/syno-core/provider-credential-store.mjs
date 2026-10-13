import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { protectSecret, runDpapi, unprotectSecret } from "./secret-protector.mjs";

const DEFAULT_BASE_URL = "https://server.flowyaipc.cn/claw/v1";

function validateProviderConfig(config = {}, { requireToken = true } = {}) {
  const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new Error("Provider Base URL 无效"); }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) throw new Error("Provider 必须使用 HTTPS，或显式的本机 HTTP");
  const modelId = String(config.modelId || "").trim();
  if (!modelId) throw new Error("Provider Model ID 不能为空");
  const contextLength = Number(config.contextLength);
  if (!Number.isInteger(contextLength) || contextLength < 4_096 || contextLength > 10_000_000) throw new Error("Provider 上下文长度无效");
  const token = String(config.token || "");
  if (requireToken && !token) throw new Error("Provider Token 不能为空");
  return { baseUrl, modelId, contextLength, token };
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {}); // rename 失败时清理残留 tmp
    throw error;
  }
  await fs.chmod(file, 0o600).catch(() => {});
}

class ProviderCredentialStore {
  constructor({ root = PATHS.credentialsRoot, protect = protectSecret, unprotect = unprotectSecret } = {}) {
    this.root = root;
    this.metadataFile = path.join(root, "provider.json");
    this.tokenFile = path.join(root, "provider-token.dpapi");
    this.protect = protect;
    this.unprotect = unprotect;
  }

  async save(config) {
    const normalized = validateProviderConfig(config);
    const encrypted = await this.protect(normalized.token);
    await atomicWrite(this.tokenFile, encrypted);
    await atomicWrite(this.metadataFile, JSON.stringify({
      version: 1,
      baseUrl: normalized.baseUrl,
      modelId: normalized.modelId,
      contextLength: normalized.contextLength,
      updatedAt: new Date().toISOString(),
    }, null, 2));
    return this.status();
  }

  async load() {
    const metadata = JSON.parse(await fs.readFile(this.metadataFile, "utf8"));
    const encrypted = await fs.readFile(this.tokenFile, "utf8");
    return validateProviderConfig({ ...metadata, token: await this.unprotect(encrypted) });
  }

  async status() {
    try {
      const metadata = JSON.parse(await fs.readFile(this.metadataFile, "utf8"));
      await fs.access(this.tokenFile);
      return { configured: true, baseUrl: metadata.baseUrl, modelId: metadata.modelId, contextLength: metadata.contextLength, updatedAt: metadata.updatedAt };
    } catch {
      return { configured: false, baseUrl: DEFAULT_BASE_URL, modelId: "", contextLength: 128_000 };
    }
  }
}

export { DEFAULT_BASE_URL, ProviderCredentialStore, runDpapi, validateProviderConfig };
