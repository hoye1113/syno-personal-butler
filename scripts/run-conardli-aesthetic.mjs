import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { parseInlineMarkdownElements } from "./sync-vault-to-docx.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const SPACE_ID = "7694918217688534004";
const ROOT_PARENT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";

export { parseWeChatHtmlAesthetic } from "../packages/syno-core/wechat-aesthetic-parser.mjs";

async function withRetry(fn, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(delay * attempt);
    }
  }
}

async function writeDocxWithAestheticItems({ client, docId, items, attachmentsAbsDir }) {
  // Clear existing blocks
  const childrenRes = await client.docx.v1.documentBlockChildren.get({
    path: { document_id: docId, block_id: docId },
  }).catch(() => ({ data: { items: [] } }));
  const currentCount = childrenRes?.data?.items?.length || 0;
  if (currentCount > 0) {
    console.log(`- 正在清空旧版区块 (${currentCount} 个)，注入全新美感排版...`);
    await client.docx.v1.documentBlockChildren.batchDelete({
      path: { document_id: docId, block_id: docId },
      data: { start_index: 0, end_index: currentCount },
    }).catch(() => {});
  }

  let pendingTextBlocks = [];

  const flushTextBlocks = async () => {
    if (pendingTextBlocks.length === 0) return;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < pendingTextBlocks.length; i += CHUNK_SIZE) {
      const chunk = pendingTextBlocks.slice(i, i + CHUNK_SIZE);
      await withRetry(() =>
        client.docx.v1.documentBlockChildren.create({
          path: { document_id: docId, block_id: docId },
          data: { children: chunk },
        })
      );
    }
    pendingTextBlocks = [];
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === "heading") {
      const blockType = item.level === 1 ? 3 : item.level === 2 ? 4 : 5;
      const key = item.level === 1 ? "heading1" : item.level === 2 ? "heading2" : "heading3";
      pendingTextBlocks.push({
        block_type: blockType,
        [key]: { elements: parseInlineMarkdownElements(item.content) },
      });
    } else if (item.type === "quote") {
      pendingTextBlocks.push({
        block_type: 15,
        quote: { elements: parseInlineMarkdownElements(item.content) },
      });
    } else if (item.type === "bullet") {
      pendingTextBlocks.push({
        block_type: 12,
        bullet: { elements: parseInlineMarkdownElements(item.content) },
      });
    } else if (item.type === "ordered") {
      pendingTextBlocks.push({
        block_type: 13,
        ordered: { elements: parseInlineMarkdownElements(item.content) },
      });
    } else if (item.type === "divider") {
      pendingTextBlocks.push({
        block_type: 22,
        divider: {},
      });
    } else if (item.type === "code") {
      pendingTextBlocks.push({
        block_type: 14,
        code: {
          style: { language: 1 }, // plain text
          elements: [{ text_run: { content: item.content } }],
        },
      });
    } else if (item.type === "text" || item.type === "empty_line") {
      pendingTextBlocks.push({
        block_type: 2,
        text: { elements: parseInlineMarkdownElements(item.content || "") },
      });
    } else if (item.type === "image") {
      await flushTextBlocks();

      const localImagePath = path.join(attachmentsAbsDir, item.filename);
      let imgBuf;
      try {
        imgBuf = await fs.readFile(localImagePath);
      } catch (err) {
        const altExt = item.filename.endsWith(".png")
          ? item.filename.replace(/\.png$/, ".jpg")
          : item.filename.replace(/\.jpg$/, ".png");
        try {
          imgBuf = await fs.readFile(path.join(attachmentsAbsDir, altExt));
        } catch {
          if (item.url) {
            try {
              console.log(`  ⬇️ 本地未找到，正在从微信源下载: ${item.filename}...`);
              const dlRes = await fetch(item.url, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
              });
              const arrBuf = await dlRes.arrayBuffer();
              imgBuf = Buffer.from(arrBuf);
              await fs.writeFile(localImagePath, imgBuf);
            } catch (dlErr) {
              console.warn(`[图片下载失败] ${item.filename}: ${dlErr.message}`);
              continue;
            }
          } else {
            console.warn(`[图片跳过] 本地未找到且无URL: ${localImagePath}`);
            continue;
          }
        }
      }

      try {
        const imgBlockRes = await withRetry(() =>
          client.docx.v1.documentBlockChildren.create({
            path: { document_id: docId, block_id: docId },
            data: { children: [{ block_type: 27, image: {} }] },
          })
        );
        const imageBlockId = imgBlockRes?.data?.children?.[0]?.block_id;
        if (!imageBlockId) throw new Error(`创建图片块未返回 block_id: ${item.filename}`);

        const uploadRes = await withRetry(() =>
          client.drive.v1.media.uploadAll({
            data: {
              file_name: item.filename,
              parent_type: "docx_image",
              parent_node: imageBlockId,
              size: imgBuf.length,
              file: imgBuf,
            },
          })
        );
        const fileToken = uploadRes?.file_token || uploadRes?.data?.file_token;
        if (!fileToken) throw new Error(`上传图片未返回 token: ${item.filename}`);

        await withRetry(() =>
          client.docx.v1.documentBlock.patch({
            path: { document_id: docId, block_id: imageBlockId },
            data: { replace_image: { token: fileToken } },
          })
        );
        console.log(`  🖼️ 成功嵌入原生图片块: ${item.filename}`);
      } catch (err) {
        console.error(`[嵌入图片异常] ${item.filename}: ${err.message}`);
      }
    }
  }

  await flushTextBlocks();
}

