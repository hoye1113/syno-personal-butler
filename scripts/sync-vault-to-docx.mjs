import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";

function parseInlineMarkdownElements(text) {
  if (!text) return [{ text_run: { content: "" } }];
  const elements = [];
  const regex = /(\*\*([^\*]+)\*\*)|(`([^`]+)`)|([^\*`]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      elements.push({
        text_run: {
          content: match[2],
          text_element_style: { bold: true },
        },
      });
    } else if (match[4]) {
      elements.push({
        text_run: {
          content: match[4],
          text_element_style: { inline_code: true },
        },
      });
    } else if (match[5]) {
      elements.push({
        text_run: {
          content: match[5],
        },
      });
    }
  }
  return elements.length > 0 ? elements : [{ text_run: { content: text } }];
}

function markdownToDocxBlocks(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  const blocks = [];
  let consecutiveEmptyLines = 0;
  let inFrontmatter = false;
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Frontmatter handling
    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line.trim() === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    // Code block handling
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        blocks.push({
          block_type: 14,
          code: {
            style: { language: 1 },
            elements: [{ text_run: { content: codeBuffer.join("\n") } }],
          },
        });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Empty lines (breathing space)
    if (!line) {
      consecutiveEmptyLines++;
      if (consecutiveEmptyLines <= 3 && blocks.length > 0) {
        blocks.push({
          block_type: 2,
          text: {
            elements: [{ text_run: { content: "" } }],
          },
        });
      }
      continue;
    }
    consecutiveEmptyLines = 0;

    // Divider
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      blocks.push({
        block_type: 22,
        divider: {},
      });
      continue;
    }

    // Heading 1
    if (line.startsWith("# ")) {
      blocks.push({
        block_type: 3,
        heading1: {
          elements: parseInlineMarkdownElements(line.slice(2).trim()),
        },
      });
    } else if (line.startsWith("## ")) {
      // Heading 2
      blocks.push({
        block_type: 4,
        heading2: {
          elements: parseInlineMarkdownElements(line.slice(3).trim()),
        },
      });
    } else if (line.startsWith("### ")) {
      // Heading 3
      blocks.push({
        block_type: 5,
        heading3: {
          elements: parseInlineMarkdownElements(line.slice(4).trim()),
        },
      });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // Bullet list
      blocks.push({
        block_type: 12,
        bullet: {
          elements: parseInlineMarkdownElements(line.slice(2).trim()),
        },
      });
    } else if (/^\d+\.\s/.test(line)) {
      // Ordered list
      const content = line.replace(/^\d+\.\s+/, "");
      blocks.push({
        block_type: 13,
        ordered: {
          elements: parseInlineMarkdownElements(content),
        },
      });
    } else if (line.startsWith("> ")) {
      // Quote
      blocks.push({
        block_type: 15,
        quote: {
          elements: parseInlineMarkdownElements(line.slice(2).trim()),
        },
      });
    } else {
      // Plain text paragraph
      blocks.push({
        block_type: 2,
        text: {
          elements: parseInlineMarkdownElements(line),
        },
      });
    }

    if (blocks.length >= 400) {
      break;
    }
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      block_type: 14,
      code: {
        style: { language: 1 },
        elements: [{ text_run: { content: codeBuffer.join("\n") } }],
      },
    });
  }

  return blocks;
}

async function syncNoteToDocx({
  client,
  title,
  body,
  ownerOpenId,
}) {
  // 1. 创建 Docx 空文档
  const createRes = await client.docx.v1.document.create({
    data: { title: title.slice(0, 100) },
  });
  const docId = createRes?.data?.document?.document_id;
  if (!docId) {
    throw new Error(`创建文档失败: ${JSON.stringify(createRes?.data)}`);
  }

  // 2. 授权 Owner 访问权限 (全管理权限，可在手机端查看/批注/编辑)
  if (ownerOpenId) {
    try {
      await client.drive.v1.permissionMember.create({
        path: { token: docId },
        params: { type: "docx" },
        data: {
          member_type: "openid",
          member_id: ownerOpenId,
          perm: "full_access",
        },
      });
    } catch (e) {
      // 忽略非致命提示
    }
  }

  // 3. 写入内容 Blocks
  const blocks = markdownToDocxBlocks(body);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    const chunk = blocks.slice(i, i + CHUNK_SIZE);
    try {
      await client.docx.v1.documentBlockChildren.create({
        path: { document_id: docId, block_id: docId },
        data: { children: chunk },
      });
    } catch (e) {
      console.warn(`[Docx Block] 写入区块提示: ${e?.message}`);
    }
  }

  return {
    documentId: docId,
    url: `https://my.feishu.cn/docx/${docId}`,
  };
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier1Only: false,
    limit: Infinity,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tier1" || args[i] === "--tier1-only") {
      options.tier1Only = true;
    } else if (args[i] === "--limit" && args[i + 1]) {
      options.limit = parseInt(args[++i], 10) || Infinity;
    }
  }
  return options;
}

