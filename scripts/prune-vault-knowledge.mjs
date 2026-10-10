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

async function pruneKnowledgeBase({
  appToken = DEFAULT_APP_TOKEN,
  tableId = DEFAULT_CATALOG_TABLE_ID,
  credentials = new FeishuCredentialStore(),
} = {}) {
  const vaultRoot = PATHS.vaultRoot;

  const targetsToPrune = [
    path.join(vaultRoot, "02-Resources", "Prompts"),
    path.join(vaultRoot, "02-Resources", "AI and Agents", "B站视频知识库"),
  ];

  console.log("=== 正在统计待清理的本地第三、第四梯队文件 ===");
  const localFilesToDelete = [];
  for (const targetDir of targetsToPrune) {
    const files = await walk(targetDir);
    localFilesToDelete.push(...files);
    console.log(`- 目标目录: ${path.relative(vaultRoot, targetDir)}: 包含 ${files.length} 篇笔记`);
  }

  console.log(`本地待清理笔记总数: ${localFilesToDelete.length} 篇`);

  // 1. 删除本地物理目录与文件
  console.log("\n=== 1. 执行本地文件物理删除 ===");
  for (const targetDir of targetsToPrune) {
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
      console.log(`✅ 已彻底删除目录: ${path.relative(vaultRoot, targetDir)}`);
    } catch (err) {
      console.error(`删除目录失败: ${targetDir}`, err);
    }
  }

  // 2. 清理 MOC 导航引用
  console.log("\n=== 2. 更新 MOC 导航路由器 ===");
  const navMocPath = path.join(vaultRoot, "MOC - 知识库导航.md");
  try {
    let mocContent = await fs.readFile(navMocPath, "utf8");
    const oldRow = "| 可复用 prompt 模板（tweet / 摘要 / 翻译 / web clip） | [[MOC - Prompt 库]] | 模板库 |\n";
    if (mocContent.includes(oldRow)) {
      mocContent = mocContent.replace(oldRow, "");
      await fs.writeFile(navMocPath, mocContent, "utf8");
      console.log("✅ 已从 MOC - 知识库导航.md 中清理 Prompt 库路由");
    }
  } catch (err) {
    console.warn("更新 MOC 导航提示:", err.message);
  }

  // 3. 同步清理飞书多维表格大盘 (Table 2) 对应记录
  console.log("\n=== 3. 同步清理飞书多维表格大盘记录 ===");
  const cred = await credentials.load();
  if (!cred?.appId || !cred?.appSecret) {
    console.warn("未配置飞书凭据，跳过飞书多维表格记录同步清理");
    return { localDeleted: localFilesToDelete.length, remoteDeleted: 0 };
  }

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  const recordIdsToDelete = [];
  let pageToken = "";
  do {
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: appToken, table_id: tableId },
      params: { page_size: 100, page_token: pageToken || undefined },
    });
    const items = listRes?.data?.items || [];
    for (const item of items) {
      const relPath = String(item.fields?.["本地相对路径"] || "").trim().replace(/\\/g, "/");
      const isTarget =
        relPath.startsWith("vault/02-Resources/Prompts") ||
        relPath.startsWith("vault/02-Resources/AI and Agents/B站视频知识库");

      if (isTarget) {
        recordIdsToDelete.push(item.record_id);
      }
    }
    pageToken = listRes?.data?.has_more ? listRes.data.page_token : "";
  } while (pageToken);

  console.log(`多维表格大盘中检测到 ${recordIdsToDelete.length} 条待清理的废弃记录`);

  let remoteDeleted = 0;
  for (let i = 0; i < recordIdsToDelete.length; i += BATCH_SIZE) {
    const chunk = recordIdsToDelete.slice(i, i + BATCH_SIZE);
    try {
      await client.bitable.appTableRecord.batchDelete({
        path: { app_token: appToken, table_id: tableId },
        data: { records: chunk },
      });
      remoteDeleted += chunk.length;
      console.log(`[Bitable Sync] 已删除大盘废弃记录: ${remoteDeleted}/${recordIdsToDelete.length}`);
    } catch (err) {
      console.error("[Bitable Sync] 批量删除记录异常:", err?.response?.data || err.message);
    }
  }

  console.log("\n🎉 第三、第四梯队知识库瘦身清理彻底完成！");
  console.log(`- 本地清理笔记数: ${localFilesToDelete.length} 篇`);
  console.log(`- 飞书大盘同步下线记录数: ${remoteDeleted} 篇`);

  return {
    localDeleted: localFilesToDelete.length,
    remoteDeleted,
  };
}

if (process.argv[1] && process.argv[1].endsWith("prune-vault-knowledge.mjs")) {
  pruneKnowledgeBase().catch((err) => {
    console.error("执行清理失败:", err);
    process.exit(1);
  });
}

export { pruneKnowledgeBase };
