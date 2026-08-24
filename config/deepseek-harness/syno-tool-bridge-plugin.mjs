/**
 * Out-of-tree Cordis plugin: register Syno Tool Bridge tools under native
 * `syno_*` names (not `mcp__syno__*`). Loaded by dsh-jsonrpc-agent from
 * Syno's cordis.yml; talks HTTP JSON-RPC to `/api/syno/bridge/mcp`.
 */
import { isCoreChatToolName } from "./syno-tool-sets.mjs";

export const name = "syno-tool-bridge";
export const inject = ["tools"];

const FALLBACK_TOOLS = Object.freeze([
  ["workflow_context", "Load Syno workflow context"],
  ["knowledge_search", "Search the Syno vault"],
  ["knowledge_read_snippet", "Read a vault snippet"],
  ["knowledge_fetch_url", "Fetch a URL through Syno"],
  ["today_read", "Read today's Syno snapshot"],
  ["capture_start", "Start a capture workflow"],
  ["capture_status", "Read capture status"],
  ["capture_list_pending", "List pending captures"],
  ["projects_list", "List Syno projects"],
  ["projects_create", "Create a Syno project"],
  ["projects_update_status", "Update a Syno project status"],
  ["learning_due", "List due learning reviews"],
  ["learning_teach_back", "Submit a teach-back"],
  ["learning_submit", "Submit learning evidence"],
  ["goals_list", "List goals"],
  ["claims_propose", "Propose a claim"],
  ["evidence_source_read", "Read evidence source"],
  ["evidence_propose", "Propose evidence"],
  ["jobs_list", "List Syno jobs"],
  ["jobs_submit", "Submit a Syno job"],
  ["settings_adjust", "Adjust Syno settings"],
  ["image_read", "Read an isolated image via Host vision"],
  ["browser_status", "Browser capture status"],
  ["browser_navigate", "Browser navigate"],
  ["browser_snapshot", "Browser snapshot"],
  ["browser_list_tabs", "List browser tabs"],
  ["browser_close_session", "Close a browser session"],
]);

function selectToolDefinitions(definitions, toolSet = "all") {
  const selected = String(toolSet || "all").trim() || "all";
  if (selected === "all") return [...definitions];
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
    async execute(args) {
      const payload = await rpc(origin, token, "tools/call", { name: bridgeName, arguments: args || {} }, `call-${Date.now()}`);
      if (payload?.error) {
        throw new Error(payload.error.message || "Syno Tool Bridge 调用失败");
      }
      return payload?.result || {};
    },
  });
}

export async function apply(ctx, config = {}) {
  const origin = String(process.env.SYNO_BRIDGE_ORIGIN || "").trim();
  const token = String(process.env.SYNO_BRIDGE_TOKEN || "").trim();
  if (!origin || !token) {
    throw new Error("syno-tool-bridge: SYNO_BRIDGE_ORIGIN and SYNO_BRIDGE_TOKEN are required");
  }
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
  for (const tool of selectToolDefinitions(listed, config.toolSet)) registerTool(ctx, origin, token, tool);
}

export { selectToolDefinitions };
