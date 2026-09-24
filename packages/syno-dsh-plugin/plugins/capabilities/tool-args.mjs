function assertIntegerRange(value, min, max, name) {
  if (value === undefined || value === null || value === "") return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    const error = new Error(`${name} 必须是 ${min}-${max} 之间的整数`);
    error.code = "TOOL_INPUT_INVALID";
    throw error;
  }
}

function canonicalToolName(name, chatTools = process.env.SYNO_CHAT_TOOLS) {
  const value = String(name || "");
  return String(chatTools || "").trim() === "plugin" ? value.replace(/^syno_core_/, "syno_") : value;
}

export { assertIntegerRange, canonicalToolName };