function isTier1(relPath) {
  const norm = String(relPath || "").replace(/\\/g, "/");
  return (
    norm.startsWith("vault/01-Areas/") ||
    norm.startsWith("vault/02-Resources/哲学与自我认知/") ||
    norm.includes("Anthropic") ||
    norm.includes("Harness Engineering") ||
    norm.includes("Loop Engineering") ||
    norm.includes("Ralph Loop")
  );
}

async function main() {
  const options = parseCliArgs();
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) {
    throw new Error("飞书未配置凭据");
  }

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  console.log("=== 正在读取多维表格大盘记录 ===");
  const allRecords = [];
  let pageToken = "";
  do {
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { page_size: 100, page_token: pageToken || undefined },
    });
    const items = listRes?.data?.items || [];
    allRecords.push(...items);
    pageToken = listRes?.data?.has_more ? listRes.data.page_token : "";
  } while (pageToken);

  console.log(`大盘总记录数: ${allRecords.length} 篇`);

  // 筛选待上传记录 (未生成云文档链接)
  const pendingRecords = allRecords.filter((r) => {
    const link = r.fields?.["云文档链接"];
    const hasLink = Boolean(typeof link === "object" ? link?.link : link);
    if (hasLink) return false;
    if (options.tier1Only) {
      return isTier1(r.fields?.["本地相对路径"]);
    }
    return true;
  });

  // 按梯队排序：优先第一梯队核心理论与实战
  pendingRecords.sort((a, b) => {
    const aIsT1 = isTier1(a.fields?.["本地相对路径"]) ? 0 : 1;
    const bIsT1 = isTier1(b.fields?.["本地相对路径"]) ? 0 : 1;
    return aIsT1 - bIsT1;
  });

  const targets = pendingRecords.slice(0, options.limit);
  console.log(`\n待生成飞书云文档的目标数量: ${targets.length} 篇`);
  if (!targets.length) {
    console.log("所有符合条件的笔记均已生成云文档！无需重复同步。");
    return;
  }

  let successCount = 0;
  for (let i = 0; i < targets.length; i++) {
    const record = targets[i];
    const recordId = record.record_id;
    const relPath = String(record.fields?.["本地相对路径"] || "").trim();
    const noteName = String(record.fields?.["笔记名称"] || path.basename(relPath, ".md")).trim();

    const fullPath = path.resolve(relPath);
    let body = "";
    try {
      const raw = await fs.readFile(fullPath, "utf8");
      body = raw.replace(/^---[\s\S]*?---\s*/m, "").trim();
    } catch (e) {
      console.warn(`[跳过] 本地文件无法读取 (${relPath}):`, e.message);
      continue;
    }

    try {
      const docxRes = await syncNoteToDocx({
        client,
        title: noteName,
        body,
        ownerOpenId: cred.ownerOpenId,
      });

      // 回写多维表格
      await client.bitable.appTableRecord.update({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID, record_id: recordId },
        data: {
          fields: {
            "云文档链接": {
              text: "📖 飞书云文档",
              link: docxRes.url,
            },
          },
        },
      });

      successCount++;
      console.log(`[${i + 1}/${targets.length}] ✅ 已生成并挂载: ${noteName} -> ${docxRes.url}`);
    } catch (err) {
      console.error(`[${i + 1}/${targets.length}] ❌ 生成云文档失败 (${noteName}):`, err.message);
    }

    // 防限流延时
    await sleep(200);
  }

  console.log(`\n🎉 本批次飞书云文档同步完成！成功生成并挂载: ${successCount}/${targets.length} 篇`);
}

if (process.argv[1] && process.argv[1].endsWith("sync-vault-to-docx.mjs")) {
  main().catch((err) => {
    console.error("执行异常:", err);
    process.exit(1);
  });
}

export { syncNoteToDocx, markdownToDocxBlocks, isTier1, parseInlineMarkdownElements };