async function runConardLiAesthetic() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  const url = "https://mp.weixin.qq.com/s/t0-HbOj-Z2_RcZZJRPpM9A";
  const imagePrefix = "conardli";
  const attachmentsDir = "99-System/Attachments/WeChat Articles/conardli-beautiful-article";
  const targetRelPath = "02-Resources/AI and Agents/Agent Design & Patterns/Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi.md";
  const docxToken = "OrSzdgYcgo4bCAxhJJccRQwQnqb";

  console.log(`1. 抓取文章 HTML...`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
  });
  const html = await res.text();
  const startIdx = html.indexOf('id="js_content"');
  const openTagEnd = html.indexOf(">", startIdx) + 1;
  const scriptIdx = html.indexOf("<script", openTagEnd);
  const rawBodyHtml = scriptIdx !== -1 ? html.slice(openTagEnd, scriptIdx) : html.slice(openTagEnd);

  console.log(`2. 使用 V4 美感排版引擎进行语义深度解构...`);
  const highlights = [
    /好的 Harness 是可以迁移的/g,
    /模型负责生成，Harness 负责约束/g,
    /组件化协议/g,
    /闭环质检/g,
    /7条核心原则/g,
    /Reacticle/g,
  ];
  const items = parseWeChatHtmlAesthetic(rawBodyHtml, imagePrefix, highlights);
  console.log(`✅ 解析完成: 共 ${items.length} 个结构元素（包含代码块、列表、分级标题与配图）`);

  const attachmentsAbsDir = path.resolve(PATHS.vaultRoot, attachmentsDir);

  // 3. 构造本地 Markdown
  console.log(`3. 正在生成带美感排版的本地 Markdown...`);
  const mdLines = [];
  mdLines.push(`---`);
  mdLines.push(`title: "Harness 实践：将任何文字编辑成精美的文章"`);
  mdLines.push(`author: "ConardLi"`);
  mdLines.push(`source: "${url}"`);
  mdLines.push(`source_type: "wechat_article"`);
  mdLines.push(`created: "2026-06-18"`);
  mdLines.push(`tags: ["ai_agent","article","harness_engineering","skills","reacticle","conardli"]`);
  mdLines.push(`category: "05_harness"`);
  mdLines.push(`domain: "02-核心技术与架构"`);
  mdLines.push(`topic: "Harness Context & Reliability"`);
  mdLines.push(`description: "ConardLi 深度拆解将任意非结构化文本通过 Harness 工程编辑成高印刷质量精美文章的全套方案。阐述 7 条核心 Harness 设计原则，验证好的 Harness 具备跨模型迁移能力；提出 Reacticle 组件化渲染协议与闭环自我质检机制。"`);
  mdLines.push(`---\n`);

  mdLines.push(`# Harness 实践：将任何文字编辑成精美的文章\n`);
  mdLines.push(`> **作者**：ConardLi  `);
  mdLines.push(`> **发布日期**：2026-06-18  `);
  mdLines.push(`> **原文来源**：[微信公众平台](${url})\n`);
  mdLines.push(`> 💡 **核心精粹与认知反思**：  `);
  mdLines.push(`> **Harness 的核心秘密：好的 Harness 是可以迁移的。模型负责生成，Harness 负责约束、规范与渲染反馈回路。**`);
  mdLines.push(`> 1. **从 Prompt 到 Harness**：Prompt 是单次指导，Harness 是带状态机、带工具链、带输出验证规约的完整运行缰绳；`);
  mdLines.push(`> 2. **协议先行**：引入组件化协议（如 Reacticle），将非结构化长文拆解为富交互组件流；`);
  mdLines.push(`> 3. **闭环质检**：依靠自我审查（Self-Review）与确定性 Schema 拦截幻觉，让长文编辑达到生产级印刷水准。`);
  mdLines.push(`\n\n\n\n`);

  const fullLocalPath = path.resolve(PATHS.vaultRoot, targetRelPath);
  const relToAttachments = path.relative(path.dirname(fullLocalPath), attachmentsAbsDir).replace(/\\/g, "/");

  for (const it of items) {
    if (it.type === "heading") {
      const prefix = "#".repeat(it.level || 2);
      mdLines.push(`\n${prefix} ${it.content}\n`);
    } else if (it.type === "divider") {
      mdLines.push(`\n---\n`);
    } else if (it.type === "quote") {
      mdLines.push(`\n> ${it.content}\n`);
    } else if (it.type === "bullet") {
      mdLines.push(`- ${it.content}`);
    } else if (it.type === "ordered") {
      mdLines.push(`1. ${it.content}`);
    } else if (it.type === "code") {
      mdLines.push(`\n\`\`\`text\n${it.content}\n\`\`\`\n`);
    } else if (it.type === "text") {
      mdLines.push(`${it.content}\n`);
    } else if (it.type === "image") {
      const imgRel = `${relToAttachments}/${it.filename}`;
      mdLines.push(`\n![${it.alt}](${imgRel})\n`);
    }
  }

  await fs.writeFile(fullLocalPath, mdLines.join("\n"), "utf8");
  console.log(`✅ 本地 Markdown 笔记已更新！`);

  // 4. 同步飞书 Docx
  console.log(`4. 正在同步飞书 Docx 原生美感排版...`);
  const leadQuote = `**Harness 的核心秘密：好的 Harness 是可以迁移的。模型负责生成，Harness 负责约束、规范与渲染反馈回路。**
1. **从 Prompt 到 Harness**：Prompt 是单次指导，Harness 是带状态机、带工具链、带输出验证规约的完整运行缰绳；
2. **协议先行**：引入组件化协议（如 Reacticle），将非结构化长文拆解为富交互组件流；
3. **闭环质检**：依靠自我审查（Self-Review）与确定性 Schema 拦截幻觉，让长文编辑达到生产级印刷水准。`;

  const docxItems = [
    { type: "quote", content: `💡 核心精粹与认知反思：\n${leadQuote}` },
    { type: "empty_line", content: "" },
    { type: "empty_line", content: "" },
    { type: "empty_line", content: "" },
    ...items,
  ];

  await writeDocxWithAestheticItems({
    client,
    docId: docxToken,
    items: docxItems,
    attachmentsAbsDir,
  });

  console.log(`🎉 《Harness 实践：将任何文字编辑成精美的文章》美感排版已全量上云！`);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith("run-conardli-aesthetic.mjs") ||
  path.resolve(process.argv[1]).includes("run-conardli-aesthetic")
);
if (isMain) {
  runConardLiAesthetic().catch(console.error);
}
