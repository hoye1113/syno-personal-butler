import { FeishuBitableSyncEngine } from "../packages/syno-core/feishu-bitable-sync.mjs";

async function main() {
  const engine = new FeishuBitableSyncEngine();
  console.log("正在同步飞书多维表格待收录条目到本地知识库 Inbox...");
  const result = await engine.syncIntakeOnce();
  console.log(`同步完成：处理了 ${result.processed} 条新收录。`);
  for (const item of result.items) {
    console.log(`- [${item.title}] -> ${item.relPath}`);
  }
}

main().catch((err) => {
  console.error("同步失败:", err);
  process.exitCode = 1;
});
