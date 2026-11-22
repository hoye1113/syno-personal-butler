import { promises as fs } from "node:fs";
import path from "node:path";

import { FeishuPublisher, checked } from "../../../packages/syno-core/feishu-bitable-sync.mjs";

const PARENT_TITLE = "P5 信息雷达";

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#(?:39|x27);/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function textElements(content) {
  return [{ text_run: { content: cleanText(content) } }];
}

function textBlock(content) {
  return { block_type: 2, text: { elements: textElements(content) } };
}

function headingBlock(level, content) {
  const type = level === 2 ? 4 : 5;
  const key = level === 2 ? "heading2" : "heading3";
  return { block_type: type, [key]: { elements: textElements(content) } };
}

function bulletBlock(content) {
  return { block_type: 12, bullet: { elements: textElements(content) } };
}

function dividerBlock() {
  return { block_type: 22, divider: {} };
}

function publishedLabel(value) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function renderDailyDocBlocks({ date, items }) {
  const blocks = [
    textBlock(`日期：${date} · 全部 ${items.length} 条（未按画像过滤）`),
    textBlock("按发布时间倒序。每篇列出中文标题、来源、发布时间和中文摘要；回复「跟进 1」或「忽略 1」操作。摘要来自源 feed 或已缓存深读，未逐篇抓取全文。"),
  ];
  items.forEach((entry, index) => {
    const item = entry.item ?? entry;
    const summary = entry.summary ?? entry.article ?? {};
    const titleZh = summary.titleZh || item.title || `候选 ${index + 1}`;
    blocks.push(headingBlock(2, `${index + 1}. ${titleZh}`));
    blocks.push(textBlock([
      `来源：${item.source_name || item.source_id || "未知"}`,
      `类型：${item.kind === "video" ? "视频" : "文章"}`,
      `发布：${publishedLabel(item.published_at)}`,
      item.title && item.title !== titleZh ? `原文标题：${item.title}` : "",
    ].filter(Boolean).join(" · ")));
    const sourceStatus = String(summary.sourceStatus || "");
    blocks.push(textBlock(sourceStatus === "transcript-timed"
      ? "资料范围：视频字幕（含时间戳）"
      : sourceStatus === "transcript-plain"
        ? "资料范围：视频字幕（无时间戳）"
        : sourceStatus.includes("llm-parse-fallback")
          ? "资料范围：正文已抓取，摘要解析失败"
          : sourceStatus.startsWith("article")
            ? "资料范围：正文已抓取"
          : sourceStatus === "feed-translation"
            ? "资料范围：标题 + 源摘要（已翻译，未深读正文）"
            : sourceStatus.startsWith("translation-fallback")
              ? "资料范围：翻译失败，保留原文"
              : sourceStatus.includes("feed-summary")
                ? "资料范围：仅源摘要（正文抓取失败）"
                : "资料范围：源摘要"));
    blocks.push(headingBlock(3, "摘要"));
    blocks.push(textBlock(summary.summaryZh || item.summary || "资料不足。"));
    if (Array.isArray(summary.points) && summary.points.length) {
      blocks.push(headingBlock(3, "核心要点"));
      for (const point of summary.points) blocks.push(bulletBlock(point));
    }
    if (summary.whyZh) {
      blocks.push(headingBlock(3, "为什么值得看"));
      blocks.push(textBlock(summary.whyZh));
    }
    blocks.push(textBlock(`原文：${item.url}`));
    blocks.push(textBlock(`操作：回复「跟进 ${index + 1}」或「忽略 ${index + 1}」`));
    if (index < items.length - 1) blocks.push(dividerBlock());
  });
  return blocks;
}

async function readState(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

async function clearBlocks(client, docId) {
  const items = [];
  let pageToken = null;
  do {
    const data = checked(await client.docx.v1.documentBlockChildren.get({
      path: { document_id: docId, block_id: docId },
      params: { page_size: 500, ...(pageToken ? { page_token: pageToken } : {}) },
    }));
    items.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : null;
    if (data.has_more && !pageToken) throw new Error("Docx 分页不完整");
  } while (pageToken);
  for (let end = items.length; end > 0; end -= 50) {
    checked(await client.docx.v1.documentBlockChildren.batchDelete({
      path: { document_id: docId, block_id: docId },
      data: { start_index: Math.max(0, end - 50), end_index: end },
    }));
  }
}

async function addBlocks(client, docId, blocks) {
  for (let offset = 0; offset < blocks.length; offset += 50) {
    const chunk = blocks.slice(offset, offset + 50);
    const data = checked(await client.docx.v1.documentBlockChildren.create({
      path: { document_id: docId, block_id: docId },
      data: { children: chunk },
    }));
    if (data.children?.length !== chunk.length) throw new Error("Docx 区块写入数量不完整");
  }
}

export async function createFeishuDailyDoc({
  date, items, configPath, stateFile, publisher = new FeishuPublisher(), log = () => {},
} = {}) {
  if (!date || !Array.isArray(items)) throw new Error("每日文档缺少 date 或 items");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (config.mode === "disabled") throw Object.assign(new Error("知识发布目标未启用，无法创建 P5 飞书文档"), { code: "P5_DOC_DISABLED" });
  if (!config.wikiSpaceId || !config.wikiParentId) throw new Error("飞书发布配置缺少 wikiSpaceId／wikiParentId");
  const client = await publisher.api();
  const state = await readState(stateFile);
  const linkBase = config.wikiOrigin || "https://www.feishu.cn";

  if (!state.parentNodeToken || state.spaceId !== config.wikiSpaceId) {
    const created = checked(await client.wiki.spaceNode.create({
      path: { space_id: config.wikiSpaceId },
      data: {
        obj_type: "docx",
        node_type: "origin",
        parent_node_token: config.wikiParentId,
        title: PARENT_TITLE,
      },
    }));
    if (!created.node?.node_token || !created.node?.obj_token) throw new Error("P5 父节点创建缺少资源身份");
    state.spaceId = config.wikiSpaceId;
    state.parentNodeToken = created.node.node_token;
    state.parentDocId = created.node.obj_token;
    state.parentLink = `${linkBase}/wiki/${created.node.node_token}`;
    await writeState(stateFile, state);
    log("p5-doc-parent-created", { link: state.parentLink });
  }

  state.docs = state.docs && typeof state.docs === "object" ? state.docs : {};
  let doc = state.docs[date];
  if (!doc?.nodeToken || !doc?.docId) {
    const created = checked(await client.wiki.spaceNode.create({
      path: { space_id: config.wikiSpaceId },
      data: {
        obj_type: "docx",
        node_type: "origin",
        parent_node_token: state.parentNodeToken,
        title: `P5 信息雷达 · ${date}`,
      },
    }));
    if (!created.node?.node_token || !created.node?.obj_token) throw new Error("P5 日报文档创建缺少资源身份");
    doc = {
      nodeToken: created.node.node_token,
      docId: created.node.obj_token,
      link: `${linkBase}/wiki/${created.node.node_token}`,
      createdAt: new Date().toISOString(),
    };
    state.docs[date] = doc;
    await writeState(stateFile, state);
  }

  const blocks = renderDailyDocBlocks({ date, items });
  await clearBlocks(client, doc.docId);
  await addBlocks(client, doc.docId, blocks);
  doc.updatedAt = new Date().toISOString();
  doc.itemCount = items.length;
  await writeState(stateFile, state);
  log("p5-doc-written", { date, link: doc.link, blocks: blocks.length });
  return { link: doc.link, nodeToken: doc.nodeToken, docId: doc.docId, itemCount: items.length, blocks: blocks.length };
}
