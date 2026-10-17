import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
  KNOWLEDGE_SEARCH_TOOL_NAME,
  readKnowledgeSnippetJson,
  searchKnowledgeNotes,
} from "./knowledge-tools.mjs";
import { FETCH_URL_TOOL_NAME, fetchKnowledgeUrl } from "./fetch-tools.mjs";
import { assertIntegerRange, canonicalToolName } from "./tool-args.mjs";

export const name = "syno-capabilities";
export const inject = ["tools"];

function registerCoreTools(ctx) {
  ctx.tools.register(defineTool({
    name: canonicalToolName(KNOWLEDGE_SEARCH_TOOL_NAME),
    description: "搜索 Syno 知识库（in-process 试用工具，与 Bridge 并存，B5 波次后接管 canonical 名称）",
    parameters: {
      query: { type: "string", required: true, description: "搜索词" },
      limit: { type: "integer", description: "返回条数上限（1-20，默认 8）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => searchKnowledgeNotes({ query: args.query, limit: args.limit }),
  }));
  ctx.tools.register(defineTool({
    name: canonicalToolName(KNOWLEDGE_READ_SNIPPET_TOOL_NAME),
    description: "按搜索结果 excerptOffset 定位读取非敏感笔记；必要时用 nextOffset 续读，null 表示文末",
    parameters: {
      path: { type: "string", required: true, description: "vault/... 逻辑路径" },
      maxChars: { type: "integer", description: "片段字符上限（200-8000，默认 6000）" },
      offset: { type: "integer", description: "起始字符偏移（默认 0）；使用 excerptOffset 或上次 nextOffset" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => {
      assertIntegerRange(args.maxChars, 200, 8000, "maxChars");
      return readKnowledgeSnippetJson({ path: args.path, maxChars: args.maxChars, offset: args.offset });
    },
  }));
  ctx.tools.register(defineTool({
    name: canonicalToolName(FETCH_URL_TOOL_NAME),
    description: "受控读取公网网页正文。主人对话里命中反爬验证墙时自动改用本机浏览器后台窗口重读，并保留窗口等待主人完成验证（不借标签页、不代替主人验证）；blocked 非空表示仍未取得正文，不得把验证页当文章；可继续搜索公开替代来源",
    parameters: {
      url: { type: "string", required: true, description: "公网 URL" },
      maxChars: { type: "integer", description: "正文上限（1000-100000）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args, exec) => {
      assertIntegerRange(args.maxChars, 1000, 100000, "maxChars");
      return fetchKnowledgeUrl({ url: args.url, maxChars: args.maxChars, sessionId: exec?.agent?.id || null });
    },
  }));
}

export function apply(ctx) {
  // 默认（含未设置）= 插件接管：注册 canonical syno_* 工具；`SYNO_CHAT_TOOLS=bridge` 回滚模式下
  // 只有当开发闸门 `SYNO_CAPABILITIES_TOOLS=1` 打开时才注册开发名（两套并存用于对照）。
  const chatTools = String(process.env.SYNO_CHAT_TOOLS || "").trim();
  if (chatTools === "bridge" && process.env.SYNO_CAPABILITIES_TOOLS !== "1") return;
  registerCoreTools(ctx);
}
