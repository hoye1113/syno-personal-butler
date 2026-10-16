// 通用文本排版助手（2026-10-16 从 weixin-text-format 抽出并去微信化）。
//
// 飞书用 markdown 卡片渲染，不再需要「每行铺成空行」的微信兼容 hack（那是当年为微信只认
// `\n\n` 的渲染规则做的）；这里只保留通道无关的清洗与截断，以及结构化通知排版。

// 保守的 markdown→纯文本清洗。用于不该出现标记的位置（例如把模型产出塞进一行预览）。
// 顺序有讲究：先代码围栏（保住代码内容、只去围栏），再行内 code，再标题/粗体/链接/列表。
export function stripMarkdown(input) {
  let text = String(input || "");
  text = text.replace(/```[a-zA-Z]*\r?\n?([\s\S]*?)```/g, (_m, inner) => inner.replace(/\s+$/u, ""));
  text = text.replace(/`([^`]*)`/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2");
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1（$2）");
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "· ");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// 截断到 maxChars 字（按字符），尽量在换行/标点处收束，超长加省略号。用于内容预览。
export function clip(input, maxChars = 120) {
  const text = String(input || "").replace(/\s+/gu, " ").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).replace(/[，。；、,;.\s]+$/u, "")}…`;
}

// 结构化通知排版（收录回执、待确认、拒收等）：
//   formatNotice({ title: "📥 收录方案待确认", sections: [{ icon: "📝", heading: "内容要点", lines: [...] }], footer: "—" })
// 规则：每个 section = 标题行(icon + heading) + 内容行；空节省略；节与节之间空一行。
// 内容行内部保留单换行（markdown 渲染器会正常换行），不再像微信时代那样逐行铺空行。
export function formatNotice({ title, sections = [], footer } = {}) {
  const blocks = [];
  if (title && String(title).trim()) blocks.push(String(title).trim());
  for (const section of sections) {
    if (!section) continue;
    const headingText = section.heading && String(section.heading).trim() ? String(section.heading).trim() : "";
    const head = headingText
      ? [section.icon, headingText].filter((value) => value && String(value).trim()).map(String).join(" ")
      : "";
    const body = (Array.isArray(section.lines) ? section.lines : [])
      .map((line) => String(line ?? ""))
      .filter((line) => line.trim() !== "");
    const lines = [];
    if (head) lines.push(head);
    lines.push(...body);
    if (lines.length) blocks.push(lines.join("\n"));
  }
  if (footer && String(footer).trim()) blocks.push(String(footer).trim());
  return blocks.join("\n\n");
}
