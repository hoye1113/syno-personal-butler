import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const BATCH_SIZE = 50;

async function walk(dir) {
  let files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...await walk(full));
      else if (e.name.endsWith(".md")) files.push(full);
    }
  } catch {}
  return files;
}

async function main() {
  const targetDir = path.join(PATHS.vaultRoot, "02-Resources", "AI and Agents", "Loock AI 全栈应用开发");
  console.log(`=== 正在统计待清理的 Coding 课程文件 ===`);
  const filesToDelete = await walk(targetDir);
  console.log(`目标目录: ${path.relative(PATHS.vaultRoot, targetDir)}: 包含 ${filesToDelete.length} 篇代码切片`);

  // 1. 删除本地物理目录
  console.log("\n=== 1. 执行本地文件物理删除 ===");
  try {
    await fs.rm(targetDir, { recursive: true, force: true });
    console.log(`✅ 已彻底删除本地目录: ${path.relative(PATHS.vaultRoot, targetDir)}`);
  } catch (err) {
    console.error(`删除目录失败:`, err.message);
  }

  // 2. 清理 MOC 导航中的 Loock 课程行
  console.log("\n=== 2. 更新 MOC 导航路由器 ===");
  const navMocPath = path.join(PATHS.vaultRoot, "MOC - 知识库导航.md");
  try {
    let mocContent = await fs.readFile(navMocPath, "utf8");
    const targetPattern = /\|\s*全栈实现\s*\/[\s\S]*?\[\[MOC - Loock AI 全栈课程\]\]\s*\|\s*课程\s*\|\r?\n/;
    if (targetPattern.test(mocContent)) {
      mocContent = mocContent.replace(targetPattern, "");
      await fs.writeFile(navMocPath, mocContent, "utf8");
      console.log(`✅ 已从 MOC - 知识库导航.md 中清理 Loock AI 全栈课程路由`);
    }
  } catch (err) {
    console.warn(`更新 MOC 导航提示:`, err.message);
  }

  // 3. 从飞书多维表格大盘 (Table 2) 同步删除对应记录
  console.log("\n=== 3. 同步清理飞书多维表格大盘记录 ===");
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  const recordIdsToDelete = [];
  let pageToken = "";
  do {
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { page_size: 100, page_token: pageToken || undefined },
    });
    const items = listRes?.data?.items || [];
    for (const item of items) {
      const relPath = String(item.fields?.["本地相对路径"] || "").replace(/\\/g, "/");
      if (relPath.includes("Loock AI 全栈应用开发")) {
        recordIdsToDelete.push(item.record_id);
      }
    }
    pageToken = listRes?.data?.has_more ? listRes.data.page_token : "";
  } while (pageToken);

  console.log(`多维表格大盘中检测到 ${recordIdsToDelete.length} 条待清理的 Coding 教程记录`);

  let remoteDeleted = 0;
  for (let i = 0; i < recordIdsToDelete.length; i += BATCH_SIZE) {
    const chunk = recordIdsToDelete.slice(i, i + BATCH_SIZE);
    try {
      await client.bitable.appTableRecord.batchDelete({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
        data: { records: chunk },
      });
      remoteDeleted += chunk.length;
      console.log(`[Bitable Sync] 已下线大盘记录: ${remoteDeleted}/${recordIdsToDelete.length}`);
    } catch (e) {
      console.error(`[Bitable Sync] 删除异常:`, e?.response?.data || e.message);
    }
  }

  console.log(`\n🎉 Coding 教程清理彻底完成！`);
  console.log(`- 本地清理笔记数: ${filesToDelete.length} 篇`);
  console.log(`- 飞书大盘同步下线记录数: ${remoteDeleted} 篇`);
}

main().catch((err) => {
  console.error("执行清理失败:", err);
  process.exit(1);
});
