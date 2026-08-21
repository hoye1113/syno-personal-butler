const CORE_CHAT_TOOL_NAMES = Object.freeze([
  "workflow.context",
  "knowledge.search",
  "knowledge.read_snippet",
  "today.read",
  "capture.start",
  "capture.status",
  "capture.list_pending",
  "jobs.list",
  "jobs.submit",
  "image.read",
]);

const CORE_CHAT_BRIDGE_TOOL_NAMES = Object.freeze(
  CORE_CHAT_TOOL_NAMES.map((name) => name.replaceAll(".", "_").replaceAll("-", "_")),
);

function canonicalBridgeToolName(name) {
  let value = String(name || "").trim();
  if (value.startsWith("syno_")) value = value.slice("syno_".length);
  return value.replaceAll(".", "_").replaceAll("-", "_");
}

function isCoreChatToolName(name) {
  return CORE_CHAT_BRIDGE_TOOL_NAMES.includes(canonicalBridgeToolName(name));
}

export {
  CORE_CHAT_BRIDGE_TOOL_NAMES,
  CORE_CHAT_TOOL_NAMES,
  canonicalBridgeToolName,
  isCoreChatToolName,
};
