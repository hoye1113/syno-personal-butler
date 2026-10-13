import { MacServiceManager } from "../apps/syno/syno/mac-service-manager.mjs";

// 主人手动执行的 macOS 登录自启管理入口（不进入管家能力面）：
//   node scripts/manage-macos-agent.mjs install|status|restart|uninstall
const ACTIONS = ["install", "status", "restart", "uninstall"];

const action = String(process.argv[2] || "").toLowerCase();
if (!ACTIONS.includes(action)) {
  console.error(`用法：node scripts/manage-macos-agent.mjs <${ACTIONS.join("|")}>`);
  process.exit(2);
}

const manager = new MacServiceManager();
try {
  const result = await manager[action]();
  console.log(JSON.stringify({ action, ...result }, null, 2));
  if (result.supported === false) process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ action, ok: false, code: error?.code || "MACOS_AGENT_FAILED", message: String(error?.message || error) }));
  process.exitCode = 1;
}
