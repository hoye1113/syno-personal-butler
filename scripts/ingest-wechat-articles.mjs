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

const WECHAT_ARTICLES = [
  {
    url: "https://mp.weixin.qq.com/s/Me1AvtStUdcfmikAGjI4xg",
    slug: "a16z-report",
    imagePrefix: "a16z",
    title: "数字生命卡兹克-聊聊A16Z这两份AI报告以及一些反常识的真相",
    author: "数字生命卡兹克",
    date: "2026-10-06",
    targetRelPath: "02-Resources/AI and Agents/AI Native Organization Product & Career/数字生命卡兹克-聊聊A16Z这两份AI报告以及一些反常识的真相.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/a16z-report",
    wikiCatKey: "06_organization",
    bitableDomain: "03-前沿架构与评测",
    bitableTopic: "AI Native Organization Product & Career",
    tags: ["ai_agent", "article", "a16z", "ai_native_org", "jevons_paradox", "leverage"],
    leadQuote: `**智能变得便宜，知识也变得便宜。人人都能做过去只有专业人士才能做的事。但同时，杠杆也变得越来越便宜。那其实就带来了一个非常残酷的现实：最会用杠杆的人，他只会跑得越快。就像 AI 本质上就是所有普通人，如今最大的杠杆。于是，鸿沟就出现了：**
1. **AI 的使用已经很广，但对全社会来说，真正的使用深度浅得离谱；**
2. **杰文斯悖论：智能越便宜，需求越大，Agent 会把 Token 消耗推到一个过去无法想象的量级；**
3. **真正跑在最前面的那 1%，已经开始和剩下 99% 生活在两个不同的 AI 时代。**`,
    description: "数字生命卡兹克深度剖析 a16z 最新的 AI 趋势报告与《市场状况 II》。揭示三大反常识真相：AI社会普及度高但使用深度极浅；杰文斯悖论下智能越廉价Token消耗越呈指数级爆发；最残酷的现实是杠杆变得廉价，真正跑在前面的1%已与剩下99%生活在两个不同的AI时代。",
  },
  {
    url: "https://mp.weixin.qq.com/s/lSal9jb7c-tUbm9vO4pI4A",
    slug: "ai-math",
    imagePrefix: "math",
    title: "数字生命卡兹克-AI让数学再也回不去那个旧世界了",
    author: "数字生命卡兹克",
    date: "2026-10-08",
    targetRelPath: "02-Resources/哲学与自我认知/数字生命卡兹克-AI让数学再也回不去那个旧世界了.md",
    attachmentsDir: "99-System/Attachments/WeChat Articles/ai-math",
    wikiCatKey: "10_philosophy",
    bitableDomain: "06-其他与思考",
    bitableTopic: "哲学与自我认知",
    tags: ["philosophy", "article", "mathematics", "karpathy", "metacognition", "first_principles"],
    leadQuote: `**卡帕西大神有一句话，我最近也一直在提醒我自己：“你可以外包思考，但你没法外包理解。”**
**AI 时代，人还剩下什么？我想，大概有三样东西：**
1. **提问**：什么问题值得问，往哪个方向走，这背后是人的好奇心还有积累的**审美（Taste）**；
2. **理解**：机器给出一个一百页的证明，它是对的，但它到底说明了什么？和别的东西有什么联系？
3. **意义**：有了汽车，人还在跑马拉松；有了缆车，人还在爬山；AlphaGo 之后棋手也没有消失……我们做一件事，从来不全是为了结果，还有意义。
**“我们必须知道。我们，也必将知道。”**`,
    description: "数字生命卡兹克针对近期 OpenAI 在形式化数学证明与自动推理领域的巨大突破，从欧几里得、费马大定理、希尔伯特公理化梦想，一直讲到哥德尔不完备定理的认知边界。借用 Karpathy 名言'你可以外包思考，但你没法外包理解'，深度追问在机器秒级自动证明的时代人类剩下的三样终极壁垒：提问、理解与意义。",
  },
];

