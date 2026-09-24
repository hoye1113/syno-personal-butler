import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
  KNOWLEDGE_SEARCH_TOOL_NAME,
  readKnowledgeSnippetJson,
  searchKnowledgeNotes,
} from "./knowledge-tools.mjs";

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
}

export function apply(ctx) {
  if (process.env.SYNO_CAPABILITIES_TOOLS === "1") registerCoreTools(ctx);
}
