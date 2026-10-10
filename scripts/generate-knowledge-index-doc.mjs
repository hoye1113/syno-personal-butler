import process from "node:process";
import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  console.log("正在从多维表格大盘收集已生成的 72 篇云文档链接...");
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

  const linkedDocs = allItems
    .filter((i) => i.fields?.["云文档链接"])
    .map((i) => {
      const linkObj = i.fields["云文档链接"];
      const url = typeof linkObj === "object" ? linkObj.link : linkObj;
      const title = String(i.fields["笔记名称"] || "").trim();
      const relPath = String(i.fields["本地相对路径"] || "").trim().replace(/\\/g, "/");
      const domain = String(i.fields["知识领域"] || "").trim();
      const topic = String(i.fields["核心专题"] || "").trim();
      return { title, url, relPath, domain, topic };
    });

  console.log(`已找到 ${linkedDocs.length} 篇已上云文档。正在按知识体系分级分类...`);

  // 分类归集
  const theoryNotes = linkedDocs.filter((d) => d.relPath.includes("01-Areas/AI Agent Development") && !d.relPath.includes("Super Agent"));
  const superAgentNotes = linkedDocs.filter((d) => d.relPath.includes("Super Agent 实战课"));
  const architectureNotes = linkedDocs.filter(
    (d) =>
      d.relPath.includes("02-Resources/AI and Agents") ||
      d.relPath.includes("01-Areas/Workflow") ||
      d.relPath.includes("01-Areas/Programming") ||
      d.relPath.includes("01-Areas/AI Tools")
  );
  const philosophyNotes = linkedDocs.filter((d) => d.relPath.includes("哲学与自我认知"));

  // 构建 Markdown 大纲
  const markdownLines = [
    "# 📚 Syno 知识库总控导航大纲",
    "",
    "> 本文档是由 Syno 管家为您整理的**知识库总控书架**。所有核心笔记已按专题进行系统分级整理，点击任意卡片即可直达飞书原生阅读体验。",
    "",
    "---",
    "",
    "## 📖 模块一：AI Agent 底层认知与理论支柱（33 篇）",
    "> 系统阐述 Agent 理论心法：认知校准、Agent Loop、工具系统、上下文工程、Multi-Agent 与 Harness 架构。",
    "",
    ...theoryNotes.map((d, idx) => `${idx + 1}. [${d.title}](${d.url})`),
    "",
    "---",
    "",
    "## 🛠 模块二：Super Agent 实战课全案（23 篇）",
    "> 从 10 行代码到工业级 Agent：Tool 注册、Prompt 管道、Token 预算、持久记忆、RAG、Skills 插件与定时部署。",
    "",
    ...superAgentNotes.map((d, idx) => `${idx + 1}. [${d.title}](${d.url})`),
    "",
    "---",
    "",
    "## 💡 模块三：顶级架构与深度工程长文（12 篇）",
    "> 业内领跑团队（Anthropic / Cognition / Vercel）的生产级工程经验与架构哲学。",
    "",
    ...architectureNotes.map((d, idx) => `${idx + 1}. [${d.title}](${d.url})`),
    "",
    "---",
    "",
    "## 🧘 模块四：元认知与认知成长（3 篇）",
    "> 智能体时代的个人杠杆、心智模型与人何以自处。",
    "",
    ...philosophyNotes.map((d, idx) => `${idx + 1}. [${d.title}](${d.url})`),
    "",
    "---",
    "",
    "### 💡 使用小贴士",
    "- **置顶阅读**：点击本页面右上角「...」或点击标题右侧收藏按钮，将本文档添加到飞书侧边栏「置顶文档」，手机端一秒触达；",
    "- **全景搜索**：如需对 343 篇全库笔记进行多维筛选或关键词检索，请前往 [📚 飞书多维表格大盘](https://my.feishu.cn/base/OINQbQgyAaHyREsOyx5cbpqjnbe)。",
  ];

  const fullMarkdown = markdownLines.join("\n");

  // 创建原生 Docx
  console.log("正在创建总控导航 Docx 文档...");
  const createRes = await client.docx.v1.document.create({
    data: { title: "📚 Syno 知识库总控导航大纲" },
  });
  const docId = createRes?.data?.document?.document_id;
  if (!docId) throw new Error("创建总控文档失败");

  // 授权 Owner
  if (cred.ownerOpenId) {
    try {
      await client.drive.v1.permissionMember.create({
        path: { token: docId },
        params: { type: "docx" },
        data: {
          member_type: "openid",
          member_id: cred.ownerOpenId,
          perm: "full_access",
        },
      });
    } catch {}
  }

  // 写入 Blocks
  const lines = fullMarkdown.split(/\r?\n/);
  const blocks = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      blocks.push({
        block_type: 3,
        heading1: { elements: [{ text_run: { content: line.slice(2).trim() } }] },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        block_type: 4,
        heading2: { elements: [{ text_run: { content: line.slice(3).trim() } }] },
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        block_type: 5,
        heading3: { elements: [{ text_run: { content: line.slice(4).trim() } }] },
      });
    } else if (line.startsWith("> ")) {
      blocks.push({
        block_type: 15,
        quote: { elements: [{ text_run: { content: line.slice(2).trim() } }] },
      });
    } else if (/^\d+\.\s+\[(.+?)\]\((https?:\/\/.+?)\)/.test(line)) {
      const match = /^\d+\.\s+\[(.+?)\]\((https?:\/\/.+?)\)/.exec(line);
      const text = match[1];
      const link = match[2];
      blocks.push({
        block_type: 13,
        ordered: {
          elements: [
            {
              text_run: {
                content: text,
                text_element_style: { link: { url: link } },
              },
            },
          ],
        },
      });
    } else {
      blocks.push({
        block_type: 2,
        text: { elements: [{ text_run: { content: line } }] },
      });
    }
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
    const chunk = blocks.slice(i, i + CHUNK_SIZE);
    await client.docx.v1.documentBlockChildren.create({
      path: { document_id: docId, block_id: docId },
      data: { children: chunk },
    });
  }

  const docUrl = `https://my.feishu.cn/docx/${docId}`;
  console.log("\n✅ 知识库总控导航大纲生成成功！");
  console.log("👉 访问链接:", docUrl);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