function applyProactiveHighlights(text, imagePrefix) {
  let t = text;
  if (imagePrefix === "a16z") {
    t = t
      .replace(/(5天烧了将近140亿的token)/g, "**$1**")
      .replace(/(智能越便宜，知识也变得便宜)/g, "**$1**")
      .replace(/(最会用杠杆的人，他只会跑得越快)/g, "**$1**")
      .replace(/(真正跑在最前面的那1%，已经开始和剩下99%生活在两个不同的AI时代)/g, "**$1**")
      .replace(/(真正的使用深度还浅得离谱)/g, "**$1**")
      .replace(/(Agent会把Token消耗推到一个过去无法想象的量级)/g, "**$1**")
      .replace(/(流量不是钱，能帮用户去进行高价值工作，才是钱)/g, "**$1**")
      .replace(/(带动了全球基础设施的一个巨大的资本开支周期)/g, "**$1**");
  } else if (imagePrefix === "math") {
    t = t
      .replace(/(你可以外包思考，但你没法外包理解)/g, "**$1**")
      .replace(/(第一，是提问。)/g, "**$1**")
      .replace(/(第二，是理解。)/g, "**$1**")
      .replace(/(第三，是意义。)/g, "**$1**")
      .replace(/(这背后是人的好奇心还有积累的审美)/g, "**$1**")
      .replace(/(我们必须知道。)/g, "**$1**")
      .replace(/(我们，也必将知道。)/g, "**$1**")
      .replace(/(数学，用自己最严格的方法，证明了自己的边界)/g, "**$1**");
  }
  return t;
}

