import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../apps/syno/syno/paths.mjs";
import { WeixinIlinkAdapter } from "../apps/syno/syno/weixin-ilink.mjs";

const adapter = new WeixinIlinkAdapter();
const reportFile = path.join(PATHS.repoRoot, "docs", "WEIXIN-ANDROID-PROBE.md");
const startOnly = process.argv.includes("--start-only");
try {
  const login = await adapter.beginLogin();
  console.log("请使用 Android 微信扫描以下二维码链接，并在手机确认：");
  console.log(login.imageUrl);
  console.log(`二维码标识：${login.qrcode}`);
  let result = { status: startOnly ? "not_scanned_start_only" : "waiting" };
  const deadline = Date.now() + Math.min(300, login.expiresInSeconds || 300) * 1000;
  while (!startOnly && Date.now() < deadline && result.status !== "confirmed") {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    result = await adapter.pollLogin();
    if (result.status !== "waiting") console.log(`状态：${result.status}`);
  }
  const lines = ["# Android 微信 iLink 探针", "", `- 时间：${new Date().toISOString()}`, `- 二维码获取：成功`, `- 扫码确认：${result.status}`, `- Bot 身份：${result.botId || "未取得"}`, "- 私聊收发：需连接 Worker 后由本人发送一条文字完成", ""];
  await fs.writeFile(reportFile, lines.join("\n"), "utf8");
  if (!startOnly && result.status !== "confirmed") process.exitCode = 2;
} catch (error) {
  await fs.writeFile(reportFile, `# Android 微信 iLink 探针\n\n- 时间：${new Date().toISOString()}\n- 结果：不可用（不阻塞核心 V1）\n- 原因：${error.message}\n`, "utf8");
  console.error(error.message);
  process.exitCode = 2;
}
