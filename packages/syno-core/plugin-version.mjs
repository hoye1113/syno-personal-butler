import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

export const P5_PLUGIN_CONTRACT = "syno.p5-radar/1";
export const P5_PLUGIN_CAPABILITIES = Object.freeze([
  "health",
  "collect",
  "renderDailyDoc",
  "feedback",
  "status",
  "preference",
]);
export const DEFAULT_P5_PLUGIN_REGISTRY = path.join(PATHS.runtimeRoot, "plugins", "p5-radar", "active.json");

const VERSION = /^[0-9A-Za-z][0-9A-Za-z._-]{0,80}$/u;

function pluginError(code, message) {
  return Object.assign(new Error(message), { code });
}

export function validatePluginManifest(manifest, { pluginDir } = {}) {
  if (!manifest || typeof manifest !== "object") throw pluginError("P5_PLUGIN_MANIFEST_INVALID", "插件 manifest 缺失");
  if (manifest.name !== "p5-radar") throw pluginError("P5_PLUGIN_NAME_INVALID", "插件 name 必须是 p5-radar");
  if (manifest.contract !== P5_PLUGIN_CONTRACT) throw pluginError("P5_PLUGIN_CONTRACT_INVALID", `插件 contract 必须是 ${P5_PLUGIN_CONTRACT}`);
  if (!VERSION.test(String(manifest.version || ""))) throw pluginError("P5_PLUGIN_VERSION_INVALID", "插件 version 不合法");
  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities.map(String) : [];
  const unknown = capabilities.filter((item) => !P5_PLUGIN_CAPABILITIES.includes(item));
  if (!capabilities.length || unknown.length) throw pluginError("P5_PLUGIN_CAPABILITY_INVALID", `插件能力不允许：${unknown.join(", ") || "(empty)"}`);
  if (typeof manifest.entry !== "string" || !manifest.entry.trim()) throw pluginError("P5_PLUGIN_ENTRY_INVALID", "插件 entry 缺失");
  if (!pluginDir) throw pluginError("P5_PLUGIN_DIR_INVALID", "缺少插件目录");
  const root = path.resolve(pluginDir);
  const entry = path.resolve(root, manifest.entry);
  const relative = path.relative(root, entry);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw pluginError("P5_PLUGIN_ENTRY_OUTSIDE", "插件 entry 超出插件目录");
  return {
    manifest,
    pluginDir: root,
    entry,
    capabilities: Object.freeze([...new Set(capabilities)]),
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

export async function activatePluginVersion({
  pluginDir,
  manifest,
  registryFile = DEFAULT_P5_PLUGIN_REGISTRY,
  now = () => new Date(),
} = {}) {
  const validated = validatePluginManifest(manifest, { pluginDir });
  const entryBytes = await fs.readFile(validated.entry);
  const sha256 = createHash("sha256")
    .update(JSON.stringify(manifest))
    .update("\0")
    .update(entryBytes)
    .digest("hex");
  const prior = await readJson(registryFile);
  const active = {
    contract: P5_PLUGIN_CONTRACT,
    name: "p5-radar",
    version: manifest.version,
    path: validated.pluginDir,
    entry: path.relative(validated.pluginDir, validated.entry).replaceAll("\\", "/"),
    sha256,
    capabilities: validated.capabilities,
    activatedAt: now().toISOString(),
    previous: prior && prior.sha256 !== sha256 ? prior : prior?.previous ?? null,
  };
  await writeJson(registryFile, active);
  return active;
}

export async function readActivePlugin({ registryFile = DEFAULT_P5_PLUGIN_REGISTRY } = {}) {
  const active = await readJson(registryFile);
  if (!active) return null;
  if (active.contract !== P5_PLUGIN_CONTRACT) throw pluginError("P5_PLUGIN_CONTRACT_INVALID", "active 插件 contract 不匹配");
  const manifest = await readJson(path.join(active.path, "plugin.json"));
  const validated = validatePluginManifest(manifest, { pluginDir: active.path });
  if (active.sha256) {
    const entryBytes = await fs.readFile(validated.entry);
    const sha256 = createHash("sha256")
      .update(JSON.stringify(validated.manifest))
      .update("\0")
      .update(entryBytes)
      .digest("hex");
    if (sha256 !== active.sha256) throw pluginError("P5_PLUGIN_INTEGRITY_FAILED", "插件入口哈希与激活记录不一致");
  }
  return { ...active, entryPath: validated.entry };
}

export async function rollbackPluginVersion({
  registryFile = DEFAULT_P5_PLUGIN_REGISTRY,
  now = () => new Date(),
} = {}) {
  const active = await readJson(registryFile);
  if (!active?.previous) throw pluginError("P5_PLUGIN_NO_PREVIOUS", "没有可回滚的插件版本");
  const previous = active.previous;
  const next = {
    ...previous,
    activatedAt: now().toISOString(),
    previous: null,
  };
  await writeJson(registryFile, next);
  return next;
}