function parseWeChatHtml(rawHtml, imagePrefix) {
  const clean = rawHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  const tokenRegex = /(<img[^>]+data-src="([^">]+)"[^>]*>)|(<(h[1-6]|blockquote|p|section)[^>]*>([\s\S]*?)<\/\4>)/gi;
  let imgIndex = 0;
  const items = [];

  let match;
  while ((match = tokenRegex.exec(clean)) !== null) {
    if (match[1]) {
      const dataSrc = match[2].trim();
      if (!dataSrc || dataSrc.includes("data:image") || dataSrc.includes("res.wx.qq.com")) continue;
      imgIndex++;
      const ext = dataSrc.includes("wx_fmt=png") ? "png" : dataSrc.includes("wx_fmt=jpeg") || dataSrc.includes("wx_fmt=jpg") ? "jpg" : "png";
      const filename = `${imagePrefix}-${String(imgIndex).padStart(2, "0")}.${ext}`;
      items.push({ type: "image", url: dataSrc, filename, alt: `配图 ${imgIndex}` });
    } else if (match[3]) {
      const tag = match[4].toLowerCase();
      let inner = match[5];

      const innerImgMatch = inner.match(/<img[^>]+data-src="([^">]+)"[^>]*>/i);
      if (innerImgMatch) {
        const dataSrc = innerImgMatch[1].trim();
        if (dataSrc && !dataSrc.includes("data:image") && !dataSrc.includes("res.wx.qq.com")) {
          imgIndex++;
          const ext = dataSrc.includes("wx_fmt=png") ? "png" : dataSrc.includes("wx_fmt=jpeg") || dataSrc.includes("wx_fmt=jpg") ? "jpg" : "png";
          const filename = `${imagePrefix}-${String(imgIndex).padStart(2, "0")}.${ext}`;
          items.push({ type: "image", url: dataSrc, filename, alt: `配图 ${imgIndex}` });
        }
      }

      // 保留原始 strong 与 b 标签为 Markdown 加粗语法
      inner = inner.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");

      let text = inner.replace(/<[^>]+>/g, "").replace(/\n\s*\n/g, "\n").trim();
      if (!text) continue;

      if (text.includes("谢谢你看我的文章") || text.includes("那些思想 · 目录") || text.includes("微信扫一扫赞赏作者") || text.includes("喜欢作者")) {
        continue;
      }

      // 施加主动高亮修饰
      text = applyProactiveHighlights(text, imagePrefix);

      if (tag.startsWith("h")) {
        const level = parseInt(tag[1], 10);
        items.push({ type: "heading", level, content: text.replace(/\*\*/g, "") });
      } else if (tag === "blockquote") {
        items.push({ type: "quote", content: text });
      } else {
        if (text.length <= 40 && /^(一|二|三|四|五|六|七|八|九|十|\d+)[、.．\s]/.test(text.replace(/\*\*/g, ""))) {
          items.push({ type: "heading", level: 2, content: text.replace(/\*\*/g, "") });
        } else {
          items.push({ type: "text", content: text });
        }
      }
    }
  }

  const deduped = [];
  for (const it of items) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.type === it.type && prev.content === it.content && it.content) continue;
    if (prev && prev.type === "image" && it.type === "image" && prev.url === it.url) continue;
    deduped.push(it);
  }

  return deduped;
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
  // 1. 如果已有旧排版块，先清空重置
  const childrenRes = await client.docx.v1.documentBlockChildren.get({
    path: { document_id: docId, block_id: docId },
  }).catch(() => ({ data: { items: [] } }));
  const currentCount = childrenRes?.data?.items?.length || 0;
  if (currentCount > 0) {
    console.log(`- 正在清空旧版未加粗排版区块 (${currentCount} 个)，准备重新注入高对比度精美排版...`);
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
    } else if (item.type === "text") {
      pendingTextBlocks.push({
        block_type: 2,
        text: { elements: parseInlineMarkdownElements(item.content) },
      });
    } else if (item.type === "image") {
      // 1. Flush any text blocks prior to this image
      await flushTextBlocks();

      // 2. Read local image buffer
      const localImagePath = path.join(attachmentsAbsDir, item.filename);
      let imgBuf;
      try {
        imgBuf = await fs.readFile(localImagePath);
      } catch (err) {
        console.warn(`[图片跳过] 本地未找到图片: ${localImagePath}`);
        continue;
      }

      // 3. Create image block in docx
      try {
        const imgBlockRes = await withRetry(() =>
          client.docx.v1.documentBlockChildren.create({
            path: { document_id: docId, block_id: docId },
            data: { children: [{ block_type: 27, image: {} }] },
          })
        );
        const imgBlockId = imgBlockRes?.data?.children?.[0]?.block_id;
        if (!imgBlockId) throw new Error("创建图片块未返回 block_id");

        // 4. Upload media to Feishu
        const uploadRes = await withRetry(() =>
          client.drive.v1.media.uploadAll({
            data: {
              file_name: item.filename,
              parent_type: "docx_image",
              parent_node: imgBlockId,
              size: imgBuf.length,
              file: imgBuf,
            },
          })
        );
        const fileToken = uploadRes?.data?.file_token || uploadRes?.file_token;
        if (!fileToken) throw new Error("上传图片素材未返回 file_token");

        // 5. Patch image block with token
        await withRetry(() =>
          client.docx.v1.documentBlock.patch({
            path: { document_id: docId, block_id: imgBlockId },
            data: { replace_image: { token: fileToken } },
          })
        );
        console.log(`  🖼️ 成功嵌入云文档原生图片块: ${item.filename} (token: ${fileToken.slice(0, 10)}...)`);
        await sleep(150);
      } catch (e) {
        console.warn(`  ⚠️ 插入图片块失败: ${item.filename}: ${e.message}`);
      }
    }
  }

  // Flush remaining text blocks
  await flushTextBlocks();
}

