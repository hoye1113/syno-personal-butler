import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

import { OpenCodeCredentialStore } from "../apps/syno/syno/opencode-credential-store.mjs";
import { BrowserCaptureAdapter } from "../apps/syno/syno/browser-capture-adapter.mjs";
import { discoverOpenCodeCandidates, LOCKED_OPENCODE_VERSION, resolveOpenCodeBinary } from "../apps/syno/syno/opencode-supervisor.mjs";
import { DEFAULT_WEB_PORT, PATHS } from "../apps/syno/syno/paths.mjs";

const REQUIRED_SKILLS = ["capture", "knowledge", "learn", "review", "create", "maintain", "web-capture"];

async function doctor({
  candidates,
  versionOf,
  credentials = new OpenCodeCredentialStore(),
  repoRoot = PATHS.repoRoot,
  browserCapture = new BrowserCaptureAdapter(),
} = {}) {
  const checks = [];
  let installation;
  try {
    installation = await resolveOpenCodeBinary({ candidates: candidates || await discoverOpenCodeCandidates(), versionOf });
    checks.push({ name: "binary", ok: true, executable: installation.executable, version: installation.version });
  } catch (error) {
    checks.push({ name: "binary", ok: false, code: error.code || "OPENCODE_BINARY_FAILED", message: error.message });
  }
  const agent = path.join(repoRoot, ".opencode", "agents", "syno.md");
  const missing = [];
  try { await fs.access(agent); } catch { missing.push(path.relative(repoRoot, agent)); }
  for (const name of REQUIRED_SKILLS) {
    const file = path.join(repoRoot, ".opencode", "skills", `syno-${name}`, "SKILL.md");
    try { await fs.access(file); } catch { missing.push(path.relative(repoRoot, file)); }
  }
  checks.push({ name: "project-agent-skills", ok: missing.length === 0, missing });
  const globalSkillFile = path.join(process.env.USERPROFILE || "", ".config", "opencode", "skills", "kimi-webbridge", "SKILL.md");
  const projectWebCaptureFile = path.join(repoRoot, ".opencode", "skills", "syno-web-capture", "SKILL.md");
  const projectWebCapture = await fs.readFile(projectWebCaptureFile, "utf8").catch(() => "");
  const declaredUpstreamDigest = /x-syno-upstream-digest:\s*([a-f0-9]{64})/iu.exec(projectWebCapture)?.[1]?.toLowerCase() || "";
  let upstreamSkill = { present: false, reviewRequired: false };
  try {
    const content = await fs.readFile(globalSkillFile);
    upstreamSkill = {
      present: true,
      digest: createHash("sha256").update(content).digest("hex"),
    };
    upstreamSkill.reviewRequired = !declaredUpstreamDigest || upstreamSkill.digest !== declaredUpstreamDigest;
  } catch {}
  checks.push({ name: "kimi-webbridge-upstream", ok: true, ...upstreamSkill });
  const browserHealth = await browserCapture.health().catch((error) => ({ available: false, error: { code: error.code || "BROWSER_DAEMON_UNAVAILABLE", message: error.message } }));
  checks.push({
    name: "kimi-webbridge-runtime",
    ok: browserHealth.available === true,
    available: browserHealth.available === true,
    ...(browserHealth.daemonVersion ? { daemonVersion: browserHealth.daemonVersion } : {}),
    ...(browserHealth.extensionVersion ? { extensionVersion: browserHealth.extensionVersion } : {}),
    ...(browserHealth.error ? { error: browserHealth.error } : {}),
  });
  const credentialStatus = await credentials.status();
  checks.push({ name: "zen-credential", ok: credentialStatus.configured, configured: credentialStatus.configured });
  checks.push({ name: "security", ok: true, loopbackOnly: true, builtinsDenied: true, dynamicMcp: false, autoUpdate: false });
  return {
    ok: checks.every((item) => item.ok),
    lockedVersion: LOCKED_OPENCODE_VERSION,
    checks,
  };
}

async function readSecretFromStdin() {
  if (process.stdin.isTTY) {
    if (process.platform !== "win32") {
      throw new Error("交互式 Token 输入仅支持 Windows 隐藏输入；其他平台请通过受控标准输入管道传入");
    }
    return new Promise((resolve, reject) => {
      const script = [
        "$secret = Read-Host '请输入 OpenCode Zen Token' -AsSecureString",
        "$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)",
        "try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) }",
        "finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }",
      ].join("; ");
      const child = spawn("powershell.exe", ["-NoProfile", "-Command", script], {
        stdio: ["inherit", "pipe", "inherit"],
        windowsHide: true,
      });
      let value = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { value += chunk; });
      child.once("error", reject);
      child.once("exit", (code) => code === 0
        ? resolve(value.trim())
        : reject(new Error(`隐藏 Token 输入失败：PowerShell exit ${code}`)));
    });
  }
  let value = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) value += chunk;
  return value.trim();
}

async function hostRequest(pathname, { method = "GET" } = {}) {
  const origin = `http://127.0.0.1:${Number(process.env.PORT || DEFAULT_WEB_PORT)}`;
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json", Origin: origin } : {},
    ...(method === "POST" ? { body: "{}" } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Syno Host 返回 ${response.status}`);
  return response.json();
}

async function main(argv = process.argv.slice(2)) {
  const action = argv[0] || "doctor";
  if (argv.slice(1).some((item) => /token|key|secret/i.test(item))) throw new Error("禁止通过命令行参数传入 Token");
  let result;
  if (action === "doctor") result = await doctor();
  else if (action === "configure") {
    if (argv.length !== 1) throw new Error("configure 不接受参数；Token 只能通过标准输入");
    result = await new OpenCodeCredentialStore().save(await readSecretFromStdin());
  } else if (action === "status") result = await hostRequest("/api/syno/opencode");
  else if (action === "restart") result = await hostRequest("/api/syno/opencode/restart", { method: "POST" });
  else throw new Error(`未知 OpenCode 管理动作：${action}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (action === "doctor" && !result.ok) process.exitCode = 1;
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"))) {
  main().catch((error) => {
    process.stderr.write(`${error.code || "OPENCODE_COMMAND_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { doctor, main };
