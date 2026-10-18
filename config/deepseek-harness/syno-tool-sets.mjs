import { BUSINESS_TOOL_NAMES } from "../../packages/syno-core/business-tools.mjs";

// Ordinary chat may read knowledge and submit controlled business operations.
const CORE_CHAT_TOOL_NAMES = Object.freeze([
  "knowledge.search",
  "knowledge.read_snippet",
  "knowledge.fetch_url",
  ...BUSINESS_TOOL_NAMES,
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
