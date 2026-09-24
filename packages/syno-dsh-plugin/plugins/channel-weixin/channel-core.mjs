import { randomUUID } from "node:crypto";

import { createUserMessage } from "@deepseek-ai/dsh-llm";

import { WeixinSessionMap } from "./session-map.mjs";
import { awaitSessionTurn } from "./session-turn.mjs";

const DEFAULT_MODEL = Object.freeze({ provider: "deepseek-official", model: "deepseek-v4-flash" });
const DEFAULT_PRESET = "syno";
const DEFAULT_TIMEOUT_MS = 120_000;

function createInprocessWeixinChannel({
  ctx,
  adapter,
  workspacePath,
  model = DEFAULT_MODEL,
  presetId = DEFAULT_PRESET,
  ownerKey = "local-user",
  threadKey = "main",
  mapping = new WeixinSessionMap(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!ctx) throw new Error("通道核心需要 DSH ctx");
  if (!adapter) throw new Error("通道核心需要 adapter");
  if (!workspacePath) throw new Error("通道核心需要 workspacePath");
  const key = `${ownerKey}:${threadKey}`;
  let currentSessionId = null;

  async function ensureSession() {
    let sessionId = await mapping.get(key);
    if (sessionId && ctx.agents.get(sessionId)) {
      currentSessionId = sessionId;
      return sessionId;
    }
    // 映射存在但 agent 已不在（重启/被回收）：先清映射再重建；resume 复用留待 C2/C5。
    if (sessionId) await mapping.clear(key);
    const preset = await ctx.agentPresets.resolve(presetId);
    const scope = await ctx.agentPresets.acquireScope(preset.id);
    void scope;
    sessionId = `weixin-${ownerKey}-${randomUUID()}`;
    const workspace = await ctx.workspaceRegistry.create(workspacePath);
    await ctx.agents.create({
      sessionId,
      meta: { cwd: workspace.path, agentPreset: preset.id },
      agentOptions: { ...model },
      setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, preset.id); },
    });
    await workspace.attachSession(sessionId);
    await mapping.set(key, sessionId);
    currentSessionId = sessionId;
    return sessionId;
  }

  async function handleInbound(message = {}) {
    const text = String(message.text || "").trim();
    if (!text) return "（空消息：当前仅支持文本）";
    const sessionId = await ensureSession();
    const result = await awaitSessionTurn({
      ctx,
      sessionId,
      sourceKind: "weixin",
      timeoutMs,
      dispatch: (id) => {
        const agent = ctx.agents.get(id);
        if (!agent) throw Object.assign(new Error("通道会话不在运行"), { code: "CHANNEL_SESSION_MISSING" });
        agent.followup(createUserMessage({
          content: [{ type: "text", text }],
          source: { kind: "weixin" },
        }));
      },
    });
    return result.text || "（模型未返回文本，请稍后再试）";
  }

  function attach() {
    adapter.onMessage = async (message = {}) => ({ text: await handleInbound(message) });
    return channel;
  }

  const channel = {
    attach,
    handleInbound,
    sessionKey: key,
    currentSessionId: () => currentSessionId,
  };
  return channel;
}

export { createInprocessWeixinChannel };
