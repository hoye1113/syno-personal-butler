import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const BATCH_SIZE = 50;

function stripMarkdown(text) {
  return String(text || "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\[\[(.*?)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~>]/g, "")
    .replace(/\r?\n+/g, " ")
    .trim();
}

function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\s*/.exec(content);
  if (!match) return { meta: {}, body: content };
  const yamlText = match[1];
  const meta = {};
  let currentKey = null;

  for (const line of yamlText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const topMatch = /^([a-zA-Z0-9_-]+):\s*(.*)$/.exec(line);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = topMatch[2].trim();
      if (val === "" || val === "[]") {
        meta[currentKey] = val === "[]" ? [] : "";
      } else if (val.startsWith("[") && val.endsWith("]")) {
        meta[currentKey] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      } else {
        meta[currentKey] = val.replace(/^['"]|['"]$/g, "");
      }
      continue;
    }

    if (currentKey && /^\s*-\s*(.+)$/.test(line)) {
      const itemMatch = /^\s*-\s*(.+)$/.exec(line);
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(itemMatch[1].trim().replace(/^['"]|['"]$/g, ""));
    }
  }

  return { meta, body: content.slice(match[0].length) };
}

function extractMocLinks(content) {
  const mocs = [];
  const regex = /\[\[(MOC\s*-[^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!mocs.includes(match[1])) mocs.push(`[[${match[1]}]]`);
  }
  return mocs.join(", ").slice(0, 500);
}

function classifyNote(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.startsWith("01-Areas/AI Agent Development")) {
    return {
      domain: "01-系统课程体系",
      topic: normalized.includes("Super Agent") ? "Super Agent 实战课" : "AI Agent 支柱理论课",
    };
  }
  if (normalized.includes("Loock AI 全栈应用开发")) {
    return {
      domain: "02-实战应用课程",
      topic: "Loock AI 全栈应用开发",
    };
  }
  if (normalized.includes("播客转录") || normalized.includes("B站视频知识库")) {
    return {
      domain: "04-音视频转录",
      topic: normalized.includes("播客") ? "播客深度对话" : "B站视频精析",
    };
  }
  if (normalized.startsWith("02-Resources/Prompts")) {
    return {
      domain: "05-Prompt与工具",
      topic: "Prompt 模式与工程",
    };
  }
  if (normalized.startsWith("02-Resources/AI and Agents")) {
    const parts = normalized.split("/");
    const sub = parts.length > 2 ? parts[2] : "前沿研究";
    return {
      domain: "03-前沿架构与评测",
      topic: sub.replace(/\.md$/, ""),
    };
  }
  return {
    domain: "06-其他与思考",
    topic: normalized.split("/")[0] || "综合",
  };
}

async function collectVaultNotes(vaultRoot) {
  const notes = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || ["tests", "99-System", ".agents", ".claude"].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        notes.push(fullPath);
      }
    }
  }
  await walk(vaultRoot);
  return notes;
}

async function buildRecord(filePath, vaultRoot) {
  const relPath = path.relative(vaultRoot, filePath).replace(/\\/g, "/");
  const fullRelPath = `vault/${relPath}`;
  const content = await fs.readFile(filePath, "utf8");
  const stat = await fs.stat(filePath);
  const { meta, body } = parseFrontmatter(content);

  let title = meta.title;
  if (!title) {
    const headingMatch = /^#\s+(.+)$/m.exec(body);
    title = headingMatch ? headingMatch[1].trim() : path.basename(filePath, ".md");
  }

  const { domain, topic } = classifyNote(relPath);

  let summary = meta.description || "";
  if (!summary) {
    const cleanText = stripMarkdown(body);
    summary = cleanText.slice(0, 260) + (cleanText.length > 260 ? "..." : "");
  }

  const tags = Array.isArray(meta.tags) ? meta.tags.map(String).filter(Boolean).slice(0, 8) : [];
  const moc = extractMocLinks(content);

  let dateMs = stat.mtimeMs;
  if (meta.created && !Number.isNaN(Date.parse(meta.created))) dateMs = Date.parse(meta.created);
  else if (meta.updated && !Number.isNaN(Date.parse(meta.updated))) dateMs = Date.parse(meta.updated);

  const cleanBody = body.trim();
  const boundedBody = cleanBody.length > 18000
    ? `${cleanBody.slice(0, 18000)}\n\n*(注：文章内容过长，超出多维表格单单元格上限，其余内容请查阅云文档或本地)*`
    : cleanBody;

  return {
    relPath: fullRelPath,
    fields: {
      "笔记名称": title.slice(0, 100),
      "知识领域": domain,
      "核心专题": topic.slice(0, 100),
      "核心要点摘要": summary.slice(0, 500),
      "完整正文": boundedBody,
      ...(tags.length ? { "标签": tags } : {}),
      ...(moc ? { "关联 MOC": moc } : {}),
      "本地相对路径": fullRelPath,
      "创建/更新日期": Math.floor(dateMs),
    },
  };
}

async function syncVaultCatalog({
  appToken = DEFAULT_APP_TOKEN,
  tableId = DEFAULT_CATALOG_TABLE_ID,
  credentials = new FeishuCredentialStore(),
  vaultRoot = PATHS.vaultRoot,
  syncContent = true,
  onProgress = () => {},
} = {}) {
  const cred = await credentials.load();
  if (!cred?.appId || !cred?.appSecret) {
    throw new Error("飞书未配置凭据，无法同步多维表格");
  }

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  // 1. 获取全景大盘中已存在的记录（以本地相对路径为键）
  const existingMap = new Map(); // relPath -> { recordId, hasContent }
  let pageToken = "";
  do {
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: appToken, table_id: tableId },
      params: { page_size: 100, page_token: pageToken || undefined },
    });
    const items = listRes?.data?.items || [];
    for (const item of items) {
      const p = item.fields?.["本地相对路径"];
      if (p) {
        existingMap.set(String(p).trim(), {
          recordId: item.record_id,
          hasContent: Boolean(item.fields?.["完整正文"]),
        });
      }
    }
    pageToken = listRes?.data?.has_more ? listRes.data.page_token : "";
  } while (pageToken);

  onProgress({ event: "existing_scanned", existingCount: existingMap.size });

  // 2. 收集本地 vault 笔记
  const noteFiles = await collectVaultNotes(vaultRoot);
  onProgress({ event: "vault_scanned", totalNotes: noteFiles.length });

  // 3. 构建待新增与待更新列表
  const pendingCreates = [];
  const pendingUpdates = [];

  for (const file of noteFiles) {
    const record = await buildRecord(file, vaultRoot);
    const existing = existingMap.get(record.relPath);
    if (!existing) {
      pendingCreates.push(record.fields);
    } else if (syncContent && !existing.hasContent) {
      pendingUpdates.push({
        record_id: existing.recordId,
        fields: {
          "完整正文": record.fields["完整正文"],
        },
      });
    }
  }

  onProgress({
    event: "pending_prepared",
    pendingCreates: pendingCreates.length,
    pendingUpdates: pendingUpdates.length,
  });

  // 4. 分批更新已有记录的正文
  let updated = 0;
  for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
    const chunk = pendingUpdates.slice(i, i + BATCH_SIZE);
    await client.bitable.appTableRecord.batchUpdate({
      path: { app_token: appToken, table_id: tableId },
      data: { records: chunk },
    });
    updated += chunk.length;
    onProgress({ event: "batch_updated", updated, total: pendingUpdates.length });
  }

  // 5. 分批批量写入新记录
  let inserted = 0;
  for (let i = 0; i < pendingCreates.length; i += BATCH_SIZE) {
    const chunk = pendingCreates.slice(i, i + BATCH_SIZE).map((fields) => ({ fields }));
    await client.bitable.appTableRecord.batchCreate({
      path: { app_token: appToken, table_id: tableId },
      data: { records: chunk },
    });
    inserted += chunk.length;
    onProgress({ event: "batch_inserted", inserted, total: pendingCreates.length });
  }

  return {
    totalNotes: noteFiles.length,
    existingCount: existingMap.size,
    updatedCount: updated,
    insertedCount: inserted,
    appToken,
    tableId,
  };
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirect) {
  syncVaultCatalog({
    onProgress: (info) => console.log(`[Catalog Sync] ${JSON.stringify(info)}`),
  })
    .then((res) => {
      console.log("\n✅ 知识库全景大盘同步完成！");
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error("\n❌ 同步失败:", err);
      process.exitCode = 1;
    });
}

export { buildRecord, classifyNote, syncVaultCatalog };
