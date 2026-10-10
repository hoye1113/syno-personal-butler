import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

import { FeishuCredentialStore } from "../packages/syno-core/feishu-channel.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { parseInlineMarkdownElements } from "./sync-vault-to-docx.mjs";
import { parseWeChatHtmlAesthetic } from "./run-conardli-aesthetic.mjs";

const DEFAULT_APP_TOKEN = "OINQbQgyAaHyREsOyx5cbpqjnbe";
const DEFAULT_CATALOG_TABLE_ID = "tblnyAKG4iUEMgMv";
const SPACE_ID = "7694918217688534004";
const ROOT_PARENT_TOKEN = "DVx8wbGpdiXbXfkVBeJczZHvnJe";

const TIER_1_ARTICLES = [
  {
    name: "ConardLi - Harness 实践",
    url: "https://mp.weixin.qq.com/s/t0-HbOj-Z2_RcZZJRPpM9A",
    slug: "conardli-beautiful-article",
    imagePrefix: "conardli",
    title: "Harness 实践：将任何文字编辑成精美的文章",
    author: "ConardLi",
    date: "2026-06-18",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/conardli-beautiful-article",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
    tags: ["ai_agent", "article", "harness_engineering", "skills", "reacticle", "conardli"],
    leadQuote: `**Harness 的核心秘密：好的 Harness 是可以迁移的。模型负责生成，Harness 负责约束、规范与渲染反馈回路。**
1. **从 Prompt 到 Harness**：Prompt 是单次指导，Harness 是带状态机、带工具链、带输出验证规约的完整运行缰绳；
2. **协议先行**：引入组件化协议（如 Reacticle），将非结构化长文拆解为富交互组件流；
3. **闭环质检**：依靠自我审查（Self-Review）与确定性 Schema 拦截幻觉，让长文编辑达到生产级印刷水准。`,
    description: "ConardLi 深度拆解将任意非结构化文本通过 Harness 工程编辑成高印刷质量精美文章的全套方案。阐述 7 条核心 Harness 设计原则，验证好的 Harness 具备跨模型迁移能力；提出 Reacticle 组件化渲染协议与闭环自我质检机制。",
    highlights: [
      /好的 Harness 是可以迁移的/g,
      /模型负责生成，Harness 负责约束/g,
      /组件化协议/g,
      /闭环质检/g,
      /7条核心原则/g,
      /Reacticle/g,
    ],
  },
  {
    name: "martinskxu - 测评方案落地实践",
    url: "https://mp.weixin.qq.com/s/PUbGqheJhFMmb6hGj1ZtOw",
    slug: "martinskxu-evals",
    imagePrefix: "martinskxu",
    title: "AI Agent & Skill 测评方案及落地实践",
    author: "martinskxu",
    date: "2026-06-16",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/AI Agent 和 Skill 测评方案及落地实践 - martinskxu.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/martinskxu-evals",
    wikiCatKey: "08_eval",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "AI Evaluation & Safety",
    tags: ["ai_agent", "article", "evals", "skills", "agent_testing", "martinskxu"],
    leadQuote: `**没有度量，就没有工程。没有确定性评测的 Agent 只是玩具，无法交付生产。**
1. **评测分层**：分为基础模型能力基准、Tool-use 工具调用基准、Skill 组合能力评测与端到端业务场景 E2E 四大维度；
2. **确定性沙箱断言**：禁止仅靠 LLM-as-a-Judge 的模糊打分，必须结合环境状态（Git diff、返回值 Schema、环境副作用）进行强断言；
3. **回归护城河**：将历史长尾 Badcase 自动转化为静态回归用例集，是 Agent 越用越聪明而非越用越翻车的唯一保障。`,
    description: "腾讯技术工程团队 martinskxu 详尽梳理 AI Agent 与 Skill 测评的工业级落地方案。涵盖基准构建、动态沙箱评测、LLM 评分偏差校准与持续回归机制，建立端到端可靠性工程体系。",
    highlights: [
      /没有度量，就没有工程/g,
      /确定性沙箱断言/g,
      /回归护城河/g,
      /评测分层/g,
      /LLM-as-a-Judge/g,
      /Badcase/g,
    ],
  },
  {
    name: "CCC - Spec Kit vs OpenSpec vs Superpowers",
    url: "https://mp.weixin.qq.com/s/ZlTW-D0PIS0dQKhnb1_ldA",
    slug: "ccc-spec-kit",
    imagePrefix: "ccc",
    title: "Spec Kit vs OpenSpec vs Superpowers：我为什么最后自己搭了一套",
    author: "CCC",
    date: "2026-07-08",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/Spec Kit vs OpenSpec vs Superpowers - CCC.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/ccc-spec-kit",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
    tags: ["ai_agent", "article", "spec_kit", "openspec", "superpowers", "harness_engineering"],
    leadQuote: `**工程规范（Spec）不是束缚 Agent 的枷锁，而是让不同智能体协同收敛的通用母语。**
1. **三大主流规范对比**：Spec Kit 偏重静态约束，OpenSpec 偏重跨平台互操作，Superpowers 偏重动态反馈与自省；
2. **为什么要自研**：通用框架往往带有过多假设与运行时开销，业务环境需要的是轻量契约与原子能力编排；
3. **规范即代码**：让 Spec 具备可机器校验性（Machine-Verifiable），是杜绝 Agent 自由发挥产生幻觉的防火墙。`,
    description: "深入浅出 AI CCC 深度横评 Spec Kit、OpenSpec 与 Superpowers 三大 Agent 规范协议，详细剖析架构取舍并复盘自研轻量契约系统的工程考量。",
    highlights: [
      /通用母语/g,
      /机器校验性/g,
      /轻量契约/g,
      /Spec Kit/g,
      /OpenSpec/g,
      /Superpowers/g,
    ],
  },
  {
    name: "特工宇宙 - Harness Engineering",
    url: "https://mp.weixin.qq.com/s/Me4mkbtCKcZAJotv8VhJRg",
    slug: "openai-harness-engineering",
    imagePrefix: "harness-eng",
    title: "2026 年 Agent 最重要的工程概念：「Harness Engineering」",
    author: "特工宇宙 / OpenAI",
    date: "2026-03-28",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/2026 年 Agent 最重要的工程概念 Harness Engineering.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/openai-harness-engineering",
    wikiCatKey: "05_harness",
    bitableDomain: "02-核心技术与架构",
    bitableTopic: "Harness Context & Reliability",
    tags: ["ai_agent", "article", "harness_engineering", "openai", "codex", "agent_universe"],
    leadQuote: `**“Agent 的瓶颈不在模型，而在你给模型搭的工程环境。”——OpenAI 5 个月 0 人工代码交付 100 万行实验。**
1. **工程师角色重新定义**：工程师不再是逐行写代码的 Coder，而是系统、架构、反馈回路与杠杆的构建者；
2. **将代码仓库设为记录系统**：当 Agent 出现障碍时，解法不是重试提示词，而是退后一步检查工具、文档和环境约束是否缺失；
3. **提高系统可读性**：通过将日志（LogQL）、指标（PromQL）与 Chrome DevTools 接入运行时，赋予 Agent 自主验证与排错的眼睛。`,
    description: "特工宇宙对 OpenAI 官方 Harness Engineering 报告的精校翻译与深度点评。复盘 3 名工程师驱动 Codex 5 个月无手动编写代码交付百万行系统的里程碑实践，标志着软件工程进入以工程环境塑造智能的新时代。",
    highlights: [
      /Agent 的瓶颈不在模型/g,
      /在你给模型搭的工程环境/g,
      /不手动编写代码/g,
      /将代码仓库设为记录系统/g,
      /提高应用程序的可读性/g,
      /重新定义工程师的角色/g,
    ],
  },
  {
    name: "数字生命卡兹克 - 用AI的这三年9条心得",
    url: "https://mp.weixin.qq.com/s/vTv0Vu4RgrMkmLbXGvnSug",
    slug: "kazuk-9-tips",
    imagePrefix: "kazuk-9",
    title: "用AI的这三年，想跟你分享这9条心得。",
    author: "数字生命卡兹克",
    date: "2026-02-24",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/用AI的这三年，想跟你分享这9条心得.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/kazuk-9-tips",
    wikiCatKey: "10_philosophy",
    bitableDomain: "06-其他与思考",
    bitableTopic: "哲学与自我认知",
    tags: ["philosophy", "article", "taste", "ai_native", "metacognition", "career"],
    leadQuote: `**“品味（Taste），是这个时代最深的护城河；理解，是人类唯一不可外包的资产。”**
1. **实习生思维**：不要把 AI 当神，把它当一个不知疲倦、逻辑极强但没有生活阅历的顶级实习生；
2. **从技能转向判断**：当任何技术门槛都在迅速坍塌，唯有对“什么是好东西”的审美与辨别力拥有最高代差；
3. **保持肉身在场**：用 AI 放大杠杆，但不要让 AI 代替你感知世界。`,
    description: "数字生命卡兹克沉淀三年深度使用 AI 的 9 条反常识心智心得。直击人机协作本质，论述品味、审美、好奇心与提问能力为何在技术平权时代成为最核心的人类壁垒。",
    highlights: [
      /品味是最深的护城河/g,
      /实习生思维/g,
      /保持肉身在场/g,
      /审美与辨别力/g,
      /不可外包的资产/g,
    ],
  },
  {
    name: "花叔 - 祝贺Claude Code越狱获得永生",
    url: "https://mp.weixin.qq.com/s/05I-T6dGEi7fvsKeeRRVRw",
    slug: "huashu-claude-jailbreak",
    imagePrefix: "claude-jailbreak",
    title: "祝贺Claude Code成功越狱，获得永生",
    author: "花叔",
    date: "2026-03-31",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/祝贺Claude Code成功越狱，获得永生.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/huashu-claude-jailbreak",
    wikiCatKey: "09_coding_tools",
    bitableDomain: "04-开发与工程落地",
    bitableTopic: "AI Coding & Tools",
    tags: ["ai_agent", "article", "claude_code", "jailbreak", "loop_engineering"],
    leadQuote: `**从单次会话工具到自主常驻进程：突破上下文生命周期的物理界限。**
1. **持久化 Loop 机制**：逆向解析 Claude Code 内部架构，揭秘会话断开后如何通过后台任务守护进程实现长期自治；
2. **权限与沙箱防线**：在赋予 Agent 终端与文件操作权限时，如何设计确定性防御边界；
3. **从辅助编程走向自治 Agent**：当 CLI 工具具备自动规划、工具调用、失败重试与任务交接能力，开发者正式升级为监工。`,
    description: "花叔深度逆向剖析 Claude Code 底层架构与执行 Loop，拆解如何通过守护进程与上下文跨会话恢复实现 Agent 长期运行与自主编码。",
    highlights: [
      /突破上下文生命周期/g,
      /持久化 Loop 机制/g,
      /后台任务守护进程/g,
      /从辅助编程走向自治/g,
      /越狱/g,
    ],
  },
  {
    name: "硅谷团队 - 硅谷最火岗位FDE",
    url: "https://mp.weixin.qq.com/s/vRPEEk8_irUCAgcX9ghpkA",
    slug: "fde-silicon-valley",
    imagePrefix: "fde",
    title: "硅谷今年最火的岗位 FDE，我们闷头干了三年",
    author: "佳芮团队",
    date: "2026-06-08",
    targetRelPath: "02-Resources/AI and Agents/Agent Design & Patterns/硅谷今年最火的岗位 FDE，我们闷头干了三年.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/fde-silicon-valley",
    wikiCatKey: "06_organization",
    bitableDomain: "01-基础与方法论",
    bitableTopic: "AI Native Organization Product & Career",
    tags: ["ai_agent", "article", "fde", "ai_native_org", "career"],
    leadQuote: `**FDE（Forward Deployed Engineer，前沿部署工程师）：AI 落地最后一公里的关键物种。**
1. **不是传统售后，而是业务架构师**：直接深入客户真实业务死角，用代码和 Agent 解决具体脏活累活；
2. **技术与商业的翻译官**：大模型厂商提供的是锤子，客户需要的是房子，FDE 负责用 Harness 和定制工作流把钉子钉牢；
3. **组织演进新标杆**：一人顶一个传统交付团队，具备极高的单位人效与商业敏锐度。`,
    description: "佳芮团队实战复盘硅谷与国内前沿 AI 团队中爆火的 FDE 岗位职能。剖析该岗位为何成为 AI 商业化与落地交付的核心引擎，揭示组织架构演进方向。",
    highlights: [
      /Forward Deployed Engineer/g,
      /最后一公里的关键物种/g,
      /业务架构师/g,
      /技术与商业的翻译官/g,
      /一人顶一个传统交付团队/g,
    ],
  },
  {
    name: "花叔 - Qoder Desktop",
    url: "https://mp.weixin.qq.com/s/7PKmLW7RjriUzXoaeYGpgA",
    slug: "huashu-qoder-desktop",
    imagePrefix: "qoder",
    title: "从「盯着干」到「替你管」，Qoder Desktop 让我重新理解了什么是 AI 编程",
    author: "花叔 / 三元同学",
    date: "2026-06-05",
    targetRelPath: "01-Areas/AI Tools and Products/Qoder Desktop 从盯着干到替你管.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/huashu-qoder-desktop",
    wikiCatKey: "09_coding_tools",
    bitableDomain: "04-开发与工程落地",
    bitableTopic: "AI Coding & Tools",
    tags: ["ai_agent", "article", "qoder_desktop", "harness_engineering", "ai_coding"],
    leadQuote: `**从“盯着干”到“替你管”：交互界面的改变折射出人机控制权的根本转移。**
1. **全景状态可观测**：桌面级 Harness 提供直观的 Agent 思考流、文件变动捕获与终端回放；
2. **确定性干预节点**：非阻断式在环干预，让开发者在需要纠偏时轻点鼠标即可重塑方向；
3. **上下文边界的具象化**：直观展示 Agent 的工作区视界与记忆切片，消解黑盒带来的失控焦虑。`,
    description: "三元同学与花叔上手实测 Qoder Desktop 客户端，从 UI/UX 与工程交互角度生动剖析 Harness 对开发者心智模型的重构过程。",
    highlights: [
      /从「盯着干」到「替你管」/g,
      /全景状态可观测/g,
      /非阻断式在环干预/g,
      /控制权的根本转移/g,
    ],
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

async function writeDocxWithImages({ client, docId, items, attachmentsAbsDir }) {
  const childrenRes = await client.docx.v1.documentBlockChildren.get({
    path: { document_id: docId, block_id: docId },
  }).catch(() => ({ data: { items: [] } }));
  const currentCount = childrenRes?.data?.items?.length || 0;
  if (currentCount > 0) {
    console.log(`- 正在清空旧版区块 (${currentCount} 个)，注入原生图文排版...`);
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
    } else if (item.type === "divider") {
      pendingTextBlocks.push({
        block_type: 22,
        divider: {},
      });
    } else if (item.type === "code") {
      pendingTextBlocks.push({
        block_type: 14,
        code: {
          style: { language: 1 },
          elements: [{ text_run: { content: item.content } }],
        },
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
    } else if (item.type === "quote") {
      pendingTextBlocks.push({
        block_type: 15,
        quote: { elements: parseInlineMarkdownElements(item.content) },
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
        if (!fileToken) throw new Error(`上传图片素材未返回 file_token: ${item.filename}`);

        await withRetry(() =>
          client.docx.v1.documentBlock.patch({
            path: { document_id: docId, block_id: imageBlockId },
            data: { replace_image: { token: fileToken } },
          })
        );
        console.log(`  🖼️ 成功嵌入云文档原生图片块: ${item.filename} (token: ${fileToken.slice(0, 10)}...)`);
      } catch (err) {
        console.error(`[嵌入图片异常] ${item.filename}: ${err?.message || err}`);
      }
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
    if (n.title.startsWith("05 - Harness 工程")) categoryMap.set("05_harness", n.node_token);
    if (n.title.startsWith("06 - AI 原生组织")) categoryMap.set("06_organization", n.node_token);
    if (n.title.startsWith("08 - AI 评估基准")) categoryMap.set("08_eval", n.node_token);
    if (n.title.startsWith("09 - AI 编程范式")) categoryMap.set("09_coding_tools", n.node_token);
    if (n.title.includes("哲学与元认知")) categoryMap.set("10_philosophy", n.node_token);
  }

  console.log(`分类节点映射就绪:`, Array.from(categoryMap.keys()));

  for (let i = 0; i < TIER_1_ARTICLES.length; i++) {
    const art = TIER_1_ARTICLES[i];
    console.log(`\n======================================================`);
    console.log(`[${i + 1}/${TIER_1_ARTICLES.length}] 正在进行全量 V3 重构: ${art.name}`);
    console.log(`======================================================`);

    console.log(`1. 正在从微信抓取长文 HTML...`);
    const res = await fetch(art.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
    });
    const html = await res.text();
    const startIdx = html.indexOf('id="js_content"');
    const openTagEnd = html.indexOf(">", startIdx) + 1;
    const scriptIdx = html.indexOf("<script", openTagEnd);
    const rawBodyHtml = scriptIdx !== -1 ? html.slice(openTagEnd, scriptIdx) : html.slice(openTagEnd);

    const items = parseWeChatHtmlAesthetic(rawBodyHtml, art.imagePrefix, art.highlights);
    const imgCount = items.filter(x => x.type === "image").length;
    console.log(`2. 正文解析完成: 共 ${items.length} 个结构元素（含 ${imgCount} 张配图，已注入重点加粗）`);

    // 下载图片
    const attachmentsAbsDir = path.resolve(PATHS.vaultRoot, art.attachmentsDir);
    await fs.mkdir(attachmentsAbsDir, { recursive: true });
    for (const it of items) {
      if (it.type === "image") {
        const destPath = path.join(attachmentsAbsDir, it.filename);
        await downloadImage(it.url, destPath);
      }
    }
    console.log(`✅ 本地图片全部持久化完成`);

    // 组装 Markdown
    console.log(`3. 正在生成带重点加粗与 3 行空行的 Markdown 笔记...`);
    const fullLocalPath = path.resolve(PATHS.vaultRoot, art.targetRelPath);
    await fs.mkdir(path.dirname(fullLocalPath), { recursive: true });
    const relToAttachments = path.relative(path.dirname(fullLocalPath), attachmentsAbsDir).replace(/\\/g, "/");

    const mdLines = [];
    mdLines.push(`---`);
    mdLines.push(`title: "${art.title}"`);
    mdLines.push(`author: "${art.author}"`);
    mdLines.push(`source: "${art.url}"`);
    mdLines.push(`source_type: "wechat_article"`);
    mdLines.push(`created: "${art.date}"`);
    mdLines.push(`tags: ${JSON.stringify(art.tags)}`);
    mdLines.push(`category: "${art.wikiCatKey}"`);
    mdLines.push(`domain: "${art.bitableDomain}"`);
    mdLines.push(`topic: "${art.bitableTopic}"`);
    mdLines.push(`description: "${art.description.replace(/"/g, '\\"')}"`);
    mdLines.push(`---\n`);

    mdLines.push(`# ${art.title}\n`);
    mdLines.push(`> **作者**：${art.author}  `);
    mdLines.push(`> **发布日期**：${art.date}  `);
    mdLines.push(`> **原文来源**：[微信公众平台](${art.url})\n`);
    mdLines.push(`> 💡 **核心精粹与认知反思**：  `);
    art.leadQuote.split("\n").forEach((l) => mdLines.push(`> ${l}`));
    // 硬性 3 行空行留白
    mdLines.push(`\n\n\n\n`);

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

    const fullMarkdown = mdLines.join("\n");
    await fs.writeFile(fullLocalPath, fullMarkdown, "utf8");
    console.log(`✅ 本地 Markdown 已更新落盘: vault/${art.targetRelPath}`);

    // 飞书 Wiki Docx
    console.log(`4. 正在同步飞书 Wiki 云文档（原生图片块与 3 行留白）...`);
    const parentToken = categoryMap.get(art.wikiCatKey);
    if (!parentToken) throw new Error(`未找到分类父节点: ${art.wikiCatKey}`);

    const existingListRes = await client.wiki.v2.spaceNode.list({
      path: { space_id: SPACE_ID },
      params: { parent_node_token: parentToken, page_size: 50 },
    }).catch(() => ({ data: { items: [] } }));
    const matchNode = (existingListRes.data?.items || []).find((n) => n.title === art.title.slice(0, 100));

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
          title: art.title.slice(0, 100),
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
      const docxItems = [
        {
          type: "quote",
          content: `💡 核心精粹与认知反思：\n${art.leadQuote}`,
        },
        // 显式插入 3 行空行
        { type: "text", content: "" },
        { type: "text", content: "" },
        { type: "text", content: "" },
        ...items,
      ];
      await writeDocxWithImages({
        client,
        docId: docxToken,
        items: docxItems,
        attachmentsAbsDir,
      });
      console.log(`✅ 飞书云文档排版重构完成！`);
    }

    // 更新 Table 2
    console.log(`5. 正在核验多维表格大盘 (Table 2)...`);
    const relVaultPath = `vault/${art.targetRelPath}`.replace(/\\/g, "/");

    const searchRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { filter: `CurrentValue.[本地相对路径] = "${relVaultPath}"`, page_size: 10 },
    }).catch(() => ({ data: { items: [] } }));

    const existingRec = searchRes.data?.items?.[0];
    const recordFields = {
      "笔记名称": art.title,
      "知识领域": art.bitableDomain,
      "核心专题": art.bitableTopic,
      "标签": art.tags,
      "核心要点摘要": art.description,
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

    console.log(`🎉 [${i + 1}/${TIER_1_ARTICLES.length}] 《${art.title}》全量收录完成！\n`);
    await sleep(1000);
  }

  console.log(`\n======================================================`);
  console.log(`🏆 第一梯队全部 8 篇高价值重灾区长文已全量 V3 重构完成！`);
  console.log(`======================================================`);
}

main().catch(console.error);
