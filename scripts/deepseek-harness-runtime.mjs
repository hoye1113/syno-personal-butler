import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  CONFIG_FILES,
  defaultDshRoot,
  REPO_CONFIG_DIR,
  resolveHarnessLaunch,
} from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { DEFAULT_WEB_PORT } from "../apps/syno/syno/paths.mjs";

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function doctor({
  dshRoot = defaultDshRoot(),
  configDir = REPO_CONFIG_DIR,
} = {}) {
  const checks = [];
  let launch;
  try {
    launch = await resolveHarnessLaunch({ dshRoot, fakeAgent: "" });
    checks.push({
      name: "sidecar",
      ok: launch.bootable === true,
      bootable: launch.bootable === true,
      kind: launch.kind,
      dshRoot: launch.dshRoot,
      ...(launch.missingInstall ? { missingInstall: true } : {}),
    });
  } catch (error) {
    checks.push({
      name: "sidecar",
      ok: false,
      code: error.code || "HARNESS_SETUP_REQUIRED",
      message: error.message,
      dshRoot,
    });
  }
  const missing = [];
  for (const file of Object.values(CONFIG_FILES)) {
    const target = path.join(configDir, file);
    if (!await fileExists(target)) missing.push(path.relative(path.resolve(configDir, "../.."), target));
  }
  for (const file of ["syno-tool-bridge-plugin.mjs", "syno-agent.md", "syno-capture-agent.md"]) {
    const target = path.join(configDir, file);
    if (!await fileExists(target)) missing.push(file);
  }
  for (const skill of ["syno-capture", "syno-create", "syno-knowledge", "syno-learn", "syno-maintain", "syno-review", "syno-web-capture"]) {
    const target = path.join(configDir, "skills", skill, "SKILL.md");
    if (!await fileExists(target)) missing.push(path.join("skills", skill, "SKILL.md"));
  }
  checks.push({ name: "syno-cordis", ok: missing.length === 0, missing });
  const keyPresent = Boolean(String(process.env.DEEPSEEK_API_KEY || "").trim());
  checks.push({
    name: "deepseek-key",
    ok: true,
    present: keyPresent,
    source: keyPresent ? "env" : "opencode-auth-or-missing",
  });
  checks.push({
    name: "sandbox",
    ok: true,
    mode: "workspace-write",
    workspace: "isolated-local-root",
    dangerFullAccess: false,
    dynamicMcp: false,
  });
  const configuredRoot = defaultDshRoot();
  return {
    ok: checks.filter((item) => item.name !== "deepseek-key").every((item) => item.ok),
    runtime: process.env.SYNO_COGNITIVE_RUNTIME || "deepseek-harness",
    dshRootConfigured: Boolean(configuredRoot),
    ...(configuredRoot ? { dshRoot: configuredRoot } : {}),
    checks,
  };
}

async function hostRequest(pathname, { method = "GET" } = {}) {
  const origin = `http://127.0.0.1:${Number(process.env.PORT || DEFAULT_WEB_PORT)}`;
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json", Origin: origin } : {},
    ...(method === "POST" ? { body: "{}" } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Object.assign(new Error(`Syno Host 返回 ${response.status}`), { code: "HARNESS_HOST_UNAVAILABLE" });
  return response.json();
}

async function status() {
  try {
    return await hostRequest("/api/syno/harness");
  } catch (error) {
    const report = await doctor();
    return {
      ok: false,
      code: error.code || "HARNESS_HOST_UNAVAILABLE",
      message: error.message,
      doctor: report,
    };
  }
}

async function main(argv = process.argv.slice(2)) {
  const action = argv[0] || "doctor";
  if (argv.slice(1).some((item) => /token|key|secret/i.test(item))) {
    throw new Error("禁止通过命令行参数传入 Token");
  }
  let result;
  if (action === "doctor") result = await doctor();
  else if (action === "status") result = await status();
  else throw new Error(`未知 Harness 管理动作：${action}`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (action === "doctor" && result.ok !== true) process.exitCode = 1;
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.code || "HARNESS_COMMAND_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { doctor, main, status };
