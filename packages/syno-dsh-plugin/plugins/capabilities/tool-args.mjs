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
  // 默认（含未设置）为插件接管后的 canonical 名；只有显式 `SYNO_CHAT_TOOLS=bridge`
  // 回滚到旧工具面时才使用开发名 `syno_core_*`。
  return String(chatTools || "").trim() === "bridge" ? value : value.replace(/^syno_core_/, "syno_");
}

export { assertIntegerRange, canonicalToolName };
