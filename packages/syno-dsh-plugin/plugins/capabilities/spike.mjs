import { randomUUID } from "node:crypto";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { createInprocessWeixinChannel } from "../channel-weixin/channel-core.mjs";
import { createWeixinChannelHandler } from "../channel-weixin/channel-handler.mjs";
import { createOpsRuntime } from "./ops-tools.mjs";
import { KNOWLEDGE_READ_SNIPPET_TOOL_NAME, KNOWLEDGE_SEARCH_TOOL_NAME } from "./knowledge-tools.mjs";
import { canonicalToolName } from "./tool-args.mjs";

export const name = "syno-capabilities-spike";
export const inject = ["agents", "agentPresets", "workspaceRegistry"];

const SPIKE_PREFIX = "[syno-spike-a]";
const SPIKE_TIMEOUT_MS = Number(process.env.SYNO_SPIKE_TIMEOUT_MS || 180_000);
const SPIKE_MODEL = process.env.SYNO_SPIKE_MODEL || "kimi-for-coding";
const SEARCH_TOOL = canonicalToolName(KNOWLEDGE_SEARCH_TOOL_NAME);
const READ_SNIPPET_TOOL = canonicalToolName(KNOWLEDGE_READ_SNIPPET_TOOL_NAME);

function line(text) {
  process.stdout.write(`${SPIKE_PREFIX} ${text}\n`);
}

export function apply(ctx) {
  if (process.env.SYNO_WEIXIN_SPIKE === "1") {
    runWeixinSpike(ctx).catch((error) => {
      line(`WEIXIN_SPIKE_FAIL ${error?.stack || String(error)}`);
      setTimeout(() => process.exit(1), 100);
    });
    return;
  }
  if (process.env.SYNO_CAPABILITIES_SPIKE !== "1") return;
  runSpike(ctx).catch((error) => {
    line(`SPIKE_A_FAIL ${error?.stack || String(error)}`);
    setTimeout(() => process.exit(1), 100);
  });
}

async function runWeixinSpike(ctx) {
  const adapter = {
    async send() { return { delivered: true }; },
    async start() {},
    async stop() {},
  };
  const { core } = createOpsRuntime();
  const channel = createInprocessWeixinChannel({
    ctx,
    adapter,
    workspacePath: process.env.DSH_CWD || process.cwd(),
    timeoutMs: SPIKE_TIMEOUT_MS,
    createHandler: (runtime) => createWeixinChannelHandler({ runtime, core }),
  });
  channel.attach();
  line("weixin-channel-attached");
  const reset = await adapter.onMessage({
    channel: "weixin",
    text: "新对话",
    senderId: "spike-owner",
    contextToken: "spike-token",
    id: `spike-weixin-reset-${randomUUID()}`,
  });
  if (String(reset?.text || "") !== "已开启新对话。") {
    line(`WEIXIN_SPIKE_FAIL reset=${JSON.stringify(reset?.text || "")}`);
    setTimeout(() => process.exit(1), 100);
    return;
  }
  const reply = await adapter.onMessage({
    channel: "weixin",
    text: "只回复单词：pong",
    senderId: "spike-owner",
    contextToken: "spike-token",
    id: `spike-weixin-${randomUUID()}`,
  });
  const text = String(reply?.text || "");
  if (text.trim() !== "pong") {
    line(`WEIXIN_SPIKE_FAIL text=${JSON.stringify(text)}`);
    setTimeout(() => process.exit(1), 100);
    return;
  }
  line(`WEIXIN_SPIKE_OK ${JSON.stringify({ sessionId: channel.currentSessionId(), reset: reset.text, text })}`);
  setTimeout(() => process.exit(0), 100);
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
    agentOptions: { provider: "kimi-coding", model: SPIKE_MODEL },
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
    content: [{ type: "text", text: `请调用 ${SEARCH_TOOL} 工具（query 参数用「Agent」，limit=2），然后用一句中文告诉我返回了几条。` }],
    source: { kind: "user" },
  }));
  const secondReason = await timed(second);
  const secondText = observed.finalText;
  line(`turn-2 ${secondReason} ${secondText}`);

  const third = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: `用 ${READ_SNIPPET_TOOL} 工具读取你刚才搜索结果里第一条笔记的 path（maxChars=300），然后用一句话告诉我它的标题。` }],
    source: { kind: "user" },
  }));
  const thirdReason = await timed(third);
  const thirdText = observed.finalText;
  line(`turn-3 ${thirdReason} ${thirdText}`);

  const fourth = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: "请调用 web_search 工具搜索「今天的 AI 新闻」，然后用一句话告诉我返回了几条来源。" }],
    source: { kind: "user" },
  }));
  const fourthReason = await timed(fourth);
  const fourthText = observed.finalText;
  line(`turn-4 ${fourthReason} ${fourthText}`);

  const fifth = nextTurn();
  observed.finalText = "";
  handle.agent.followup(createUserMessage({
    content: [{ type: "text", text: "请调用 web_fetch 工具读取 https://example.com ，然后用一句话说明页面标题。" }],
    source: { kind: "user" },
  }));
  const fifthReason = await timed(fifth);
  const fifthText = observed.finalText;
  line(`turn-5 ${fifthReason} ${fifthText}`);

  const toolCalled = observed.toolCalls.includes(SEARCH_TOOL);
  const readSnippetCalled = observed.toolCalls.includes(READ_SNIPPET_TOOL);
  const webSearchCalled = observed.toolCalls.includes("web_search");
  const webFetchCalled = observed.toolCalls.includes("web_fetch");
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
    fourthReason,
    fourthText,
    fifthReason,
    fifthText,
    elapsedMs: Date.now() - started,
  };
  if (!toolCalled || !readSnippetCalled || !webSearchCalled || !webFetchCalled || secondReason !== "completed" || thirdReason !== "completed" || fourthReason !== "completed" || fifthReason !== "completed") {
    line(`SPIKE_A_FAIL tool-call mismatch ${JSON.stringify(payload)}`);
    setTimeout(() => process.exit(1), 100);
    return;
  }
  line(`SPIKE_A_OK ${JSON.stringify(payload)}`);
  setTimeout(() => process.exit(0), 100);
}
