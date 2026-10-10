/**
 * WeChat Aesthetic HTML Parser (V4)
 * 
 * 核心能力：
 * 1. 防嵌套文字墙解聚：解构微信/MDNice外层嵌套section/div，切断多换行黏连；
 * 2. 章节语义提权：汉字大章（一、二、...）提权为 H1，并上方插入分割线 divider；小节（1.1、2.1）提权为 H2；
 * 3. 流程图与命令封装：检测 ASCII/Unicode 流程指示符（▼、──►、-->）及命令，封装为原生代码块 code；
 * 4. 列表与引用解包：原生解析有序/无序列表与 blockquote；
 * 5. 配图结构化提取与格式兼容：提取 data-src 高清原图地址与占位。
 */

export function parseWeChatHtmlAesthetic(rawHtml, imagePrefix = "fig", highlights = []) {
  // 1. 提取原生代码块
  const codeBlocks = [];
  let html = rawHtml.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (m, inner) => {
    const codeMatch = inner.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
    let codeText = codeMatch ? codeMatch[1] : inner;
    codeText = codeText
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
    codeBlocks.push(codeText);
    return `\n\n___CODE_BLOCK_${codeBlocks.length - 1}___\n\n`;
  });

  // 2. 提取配图
  const images = [];
  html = html.replace(/<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi, (m, src) => {
    const dataSrc = src.trim();
    if (!dataSrc || dataSrc.includes("data:image") || dataSrc.includes("res.wx.qq.com") || dataSrc.includes("avatar") || dataSrc.includes("qrcode")) {
      return "";
    }
    const idx = images.length;
    const ext = dataSrc.includes("wx_fmt=png") ? "png" : dataSrc.includes("wx_fmt=jpeg") || dataSrc.includes("wx_fmt=jpg") ? "jpg" : "png";
    const filename = `${imagePrefix}-${String(idx + 1).padStart(2, "0")}.${ext}`;
    images.push({ url: dataSrc, filename, alt: `配图 ${idx + 1}` });
    return `\n\n___IMG_BLOCK_${idx}___\n\n`;
  });

  // 3. 标记标题
  html = html.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, content) => {
    return `\n\n___HEADING_${level}___${content}___HEADING_END___\n\n`;
  });

  // 4. 标记引用块
  html = html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, content) => {
    return `\n\n___QUOTE_BLOCK___${content}___QUOTE_END___\n\n`;
  });

  // 5. 标记列表项
  html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => {
    return `\n___LIST_ITEM___${content}___LIST_END___\n`;
  });

  // 6. 行内加粗与代码转换
  html = html
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
      const cleanText = text.replace(/<[^>]+>/g, "").trim();
      return cleanText ? `[${cleanText}](${href})` : href;
    });

  // 7. 容器闭合标签转多换行（防粘连核心）
  html = html
    .replace(/<\/(p|div|section|table|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // 8. 剥离剩余 HTML 标签
  html = html.replace(/<[^>]+>/g, "");

  // 9. 解码 HTML 实体
  html = html
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  // 10. 解析为结构化元素
  const rawParagraphs = html.split(/\n{2,}/);
  const items = [];

  for (const rawP of rawParagraphs) {
    let p = rawP.trim();
    if (!p) continue;

    if (p.includes("谢谢你看我的文章") || p.includes("微信扫一扫赞赏作者") || p.includes("喜欢作者") || p.includes("那些思想 · 目录")) {
      continue;
    }

    // 代码块占位符
    const codeMatch = p.match(/^___CODE_BLOCK_(\d+)___$/);
    if (codeMatch) {
      const codeText = codeBlocks[parseInt(codeMatch[1], 10)];
      items.push({ type: "code", content: codeText });
      continue;
    }

    // 图片占位符
    const imgMatch = p.match(/^___IMG_BLOCK_(\d+)___$/);
    if (imgMatch) {
      const img = images[parseInt(imgMatch[1], 10)];
      items.push({ type: "image", ...img });
      continue;
    }

    // 标题占位符
    const hMatch = p.match(/^___HEADING_(\d+)___([\s\S]*?)___HEADING_END___$/);
    if (hMatch) {
      let level = parseInt(hMatch[1], 10);
      const content = hMatch[2].replace(/\*\*/g, "").trim();
      if (!content) continue;
      if (/^[一二三四五六七八九十]+[、.．\s]/.test(content)) {
        items.push({ type: "divider" });
        items.push({ type: "heading", level: 1, content });
      } else if (/^\d+\.\d+[\s.．]/.test(content)) {
        items.push({ type: "heading", level: 2, content });
      } else if (/^Phase \d+/i.test(content) || /^\d+\.\d+\.\d+/.test(content)) {
        items.push({ type: "heading", level: 3, content });
      } else {
        items.push({ type: "heading", level: Math.min(Math.max(level, 1), 3), content });
      }
      continue;
    }

    // 引用占位符
    const qMatch = p.match(/^___QUOTE_BLOCK___([\s\S]*?)___QUOTE_END___$/);
    if (qMatch) {
      const content = qMatch[1].trim();
      if (content) items.push({ type: "quote", content });
      continue;
    }

    // 列表占位符
    if (p.includes("___LIST_ITEM___")) {
      const lines = p.split("\n");
      for (const line of lines) {
        const itemMatch = line.match(/___LIST_ITEM___([\s\S]*?)___LIST_END___/);
        if (itemMatch) {
          const itemText = itemMatch[1].trim();
          if (itemText) items.push({ type: "bullet", content: itemText });
        }
      }
      continue;
    }

    // 流程图 / ASCII 结构图检测 (含 ▼、──►、-->、多行 Phase)
    if (p.includes("▼") || p.includes("──►") || p.includes("-->") || (p.includes("Phase") && p.includes("\n"))) {
      items.push({ type: "code", content: p });
      continue;
    }

    // 语义化标题提权（非标准 <h> 标签排版的段落）
    const cleanNoBold = p.replace(/\*\*/g, "").trim();
    if (/^[一二三四五六七八九十]+[、.．\s]/.test(cleanNoBold) && cleanNoBold.length < 50) {
      items.push({ type: "divider" });
      items.push({ type: "heading", level: 1, content: cleanNoBold });
      continue;
    }
    if (/^\d+\.\d+[\s.．]/.test(cleanNoBold) && cleanNoBold.length < 60) {
      items.push({ type: "heading", level: 2, content: cleanNoBold });
      continue;
    }
    if (/^Phase \d+/i.test(cleanNoBold) && cleanNoBold.length < 40) {
      items.push({ type: "heading", level: 3, content: cleanNoBold });
      continue;
    }

    // 检测多行列表
    const lines = p.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every(l => l.startsWith("- ") || l.startsWith("* ") || /^\d+\.\s/.test(l))) {
      for (const l of lines) {
        if (/^\d+\.\s/.test(l)) {
          items.push({ type: "ordered", content: l.replace(/^\d+\.\s+/, "") });
        } else {
          items.push({ type: "bullet", content: l.replace(/^[-*]\s+/, "") });
        }
      }
      continue;
    }

    // 普通段落
    for (const line of lines) {
      let l = line;
      if (highlights && highlights.length) {
        for (const h of highlights) l = l.replace(h, "**$&**");
      }
      if (l.startsWith("- ") || l.startsWith("* ")) {
        items.push({ type: "bullet", content: l.replace(/^[-*]\s+/, "") });
      } else {
        items.push({ type: "text", content: l });
      }
    }
  }

  // 连续同类型重复项去重
  const deduped = [];
  for (const it of items) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.type === it.type && prev.content === it.content && it.content) continue;
    if (prev && prev.type === "image" && it.type === "image" && prev.url === it.url) continue;
    deduped.push(it);
  }

  return deduped;
}

