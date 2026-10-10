import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";

const DOC_ID = "ZhoIdM4UkoSlNwxDcZecFPW1nOe"; // 知识库首页文档 ID

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  console.log(`=== 正在读取知识库首页 (Doc ID: ${DOC_ID}) 当前内容块 ===`);
  const childrenRes = await client.docx.v1.documentBlockChildren.get({
    path: { document_id: DOC_ID, block_id: DOC_ID },
  });
  const currentCount = childrenRes?.data?.items?.length || 0;
  console.log(`当前包含 ${currentCount} 个内容块`);

  // 1. 清除旧内容块（分批循环清理，每次最多 50 个）
  if (currentCount > 0) {
    console.log(`正在清理旧的首页内容块...`);
    try {
      let remaining = currentCount;
      while (remaining > 0) {
        const batchSize = Math.min(remaining, 50);
        await client.docx.v1.documentBlockChildren.batchDelete({
          path: { document_id: DOC_ID, block_id: DOC_ID },
          data: { start_index: 0, end_index: batchSize },
        });
        remaining -= batchSize;
      }
      console.log(`✅ 旧首页内容清理完成`);
    } catch (delErr) {
      console.warn(`清理旧块提示:`, delErr?.response?.data || delErr.message);
    }
  }

  // 2. 构造精美的全新首页内容
  const newBlocks = [
    // 欢迎引用框
    {
      block_type: 15,
      quote: {
        elements: [
          {
            text_run: {
              content: "💡 欢迎来到 Syno 个人知识库！这里是专注于 AI Agent 时代心智模型、前沿架构与工程实战的长青知识中心。行远自迩，登高自卑。在智能体爆发的时代，沉淀长青体系，构筑复利杠杆。",
            },
          },
        ],
      },
    },

    // 3 行空行呼吸留白
    { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
    { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },
    { block_type: 2, text: { elements: [{ text_run: { content: "" } }] } },

    // 分割线
    { block_type: 22, divider: {} },

    // 专区一：13 大全景分类导航
    {
      block_type: 3,
      heading1: {
        elements: [{ text_run: { content: "🗺️ 13 大全景分类导航（全库 228 篇端云对齐）" } }],
      },
    },
    {
      block_type: 2,
      text: {
        elements: [
          {
            text_run: {
              content: "全库知识体系结构化挂载于左侧目录树，覆盖从底层心智认知到工业级工程落地的完整光谱：",
            },
          },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "01 - AI Agent 支柱理论：", text_element_style: { bold: true } } },
          { text_run: { content: "认知校准、Agent Loop、工具系统、上下文工程、Multi-Agent 通用设计原则。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "02 - Super Agent 实战体系：", text_element_style: { bold: true } } },
          { text_run: { content: "从 10 行 While 循环到生产级智能体，Token 预算、持久记忆、sqlite-vec 混合检索与 Skills 编排。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "03 - 顶级架构与工程长文：", text_element_style: { bold: true } } },
          { text_run: { content: "Anthropic、Cognition、Vercel 生产级实操，Loop Engineering 橙皮书与 Ralph Loop 第一性原理。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "04 - Agent 设计模式与生产实践：", text_element_style: { bold: true } } },
          { text_run: { content: "自进化 Agent 综述、Skill 自动优化、生产实战避坑与复杂决策模式。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "05 - Harness 工程与系统可靠性：", text_element_style: { bold: true } } },
          { text_run: { content: "2026 核心概念 Harness 体系、系统 Prompt 分层、Linter 检验与上下文保真度。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "06 - AI 原生组织与产品思考：", text_element_style: { bold: true } } },
          { text_run: { content: "A16Z 报告反常识、杰文斯悖论、AI 杠杆代差、单人杠杆与组织进化。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "07 - 前沿科学与物理智能：", text_element_style: { bold: true } } },
          { text_run: { content: "测试时算力 Scaling、具身智能、脑机接口与前沿模型边界。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "08 - AI 评估基准与安全测试：", text_element_style: { bold: true } } },
          { text_run: { content: "Superpowers Evals、LLM-as-judge、模型对齐与品味壁垒。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "09 - AI 编程范式与开发工具：", text_element_style: { bold: true } } },
          { text_run: { content: "Claude Code、Codex、AI Native CLI 与人机协同编程新范式。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "10 - 哲学与元认知：", text_element_style: { bold: true } } },
          { text_run: { content: "孟岩对话李继刚（人何以自处）、数学与旧世界、不可外包的理解。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "11 - 核心人物与作者档案：", text_element_style: { bold: true } } },
          { text_run: { content: "Karpathy、ConardLi、魔术师卡颂、数字生命卡兹克等核心思想者沉淀。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "12 - 知识索引与全局导航：", text_element_style: { bold: true } } },
          { text_run: { content: "MOC 知识地图与主题路由器，支持渐进式精准加载。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "13 - 系统规范与工程归档：", text_element_style: { bold: true } } },
          { text_run: { content: "Syno 执行契约、收录规范与端云三位一体对齐协议。" } },
        ],
      },
    },

    // 分割线
    { block_type: 22, divider: {} },

    // 专区二：35 篇核心长文 V4 美感排版专区
    {
      block_type: 3,
      heading1: {
        elements: [{ text_run: { content: "🏆 35 篇核心长文 V4 美感排版专区" } }],
      },
    },
    {
      block_type: 2,
      text: {
        elements: [
          {
            text_run: {
              content: "知识库已完成全量核心长文（共 35 篇）的 V4 美感重构，全面满足以下严苛审美规范：",
            },
          },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "✨ 呼吸留白律动：", text_element_style: { bold: true } } },
          { text_run: { content: "置顶核心精粹框与后续正文第一段之间显式留白 3 行，提供从容沉淀的心智缓冲。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "📐 语义分级提权：", text_element_style: { bold: true } } },
          { text_run: { content: "汉字大章（一、二、...）提权为 Heading 1 并嵌入原生分割线，小节提权为 Heading 2，跳读律动极佳。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "💻 流程图等宽代码块：", text_element_style: { bold: true } } },
          { text_run: { content: "ASCII/Unicode 流转图（▼、──►）与终端指令完整封装为原生代码块，杜绝换行扭曲。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "🖼️ 原图防盗链离线落盘：", text_element_style: { bold: true } } },
          { text_run: { content: "配图全量本地落盘，飞书端采用原生 Block 27 深度嵌入，支持双指缩放查看原图。" } },
        ],
      },
    },

    // 分割线
    { block_type: 22, divider: {} },

    // 协同联动工具
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
          { text_run: { content: "📥 知识快速收录流（Table 1: tblpP77HG2RIA0aG）：", text_element_style: { bold: true } } },
          { text_run: { content: "手机飞书随时提交文章链接或想法，管家自动完成 V4 美感排版重构入库，生成本地 Markdown 与飞书 Wiki 页面。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "📚 知识库全景大盘（Table 2: tblnyAKG4iUEMgMv）：", text_element_style: { bold: true } } },
          { text_run: { content: "全库 208+ 篇精校笔记多维检索，支持按领域、标签分组折叠与全文翻看。" } },
        ],
      },
    },
    {
      block_type: 12,
      bullet: {
        elements: [
          { text_run: { content: "📖 沉淀与划线研读：", text_element_style: { bold: true } } },
          { text_run: { content: "阅读过程中可在段落直接划线高亮、写批注与沉淀心得，实现个人认知闭环。" } },
        ],
      },
    },
  ];

  console.log(`正在写入全新的知识库首页大纲与指引描述 (${newBlocks.length} 个块)...`);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < newBlocks.length; i += CHUNK_SIZE) {
    const chunk = newBlocks.slice(i, i + CHUNK_SIZE);
    await client.docx.v1.documentBlockChildren.create({
      path: { document_id: DOC_ID, block_id: DOC_ID },
      data: { children: chunk },
    });
  }

  console.log(`\n🎉 知识库首页描述更新完成！`);
  console.log(`👉 查看刷新结果: https://my.feishu.cn/wiki/DVx8wbGpdiXbXfkVBeJczZHvnJe`);
}

main().catch((err) => {
  console.error("更新首页异常:", err);
  process.exit(1);
});
