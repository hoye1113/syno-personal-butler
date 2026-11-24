function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#(?:39|x27);/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function publishedLabel(value) {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function sourceStatusLabel(summary) {
  const status = String(summary.sourceStatus || "");
  if (status === "transcript-timed") return "视频字幕（含时间戳）";
  if (status === "transcript-plain") return "视频字幕（无时间戳）";
  if (status.includes("llm-parse-fallback")) return "正文已抓取，摘要解析失败";
  if (status.startsWith("article")) return "正文已抓取";
  if (status === "feed-translation") return "标题 + 源摘要（已翻译，未深读正文）";
  if (status.startsWith("translation-fallback")) return "翻译失败，保留原文";
  if (status.includes("feed-summary")) return "仅源摘要（正文抓取失败）";
  return "源摘要";
}

/**
 * Provider-neutral document AST. The Host maps these blocks to Feishu docx;
 * the plugin never needs to know Feishu block types or credentials.
 */
export function buildDocumentAst({ date, entries, totalItems = entries.length, unfiltered = true }) {
  const items = entries.map((entry, index) => ({
    index: index + 1,
    itemId: entry.item.item_id,
    title: entry.item.title,
    titleZh: entry.summary.titleZh,
    publishedAt: entry.item.published_at,
    kind: entry.item.kind,
  }));
  const details = entries.map((entry, index) => {
    const item = entry.item;
    const summary = entry.summary;
    return {
      index: index + 1,
      itemId: item.item_id,
      title: item.title,
      titleZh: summary.titleZh || item.title,
      publishedAt: item.published_at,
      kind: item.kind,
      source: item.source_name || item.source_id || "未知",
      url: item.url,
      summary: summary.summaryZh || item.summary || "资料不足。",
      points: Array.isArray(summary.points) ? summary.points.map(cleanText) : [],
      why: summary.whyZh || "",
      sourceStatus: sourceStatusLabel(summary),
      group: entry.group || "rest",
    };
  });
  const groupLabels = {
    preferred: "为你优先",
    explore: "圈外探索",
    rest: "其余条目",
  };
  const blocks = [
    { type: "paragraph", text: `日期：${date} · 本次展示 ${items.length} 条（库中共 ${totalItems} 条）${unfiltered ? "；不按画像过滤，未展示条目仍保留" : ""}` },
    { type: "paragraph", text: "每篇列出中文标题、来源、发布时间和中文摘要。回复「跟进 日期 编号」创建真实收录 Task，或「忽略 日期 编号」调整偏好。" },
  ];
  let currentGroup = null;
  entries.forEach((entry, index) => {
    const item = entry.item;
    const summary = entry.summary;
    const titleZh = summary.titleZh || item.title || `条目 ${index + 1}`;
    if (entry.group && entry.group !== currentGroup) {
      currentGroup = entry.group;
      blocks.push({ type: "heading", level: 1, text: groupLabels[currentGroup] || currentGroup });
      if (entry.groupReason) blocks.push({ type: "paragraph", text: entry.groupReason });
    }
    blocks.push({ type: "heading", level: 2, text: `${index + 1}. ${titleZh}` });
    blocks.push({
      type: "paragraph",
      text: [
        `来源：${item.source_name || item.source_id || "未知"}`,
        `类型：${item.kind === "video" ? "视频" : "文章"}`,
        `发布：${publishedLabel(item.published_at)}`,
        item.title && item.title !== titleZh ? `原文标题：${item.title}` : "",
      ].filter(Boolean).join(" · "),
    });
    blocks.push({ type: "paragraph", text: `资料范围：${sourceStatusLabel(summary)}` });
    blocks.push({ type: "heading", level: 3, text: "摘要" });
    blocks.push({ type: "paragraph", text: summary.summaryZh || item.summary || "资料不足。" });
    if (Array.isArray(summary.points) && summary.points.length) {
      blocks.push({ type: "heading", level: 3, text: "核心要点" });
      blocks.push({ type: "bullets", items: summary.points.map(cleanText) });
    }
    if (summary.whyZh) {
      blocks.push({ type: "heading", level: 3, text: "为什么值得看" });
      blocks.push({ type: "paragraph", text: summary.whyZh });
    }
    blocks.push({ type: "link", text: "原文", url: item.url });
    blocks.push({ type: "paragraph", text: `操作：回复「跟进 ${date} ${index + 1}」或「忽略 ${date} ${index + 1}」` });
    if (index < entries.length - 1) blocks.push({ type: "divider" });
  });
  return {
    title: `P5 信息雷达 · ${date}`,
    date,
    unfiltered,
    items,
    details,
    totalItems,
    blocks,
    shortMessage: `今日 P5 信息雷达已整理：共 ${items.length} 条。回复「跟进 ${date} N」创建真实收录任务，或「忽略 ${date} N」调整偏好。`,
  };
}
