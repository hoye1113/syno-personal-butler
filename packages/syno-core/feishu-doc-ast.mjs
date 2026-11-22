import { promises as fs } from "node:fs";
import path from "node:path";

import { FeishuPublisher, checked } from "./feishu-bitable-sync.mjs";

const PARENT_TITLE = "P5 信息雷达";

function textElements(content) {
  return [{ text_run: { content: String(content ?? "") } }];
}

function textBlock(content) {
  return { block_type: 2, text: { elements: textElements(content) } };
}

export function renderAstToFeishuBlocks(ast) {
  const blocks = [];
  for (const block of ast?.blocks || []) {
    if (block.type === "heading") {
      const level = [1, 2, 3].includes(Number(block.level)) ? Number(block.level) : 2;
      const key = level === 1 ? "heading1" : level === 2 ? "heading2" : "heading3";
      blocks.push({
        block_type: level === 1 ? 3 : level === 2 ? 4 : 5,
        [key]: { elements: textElements(block.text) },
      });
    } else if (block.type === "paragraph") {
      blocks.push(textBlock(block.text));
    } else if (block.type === "bullets") {
      for (const item of block.items || []) {
        blocks.push({ block_type: 12, bullet: { elements: textElements(item) } });
      }
    } else if (block.type === "link") {
      blocks.push(textBlock(`${block.text || "链接"}：${block.url || ""}`));
    } else if (block.type === "divider") {
      blocks.push({ block_type: 22, divider: {} });
    }
  }
  return blocks;
}

async function readState(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
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

/**
 * The Host owns Feishu credentials and docx blocks. The plugin only supplies
 * a neutral AST, so a plugin upgrade cannot change the outbound document contract.
 */
export async function createFeishuDocFromAst({
  ast, configPath, stateFile, publisher = new FeishuPublisher(), log = () => {},
} = {}) {
  if (!ast?.date || !Array.isArray(ast.blocks)) throw new Error("缺少 P5 文档 AST");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  if (config.mode === "disabled") throw Object.assign(new Error("知识发布目标未启用"), { code: "P5_DOC_DISABLED" });
  if (!config.wikiSpaceId || !config.wikiParentId) throw new Error("飞书发布配置缺少 wikiSpaceId／wikiParentId");
  const client = await publisher.api();
  const state = await readState(stateFile);
  const linkBase = config.wikiOrigin || "https://www.feishu.cn";

  if (!state.parentNodeToken || state.spaceId !== config.wikiSpaceId) {
    const created = checked(await client.wiki.spaceNode.create({
      path: { space_id: config.wikiSpaceId },
      data: { obj_type: "docx", node_type: "origin", parent_node_token: config.wikiParentId, title: PARENT_TITLE },
    }));
    if (!created.node?.node_token || !created.node?.obj_token) throw new Error("P5 父节点创建缺少资源身份");
    Object.assign(state, {
      spaceId: config.wikiSpaceId,
      parentNodeToken: created.node.node_token,
      parentDocId: created.node.obj_token,
      parentLink: `${linkBase}/wiki/${created.node.node_token}`,
    });
    await writeState(stateFile, state);
  }

  state.docs = state.docs && typeof state.docs === "object" ? state.docs : {};
  let doc = state.docs[ast.date];
  if (!doc?.nodeToken || !doc?.docId) {
    const created = checked(await client.wiki.spaceNode.create({
      path: { space_id: config.wikiSpaceId },
      data: {
        obj_type: "docx",
        node_type: "origin",
        parent_node_token: state.parentNodeToken,
        title: ast.title || `P5 信息雷达 · ${ast.date}`,
      },
    }));
    if (!created.node?.node_token || !created.node?.obj_token) throw new Error("P5 日报文档创建缺少资源身份");
    doc = {
      nodeToken: created.node.node_token,
      docId: created.node.obj_token,
      link: `${linkBase}/wiki/${created.node.node_token}`,
      createdAt: new Date().toISOString(),
    };
    state.docs[ast.date] = doc;
    await writeState(stateFile, state);
  }

  const blocks = renderAstToFeishuBlocks(ast);
  await clearBlocks(client, doc.docId);
  await addBlocks(client, doc.docId, blocks);
  doc.updatedAt = new Date().toISOString();
  doc.itemCount = ast.items?.length ?? 0;
  await writeState(stateFile, state);
  log("p5-doc-ast-written", { date: ast.date, link: doc.link, blocks: blocks.length, items: doc.itemCount });
  return { link: doc.link, nodeToken: doc.nodeToken, docId: doc.docId, itemCount: doc.itemCount, blocks: blocks.length };
}