async function main() {
  const store = new FeishuCredentialStore();
  const cred = await store.load();
  if (!cred?.appId || !cred?.appSecret) throw new Error("飞书凭据未配置");

  const lark = await import("@larksuiteoapi/node-sdk");
  const client = new lark.Client({ appId: cred.appId, appSecret: cred.appSecret });

  // 1. 获取 Wiki 根节点下的分类节点映射
  console.log(`=== 正在获取 Wiki 空间目录映射 ===`);
  const rootChildrenRes = await client.wiki.v2.spaceNode.list({
    path: { space_id: SPACE_ID },
    params: { parent_node_token: ROOT_PARENT_TOKEN, page_size: 50 },
  });
  const rootNodes = rootChildrenRes.data?.items || [];
  const categoryMap = new Map();

  for (const n of rootNodes) {
    if (n.title.startsWith("06 - AI 原生组织")) categoryMap.set("06_organization", n.node_token);
    if (n.title.includes("哲学与元认知")) categoryMap.set("10_philosophy", n.node_token);
  }

  console.log(`分类节点就绪:`, Array.from(categoryMap.keys()));

  // 2. 依次收录微信长文
  for (let i = 0; i < WECHAT_ARTICLES.length; i++) {
    const art = WECHAT_ARTICLES[i];
    console.log(`\n======================================================`);
    console.log(`[${i + 1}/${WECHAT_ARTICLES.length}] 正在进行高对比度精美重构: ${art.title}`);
    console.log(`======================================================`);

    // A. 抓取与解析微信正文
    console.log(`1. 正在从微信抓取长文 HTML...`);
    const res = await fetch(art.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" },
    });
    const html = await res.text();
    const startIdx = html.indexOf('id="js_content"');
    const openTagEnd = html.indexOf(">", startIdx) + 1;
    const scriptIdx = html.indexOf("<script", openTagEnd);
    const rawBodyHtml = html.slice(openTagEnd, scriptIdx);

    const items = parseWeChatHtml(rawBodyHtml, art.imagePrefix);
    console.log(`2. 正文解析完成: 共 ${items.length} 个结构元素（含 ${items.filter(x => x.type === "image").length} 张高清配图，已注入主动重点加粗）`);

    // B. 下载图片到本地 attachments 目录
    const attachmentsAbsDir = path.resolve(PATHS.vaultRoot, art.attachmentsDir);
    await fs.mkdir(attachmentsAbsDir, { recursive: true });
    for (const it of items) {
      if (it.type === "image") {
        const destPath = path.join(attachmentsAbsDir, it.filename);
        await downloadImage(it.url, destPath);
      }
    }
    console.log(`✅ 本地图片全部持久化核对完成`);

    // C. 组装本地 Markdown 笔记
    console.log(`3. 正在生成带重点加粗的本地 Markdown 规范笔记...`);
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
    mdLines.push(`\n\n\n\n`);

    for (const it of items) {
      if (it.type === "heading") {
        const prefix = "#".repeat(it.level || 2);
        mdLines.push(`\n${prefix} ${it.content}\n`);
      } else if (it.type === "quote") {
        mdLines.push(`\n> ${it.content}\n`);
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

    // D. 挂载到飞书 Wiki 目录树
    console.log(`4. 正在刷新飞书 Wiki 原生云文档（注入加粗重点与原图块）...`);
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
        // 显式插入 3 行空行，形成清晰呼吸感与视觉层级区隔
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
      console.log(`✅ 飞书云文档加粗图文排版重构完成！`);
    }

    // E. 更新多维表格大盘 (Table 2)
    console.log(`5. 正在核验多维表格大盘 (Table 2)...`);
    const relVaultPath = `vault/${art.targetRelPath}`.replace(/\\/g, "/");

    const searchRes = await client.bitable.appTableRecord.list({
      path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
      params: { page_size: 50 },
    });
    const existingRec = (searchRes.data?.items || []).find((r) => r.fields["笔记名称"] === art.title);

    const recordFields = {
      "笔记名称": art.title,
      "知识领域": art.bitableDomain,
      "核心专题": art.bitableTopic,
      "本地相对路径": relVaultPath,
      "核心要点摘要": art.leadQuote.slice(0, 500),
      "标签": art.tags,
      "完整正文": fullMarkdown.slice(0, 18000),
      "云文档链接": { text: "📖 知识库 Wiki", link: wikiUrl },
    };

    if (existingRec) {
      await client.bitable.appTableRecord.update({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID, record_id: existingRec.record_id },
        data: { fields: recordFields },
      });
      console.log(`✅ 已更新多维表格大盘记录: ${existingRec.record_id}`);
    } else {
      const bitableRes = await client.bitable.appTableRecord.create({
        path: { app_token: DEFAULT_APP_TOKEN, table_id: DEFAULT_CATALOG_TABLE_ID },
        data: { fields: recordFields },
      });
      console.log(`✅ 已新增多维表格大盘记录: ${bitableRes.data?.record?.record_id}`);
    }
  }

  console.log(`\n🎉 全部两篇长文已完成排版升级、重点加粗、图片原生嵌入与三端对齐！`);
}

main().catch((err) => {
  console.error("执行异常:", err);
  process.exit(1);
});
