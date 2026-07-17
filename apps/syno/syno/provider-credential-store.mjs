import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

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

function runDpapi(mode, value) {
  if (process.platform !== "win32") throw new Error("DPAPI 凭据存储仅支持 Windows");
  const protect = mode === "protect";
  const script = protect
    ? "$v=[Console]::In.ReadToEnd();$b=[Text.Encoding]::UTF8.GetBytes($v);$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))"
    : "$v=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($v);$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))";
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    let stdout = ""; let stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`DPAPI ${mode} 失败：${stderr.trim() || `exit ${code}`}`)));
    child.stdin.end(value);
  });
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

class ProviderCredentialStore {
  constructor({ root = PATHS.credentialsRoot, protect = (value) => runDpapi("protect", value), unprotect = (value) => runDpapi("unprotect", value) } = {}) {
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
