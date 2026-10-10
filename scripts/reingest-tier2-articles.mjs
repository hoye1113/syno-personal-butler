import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { parseInlineMarkdownElements } from "./sync-vault-to-docx.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const SPACE_ID = "7694918217688534004";
const ROOT_PARENT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";

const TIER_2_ARTICLES = [
  {
    relPath: "01-Areas/AI Tools and Products/OpenSquilla MetaSkill 第三块拼图.md",
    url: "https://mp.weixin.qq.com/s/8e5VWlBoc1tULBjFjrLREA",
    slug: "huashu-opensquilla-metaskill",
    wikiCatKey: "09_coding_tools",
    bitableDomain: "04-开发与工程落地",
    bitableTopic: "AI Tools and Products",
  },
  {
    relPath: "01-Areas/Workflow and Skill Management/先解决痛点再搞系统.md",
    url: "https://mp.weixin.qq.com/s/V48j4ut06_-xT4lIFjcvWg",
    slug: "workflow-painpoint-first",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/80% 的 App 未来会消失吗？我不这么认为.md",
    url: "https://mp.weixin.qq.com/s/SaeCkJF9FSXUWKju5P3XWQ",
    slug: "will-apps-disappear",
    wikiCatKey: "06_organization",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "AI Native Organization Product & Career",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/Agent 越用越翻车，怎么破局？答案藏在经典管理学里.md",
    url: "https://mp.weixin.qq.com/s/N1WgUN8ddXrw0p0o5IiykA",
    slug: "agent-management-breakthrough",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/BqKWvdIfDUemU5vCwLPDlw",
    slug: "kasong-50-percent-rule",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/AI 主导的项目和人主导的区别 - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/ZzYrfK5v_iBRWcQCLfMSEw",
    slug: "kasong-ai-vs-human-led",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/AI 时代如何面试工程师.md",
    url: "https://mp.weixin.qq.com/s/4N1eKJYf_4kozamVqRixnw",
    slug: "how-to-interview-engineers-in-ai-era",
    wikiCatKey: "06_organization",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "AI Native Organization Product & Career",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/AI框架与 Harness 的关系 - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/Guo8r48RuydDolutIsc2vg",
    slug: "kasong-framework-vs-harness",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/Codex 自我改进 Prompt.md",
    url: "https://mp.weixin.qq.com/s/pSnYuU1C5v5ufOm0U-lbHQ",
    slug: "codex-self-improving-prompt",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/Codex 负责人-所有人都是 builder 是个很糟糕的主意 - Founder Park.md",
    url: "https://mp.weixin.qq.com/s/wJrUsBSs0owDascwDZBd-w",
    slug: "codex-founder-park-builder",
    wikiCatKey: "06_organization",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "AI Native Organization Product & Career",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/Fable 5 订阅权限又续了 5 天 - 花叔.md",
    url: "https://mp.weixin.qq.com/s/WbeRHxfXri_j0rJMoqcnyw",
    slug: "huashu-fable-5",
    wikiCatKey: "09_coding_tools",
    bitableDomain: "04-开发与工程落地",
    bitableTopic: "AI Tools and Products",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/Sitor AI - 解决人的信息幻觉 - 三元同学.md",
    url: "https://mp.weixin.qq.com/s/q0i77q32E-w_JNJ7Bp7doA",
    slug: "sitor-ai-information-hallucination",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
    url: "https://mp.weixin.qq.com/s/GkhemHUAhKWV-3Uxaa1Mqg",
    slug: "workbuddy-harness-engineering",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/一个业务 Agent 到底长啥样 - 沐洒.md",
    url: "https://mp.weixin.qq.com/s/uP-HdbmdXAXlyKsE1SMvmg",
    slug: "business-agent-anatomy",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/别再搭 Harness 了，先把你的痛点解决，用最笨的方式.md",
    url: "https://mp.weixin.qq.com/s/V48j4ut06_-xT4lIFjcvWg",
    slug: "stop-building-harness-solve-painpoint",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/如何为项目定制 Harness 环境 - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/pe5urflbuXNN5c7UjWBtCg",
    slug: "kasong-custom-harness",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/所谓的agent开发到底是个啥岗位.md",
    url: "https://mp.weixin.qq.com/s/IOU4XANXu7S6W4EmqkB8ww",
    slug: "kasong-what-is-agent-job",
    wikiCatKey: "06_organization",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "AI Native Organization Product & Career",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/拾语隅-给Hermes装个状态灯.md",
    url: "https://mp.weixin.qq.com/s/fHmKgu504dM1WWwP3iJdOg",
    slug: "hermes-status-light",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/未来的 AI 编程就是 Loop 套 Loop - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/wsuOcx1db7ydin7w1np6mA",
    slug: "kasong-loop-in-loop",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
  {
    relPath: "02-Resources/AI and Agents/Agent Design & Patterns/驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂.md",
    url: "https://mp.weixin.qq.com/s/hsA6ZqJB6HlWIZ-rMnVZyA",
    slug: "kasong-controlled-experiment",
    wikiCatKey: "04_design_patterns",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "Agent Design & Patterns",
  },
];

async function withRetry(fn, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const waitTime = delay * attempt;
      console.warn(`[重试 ${attempt}/${retries}] 请求异常: ${err?.message || err}，等待 ${waitTime}ms...`);
      await sleep(waitTime);
    }
  }
}

