import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { markdownToDocxBlocks } from "./sync-vault-to-docx.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const SPACE_ID = "7694918217688534004";
const ROOT_PARENT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";

const ARTICLES = [
  {
    opusId: "1254559088233152517",
    title: "GEPA项目负责人-文本反思优化胜过强化学习",
    author: "Lakshya A. Agrawal（GEPA 项目负责人）",
    targetPath: "02-Resources/AI and Agents/Harness Context & Reliability/GEPA项目负责人-文本反思优化胜过强化学习.md",
    wikiCatKey: "05_harness",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "Harness Context & Reliability",
    tags: ["ai_agent", "bilibili", "article", "harness", "optimization"],
  },
  {
    opusId: "1251590406821380116",
    title: "OpenAI研究员Noam Brown-多智能体协作能否递归自我改进",
    author: "Noam Brown（OpenAI 研究员）",
    targetPath: "02-Resources/AI and Agents/Frontier Models & Physical AI/OpenAI研究员Noam Brown-多智能体协作能否递归自我改进.md",
    wikiCatKey: "07_frontier",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "Frontier Models & Physical AI",
    tags: ["ai_agent", "bilibili", "article", "frontier_models", "multi_agent"],
  },
  {
    opusId: "1250848236447465493",
    title: "Restate CEO-每一步每次调用都可靠的Agent系统",
    author: "Giselle van Dongen（Restate CEO）",
    targetPath: "02-Resources/AI and Agents/Harness Context & Reliability/Restate CEO-每一步每次调用都可靠的Agent系统.md",
    wikiCatKey: "05_harness",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "Harness Context & Reliability",
    tags: ["ai_agent", "bilibili", "article", "harness", "system_architecture"],
  },
  {
    opusId: "1251219338836312088",
    title: "Brex CEO-别再构建Agent改做AI Employee",
    author: "Pedro Franceschi（Brex CEO）",
    targetPath: "02-Resources/AI and Agents/AI Native Organization Product & Career/Brex CEO-别再构建Agent改做AI Employee.md",
    wikiCatKey: "06_organization",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "AI Native Organization Product & Career",
    tags: ["ai_agent", "bilibili", "article", "ai_native_org", "product_design"],
  },
  {
    opusId: "1251961500602466327",
    title: "Tobi Lütke-AI让哪些技能更值钱",
    author: "Tobi Lütke（Shopify CEO）",
    targetPath: "02-Resources/哲学与自我认知/Tobi Lütke-AI让哪些技能更值钱.md",
    wikiCatKey: "10_philosophy",
    bitableDomain: "06-其他与思考",
    bitableTopic: "哲学与自我认知",
    tags: ["philosophy", "bilibili", "article", "career_growth"],
  },
  {
    opusId: "1254450859343872021",
    title: "Box CEO-AI下一次突破或将来自大实验室之外",
    author: "Aaron Levie（Box 联合创始人兼 CEO）",
    targetPath: "02-Resources/AI and Agents/AI Native Organization Product & Career/Box CEO-AI下一次突破或将来自大实验室之外.md",
    wikiCatKey: "06_organization",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "AI Native Organization Product & Career",
    tags: ["ai_agent", "bilibili", "article", "ai_native_org", "frontier_trend"],
  },
  {
    opusId: "1251482173611966514",
    title: "Liquid AI CEO-线虫302个神经元启发AI架构",
    author: "Ramin Hasani（Liquid AI 联合创始人兼 CEO）",
    targetPath: "02-Resources/AI and Agents/Frontier Models & Physical AI/Liquid AI CEO-线虫302个神经元启发AI架构.md",
    wikiCatKey: "07_frontier",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "Frontier Models & Physical AI",
    tags: ["ai_agent", "bilibili", "article", "frontier_models", "biological_ai"],
  },
];

function opusToMarkdown(data) {
  const contentMod = data.item.modules?.find((m) => m.module_content);
  if (!contentMod) return { body: "", summary: "" };
  const paras = contentMod.module_content.paragraphs || [];
  const lines = [];
  let summary = "";

  for (const p of paras) {
    if (p.text && p.text.nodes) {
      const line = p.text.nodes.map((n) => n.word?.words || "").join("");
      const first = p.text.nodes[0]?.word;
      if (first?.font_size >= 20) {
        lines.push(`\n## ${line.trim()}\n`);
      } else if (p.text.nodes.length === 1 && first?.style?.bold) {
        lines.push(`\n### ${line.trim()}\n`);
      } else {
        if (!summary && line.includes("导读：")) {
          summary = line.replace(/^导读：\s*/, "").slice(0, 150);
        }
        lines.push(line);
      }
    } else if (p.list && p.list.items) {
      for (const item of p.list.items) {
        const itemText = (item.nodes || []).map((n) => n.word?.words || "").join("");
        lines.push(`- ${itemText.trim()}`);
      }
    }
  }

  const body = lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return { body, summary };
}

