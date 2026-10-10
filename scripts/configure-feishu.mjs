import process from "node:process";
import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--appId" || args[i] === "--app-id") {
      result.appId = args[++i];
    } else if (args[i] === "--appSecret" || args[i] === "--app-secret") {
      result.appSecret = args[++i];
    } else if (args[i] === "--ownerOpenId" || args[i] === "--owner-open-id") {
      result.ownerOpenId = args[++i];
    }
  }
  return result;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const appId = parsed.appId || process.env.FEISHU_APP_ID;
  const appSecret = parsed.appSecret || process.env.FEISHU_APP_SECRET;
  const ownerOpenId = parsed.ownerOpenId || process.env.FEISHU_OWNER_OPEN_ID || "";

  if (!appId || !appSecret) {
    console.error("用法: node scripts/configure-feishu.mjs --appId <id> --appSecret <secret> [--ownerOpenId <openId>]");
    process.exit(1);
  }

  const store = new FeishuCredentialStore();
  const status = await store.save({ appId, appSecret, ownerOpenId });
  console.log("飞书凭据已加密保存 (DPAPI):", JSON.stringify(status, null, 2));
}

main().catch((err) => {
  console.error("配置失败:", err);
  process.exit(1);
});
