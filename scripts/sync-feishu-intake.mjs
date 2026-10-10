import process from "node:process";
import { FeishuBitableSyncEngine } from "../packages/syno-core/feishu-bitable-sync.mjs";

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return null;
}

async function runOnce(engine) {
  console.log(`[${new Date().toLocaleTimeString()}] 正在检查飞书多维表格待收录条目...`);
  const result = await engine.syncIntakeOnce();
  if (result.processed > 0) {
    console.log(`同步完成：处理了 ${result.processed} 条新收录。`);
    for (const item of result.items) {
      console.log(`- [${item.title}] -> ${item.relPath}`);
    }
  } else {
    console.log("多维表格收录池当前无待处理条目。");
  }
  return result;
}

async function main() {
  const isWatch = process.argv.includes("--watch");
  const intervalArg = getArgValue("--interval") || "15";
  const intervalMs = Math.max(1, parseInt(intervalArg, 10)) * 60 * 1000;

  const engine = new FeishuBitableSyncEngine();
  await runOnce(engine);

  if (isWatch) {
    console.log(`已进入定时轮询模式，每 ${intervalArg} 分钟检查一次（按 Ctrl+C 退出）...`);
    setInterval(async () => {
      try {
        await runOnce(engine);
      } catch (err) {
        console.error("定时轮询同步异常:", err);
      }
    }, intervalMs);
  }
}

main().catch((err) => {
  console.error("同步失败:", err);
  process.exitCode = 1;
});
