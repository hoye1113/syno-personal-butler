import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../../../packages/syno-core/paths.mjs";

// 主人的本机密钥统一放在仓库根 .env（已被 .gitignore 忽略）。Host 读出后按进程
// 环境变量注入 DSH 子进程——key 只过内存、不落新文件、不进日志。读取优先级为
// 进程环境变量 > .env 文件，只返回非空项；读不到一律返回空记录，由调用方决定
// 失败策略（如无 Kimi key 时 provider 请求会以 MISSING_CREDENTIAL 快速失败）。
const SYNO_SECRET_NAMES = Object.freeze([
  "KIMI_API_KEY",
  "DOUBAO_SEARCH_API_KEY",
  "TAVILY_API_KEY",
  "EXA_API_KEY",
]);

function parseDotenvValue(text, name) {
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const eq = normalized.indexOf("=");
    if (eq <= 0) continue;
    if (normalized.slice(0, eq).trim() !== name) continue;
    let value = normalized.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value.trim();
  }
  return "";
}

async function defaultSynoSecretLoader({ envFile, env = process.env } = {}) {
  const file = envFile || path.join(PATHS.repoRoot, ".env");
  let fileText = "";
  try {
    fileText = await fs.readFile(file, "utf8");
  } catch {
    fileText = "";
  }
  const secrets = {};
  for (const name of SYNO_SECRET_NAMES) {
    const value = String(env?.[name] ?? "").trim() || parseDotenvValue(fileText, name);
    if (value) secrets[name] = value;
  }
  return secrets;
}

export { SYNO_SECRET_NAMES, defaultSynoSecretLoader, parseDotenvValue };
