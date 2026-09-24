import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
  KNOWLEDGE_SEARCH_TOOL_NAME,
  readKnowledgeSnippetJson,
  searchKnowledgeNotes,
} from "./knowledge-tools.mjs";
import { INSPIRATION_FEEDBACK_TOOL_NAME, recordInspirationFeedback } from "./inspiration-tools.mjs";
import { FETCH_URL_TOOL_NAME, fetchKnowledgeUrl } from "./fetch-tools.mjs";
import {
  CAPTURE_LIST_PENDING_TOOL_NAME,
  CAPTURE_START_TOOL_NAME,
  CAPTURE_STATUS_TOOL_NAME,
  captureListPending,
  captureStatus,
  startCapture,
} from "./capture-tools.mjs";
import {
  JOBS_LIST_TOOL_NAME,
  JOBS_SUBMIT_TOOL_NAME,
  TODAY_READ_TOOL_NAME,
  defaultOpsTools,
} from "./ops-tools.mjs";
import { assertIntegerRange } from "./tool-args.mjs";

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
    execute: (args) => {
      assertIntegerRange(args.maxChars, 200, 8000, "maxChars");
      return readKnowledgeSnippetJson({ path: args.path, maxChars: args.maxChars });
    },
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
  ctx.tools.register(defineTool({
    name: FETCH_URL_TOOL_NAME,
    description: "抓取并读取一个公网网页的正文（in-process 试用工具，直抓；浏览器升级与续办在通道迁移后接入）",
    parameters: {
      url: { type: "string", required: true, description: "公网 URL" },
      maxChars: { type: "integer", description: "正文上限（1000-100000）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => {
      assertIntegerRange(args.maxChars, 1000, 100000, "maxChars");
      return fetchKnowledgeUrl({ url: args.url, maxChars: args.maxChars });
    },
  }));
  ctx.tools.register(defineTool({
    name: CAPTURE_START_TOOL_NAME,
    description: "接收待收录内容并启动可恢复的 IngestWorkflow（in-process 试用工具；分析接入留待 sidecar 迁移）",
    parameters: {
      kind: { type: "string", required: true, description: "url | text | markdown | txt | personal", enum: ["url", "text", "markdown", "txt", "personal"] },
      value: { type: "string", required: true, description: "收录内容（URL 或正文）" },
      title: { type: "string", description: "可选标题" },
      filename: { type: "string", description: "可选文件名（txt/文件类收录）" },
      sourceKind: { type: "string", description: "personal | unknown", enum: ["personal", "unknown"] },
      analysisMode: { type: "string", description: "remote | local-only", enum: ["remote", "local-only"] },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => startCapture({
      kind: args.kind,
      value: args.value,
      ...(args.title ? { title: args.title } : {}),
      ...(args.filename ? { filename: args.filename } : {}),
      ...(args.sourceKind ? { sourceKind: args.sourceKind } : {}),
      ...(args.analysisMode ? { analysisMode: args.analysisMode } : {}),
    }),
  }));
  ctx.tools.register(defineTool({
    name: CAPTURE_STATUS_TOOL_NAME,
    description: "读取一个 Artifact 的收录方案状态（in-process 试用工具）",
    parameters: {
      artifactId: { type: "string", required: true, description: "capture.start 返回的 artifact.id" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => captureStatus({ artifactId: args.artifactId }),
  }));
  ctx.tools.register(defineTool({
    name: CAPTURE_LIST_PENDING_TOOL_NAME,
    description: "列出尚未完成的收录工作流（in-process 试用工具）",
    parameters: {},
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: () => captureListPending(),
  }));
  ctx.tools.register(defineTool({
    name: JOBS_LIST_TOOL_NAME,
    description: "查看任务与执行状态（in-process 试用工具）",
    parameters: {
      limit: { type: "integer", description: "返回条数上限（1-100，默认 20）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => {
      assertIntegerRange(args.limit, 1, 100, "limit");
      return defaultOpsTools().jobsList({ limit: args.limit });
    },
  }));
  ctx.tools.register(defineTool({
    name: JOBS_SUBMIT_TOOL_NAME,
    description: "提交受 Policy 约束的动作、长期记忆候选、报告或选题 Job（in-process 试用工具，仍走 Job/Validator/GitGuard）",
    parameters: {
      mode: { type: "string", required: true, description: "action | memory | report | output", enum: ["action", "memory", "report", "output"] },
      text: { type: "string", required: true, description: "Job 文本（动作标题/记忆陈述/报告类型/选题标题）" },
      reason: { type: "string", description: "可选理由（memory/output 模式）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => defaultOpsTools().jobsSubmit({ mode: args.mode, text: args.text, reason: args.reason }),
  }));
  ctx.tools.register(defineTool({
    name: TODAY_READ_TOOL_NAME,
    description: "读取按目标、承诺和到期信号排序的今日工作台（in-process 试用工具）",
    parameters: {
      capacity: { type: "integer", description: "返回条数上限（1-20，默认 10）" },
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: String(value) }],
    },
    execute: (args) => {
      assertIntegerRange(args.capacity, 1, 20, "capacity");
      return defaultOpsTools().todayRead({ capacity: args.capacity });
    },
  }));
}

export function apply(ctx) {
  if (process.env.SYNO_CAPABILITIES_TOOLS === "1") registerCoreTools(ctx);
}
