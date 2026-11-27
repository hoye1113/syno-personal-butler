import { DEFAULT_MODEL } from "./opencode.mjs";

function cleanFeedText(value) {
  return String(value || "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

export function buildTranslationPrompt(items) {
  const payload = items.map((item, index) => ({
    index: index + 1,
    title: item.title,
    summary: cleanFeedText(item.summary).slice(0, 1200),
    source: item.source_name || item.source_id,
    kind: item.kind,
    published_at: item.published_at,
  }));
  return `你是中文 AI 技术雷达编辑。把下面每条资讯的标题和摘要翻成自然、准确的中文；专有名词、模型名、产品名保留英文。不要添加原文没有的事实，不要统一改写观点，不要输出 Markdown。

只输出一个 JSON 数组，元素顺序与输入一致：
[{"index":1,"title_zh":"中文标题","summary_zh":"中文摘要"}]

输入：
${JSON.stringify(payload)}`;
}

export function parseTranslationJson(text) {
  const raw = String(text ?? "").trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/iu.exec(raw);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed.map((entry) => ({
      index: Number(entry?.index),
      titleZh: String(entry?.title_zh || "").trim(),
      summaryZh: String(entry?.summary_zh || "").trim(),
    })).filter((entry) => Number.isInteger(entry.index));
  } catch {
    return null;
  }
}

async function translateBatch({ items, client, model, timeout }) {
  const prompt = buildTranslationPrompt(items);
  const result = await client.generate({ prompt, model, timeout });
  const parsed = parseTranslationJson(result.text);
  if (!parsed) throw new Error("翻译返回格式无法解析");
  const byIndex = new Map(parsed.map((entry) => [entry.index, entry]));
  return items.map((item, index) => {
    const translated = byIndex.get(index + 1);
    return {
      itemId: item.item_id ?? item.id,
      titleZh: translated?.titleZh || item.title,
      summaryZh: translated?.summaryZh || item.summary || "资料不足。",
      sourceStatus: translated ? "feed-translation" : "translation-missing",
      points: [],
      whyZh: "",
      model: `${model.providerID}/${model.id}`,
    };
  });
}

/**
 * Translate feed titles/summaries in bounded batches. This is the index layer:
 * it does not fetch full articles; full-article summaries remain opt-in.
 */
export async function translateFeedItems({
  items, client, model = DEFAULT_MODEL, batchSize = 20, timeout, log = () => {},
} = {}) {
  if (!Array.isArray(items) || !items.length) return [];
  const results = [];
  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    try {
      results.push(...await translateBatch({ items: batch, client, model, timeout }));
    } catch (error) {
      log("p5-translate-batch-failed", { error: String(error?.message || error).slice(0, 300), count: batch.length });
      results.push(...batch.map((item) => ({
        itemId: item.item_id ?? item.id,
        titleZh: item.title,
        summaryZh: item.summary || "资料不足。",
        sourceStatus: "translation-fallback",
        points: [],
        whyZh: "",
      })));
    }
  }
  return results;
}