export function parseInlineMarkdownElements(text) {
  if (!text) return [{ text_run: { content: "" } }];
  const elements = [];
  const regex = /(\*\*([^\*]+)\*\*)|(`([^`]+)`)|([^\*`]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      elements.push({
        text_run: {
          content: match[2],
          text_element_style: { bold: true },
        },
      });
    } else if (match[4]) {
      elements.push({
        text_run: {
          content: match[4],
          text_element_style: { inline_code: true },
        },
      });
    } else if (match[5]) {
      elements.push({
        text_run: {
          content: match[5],
        },
      });
    }
  }
  return elements.length > 0 ? elements : [{ text_run: { content: text } }];
}

export function buildDocxBlockFromItem(item) {
  if (!item) return null;
  switch (item.type) {
    case "divider":
      return { block_type: 22, divider: {} };
    case "heading": {
      const level = Math.min(Math.max(item.level || 1, 1), 3);
      const elements = parseInlineMarkdownElements(item.content);
      if (level === 1) return { block_type: 3, heading1: { elements } };
      if (level === 2) return { block_type: 4, heading2: { elements } };
      return { block_type: 5, heading3: { elements } };
    }
    case "quote":
      return { block_type: 15, quote: { elements: parseInlineMarkdownElements(item.content) } };
    case "bullet":
      return { block_type: 12, bullet: { elements: parseInlineMarkdownElements(item.content) } };
    case "ordered":
      return { block_type: 13, ordered: { elements: parseInlineMarkdownElements(item.content) } };
    case "code":
      return {
        block_type: 14,
        code: {
          style: { language: 1 },
          elements: [{ text_run: { content: item.content } }],
        },
      };
    case "text":
      return { block_type: 2, text: { elements: parseInlineMarkdownElements(item.content) } };
    default:
      return null;
  }
}
