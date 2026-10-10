import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { FeishuCredentialStore } from "./feishu-channel.mjs";
import { PATHS } from "./paths.mjs";
import {
  parseWeChatHtmlAesthetic,
  buildDocxBlockFromItem,
} from "./wechat-aesthetic-parser.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_INTAKE_TABLE_ID = "tblpP77HG2RIA0aG";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const DEFAULT_WIKI_SPACE_ID = "7694918217688534004";
const DEFAULT_WIKI_ROOT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";

function sanitizeFilename(name) {
  return String(name || "note")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "note";
}

function extractUrl(val) {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") return String(val.text || val.link || "").trim();
  return "";
}

function extractTags(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
}

function isWeChatUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return /(?:^|\.)mp\.weixin\.qq\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function decodeHtmlEntities(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractWeChatMetadata(html) {
  let title = "";
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitleMatch) title = decodeHtmlEntities(ogTitleMatch[1]);
  if (!title) {
    const h1Match = html.match(/<h1[^>]*class=["'][^"']*rich_media_title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) title = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, ""));
  }
  if (!title) {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = decodeHtmlEntities(titleMatch[1]);
  }

  let author = "";
  const ogAuthorMatch = html.match(/<meta\s+property=["']og:article:author["']\s+content=["']([^"']+)["']/i);
  if (ogAuthorMatch) author = decodeHtmlEntities(ogAuthorMatch[1]);
  if (!author) {
    const nameMatch = html.match(/<a[^>]*id=["']js_name["'][^>]*>([\s\S]*?)<\/a>/i);
    if (nameMatch) author = decodeHtmlEntities(nameMatch[1].replace(/<[^>]+>/g, ""));
  }

  return { title, author };
}

function determineCategoryInfo(title = "", tags = []) {
  const combined = `${title} ${tags.join(" ")}`.toLowerCase();

  if (/harness|loop engineering|系统工程/i.test(combined)) {
    return {
      wikiCatKey: "05_harness",
      wikiPrefix: "05 - Harness 工程",
      bitableDomain: "04-开发与工程落地",
      bitableTopic: "Harness Engineering",
    };
  }
  if (/super agent|实战课|sqlite-vec|agent loop/i.test(combined)) {
    return {
      wikiCatKey: "02_super_agent",
      wikiPrefix: "02 - Super Agent 实战体系",
      bitableDomain: "04-开发与工程落地",
      bitableTopic: "Super Agent 实战课",
    };
  }
  if (/anthropic|cognition|架构长文|系统架构/i.test(combined)) {
    return {
      wikiCatKey: "03_architecture",
      wikiPrefix: "03 - 顶级架构与工程长文",
      bitableDomain: "03-前沿架构与评测",
      bitableTopic: "Top Architectures",
    };
  }
  if (/eval|benchmark|评测|安全测试/i.test(combined)) {
    return {
      wikiCatKey: "08_eval",
      wikiPrefix: "08 - AI 评估基准与安全测试",
      bitableDomain: "03-前沿架构与评测",
      bitableTopic: "AI Evaluation & Safety",
    };
  }
  if (/coding|cursor|cli|codex|claude code|编程/i.test(combined)) {
    return {
      wikiCatKey: "09_coding_tools",
      wikiPrefix: "09 - AI 编程范式与开发工具",
      bitableDomain: "04-开发与工程落地",
      bitableTopic: "AI Coding & Tools",
    };
  }
  if (/组织|a16z|产品思考|个人杠杆|职业/i.test(combined)) {
    return {
      wikiCatKey: "06_organization",
      wikiPrefix: "06 - AI 原生组织与产品思考",
      bitableDomain: "01-基础与方法论",
      bitableTopic: "AI Native Organization Product & Career",
    };
  }
  if (/哲学|元认知|李继刚|孟岩|思考|心智/i.test(combined)) {
    return {
      wikiCatKey: "10_philosophy",
      wikiPrefix: "10 - 哲学与元认知",
      bitableDomain: "06-其他与思考",
      bitableTopic: "哲学与自我认知",
    };
  }
  if (/模式|pattern|skill|自进化|设计模式/i.test(combined)) {
    return {
      wikiCatKey: "04_design_patterns",
      wikiPrefix: "04 - Agent 设计模式与生产实践",
      bitableDomain: "01-基础与方法论",
      bitableTopic: "Agent Design & Patterns",
    };
  }
  if (/具身|脑机|bci|物理智能/i.test(combined)) {
    return {
      wikiCatKey: "07_frontier",
      wikiPrefix: "07 - 前沿科学与物理智能",
      bitableDomain: "03-前沿架构与评测",
      bitableTopic: "具身智能与脑机接口",
    };
  }
  return {
    wikiCatKey: "01_theory",
    wikiPrefix: "01 - AI Agent 支柱理论",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Theory and Design",
  };
}

class FeishuBitableSyncEngine {
  constructor({
    appToken = DEFAULT_APP_TOKEN,
    intakeTableId = DEFAULT_INTAKE_TABLE_ID,
    catalogTableId = DEFAULT_CATALOG_TABLE_ID,
    wikiSpaceId = DEFAULT_WIKI_SPACE_ID,
    wikiRootNodeToken = DEFAULT_WIKI_ROOT_TOKEN,
    credentials = new FeishuCredentialStore(),
    vaultRoot = PATHS.vaultRoot,
    vaultInboxRoot = path.join(PATHS.vaultRoot, "00-Inbox"),
    sdkLoader = () => import("@larksuiteoapi/node-sdk"),
    clock = () => new Date(),
    fetcher = globalThis.fetch,
  } = {}) {
    this.appToken = appToken;
    this.intakeTableId = intakeTableId;
    this.catalogTableId = catalogTableId;
    this.wikiSpaceId = wikiSpaceId;
    this.wikiRootNodeToken = wikiRootNodeToken;
    this.credentials = credentials;
    this.vaultRoot = vaultRoot;
    this.vaultInboxRoot = vaultInboxRoot;
    this.sdkLoader = sdkLoader;
    this.clock = clock;
    this.fetcher = fetcher;
  }

  async #getClient() {
    const cred = await this.credentials.load();
    if (!cred?.appId || !cred?.appSecret) {
      throw new Error("飞书未配置有效凭据，无法连接多维表格");
    }
    const lark = await this.sdkLoader();
    return new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });
  }

  async #writeDocxBlocks({ client, docId, blocks, attachmentsDir }) {
    if (!client.docx?.v1?.documentBlockChildren) return;

    let pendingTextBlocks = [];
    const flushTextBlocks = async () => {
      if (pendingTextBlocks.length === 0) return;
      const CHUNK_SIZE = 50;
      for (let i = 0; i < pendingTextBlocks.length; i += CHUNK_SIZE) {
        const chunk = pendingTextBlocks.slice(i, i + CHUNK_SIZE);
        await client.docx.v1.documentBlockChildren.create({
          path: { document_id: docId, block_id: docId },
          data: { children: chunk },
        });
      }
      pendingTextBlocks = [];
    };

    for (const b of blocks) {
      if (b.type === "image") {
        await flushTextBlocks();
        const localImagePath = path.join(attachmentsDir, b.filename);
        let imgBuf = null;
        try {
          imgBuf = await fs.readFile(localImagePath);
        } catch {
          // 本地无图片缓存则跳过
        }
        if (!imgBuf || !client.drive?.v1?.media?.uploadAll) continue;

        try {
          const imgBlockRes = await client.docx.v1.documentBlockChildren.create({
            path: { document_id: docId, block_id: docId },
            data: { children: [{ block_type: 27, image: {} }] },
          });
          const imageBlockId = imgBlockRes?.data?.children?.[0]?.block_id;
          if (!imageBlockId) continue;

          const uploadRes = await client.drive.v1.media.uploadAll({
            data: {
              file_name: b.filename,
              parent_type: "docx_image",
              parent_node: imageBlockId,
              size: imgBuf.length,
              file: imgBuf,
            },
          });
          const fileToken = uploadRes?.file_token || uploadRes?.data?.file_token;
          if (fileToken && client.docx?.v1?.documentBlock?.patch) {
            await client.docx.v1.documentBlock.patch({
              path: { document_id: docId, block_id: imageBlockId },
              data: { replace_image: { token: fileToken } },
            });
          }
        } catch (imgErr) {
          console.warn(`[Feishu Bitable Intake] 嵌入图片失败 (${b.filename}):`, imgErr.message);
        }
      } else {
        const docxBlock = b.docxBlock || buildDocxBlockFromItem(b);
        if (docxBlock) pendingTextBlocks.push(docxBlock);
      }
    }

    await flushTextBlocks();
  }

  async #syncToWikiDocx({ client, cred, title, categoryInfo, docxBlocks, attachmentsDir }) {
    if (!this.wikiSpaceId || !client.wiki?.v2?.spaceNode) return null;
    try {
      const rootList = await client.wiki.v2.spaceNode.list({
        path: { space_id: this.wikiSpaceId },
        params: { parent_node_token: this.wikiRootNodeToken, page_size: 50 },
      }).catch(() => ({ data: { items: [] } }));
      const items = rootList?.data?.items || [];
      const parentNode = items.find((n) => n.title?.startsWith(categoryInfo.wikiPrefix.slice(0, 5))) || items[0];
      const parentToken = parentNode?.node_token || this.wikiRootNodeToken;

      const wikiNodeRes = await client.wiki.v2.spaceNode.create({
        path: { space_id: this.wikiSpaceId },
        data: {
          parent_node_token: parentToken,
          node_type: "origin",
          obj_type: "docx",
          title: title.slice(0, 100),
        },
      });
      const node = wikiNodeRes?.data?.node;
      const docxToken = node?.obj_token;
      const wikiUrl = node?.url;

      if (cred?.ownerOpenId && docxToken && client.drive?.v1?.permissionMember?.create) {
        await client.drive.v1.permissionMember.create({
          path: { token: docxToken },
          params: { type: "docx" },
          data: { member_type: "openid", member_id: cred.ownerOpenId, perm: "full_access" },
        }).catch(() => {});
      }

      if (docxToken) {
        await this.#writeDocxBlocks({
          client,
          docId: docxToken,
          blocks: docxBlocks,
          attachmentsDir,
        });
      }

      return { wikiUrl, docxToken };
    } catch (wikiErr) {
      console.warn(`[Feishu Bitable Intake] Wiki 节点创建跳过/失败:`, wikiErr.message);
      return null;
    }
  }

  async syncIntakeOnce() {
    const cred = await this.credentials.load();
    if (!cred?.appId || !cred?.appSecret) {
      throw new Error("飞书未配置有效凭据，无法连接多维表格");
    }
    const lark = await this.sdkLoader();
    const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

    await fs.mkdir(this.vaultInboxRoot, { recursive: true });

    // 1. 读取收录表中待处理记录
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: this.appToken, table_id: this.intakeTableId },
      params: { page_size: 100 },
    });

    const records = listRes?.data?.items || [];
    const pending = records.filter((r) => {
      const status = r.fields?.["收录状态"];
      const hasContent = Boolean(r.fields?.["标题"] || r.fields?.["正文/想法"] || r.fields?.["链接"]);
      return hasContent && (status === "待收录" || !status || status === "");
    });

    if (!pending.length) {
      return { processed: 0, items: [] };
    }

    const processed = [];

    for (const record of pending) {
      const recordId = record.record_id;
      const rawTitle = String(record.fields?.["标题"] || "").trim();
      const rawBody = String(record.fields?.["正文/想法"] || "").trim();
      const rawUrl = extractUrl(record.fields?.["链接"]);
      const tags = extractTags(record.fields?.["分类标签"]);

      let title = rawTitle || (rawBody ? rawBody.slice(0, 30) : (rawUrl ? `收录-${rawUrl.slice(0, 30)}` : "未命名收录"));
      const now = this.clock();
      const dateStr = now.toISOString().slice(0, 10);
      const fileId = randomUUID().slice(0, 8);
      let safeSlug = sanitizeFilename(title);
      let fileName = `${dateStr}-${safeSlug}-${fileId}.md`;
      let fullPath = path.join(this.vaultInboxRoot, fileName);
      let relPath = `vault/00-Inbox/${fileName}`;

      const isWeChat = isWeChatUrl(rawUrl);
      let categoryInfo = isWeChat
        ? determineCategoryInfo(title, tags)
        : {
            wikiCatKey: "13_archive",
            wikiPrefix: "13 - 系统规范与工程归档",
            bitableDomain: "06-其他与思考",
            bitableTopic: "移动端飞书收录",
          };
      let finalMarkdown = "";
      let summaryNote = `已入库至 ${relPath}，已同步端云知识大盘。`;

      if (isWeChat) {
        let html = "";
        try {
          const fetchRes = await this.fetcher(rawUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              "Referer": "https://mp.weixin.qq.com",
            },
          });
          if (fetchRes && (fetchRes.ok || fetchRes.status === 200)) {
            html = await fetchRes.text();
          }
        } catch (fetchErr) {
          console.warn(`[Feishu Bitable Intake] 拉取微信网页异常 (${rawUrl}):`, fetchErr.message);
        }

        if (html) {
          const meta = extractWeChatMetadata(html);
          if (!rawTitle && meta.title) {
            title = meta.title;
            safeSlug = sanitizeFilename(title);
            fileName = `${dateStr}-${safeSlug}-${fileId}.md`;
            fullPath = path.join(this.vaultInboxRoot, fileName);
            relPath = `vault/00-Inbox/${fileName}`;
          }
          const author = meta.author || "";
          categoryInfo = determineCategoryInfo(title, tags);

          const parsedItems = parseWeChatHtmlAesthetic(html, "fig");
          const attachmentsRelDir = `99-System/Attachments/WeChat Articles/${safeSlug}`;
          const attachmentsAbsDir = path.join(this.vaultRoot, attachmentsRelDir);
          await fs.mkdir(attachmentsAbsDir, { recursive: true });

          let downloadedImagesCount = 0;
          for (const item of parsedItems) {
            if (item.type === "image" && item.url) {
              const destFile = path.join(attachmentsAbsDir, item.filename);
              try {
                const imgRes = await this.fetcher(item.url, {
                  headers: {
                    "Referer": "https://mp.weixin.qq.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                  },
                });
                if (imgRes && (imgRes.ok || imgRes.status === 200)) {
                  const buf = Buffer.from(await imgRes.arrayBuffer());
                  await fs.writeFile(destFile, buf);
                  downloadedImagesCount++;
                }
              } catch (imgErr) {
                console.warn(`[Feishu Bitable Intake] 下载图片失败 (${item.filename}):`, imgErr.message);
              }
            }
          }

          // 规范生成具备 3 行呼吸留白的 Markdown
          const mdLines = [
            "---",
            `title: ${JSON.stringify(title)}`,
            `source_url: ${JSON.stringify(rawUrl)}`,
            ...(author ? [`author: ${JSON.stringify(author)}`] : []),
            `created: ${dateStr}`,
            `updated: ${dateStr}`,
            "tags:",
            ...tags.map((t) => `  - ${t}`),
            ...(tags.length === 0 ? ["  - inbox", "  - wechat_aesthetic"] : []),
            `source: wechat_article`,
            `feishu_record_id: ${JSON.stringify(recordId)}`,
            "---",
            "",
            `# ${title}`,
            "",
            `> 💡 **核心精粹与认知反思**`,
            ...(rawBody ? [`> 主人备忘：${rawBody}`] : [`> 本文经 Syno 管家 V4 美感排版引擎自动化收录，保留 100% 深度推演脉络。`]),
            `> 原始链接：${rawUrl}`,
            `> 录入时间：${now.toLocaleString("zh-CN")}`,
            "",
            "",
            "", // 3 行呼吸留白
          ];

          for (const item of parsedItems) {
            if (item.type === "divider") {
              mdLines.push("", "---", "");
            } else if (item.type === "heading") {
              mdLines.push("", `${"#".repeat(item.level)} ${item.content}`, "");
            } else if (item.type === "quote") {
              mdLines.push("", `> ${item.content}`, "");
            } else if (item.type === "bullet") {
              mdLines.push(`- ${item.content}`);
            } else if (item.type === "ordered") {
              mdLines.push(`1. ${item.content}`);
            } else if (item.type === "code") {
              mdLines.push("", "```", item.content, "```", "");
            } else if (item.type === "image") {
              mdLines.push("", `![${item.alt}](../../${attachmentsRelDir}/${item.filename})`, "");
            } else if (item.type === "text") {
              mdLines.push("", item.content);
            }
          }

          finalMarkdown = mdLines.join("\n");

          // 生成飞书 Docx 区块
          const docxBlocks = [
            {
              block_type: 15,
              quote: {
                elements: [
                  { text_run: { content: `💡 核心精粹与认知反思\n${rawBody || "本文经 Syno 管家 V4 美感排版引擎自动化收录，保留 100% 深度推演脉络。"}\n原始链接：${rawUrl}` } },
                ],
              },
            },
            { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
            { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
            { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
          ];

          for (const item of parsedItems) {
            if (item.type === "image") {
              docxBlocks.push({ type: "image", filename: item.filename, url: item.url });
            } else {
              const b = buildDocxBlockFromItem(item);
              if (b) docxBlocks.push({ type: item.type, docxBlock: b });
            }
          }

          const wikiResult = await this.#syncToWikiDocx({
            client,
            cred,
            title,
            categoryInfo,
            docxBlocks,
            attachmentsDir: attachmentsAbsDir,
          });

          summaryNote = `已完成 V4 美感排版重构入库至 ${relPath}，已下载 ${downloadedImagesCount} 张高清原图，已对齐端云知识大盘。` + (wikiResult?.wikiUrl ? ` Wiki: ${wikiResult.wikiUrl}` : "");
        }
      }

      // 非微信或降级情况的标准 Markdown
      if (!finalMarkdown) {
        const frontmatterLines = [
          "---",
          `title: ${JSON.stringify(title)}`,
          ...(rawUrl ? [`source_url: ${JSON.stringify(rawUrl)}`] : []),
          `created: ${dateStr}`,
          `updated: ${dateStr}`,
          "tags:",
          ...tags.map((t) => `  - ${t}`),
          ...(tags.length === 0 ? ["  - inbox", "  - feishu_sync"] : []),
          `source: feishu_bitable_intake`,
          `feishu_record_id: ${JSON.stringify(recordId)}`,
          "---",
          "",
          `# ${title}`,
          "",
          ...(rawUrl ? [`> 原始链接：${rawUrl}\n`] : []),
          `> 录入时间：${now.toLocaleString("zh-CN")}\n`,
          "## 正文与笔记",
          "",
          rawBody || "*(仅有链接或标题，暂无正文内容)*",
          "",
        ];
        finalMarkdown = frontmatterLines.join("\n");
      }

      await fs.writeFile(fullPath, finalMarkdown, "utf8");

      // 3. 回写收录表状态
      await client.bitable.appTableRecord.update({
        path: { app_token: this.appToken, table_id: this.intakeTableId, record_id: recordId },
        data: {
          fields: {
            "收录状态": "已入库",
            "本地笔记路径": relPath,
            "管家摘要": summaryNote,
          },
        },
      });

      // 4. 增量写入全景大盘表
      try {
        const cleanBody = finalMarkdown.trim();
        const boundedBody = isWeChat
          ? (cleanBody.length > 18000
            ? `${cleanBody.slice(0, 18000)}\n\n*(注：文章内容过长，超出多维表格单单元格上限，其余内容请查阅云文档或本地)*`
            : cleanBody)
          : (rawBody || "");

        await client.bitable.appTableRecord.create({
          path: { app_token: this.appToken, table_id: this.catalogTableId },
          data: {
            fields: {
              "笔记名称": title.slice(0, 100),
              "知识领域": categoryInfo.bitableDomain,
              "核心专题": categoryInfo.bitableTopic,
              "核心要点摘要": (rawBody || title).slice(0, 300),
              "完整正文": boundedBody,
              ...(tags.length ? { "标签": tags } : { "标签": ["inbox"] }),
              "本地相对路径": relPath,
              "创建/更新日期": now.getTime(),
            },
          },
        });
      } catch (catalogErr) {
        console.error(`[Feishu Bitable] 增量写入大盘失败 (${recordId}):`, catalogErr.message);
      }

      processed.push({
        recordId,
        title,
        relPath,
      });
    }

    return {
      processed: processed.length,
      items: processed,
    };
  }
}

export {
  FeishuBitableSyncEngine,
  sanitizeFilename,
  extractUrl,
  extractTags,
  isWeChatUrl,
  extractWeChatMetadata,
  determineCategoryInfo,
};
