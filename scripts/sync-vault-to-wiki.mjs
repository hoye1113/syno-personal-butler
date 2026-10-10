import path from "node:path";
import process from "node:process";
import { promises as fs } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { markdownToDocxBlocks } from "./sync-vault-to-docx.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const SPACE_ID = "7694918217688534004";
const ROOT_PARENT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";
const HOME_DOC_ID = "ZhoIdM4UkoSlNwxDcZecFPW1nOe";

const CATEGORIES = [
  { key: "01_theory", name: "01 - AI Agent 支柱理论", desc: "认知校准、Agent Loop、工具系统、上下文工程、Multi-Agent、Harness 架构等底层理论" },
  { key: "02_super_agent", name: "02 - Super Agent 实战体系", desc: "工具注册执行与容错、Prompt 管道、Token 预算与压缩、持久记忆与 RAG、技能编排" },
  { key: "03_architecture", name: "03 - 顶级架构与工程长文", desc: "Anthropic、Cognition、Loop Engineering、OpenSquilla 等顶级团队架构深度解析" },
  { key: "04_design_patterns", name: "04 - Agent 设计模式与生产实践", desc: "生产级智能体设计模式、管理学隐喻、测评落地、时间管理与实战避坑" },
  { key: "05_harness", name: "05 - Harness 工程与系统可靠性", desc: "自我改进 Agent、企业级实践框架、大规模运行反思、为什么 Harness 比模型更重要" },
  { key: "06_organization", name: "06 - AI 原生组织与产品思考", desc: "Mike Krieger、Alexandr Wang、a16z 等关于 AI 原生产品范式与组织演进的深度反思" },
  { key: "07_frontier", name: "07 - 前沿科学与物理智能", desc: "测试时算力、脑机接口、材料科学自动化、持续学习与科学 3.0" },
  { key: "08_eval", name: "08 - AI 评估基准与安全测试", desc: "OpenAI 研究主管 Mark Chen（研究品味是人类终极壁垒）、模型评估与安全对齐" },
  { key: "09_coding_tools", name: "09 - AI 编程范式与开发工具", desc: "Claude Code、Codex 创造内幕与人机协同编程新范式" },
  { key: "10_philosophy", name: "10 - 哲学与元认知", desc: "孟岩对话李继刚《人何以自处》、深度自我认知与心智进化" },
  { key: "11_authors", name: "11 - 核心人物与作者档案", desc: "知识库核心引用的思想者、作者与研究团队人物档案" },
  { key: "12_navigation", name: "12 - 知识索引与全局导航", desc: "MOC 知识地图、各主题索引路由器与全库导航" },
  { key: "13_archive", name: "13 - 系统规范与工程归档", desc: "Syno 运行契约、系统规范与历史工程归档" },
];

function classifyNote(relPath) {
  const norm = String(relPath || "").replace(/\\/g, "/");
  if (norm.startsWith("vault/01-Areas/AI Agent Development/Super Agent") || norm.startsWith("01-Areas/AI Agent Development/Super Agent")) {
    return "02_super_agent";
  }
  if (norm.startsWith("vault/01-Areas/AI Agent Development") || norm.startsWith("01-Areas/AI Agent Development")) {
    return "01_theory";
  }
  if (norm.includes("哲学与自我认知") || norm.includes("播客转录")) {
    return "10_philosophy";
  }
  if (norm.includes("Harness Context & Reliability")) {
    return "05_harness";
  }
  if (norm.includes("AI Native Organization Product & Career")) {
    return "06_organization";
  }
  if (norm.includes("Frontier Models & Physical AI")) {
    return "07_frontier";
  }
  if (norm.includes("AI Evaluation & Safety")) {
    return "08_eval";
  }
  if (norm.includes("AI Coding & Tools") || norm.includes("Programming and Engineering") || norm.includes("AI Tools and Products")) {
    return "09_coding_tools";
  }
  if (norm.includes("Authors")) {
    return "11_authors";
  }
  if (norm.includes("MOC") || norm.includes("Workflow and Skill Management")) {
    return "12_navigation";
  }
  if (norm.startsWith("03-Archive") || norm.startsWith("vault/03-Archive") || ["AGENTS.md", "CLAUDE.md", "README.md"].includes(path.basename(norm))) {
    return "13_archive";
  }
  if (norm.includes("Agent Architecture & Runtime")) {
    return "03_architecture";
  }
  if (norm.includes("Agent Design & Patterns")) {
    return "04_design_patterns";
  }
  return "04_design_patterns";
}

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

