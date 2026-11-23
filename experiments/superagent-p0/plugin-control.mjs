import { promises as fs } from "node:fs";
import path from "node:path";

import { approveP5Plugin, rollbackP5Plugin } from "../../packages/syno-core/plugin-canary.mjs";
import { readActivePlugin } from "../../packages/syno-core/plugin-version.mjs";

const VERSION = "[0-9A-Za-z][0-9A-Za-z._-]{0,80}";
const COMMIT = "[0-9a-f]{40}";
const PREFIX = "(?:p5\\s*)?插件";

/** Explicit versioned control commands only; generic approval chat never reaches plugin mutation. */
export function parsePluginCommand(text) {
  const value = String(text ?? "").trim();
  if (new RegExp(`^${PREFIX}\\s*状态$`, "iu").test(value)) return { action: "status" };
  const approve = new RegExp(`^${PREFIX}\\s*批准\\s*(?:版本\\s*)?(${VERSION})\\s+(${COMMIT})$`, "iu").exec(value);
  if (approve) return { action: "approve", version: approve[1], commit: approve[2] };
  const rollback = new RegExp(`^${PREFIX}\\s*回滚\\s*(?:当前版本\\s*)?(${VERSION})$`, "iu").exec(value);
  if (rollback) return { action: "rollback", version: rollback[1] };
  return null;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function executePluginCommand(command, {
  registryFile,
  canaryFile = registryFile ? path.join(path.dirname(registryFile), "canary.json") : null,
  repoRoot,
  worktreeRoot,
  now = () => new Date(),
} = {}) {
  if (!command || !registryFile || !canaryFile) throw new Error("插件控制缺少 command 或 registryFile");
  if (command.action === "status") {
    const [active, canary] = await Promise.all([readActivePlugin({ registryFile }), readJson(canaryFile)]);
    return {
      text: [
        `当前插件：${active?.version ?? "未激活"}`,
        `上一版本：${active?.previous?.version ?? "无"}`,
        canary
          ? `待批准 canary：${canary.version}；条目 ${canary.report?.items ?? "?"}；过期时间 ${canary.expiresAt}`
          : "待批准 canary：无",
        canary ? `批准命令：插件批准 ${canary.version} ${canary.commit}` : null,
        active?.previous ? `回滚命令：插件回滚 ${active.version}` : null,
      ].filter(Boolean).join("\n"),
    };
  }
  if (command.action === "approve") {
    if (!repoRoot || !worktreeRoot) throw new Error("批准插件缺少 repoRoot 或 worktreeRoot");
    const result = await approveP5Plugin({
      canaryFile, registryFile, repoRoot, worktreeRoot, expectedVersion: command.version, expectedCommit: command.commit, now,
    });
    return { text: `插件 ${result.active.version} 已按已验收 canary 批准并激活。`, result };
  }
  if (command.action === "rollback") {
    const result = await rollbackP5Plugin({ registryFile, expectedVersion: command.version, now });
    return { text: `插件已从 ${command.version} 回滚到 ${result.version}。`, result };
  }
  throw new Error("未知插件控制动作");
}