async function downloadImage(url, destPath) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  try {
    const stat = await fs.stat(destPath);
    if (stat.size > 0) return await fs.readFile(destPath);
  } catch {}

  const res = await fetch(url, {
    headers: {
      "Referer": "https://mp.weixin.qq.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`下载图片失败 (status ${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return buf;
}

async function writeDocxFromBlocks({ client, docId, blocks, attachmentsAbsDir }) {
  const childrenRes = await client.docx.v1.documentBlockChildren.get({
    path: { document_id: docId, block_id: docId },
  }).catch(() => ({ data: { items: [] } }));
  const currentCount = childrenRes?.data?.items?.length || 0;
  if (currentCount > 0) {
    console.log(`- 正在清空旧版区块 (${currentCount} 个)，注入原生图文与 3 行空行...`);
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

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "image") {
      await flushTextBlocks();

      const localImagePath = path.join(attachmentsAbsDir, b.filename);
      let imgBuf;
      try {
        imgBuf = await fs.readFile(localImagePath);
      } catch (err) {
        const altExt = b.filename.endsWith(".png")
          ? b.filename.replace(/\.png$/, ".jpg")
          : b.filename.replace(/\.jpg$/, ".png");
        try {
          imgBuf = await fs.readFile(path.join(attachmentsAbsDir, altExt));
        } catch {
          if (b.url) {
            try {
              console.log(`  ⬇️ 本地未找到，正在从源下载: ${b.filename}...`);
              const dlRes = await fetch(b.url, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
              });
              const arrBuf = await dlRes.arrayBuffer();
              imgBuf = Buffer.from(arrBuf);
              await fs.writeFile(localImagePath, imgBuf);
            } catch (dlErr) {
              console.warn(`[图片下载失败] ${b.filename}: ${dlErr.message}`);
              continue;
            }
          } else {
            console.warn(`[图片跳过] 未找到图片: ${localImagePath}`);
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
        if (!imageBlockId) throw new Error(`创建图片块失败: ${b.filename}`);

        const uploadRes = await withRetry(() =>
          client.drive.v1.media.uploadAll({
            data: {
              file_name: b.filename,
              parent_type: "docx_image",
              parent_node: imageBlockId,
              size: imgBuf.length,
              file: imgBuf,
            },
          })
        );
        const fileToken = uploadRes?.file_token || uploadRes?.data?.file_token;
        if (!fileToken) throw new Error(`上传图片失败: ${b.filename}`);

        await withRetry(() =>
          client.docx.v1.documentBlock.patch({
            path: { document_id: docId, block_id: imageBlockId },
            data: { replace_image: { token: fileToken } },
          })
        );
        console.log(`  🖼️ 成功嵌入原生图片块: ${b.filename} (token: ${fileToken.slice(0, 10)}...)`);
      } catch (err) {
        console.error(`[嵌入图片异常] ${b.filename}: ${err?.message || err}`);
      }
    } else {
      pendingTextBlocks.push(b.docxBlock);
    }
  }

  await flushTextBlocks();
}

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  console.log(`=== 正在获取 Wiki 空间目录映射 ===`);
  const rootChildrenRes = await client.wiki.v2.spaceNode.list({
    path: { space_id: SPACE_ID },
    params: { parent_node_token: ROOT_PARENT_TOKEN, page_size: 50 },
  });
  const rootNodes = rootChildrenRes.data?.items || [];
  const categoryMap = new Map();

  for (const n of rootNodes) {
    if (n.title.startsWith("04 - Agent 设计模式")) categoryMap.set("04_design_patterns", n.node_token);
    if (n.title.startsWith("05 - Harness 工程")) categoryMap.set("05_harness", n.node_token);
    if (n.title.startsWith("06 - AI 原生组织")) categoryMap.set("06_organization", n.node_token);
    if (n.title.startsWith("08 - AI 评估基准")) categoryMap.set("08_eval", n.node_token);
    if (n.title.startsWith("09 - AI 编程范式")) categoryMap.set("09_coding_tools", n.node_token);
    if (n.title.includes("哲学与元认知")) categoryMap.set("10_philosophy", n.node_token);
  }

  console.log(`分类节点映射就绪:`, Array.from(categoryMap.keys()));

  for (let i = 0; i < TIER_2_ARTICLES.length; i++) {
    const art = TIER_2_ARTICLES[i];
    console.log(`\n======================================================`);
    console.log(`[${i + 1}/${TIER_2_ARTICLES.length}] 正在执行第二梯队原地补图与排版: ${path.basename(art.relPath, ".md")}`);
    console.log(`======================================================`);

    const fullLocalPath = path.resolve(PATHS.vaultRoot, art.relPath);
    let originalMarkdown = await fs.readFile(fullLocalPath, "utf8");

    // 1. 抓取远程图片
    console.log(`1. 正在检索微信原文中的配图...`);
    const res = await fetch(art.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
    });
    const html = await res.text();
    const remoteImgs = (html.match(/data-src=["']([^"']+)["']/g) || [])
      .map(m => m.match(/data-src=["']([^"']+)["']/)[1].trim())
      .filter(src => src && !src.includes("data:image") && !src.includes("avatar") && !src.includes("qrcode") && !src.includes("res.wx.qq.com"));

    console.log(`2. 发现原文包含 ${remoteImgs.length} 张核心原图`);

    // 2. 下载图片并构建附件目录
    const attachmentsAbsDir = path.resolve(PATHS.vaultRoot, `99-System/Attachments/WeChat Articles/${art.slug}`);
    await fs.mkdir(attachmentsAbsDir, { recursive: true });

    const downloadedImages = [];
    for (let j = 0; j < remoteImgs.length; j++) {
      const src = remoteImgs[j];
      const ext = src.includes("wx_fmt=png") ? "png" : src.includes("wx_fmt=jpeg") || src.includes("wx_fmt=jpg") ? "jpg" : "png";
      const filename = `fig-${String(j + 1).padStart(2, "0")}.${ext}`;
      const destPath = path.join(attachmentsAbsDir, filename);
      await downloadImage(src, destPath);
      downloadedImages.push({ filename, alt: `配图 ${j + 1}` });
    }
    if (downloadedImages.length > 0) {
      console.log(`✅ 已下载 ${downloadedImages.length} 张原图至本地附件仓`);
    }

    // 3. 规范化本地 Markdown，确保 3 行呼吸留白
    const relToAttachments = path.relative(path.dirname(fullLocalPath), attachmentsAbsDir).replace(/\\/g, "/");

    // 检查是否已有开头引用框，并确保引用框与正文之间有 3 行空行
    let updatedMd = originalMarkdown;
    // 如果没有留白空行，在元数据/引用块后注入
    if (updatedMd.includes("> 作者：") && !updatedMd.includes("\n\n\n\n")) {
      updatedMd = updatedMd.replace(/(> 作者：[^\n]+\n+)(---)?(\n+)/, "$1$2\n\n\n\n");
    }

    // 如果有新下载的图片且本地未引用，在文末作为「高清原文图解」补充挂载
    if (downloadedImages.length > 0 && !updatedMd.includes(art.slug)) {
      let imgSection = `\n\n---\n\n## 🖼️ 原文高清架构与图解附录\n\n`;
      for (const img of downloadedImages) {
        imgSection += `![${img.alt}](${relToAttachments}/${img.filename})\n\n`;
      }
      updatedMd += imgSection;
    }

    await fs.writeFile(fullLocalPath, updatedMd, "utf8");
    console.log(`✅ 本地 Markdown 已更新（保留原有 wikilinks 与双向图谱）: vault/${art.relPath}`);

    // 4. 解析为飞书 Docx blocks（含文字、空行、原生图片块）
    console.log(`3. 正在同步飞书 Wiki 云文档（原生图片块与 3 行留白）...`);
    const docxItems = [];

    // 分割行并构建 Docx blocks
    const lines = updatedMd.split(/\r?\n/);
    let inFrontmatter = false;
    let frontmatterDone = false;
    let inCodeBlock = false;
    let codeBuffer = [];
    let consecutiveEmpty = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const rawLine = lines[lineIdx];
      const line = rawLine.trimEnd();

      if (!frontmatterDone && line === "---") {
        if (!inFrontmatter) { inFrontmatter = true; continue; }
        else { inFrontmatter = false; frontmatterDone = true; continue; }
      }
      if (inFrontmatter) continue;

      // Code blocks
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          docxItems.push({
            type: "code",
            docxBlock: {
              block_type: 14,
              code: {
                style: { language: 1 },
                elements: [{ text_run: { content: codeBuffer.join("\n") } }],
              },
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
        consecutiveEmpty++;
        if (consecutiveEmpty <= 3 && docxItems.length > 0) {
          docxItems.push({
            type: "text",
            docxBlock: { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
          });
        }
        continue;
      }
      consecutiveEmpty = 0;

      // Dividers
      if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
        docxItems.push({
          type: "divider",
          docxBlock: { block_type: 22, divider: {} },
        });
        continue;
      }

      // 检查图片行
      const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const filename = path.basename(imgMatch[2]);
        docxItems.push({
          type: "image",
          filename,
          alt: imgMatch[1],
        });
        continue;
      }

      // Bullet lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        docxItems.push({
          type: "bullet",
          docxBlock: {
            block_type: 12,
            bullet: { elements: parseInlineMarkdownElements(line.slice(2).trim()) },
          },
        });
        continue;
      }

      // Ordered lists
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s+/, "");
        docxItems.push({
          type: "ordered",
          docxBlock: {
            block_type: 13,
            ordered: { elements: parseInlineMarkdownElements(content) },
          },
        });
        continue;
      }

      // Headings
      if (line.startsWith("# ")) {
        docxItems.push({
          type: "heading",
          docxBlock: { block_type: 3, heading1: { elements: parseInlineMarkdownElements(line.slice(2).trim()) } },
        });
      } else if (line.startsWith("## ")) {
        docxItems.push({
          type: "heading",
          docxBlock: { block_type: 4, heading2: { elements: parseInlineMarkdownElements(line.slice(3).trim()) } },
        });
      } else if (line.startsWith("### ")) {
        docxItems.push({
          type: "heading",
          docxBlock: { block_type: 5, heading3: { elements: parseInlineMarkdownElements(line.slice(4).trim()) } },
        });
      } else if (line.startsWith("> ")) {
        docxItems.push({
          type: "quote",
          docxBlock: { block_type: 15, quote: { elements: parseInlineMarkdownElements(line.slice(2).trim()) } },
        });
      } else {
        docxItems.push({
          type: "text",
          docxBlock: { block_type: 2, text: { elements: parseInlineMarkdownElements(line) } },
        });
      }
    }

    if (inCodeBlock && codeBuffer.length > 0) {
      docxItems.push({
        type: "code",
        docxBlock: {
          block_type: 14,
          code: {
            style: { language: 1 },
            elements: [{ text_run: { content: codeBuffer.join("\n") } }],
          },
        },
      });
    }

    // 5. 挂载到飞书 Wiki
    const parentToken = categoryMap.get(art.wikiCatKey);
    if (!parentToken) throw new Error(`未找到分类父节点: ${art.wikiCatKey}`);

    const titleMatch = updatedMd.match(/^#\s+(.+)$/m) || updatedMd.match(/title:\s*["']?([^"'\n]+)["']?/);
    const docTitle = (titleMatch ? titleMatch[1].trim() : path.basename(art.relPath, ".md")).replace(/[\"\*]/g, "");

    const existingListRes = await client.wiki.v2.spaceNode.list({
      path: { space_id: SPACE_ID },
      params: { parent_node_token: parentToken, page_size: 50 },
    }).catch(() => ({ data: { items: [] } }));
    const matchNode = (existingListRes.data?.items || []).find((n) => n.title === docTitle.slice(0, 100));

    let wikiUrl = "";
    let docxToken = "";

    if (matchNode && matchNode.url) {
      wikiUrl = matchNode.url;
      docxToken = matchNode.obj_token;
      console.log(`ℹ️ Wiki 节点已存在: ${wikiUrl}`);
    } else {
      const wikiNodeRes = await client.wiki.v2.spaceNode.create({
        path: { space_id: SPACE_ID },
        data: {
          parent_node_token: parentToken,
          node_type: "origin",
          obj_type: "docx",
          title: docTitle.slice(0, 100),
        },
      });
      const node = wikiNodeRes?.data?.node;
      docxToken = node?.obj_token;
      wikiUrl = node?.url;
      console.log(`✅ 新建 Wiki 节点成功: ${wikiUrl}`);
    }

    if (cred.ownerOpenId && docxToken) {
      try {
        await client.drive.v1.permissionMember.create({
          path: { token: docxToken },
          params: { type: "docx" },
          data: { member_type: "openid", member_id: cred.ownerOpenId, perm: "full_access" },
        });
      } catch {}
    }

    if (docxToken) {
      await writeDocxFromBlocks({
        client,
        docId: docxToken,
        blocks: docxItems,
        attachmentsAbsDir,
      });
      console.log(`✅ 飞书云文档已更新（含 3 行空行与原生图片块）！`);
    }

    // 6. 更新多维表格 Table 2
    console.log(`4. 正在核验多维表格大盘 (Table 2)...`);
    const relVaultPath = `vault/${art.relPath}`.replace(/\\/g, "/");

    const searchRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { filter: `CurrentValue.[本地相对路径] = "${relVaultPath}"`, page_size: 10 },
    }).catch(() => ({ data: { items: [] } }));

    const existingRec = searchRes.data?.items?.[0];
    const descMatch = updatedMd.match(/description:\s*["']?([^"'\n]+)["']?/);
    const summary = descMatch ? descMatch[1] : "";

    const cleanBody = updatedMd.trim();
    const boundedBody = cleanBody.length > 18000
      ? `${cleanBody.slice(0, 18000)}\n\n*(注：文章内容过长，超出多维表格单单元格上限，其余内容请查阅云文档或本地)*`
      : cleanBody;

    const recordFields = {
      "笔记名称": docTitle,
      "知识领域": art.bitableDomain,
      "核心专题": art.bitableTopic,
      "核心要点摘要": summary.slice(0, 500),
      "完整正文": boundedBody,
      "本地相对路径": relVaultPath,
    };

    if (existingRec) {
      await client.bitable.appTableRecord.update({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID, record_id: existingRec.record_id },
        data: { fields: recordFields },
      });
      console.log(`✅ 已更新多维表格大盘记录: ${existingRec.record_id}`);
    } else {
      const createRes = await client.bitable.appTableRecord.create({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
        data: { fields: recordFields },
      });
      console.log(`✅ 已新增多维表格大盘记录: ${createRes?.data?.record?.record_id || createRes?.data?.record_id}`);
    }

    console.log(`🎉 [${i + 1}/${TIER_2_ARTICLES.length}] 《${docTitle}》处理完成！\n`);
    await sleep(1000);
  }

  console.log(`\n======================================================`);
  console.log(`🏆 第二梯队全部 20 篇笔记已全量完成原地补图、3 行留白与三端对齐！`);
  console.log(`======================================================`);
}

main().catch(console.error);
