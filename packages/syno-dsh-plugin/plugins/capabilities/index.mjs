import { randomUUID } from "node:crypto";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { readKnowledgeSnippetJson, searchKnowledgeNotes } from "./knowledge-tools.mjs";

export const name = "syno-capabilities";
export const inject = ["agents", "agentPresets", "workspaceRegistry", "tools"];

const SPIKE_PREFIX = "[syno-spike-a]";
const SPIKE_TIMEOUT_MS = Number(process.env.SYNO_SPIKE_TIMEOUT_MS || 180_000);
const SPIKE_MODEL = process.env.SYNO_SPIKE_MODEL || "deepseek-v4-flash";
const DEV_TOOL_NAME = "syno_core_knowledge_search";

function line(text) {
  process.stdout.write(`${SPIKE_PREFIX} ${text}\n`);
}

function registerDevTools(ctx) {
  ctx.tools.register(defineTool({
    name: DEV_TOOL_NAME,
    description: "搜索 Syno 知识库（in-process 试用工具，与 Bridge 并存，Phase B 后接管 canonical 名称）",
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
    name: "syno_core_knowledge_read_snippet",
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
  if (process.env.SYNO_CAPABILITIES_TOOLS === "1") registerDevTools(ctx);
  if (process.env.SYNO_CAPABILITIES_SPIKE !== "1") return;
  runSpike(ctx).catch((error) => {
    line(`SPIKE_A_FAIL ${error?.stack || String(error)}`);
    setTimeout(() => process.exit(1), 100);
  });
}

async function runSpike(ctx) {
  const started = Date.now();
  const preset = await ctx.agentPresets.resolve("syno");
  line(`preset-resolved ${preset.id}`);
  const scope = await ctx.agentPresets.acquireScope(preset.id);
  void scope;

  const cwd = process.env.DSH_CWD || process.cwd();
  const workspace = await ctx.workspaceRegistry.create(cwd);
  const sessionId = `spike-${randomUUID()}`;

  const observed = { sessionEvents: 0, assistantMessages: 0, toolCalls: [], finalText: "" };
  const turnWaiters = [];
  ctx.on("session/event", (session, event) => {
    const id = session?.header?.id ?? session?.id;
    if (id !== sessionId) return;
    observed.sessionEvents += 1;
    if (event.type === "assistant/message") {
      observed.assistantMessages += 1;
      const text = event.data.message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      if (text.length > 0) observed.finalText = text;
    } else if (event.type === "tool/call") {
      observed.toolCalls.push(String(event.data?.name || ""));
    } else if (event.type === "turn/end") {
      const waiter = turnWaiters.shift();
      if (waiter) waiter(event.data?.reason?.kind ?? null);
    }
  }, { global: true });

  const handle = await ctx.agents.create({
    sessionId,
    meta: { cwd: workspace.path, agentPreset: preset.id },
    agentOptions: { provider: "deepseek-official", model: SPIKE_MODEL },
    setup: async (agentCtx) => {
      await ctx.agentPresets.mount(agentCtx, preset.id);
    },
  });
  await workspace.attachSession(sessionId);
  line("session-created");

  const nextTurn = () => new Promise((resolve) => turnWaiters.push(resolve));
  const timed = (promise) => Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`spike timeout after ${SPIKE_TIMEOUT_MS}ms`)), SPIKE_TIMEOUT_MS);
    }),
  ]);

  const first = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: "只回复单词：pong" }],
    source: { kind: "user" },
  }));
  const firstReason = await timed(first);
  const firstText = observed.finalText;
  line(`turn-1 ${firstReason} ${firstText}`);
  if (firstReason !== "completed" || firstText.trim() !== "pong") {
    line(`SPIKE_A_FAIL turn-1 mismatch ${JSON.stringify({ firstReason, firstText })}`);
    setTimeout(() => process.exit(1), 100);
    return;
  }

  const second = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: `请调用 ${DEV_TOOL_NAME} 工具（query 参数用「Agent」，limit=2），然后用一句中文告诉我返回了几条。` }],
    source: { kind: "user" },
  }));
  const secondReason = await timed(second);
  const secondText = observed.finalText;
  line(`turn-2 ${secondReason} ${secondText}`);

  const third = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: "用 syno_core_knowledge_read_snippet 工具读取你刚才搜索结果里第一条笔记的 path（maxChars=300），然后用一句话告诉我它的标题。" }],
    source: { kind: "user" },
  }));
  const thirdReason = await timed(third);
  const thirdText = observed.finalText;
  line(`turn-3 ${thirdReason} ${thirdText}`);

  const toolCalled = observed.toolCalls.includes(DEV_TOOL_NAME);
  const readSnippetCalled = observed.toolCalls.includes("syno_core_knowledge_read_snippet");
  const payload = {
    sessionId,
    preset: preset.id,
    assistantMessages: observed.assistantMessages,
    sessionEvents: observed.sessionEvents,
    toolCalls: observed.toolCalls,
    firstReason,
    firstText,
    secondReason,
    secondText,
    thirdReason,
    thirdText,
    elapsedMs: Date.now() - started,
  };
  if (!toolCalled || !readSnippetCalled || secondReason !== "completed" || thirdReason !== "completed") {
    line(`SPIKE_A_FAIL tool-call mismatch ${JSON.stringify(payload)}`);
    setTimeout(() => process.exit(1), 100);
    return;
  }
  line(`SPIKE_A_OK ${JSON.stringify(payload)}`);
  setTimeout(() => process.exit(0), 100);
}