async function fetchOpus(opusId) {
  const url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/detail?id=${opusId}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const data = await res.json();
  if (data.code !== 0 || !data.data?.item) {
    throw new Error(`获取 B站 Opus 失败 (id: ${opusId}): ${data.message || data.code}`);
  }
  return opusToMarkdown(data.data);
}

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  // 1. 获取 Wiki 根节点下的分类节点映射
  console.log(`=== 获取 Wiki 空间目录映射 ===`);
  const rootChildrenRes = await client.wiki.v2.spaceNode.list({
    path: { space_id: SPACE_ID },
    params: { parent_node_token: ROOT_PARENT_TOKEN, page_size: 50 },
  });
  const rootNodes = rootChildrenRes.data?.items || [];
  const categoryMap = new Map();

  for (const n of rootNodes) {
    if (n.title.startsWith("05 - Harness")) categoryMap.set("05_harness", n.node_token);
    if (n.title.startsWith("06 - AI 原生组织")) categoryMap.set("06_organization", n.node_token);
    if (n.title.startsWith("07 - 前沿科学")) categoryMap.set("07_frontier", n.node_token);
    if (n.title.includes("哲学与元认知")) categoryMap.set("10_philosophy", n.node_token);
  }

  console.log(`已就绪的分类节点:`, Array.from(categoryMap.keys()));

  // 2. 依次收录、写盘、推 Wiki、推多维表格
  let count = 0;
  for (let i = 0; i < ARTICLES.length; i++) {
    const art = ARTICLES[i];
    console.log(`\n[${i + 1}/${ARTICLES.length}] 正在处理: ${art.title} (opus: ${art.opusId})...`);

    // A. 抓取正文
    const { body, summary } = await fetchOpus(art.opusId);
    const desc = summary || art.title;

    // B. 生成本地 Markdown
    const frontmatter = `---
title: "${art.title}"
tags: ${JSON.stringify(art.tags)}
created: "${new Date().toISOString().slice(0, 10)}"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "${desc.replace(/"/g, '\\"')}"
author: "${art.author}"
source_url: "https://www.bilibili.com/opus/${art.opusId}"
opus_id: "${art.opusId}"
---

# ${art.title}

> 作者：${art.author}  
> 来源：[B站图文专栏 - Easonlee的AI笔记](https://www.bilibili.com/opus/${art.opusId})

${body}
`;

    const fullLocalPath = path.resolve(PATHS.vaultRoot, art.targetPath);
    await fs.mkdir(path.dirname(fullLocalPath), { recursive: true });
    await fs.writeFile(fullLocalPath, frontmatter, "utf8");
    console.log(`✅ 已写入本地知识库: vault/${art.targetPath}`);

    // C. 检查或挂载到飞书 Wiki 目录树
    const parentToken = categoryMap.get(art.wikiCatKey);
    if (!parentToken) {
      console.warn(`未找到分类父节点 token: ${art.wikiCatKey}`);
      continue;
    }

    // 检查是否已在该分类下创建
    let wikiUrl = "";
    const existingListRes = await client.wiki.v2.spaceNode.list({
      path: { space_id: SPACE_ID },
      params: { parent_node_token: parentToken, page_size: 50 },
    }).catch(() => ({ data: { items: [] } }));
    const matchNode = (existingListRes.data?.items || []).find((n) => n.title === art.title.slice(0, 100));

    if (matchNode && matchNode.url) {
      wikiUrl = matchNode.url;
      console.log(`ℹ️ Wiki 节点已存在，直接复用: ${wikiUrl}`);
    } else {
      const wikiNodeRes = await client.wiki.v2.spaceNode.create({
        path: { space_id: SPACE_ID },
        data: {
          parent_node_token: parentToken,
          node_type: "origin",
          obj_type: "docx",
          title: art.title.slice(0, 100),
        },
      });
      const node = wikiNodeRes?.data?.node;
      const docxToken = node?.obj_token;
      wikiUrl = node?.url;

      if (!docxToken || !wikiUrl) {
        console.error(`创建 Wiki 节点失败: ${JSON.stringify(wikiNodeRes?.data)}`);
        continue;
      }

      const blocks = markdownToDocxBlocks(body);
      const CHUNK_SIZE = 50;
      for (let b = 0; b < blocks.length; b += CHUNK_SIZE) {
        const chunk = blocks.slice(b, b + CHUNK_SIZE);
        await client.docx.v1.documentBlockChildren.create({
          path: { document_id: docxToken, block_id: docxToken },
          data: { children: chunk },
        });
      }
      console.log(`✅ 已挂载至 Wiki 目录树: ${wikiUrl}`);
    }

    // D. 写入飞书多维表格大盘 (Table 2) 包含 Wiki 链接
    const relVaultPath = `vault/${art.targetPath}`.replace(/\\/g, "/");
    const bitableRes = await client.bitable.appTableRecord.create({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      data: {
        fields: {
          "笔记名称": art.title,
          "知识领域": art.bitableDomain,
          "核心专题": art.bitableTopic,
          "本地相对路径": relVaultPath,
          "核心要点摘要": desc.slice(0, 500),
          "标签": art.tags,
          "完整正文": body.slice(0, 18000),
          "云文档链接": { text: "📖 知识库 Wiki", link: wikiUrl },
        },
      },
    });

    if (bitableRes.code === 0) {
      console.log(`✅ 已完整写入多维表格大盘并关联 Wiki 链接！record_id = ${bitableRes.data?.record?.record_id}`);
      count++;
    } else {
      console.error(`❌ 写入多维表格大盘失败:`, bitableRes);
    }

    await sleep(400);
  }

  console.log(`\n🎉 全部 7 篇精选长文收录与多端同步完毕！共挂载 ${count} 篇。`);
  console.log(`👉 飞书知识库主页直达: https://my.feishu.cn/wiki/${ROOT_PARENT_TOKEN}`);
}

main().catch((err) => {
  console.error("执行收录异常:", err);
  process.exit(1);
});
