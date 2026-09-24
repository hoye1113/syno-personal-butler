import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
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
  const loadSecurity = "Add-Type -AssemblyName System.Security;";
  // 只让 Base64（7-bit ASCII）跨过 PowerShell console 边界。zh-CN 主机 ACP=936，PowerShell 的
  // [Console]::InputEncoding/OutputEncoding 默认 GBK，原始 UTF-8 经 [Console]::In/Out 会被转码损坏。
  // Base64 是所有常见代码页的公共子集，过 GBK 不变。
  //   protect:   stdin = base64(utf8(明文)) -> stdout = base64(密文)
  //   unprotect: stdin = base64(密文)       -> stdout = base64(utf8(明文))
  // PowerShell 内只用 FromBase64String/ToBase64String，绝不调 UTF8.GetString/GetBytes。
  const script = protect
    ? `${loadSecurity}$v=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($v);$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))`
    : `${loadSecurity}$v=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($v);$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))`;
  const stdinText = protect ? Buffer.from(String(value), "utf8").toString("base64") : String(value);
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    let stdout = ""; let stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    // 若 PowerShell 提前退出（如 -Command 在极端环境被拒），stdin.write/end 触发 EPIPE；
    // 不挂监听会冒成 unhandled stream error → 可能 crash host。reject 后 close 回调幂等（Promise 已 settled）。
    child.stdin.on("error", (error) => reject(Object.assign(new Error(`DPAPI ${mode} stdin 写入失败`), { code: "DPAPI_STDIN_ERROR", cause: error })));
    child.on("close", (code) => {
      if (code !== 0) { reject(new Error(`DPAPI ${mode} 失败：${stderr.trim() || `exit ${code}`}`)); return; }
      const out = stdout.trim(); // 纯 base64；trim 掉偶发尾换行，保持密文规范（base64 正则消费方依赖）
      resolve(protect ? out : Buffer.from(out, "base64").toString("utf8"));
    });
    child.stdin.end(stdinText);
  });
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
