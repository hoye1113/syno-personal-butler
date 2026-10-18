import { BUSINESS_TOOL_SPECS, BUSINESS_TOOL_NAMES } from "../../packages/syno-core/business-tools.mjs";
/**
 * Out-of-tree Cordis plugin: register Syno Tool Bridge tools under native
 * `syno_*` names (not `mcp__syno__*`). Loaded by dsh-jsonrpc-agent from
 * Syno's cordis.yml; talks HTTP JSON-RPC to `/api/syno/bridge/mcp`.
 */
import { isCoreChatToolName } from "./syno-tool-sets.mjs";

export const name = "syno-tool-bridge";
export const inject = ["tools"];

const FALLBACK_TOOLS = Object.freeze([
  ["knowledge_search", "Search the Syno vault"],
  ["knowledge_read_snippet", "Read a vault snippet"],
  ["knowledge_fetch_url", "Fetch a URL through Syno"],
  ["browser_status", "Browser capture status"],
  ["browser_navigate", "Browser navigate"],
  ["browser_snapshot", "Browser snapshot"],
  ["browser_list_tabs", "List browser tabs"],
  ["browser_close_session", "Close a browser session"],
]);

function selectToolDefinitions(definitions, toolSet = "all") {
  const selected = String(toolSet || "all").trim() || "all";
  if (selected === "all") return [...definitions];
  if (selected === "business") return definitions.filter((d) => BUSINESS_TOOL_NAMES.some((n) => n.replaceAll(".", "_") === toBridgeName(d.name)));
  if (selected === "browser") return definitions.filter((d) => toBridgeName(d.name).startsWith("browser_"));
  if (selected === "core") return definitions.filter((definition) => isCoreChatToolName(definition?.name));
  throw new Error(`syno-tool-bridge: unknown toolSet ${selected}`);
}

export function publicSynoToolName(bridgeName) {
  const value = String(bridgeName || "").replaceAll(".", "_");
  return value.startsWith("syno_") ? value : `syno_${value}`;
}

export function toBridgeName(publicName) {
  const value = String(publicName || "").replaceAll(".", "_");
  return value.startsWith("syno_") ? value.slice("syno_".length) : value;
}

function humanTurn(exec, whole = false) {
  const events = exec?.agent?.session?.snapshotEvents?.() || [];
  let start = -1;
  for (const event of events) if (event.type === "turn/start") start = event.seq;
  const message = events.findLast((event) => event.seq > start && event.type === "user/message" && event.data?.source?.kind === "user");
  return whole ? message?.data : message?.data?.id;
}

async function rpc(origin, token, method, params, id) {
  const response = await fetch(origin, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!response.ok) {
    throw new Error(`Syno Tool Bridge HTTP ${response.status}`);
  }
  return response.json();
}

function renderOutput(_args, value) {
  if (value == null) return [{ type: "text", text: "" }];
  if (typeof value === "string") return [{ type: "text", text: value }];
  const content = Array.isArray(value.content)
    ? value.content.filter((block) => block?.type === "text").map((block) => String(block.text || "")).join("\n")
    : "";
  if (content) return [{ type: "text", text: content }];
  return [{ type: "text", text: JSON.stringify(value) }];
}

function registerTool(ctx, origin, token, definition) {
  const publicName = publicSynoToolName(definition.name);
  const bridgeName = toBridgeName(publicName);
  const parameters = definition.inputSchema && typeof definition.inputSchema === "object"
    ? definition.inputSchema
    : { type: "object", properties: {}, additionalProperties: true };
  ctx.tools.register({
    name: publicName,
    description: String(definition.description || publicName),
    parameters,
    output: {
      schema: { type: "object", additionalProperties: true },
      render: renderOutput,
    },
    async execute(args, exec) {
      const payload = await rpc(origin, token, "tools/call", { name: bridgeName, arguments: args || {}, sessionId: exec?.agent?.id, userMessageId: humanTurn(exec) }, `call-${Date.now()}`);
      if (payload?.error) {
        throw new Error(payload.error.message || "Syno Tool Bridge 调用失败");
      }
      if (payload?.result?.isError) throw new Error(payload.result.content?.map((b) => b.text || "").join("\n") || "Syno 工具执行失败");
      return payload?.result || {};
    },
  });
}

export async function apply(ctx, config = {}) {
  // Knowledge reads stay in-process; business tools always use the trusted Host.
  const chatTools = String(process.env.SYNO_CHAT_TOOLS || "").trim();
  const toolSet = chatTools !== "bridge" && config.allowWhenPluginMode !== true ? "business" : config.toolSet;
  const origin = String(process.env.SYNO_BRIDGE_ORIGIN || "").trim();
  const token = String(process.env.SYNO_BRIDGE_TOKEN || "").trim();
  if (!origin || !token) {
    throw new Error("syno-tool-bridge: SYNO_BRIDGE_ORIGIN and SYNO_BRIDGE_TOKEN are required");
  }
  if (toolSet !== "browser" && typeof ctx.inject === "function") ctx.inject(["systemPrompt"], (inner) => {
    const snapshots = new WeakMap();
    inner.systemPrompt.context({ name: "syno:personal-memory", order: 130, text: ({ scope }) => (snapshots.get(scope) || "").replaceAll("{{", "\\u007b\\u007b").replaceAll("}}", "\\u007d\\u007d") });
    inner.on("agent/pre-step", async ({ agent }, next) => {
      const message = humanTurn({ agent }, true);
      if (message) {
        const query = (message.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
        try {
          const result = await rpc(origin, token, "turn/prepare", { sessionId: agent.id, userMessageId: message.id, query }, `memory-${message.id}`);
          snapshots.set(agent, result.result?.text || "个人记忆不可用；旧快照已失效。");
        } catch { snapshots.set(agent, "个人记忆查询失败；旧快照已失效。"); }
      }
      return next();
    });
  });
  let listed = [];
  try {
    await rpc(origin, token, "initialize", {}, "init");
    const listedResponse = await rpc(origin, token, "tools/list", {}, "list");
    listed = listedResponse?.result?.tools || [];
  } catch (error) {
    process.stderr.write(`syno-tool-bridge tools/list failed, using fallback catalog: ${error.message}\n`);
  }
  if (!listed.length) {
    listed = FALLBACK_TOOLS.map(([name, description]) => ({
      name,
      description,
      inputSchema: { type: "object", properties: {}, additionalProperties: true },
    }));
  }
  if (!listed.some((d) => BUSINESS_TOOL_NAMES.some((n) => n.replaceAll(".", "_") === toBridgeName(d.name)))) {
    listed.push(...BUSINESS_TOOL_SPECS.map(({ name, description, inputSchema }) => ({ name: name.replaceAll(".", "_"), description, inputSchema })));
  }
  for (const tool of selectToolDefinitions(listed, toolSet)) registerTool(ctx, origin, token, tool);
}

export { selectToolDefinitions };
