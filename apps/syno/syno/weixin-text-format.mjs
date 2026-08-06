// 微信文本排版助手。
//
// 约束（2026-08-06 探测实证）：微信**只把 `\n\n`（空行）渲染成换行**——单 `\n`、`\r\n`、`\r`
// 全被吞成空格（同一行）；且**不渲染 markdown**——`**` `#` ``` 等标记会原样露出成星号井号。
// 因此管家的用户可见文案：
//   ① 每个逻辑行都用空行隔成独立段落、emoji 做视觉锚点（formatWx 负责结构，见文件尾归一化）；
//   ② 凡可能含 markdown 的内容（LLM 产出、正文摘要）先经 stripMarkdown 清洗。
//
// 两个导出：formatWx（结构排版）+ stripMarkdown（markdown→纯文本清洗）+ clip（截断）。

// 保守的 markdown→纯文本清洗。目标是去掉微信里只会原样露出的标记，**不**改动语义内容。
// 顺序有讲究：先代码围栏（保住代码内容、只去围栏），再行内 code，再标题/粗斜体/链接/列表。
export function stripMarkdown(input) {
  let text = String(input || "");
  // 代码围栏 ```lang ... ``` → 保留内部内容（去掉围栏与语言标注）
  text = text.replace(/```[a-zA-Z]*\r?\n?([\s\S]*?)```/g, (_m, inner) => inner.replace(/\s+$/u, ""));
  text = text.replace(/`([^`]*)`/g, "$1");                    // 行内 `code`
  text = text.replace(/^#{1,6}\s+/gm, "");                    // # 标题
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");              // **粗体**
  text = text.replace(/__([^_]+)__/g, "$1");                  // __粗体__
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2");      // *斜体*（避免误吃 ** 残留）
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1（$2）"); // [文字](链接) → 文字（链接）
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, "· ");            // - / * / + 列表 → ·
  text = text.replace(/^\s*>\s?/gm, "");                      // > 引用
  text = text.replace(/\n{3,}/g, "\n\n");                     // 3+ 连续换行压成一个空行
  return text.trim();
}

// 截断到 maxChars 字（按字符），尽量在换行/标点处收束，超长加省略号。用于内容预览。
export function clip(input, maxChars = 120) {
  const text = String(input || "").replace(/\s+/gu, " ").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).replace(/[，。；、,;.\s]+$/u, "")}…`;
}

// 出口换行归一化：微信只把空行渲染成换行（单 \n / \r\n / \r 全被吞成空格）。
// 把每段换行统一铺成 \n\n——formatWx 排好的消息已是 \n\n（幂等 no-op）；对话式长回复、
// 主动提醒里的单 \n 也铺成独立段落、不再并段。在 weixin-ilink send 出口对所有消息套用。
export function wxBreaks(input) {
  return String(input || "").replace(/\r\n?/g, "\n").replace(/\n+/g, "\n\n").trim();
}

// 结构化排版：
//   formatWx({
//     title: "📥 收录方案待确认",
//     sections: [
//       { icon: "📝", heading: "内容要点", lines: ["《标题》", "摘要…", "🏷 标签"] },
//       { icon: "📂", heading: "保存位置", lines: ["vault/00-Inbox/xx.md"] },
//       { lines: ["🔎 来源可信度　high/verified", "🔁 相似笔记　2 个"] },   // 无标题节
//     ],
//     footer: "——————\n回复「确认」保存",
//   })
// 规则：每节 = 标题行(icon+heading) + 若干内容行；空节自动省略。
// 出口归一化：标题/各节标题/各内容行/footer 行，全部拆成独立逻辑行、两两之间一个空行
// （微信只认空行为换行）。调用方传 lines 用单 \n 即可，出口统一铺成 \n\n。
export function formatWx({ title, sections = [], footer } = {}) {
  const blocks = [];
  if (title && String(title).trim()) blocks.push(String(title).trim());
  for (const section of sections) {
    if (!section) continue;
    // icon 只作 heading 的装饰：没有 heading 时忽略 icon（避免渲染出孤零零一个表情符号的废节）。
    const headingText = section.heading && String(section.heading).trim() ? String(section.heading).trim() : "";
    const head = headingText
      ? [section.icon, headingText].filter((x) => x && String(x).trim()).map(String).join(" ")
      : "";
    const body = (Array.isArray(section.lines) ? section.lines : [])
      .map((line) => String(line ?? ""))
      .filter((line) => line.trim() !== "");
    const blockLines = [];
    if (head) blockLines.push(head);
    blockLines.push(...body);
    if (blockLines.length) blocks.push(blockLines.join("\n"));
  }
  if (footer && String(footer).trim()) blocks.push(String(footer).trim());
  // 微信只把 \n\n（空行）渲染成换行；单 \n / \r\n / \r 全被吞成空格（2026-08-06 探测实证）。
  // 故把每个逻辑行都铺成独立空行段落：拆散所有 \n、逐行 trim、去空行，统一用 \n\n 连接。
  const lines = [];
  for (const block of blocks) {
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  return lines.join("\n\n");
}
