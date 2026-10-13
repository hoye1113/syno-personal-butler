import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { PATHS } from "./paths.mjs";

// 跨平台凭据保护接缝。Windows 用 DPAPI，每个值产生自包含密文；macOS 用登录钥匙串里的
// 一把 32 字节主密钥做 AES-256-GCM 信封，文件里只放自包含密文、钥匙串里只放主密钥。
// 其它平台明确拒绝，不做静默降级。
const SECRET_CIPHER_PREFIX = "syno-secret-v1:";
const KEYCHAIN_ACCOUNT = "credentials-master-key.v1";
const SECURITY_TIMEOUT_MS = 15_000;
const SECURITY_ITEM_NOT_FOUND = 44;

function secretError(code, message, cause) {
  return Object.assign(new Error(message), { code, ...(cause ? { cause } : {}) });
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

// security(1) 的 -w 不带参数值时会交互式提示两行（输入 + 复述），经 stdin 供两行可避免口令
// 出现在 argv；find 成功时 stdout 只有密钥本身。
function spawnSecurity(args, stdin, { command = "security", timeoutMs = SECURITY_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(secretError("SECRET_KEYCHAIN_TIMEOUT", `security ${args[0]} 超时（${timeoutMs}ms）`));
    }, timeoutMs);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish(secretError("SECRET_KEYCHAIN_UNAVAILABLE", `无法执行 security：${error.message}`, error)));
    child.on("close", (code) => finish(null, { code: code ?? -1, stdout, stderr }));
    child.stdin.on("error", () => {}); // 子进程提前退出时 EPIPE 不冒成 unhandled
    child.stdin.end(stdin);
  });
}

function keychainServiceFor(root) {
  const digest = createHash("sha256").update(String(root)).digest("hex").slice(0, 16);
  return `syno.butler.credentials.${digest}`;
}

function createKeychainProtector({ service = keychainServiceFor(PATHS.localDataRoot), account = KEYCHAIN_ACCOUNT, runSecurity = spawnSecurity } = {}) {
  let keyPromise;
  function masterKey() {
    keyPromise ||= (async () => {
      const found = await runSecurity(["find-generic-password", "-s", service, "-a", account, "-w"]);
      if (found.code === 0) {
        const key = Buffer.from(found.stdout.trim(), "base64");
        if (key.length !== 32) throw secretError("SECRET_MASTER_KEY_INVALID", `钥匙串主密钥长度无效：${key.length} 字节（期望 32）`);
        return key;
      }
      if (found.code !== SECURITY_ITEM_NOT_FOUND) {
        throw secretError("SECRET_KEYCHAIN_UNAVAILABLE", `读取钥匙串失败（exit ${found.code}）：${found.stderr.trim() || "无详情"}`);
      }
      const generated = randomBytes(32).toString("base64");
      const added = await runSecurity(["add-generic-password", "-U", "-s", service, "-a", account, "-w"], `${generated}\n${generated}\n`);
      if (added.code !== 0) {
        throw secretError("SECRET_KEYCHAIN_UNAVAILABLE", `写入钥匙串失败（exit ${added.code}）：${added.stderr.trim() || "无详情"}`);
      }
      // 并发首用时以钥匙串里的实际值为准，避免两个进程各自生成后互相解不开。
      const reread = await runSecurity(["find-generic-password", "-s", service, "-a", account, "-w"]);
      const key = reread.code === 0 ? Buffer.from(reread.stdout.trim(), "base64") : Buffer.from(generated, "base64");
      if (key.length !== 32) throw secretError("SECRET_MASTER_KEY_INVALID", `钥匙串主密钥长度无效：${key.length} 字节（期望 32）`);
      return key;
    })().catch((error) => { keyPromise = undefined; throw error; });
    return keyPromise;
  }
  async function protect(value) {
    if (typeof value !== "string") throw secretError("SECRET_PLAINTEXT_INVALID", "凭据保护只接受字符串");
    const key = await masterKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const sealed = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return SECRET_CIPHER_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString("base64");
  }
  async function unprotect(ciphertext) {
    const text = typeof ciphertext === "string" ? ciphertext.trim() : "";
    if (!text.startsWith(SECRET_CIPHER_PREFIX)) {
      throw secretError("SECRET_CIPHERTEXT_FORMAT_INVALID", "凭据密文不是本机钥匙串格式（可能由其它平台写入）");
    }
    const raw = Buffer.from(text.slice(SECRET_CIPHER_PREFIX.length), "base64");
    if (raw.length <= 28) throw secretError("SECRET_CIPHERTEXT_FORMAT_INVALID", "凭据密文长度不足");
    const key = await masterKey();
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    try {
      return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    } catch (error) {
      throw secretError("SECRET_CIPHERTEXT_TAMPERED", "凭据密文校验失败：内容被修改或与主密钥不匹配", error);
    }
  }
  return { protect, unprotect };
}

function createSecretProtector({ platform = process.platform, dpapi = runDpapi, ...keychainOptions } = {}) {
  if (platform === "win32") {
    return {
      protect: async (value) => dpapi("protect", value),
      unprotect: async (value) => dpapi("unprotect", value),
    };
  }
  if (platform === "darwin") return createKeychainProtector(keychainOptions);
  const reject = async () => { throw secretError("SECRET_PLATFORM_UNSUPPORTED", `当前平台 ${platform} 不支持凭据保护：仅支持 Windows DPAPI 或 macOS 钥匙串`); };
  return { protect: reject, unprotect: reject };
}

let defaultProtector;
function defaultSecretProtector() {
  defaultProtector ||= createSecretProtector();
  return defaultProtector;
}
function protectSecret(value) { return defaultSecretProtector().protect(value); }
function unprotectSecret(value) { return defaultSecretProtector().unprotect(value); }

export {
  SECRET_CIPHER_PREFIX,
  createKeychainProtector,
  createSecretProtector,
  keychainServiceFor,
  protectSecret,
  runDpapi,
  unprotectSecret,
};
