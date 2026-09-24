import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
  KNOWLEDGE_SEARCH_TOOL_NAME,
  readKnowledgeSnippetJson,
  searchKnowledgeNotes,
} from "./knowledge-tools.mjs";
import { INSPIRATION_FEEDBACK_TOOL_NAME, recordInspirationFeedback } from "./inspiration-tools.mjs";

export const name = "syno-capabilities";
export const inject = ["tools"];

function registerCoreTools(ctx) {
  ctx.tools.register(defineTool({
    name: KNOWLEDGE_SEARCH_TOOL_NAME,
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
    name: KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
    description: "读取单篇非敏感知识笔记的限长必要片段（in-process 试用工具）",
    parameters: {
      path: { type: "string", required: true, description: "vault/... 逻辑路径" },
      maxChars: { type: "integer", description: "片段字符上限（200-8000，默认 6000）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => readKnowledgeSnippetJson({ path: args.path, maxChars: args.maxChars }),
  }));
  ctx.tools.register(defineTool({
    name: INSPIRATION_FEEDBACK_TOOL_NAME,
    description: [
      "记录主人对最近一张「今日灵感」卡片的评价（in-process 试用工具）。仅当主人明确评价这张卡时调用一次：",
      "有用/有启发/不错 → useful；一般/还行/凑合 → neutral；没用/不对味/无感 → not_useful。",
      "返回 recorded:false 表示当前没有待反馈的卡，如实告诉主人即可，不要编造已记录。",
    ].join(""),
    parameters: {
      feedback: { type: "string", required: true, description: "useful | neutral | not_useful", enum: ["useful", "neutral", "not_useful"] },
      inspirationId: { type: "string", description: "可选：明确的灵感卡 ID（跨 24h 回填）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: async (args) => JSON.stringify(await recordInspirationFeedback({
      feedback: args.feedback,
      inspirationId: args.inspirationId,
    })),
  }));
}

export function apply(ctx) {
  if (process.env.SYNO_CAPABILITIES_TOOLS === "1") registerCoreTools(ctx);
}