async function updateWikiHome(client) {
  console.log(`\n=== 正在刷新知识库首页大纲描述 (Doc ID: ${HOME_DOC_ID}) ===`);
  try {
    const childrenRes = await client.docx.v1.documentBlockChildren.get({
      path: { document_id: HOME_DOC_ID, block_id: HOME_DOC_ID },
    });
    const currentCount = childrenRes?.data?.items?.length || 0;
    if (currentCount > 0) {
      await client.docx.v1.documentBlockChildren.batchDelete({
        path: { document_id: HOME_DOC_ID, block_id: HOME_DOC_ID },
        data: { start_index: 0, end_index: currentCount },
      });
    }

    const homeBlocks = [
      {
        block_type: 15,
        quote: {
          elements: [
            {
              text_run: {
                content: "💡 欢迎来到 Syno 个人知识库！这里专注于 AI Agent 时代第一性原理、深度思考反思与前沿工程架构。全库 195 篇高信噪比精华已完成 1:1 端云对齐，左侧目录树清晰层级分明，手机与电脑均可深度研读与划线批注。",
              },
            },
          ],
        },
      },
      {
        block_type: 3,
        heading1: {
          elements: [{ text_run: { content: "📚 知识库全景分类体系导航" } }],
        },
      },
    ];

    for (const cat of CATEGORIES) {
      homeBlocks.push({
        block_type: 12,
        bullet: {
          elements: [
            {
              text_run: {
                content: `${cat.name}：`,
                text_element_style: { bold: true },
              },
            },
            {
              text_run: {
                content: cat.desc,
              },
            },
          ],
        },
      });
    }

    homeBlocks.push(
      {
        block_type: 3,
        heading1: {
          elements: [{ text_run: { content: "🔗 核心联动工具与端云大盘" } }],
        },
      },
      {
        block_type: 12,
        bullet: {
          elements: [
            { text_run: { content: "📥 知识快速收录流：", text_element_style: { bold: true } } },
            { text_run: { content: "在多维表格收录流随时提交文章链接或碎片想法，管家全自动分析排版入库。" } },
          ],
        },
      },
      {
        block_type: 12,
        bullet: {
          elements: [
            { text_run: { content: "📚 知识库全景大盘：", text_element_style: { bold: true } } },
            { text_run: { content: "多维表格大盘实时收录 195 篇全量知识，支持按标签分组折叠、全局关键词搜索与快速浏览。" } },
          ],
        },
      },
      {
        block_type: 12,
        bullet: {
          elements: [
            { text_run: { content: "📖 深度研读体验：", text_element_style: { bold: true } } },
            { text_run: { content: "在左侧 Wiki 目录树中自由切换章节，阅读正文时可长按划线高亮、写批注并随时复习。" } },
          ],
        },
      }
    );

    await client.docx.v1.documentBlockChildren.create({
      path: { document_id: HOME_DOC_ID, block_id: HOME_DOC_ID },
      data: { children: homeBlocks },
    });
    console.log(`✅ 知识库首页大纲更新完成！`);
  } catch (err) {
    console.warn(`更新首页提示:`, err?.message || err);
  }
}

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  console.log(`=== 连接知识库空间 (Space ID: ${SPACE_ID}, Root: ${ROOT_PARENT_TOKEN}) ===`);

  // 1. 获取现有根节点下的子节点（分类节点）
  const rootChildrenRes = await client.wiki.v2.spaceNode.list({
    path: { space_id: SPACE_ID },
    params: { parent_node_token: ROOT_PARENT_TOKEN, page_size: 50 },
  }).catch(() => ({ data: { items: [] } }));

  const existingRootNodes = rootChildrenRes?.data?.items || [];
  const categoryMap = new Map(); // key -> token

  // 映射并规范化已有分类节点
  for (const node of existingRootNodes) {
    if (node.title.startsWith("01 - AI Agent 支柱理论")) {
      categoryMap.set("01_theory", node.node_token);
      if (node.title !== "01 - AI Agent 支柱理论") {
        await client.wiki.v2.spaceNode.updateTitle({
          path: { space_id: SPACE_ID, node_token: node.node_token },
          data: { title: "01 - AI Agent 支柱理论" },
        }).catch(() => {});
      }
    } else if (node.title.startsWith("02 - Super Agent")) {
      categoryMap.set("02_super_agent", node.node_token);
      if (node.title !== "02 - Super Agent 实战体系") {
        await client.wiki.v2.spaceNode.updateTitle({
          path: { space_id: SPACE_ID, node_token: node.node_token },
          data: { title: "02 - Super Agent 实战体系" },
        }).catch(() => {});
      }
    } else if (node.title.startsWith("03 - 顶级架构与工程长文")) {
      categoryMap.set("03_architecture", node.node_token);
      if (node.title !== "03 - 顶级架构与工程长文") {
        await client.wiki.v2.spaceNode.updateTitle({
          path: { space_id: SPACE_ID, node_token: node.node_token },
          data: { title: "03 - 顶级架构与工程长文" },
        }).catch(() => {});
      }
    } else if (node.title.includes("哲学与元认知")) {
      categoryMap.set("10_philosophy", node.node_token);
      if (node.title !== "10 - 哲学与元认知") {
        await client.wiki.v2.spaceNode.updateTitle({
          path: { space_id: SPACE_ID, node_token: node.node_token },
          data: { title: "10 - 哲学与元认知" },
        }).catch(() => {});
      }
    } else {
      // 检查是否匹配其他已建节点
      for (const cat of CATEGORIES) {
        if (node.title === cat.name || node.title.startsWith(cat.name.slice(0, 10))) {
          categoryMap.set(cat.key, node.node_token);
          break;
        }
      }
    }
  }

  // 2. 补齐缺失的分类节点
  console.log(`\n=== 正在核对并创建全量分类节点 ===`);
  for (const cat of CATEGORIES) {
    if (categoryMap.has(cat.key)) {
      console.log(`✅ 分类节点已就绪: [${cat.name}] -> ${categoryMap.get(cat.key)}`);
    } else {
      console.log(`- 正在新建分类节点: [${cat.name}]...`);
      const createRes = await withRetry(() =>
        client.wiki.v2.spaceNode.create({
          path: { space_id: SPACE_ID },
          data: {
            parent_node_token: ROOT_PARENT_TOKEN,
            node_type: "origin",
            obj_type: "docx",
            title: cat.name,
          },
        })
      );
      const token = createRes?.data?.node?.node_token;
      if (token) {
        categoryMap.set(cat.key, token);
        console.log(`✅ 分类节点创建成功: [${cat.name}] -> ${token}`);
      }
      await sleep(300);
    }
  }

  // 3. 收集所有分类下现有的文章节点，建立 title -> node 缓存
  console.log(`\n=== 正在索引 Wiki 空间内所有已有文档节点 ===`);
  const existingDocMap = new Map(); // title -> { node_token, obj_token, url, parent_token }
  for (const cat of CATEGORIES) {
    const parentToken = categoryMap.get(cat.key);
    if (!parentToken) continue;
    let pageToken = "";
    do {
      const subRes = await client.wiki.v2.spaceNode.list({
        path: { space_id: SPACE_ID },
        params: { parent_node_token: parentToken, page_size: 50, page_token: pageToken || undefined },
      }).catch(() => ({ data: { items: [] } }));
      for (const item of subRes.data?.items || []) {
        existingDocMap.set(item.title, item);
      }
      pageToken = subRes.data?.has_more ? subRes.data.page_token : "";
    } while (pageToken);
  }
  console.log(`当前 Wiki 中已存在 ${existingDocMap.size} 篇挂载文档`);

  // 4. 从多维表格大盘收集全部待挂载笔记
  console.log("\n=== 正在从多维表格大盘获取笔记清单 ===");
  const allItems = [];
  let pageToken = "";
  do {
    const listRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { page_size: 100, page_token: pageToken || undefined },
    });
    allItems.push(...listRes.data.items);
    pageToken = listRes.data.has_more ? listRes.data.page_token : "";
  } while (pageToken);

  console.log(`大盘共计 ${allItems.length} 条知识记录`);

  // 5. 遍历挂载并对齐
  let newlyMounted = 0;
  let alreadyMounted = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const recordId = item.record_id;
    const relPath = String(item.fields["本地相对路径"] || "").trim().replace(/\\/g, "/");
    const title = String(item.fields["笔记名称"] || path.basename(relPath, ".md")).trim();
    const cleanTitle = title.slice(0, 100);
    const catKey = classifyNote(relPath);
    const parentToken = categoryMap.get(catKey);

    const hasLinkInBitable = !!(item.fields["云文档链接"]?.link || item.fields["云文档链接"]?.text);

    // 检查是否已经在 Wiki 中
    if (existingDocMap.has(cleanTitle)) {
      alreadyMounted++;
      const existingNode = existingDocMap.get(cleanTitle);
      if (!hasLinkInBitable && existingNode?.url) {
        // 补充多维表格链接
        await client.bitable.appTableRecord.update({
          path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID, record_id: recordId },
          data: {
            fields: {
              "云文档链接": { text: "📖 知识库 Wiki", link: existingNode.url },
            },
          },
        }).catch(() => {});
        console.log(`[${i + 1}/${allItems.length}] 🔗 补齐大盘链接: ${cleanTitle} -> ${existingNode.url}`);
      }
      continue;
    }

    // 读取本地文件内容
    let body = "";
    try {
      const cleanRel = relPath.replace(/^vault[\/\\]/, "");
      const fullPath = path.resolve(PATHS.vaultRoot, cleanRel);
      const raw = await fs.readFile(fullPath, "utf8");
      body = raw.replace(/^---[\s\S]*?---\s*/m, "").trim();
    } catch (e) {
      console.warn(`[跳过] 无法读取文件 (${cleanTitle}): ${e.message}`);
      continue;
    }

    try {
      // 1. 在对应分类下创建叶子文章节点
      const createNodeRes = await withRetry(() =>
        client.wiki.v2.spaceNode.create({
          path: { space_id: SPACE_ID },
          data: {
            parent_node_token: parentToken,
            node_type: "origin",
            obj_type: "docx",
            title: cleanTitle,
          },
        })
      );

      const node = createNodeRes?.data?.node;
      const docxToken = node?.obj_token;
      const wikiUrl = node?.url;

      if (!docxToken || !wikiUrl) {
        throw new Error("创建 Wiki 节点未返回有效文档标识");
      }

      // 2. 将 Markdown 排版 Blocks 写入该 Wiki 文档中
      const blocks = markdownToDocxBlocks(body);
      const safeBlocks = blocks.length > 0 ? blocks : [
        { block_type: 2, text: { elements: [{ text_run: { content: "(暂无正文内容)" } }] } }
      ];

      const CHUNK_SIZE = 50;
      for (let b = 0; b < safeBlocks.length; b += CHUNK_SIZE) {
        const chunk = safeBlocks.slice(b, b + CHUNK_SIZE);
        await withRetry(() =>
          client.docx.v1.documentBlockChildren.create({
            path: { document_id: docxToken, block_id: docxToken },
            data: { children: chunk },
          })
        );
      }

      // 3. 回写多维表格链接
      await withRetry(() =>
        client.bitable.appTableRecord.update({
          path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID, record_id: recordId },
          data: {
            fields: {
              "云文档链接": {
                text: "📖 知识库 Wiki",
                link: wikiUrl,
              },
            },
          },
        })
      );

      newlyMounted++;
      existingDocMap.set(cleanTitle, { node_token: node.node_token, obj_token: docxToken, url: wikiUrl });
      console.log(`[${i + 1}/${allItems.length}] ✅ 新增挂载成功: [${catKey}] ${cleanTitle} -> ${wikiUrl}`);
    } catch (err) {
      console.error(`[${i + 1}/${allItems.length}] ❌ 挂载异常 (${cleanTitle}):`, err?.response?.data || err.message);
    }

    await sleep(300);
  }

  // 6. 刷新首页导航大纲
  await updateWikiHome(client);

  console.log(`\n🎉 全量 Wiki 树同步完成！`);
  console.log(`- 知识库全量笔记: ${allItems.length} 篇`);
  console.log(`- 本次新增入库: ${newlyMounted} 篇`);
  console.log(`- 此前已存在: ${alreadyMounted} 篇`);
  console.log(`👉 飞书知识库主页直达: https://my.feishu.cn/wiki/${ROOT_PARENT_TOKEN}`);
}

main().catch((err) => {
  console.error("执行异常:", err);
  process.exit(1);
});
