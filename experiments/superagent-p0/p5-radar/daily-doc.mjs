import { promises as fs } from "node:fs";
import path from "node:path";

import { DEFAULT_MODEL, createOpenCodeClient } from "./opencode.mjs";
import { summarizeArticle, summarizeVideoDoc } from "./article.mjs";
import { applyRadarReactions, ensurePreferences, loadRadarReactions, rankEntries } from "./preferences.mjs";
import { historicalItemIds } from "./exposure.mjs";
import { translateFeedItems } from "./translate.mjs";
import { fetchTranscript } from "./youtube.mjs";

function fallbackSummary(item, error) {
  return {
    titleZh: item.title,
    summaryZh: item.summary || "资料不足。",
    points: [],
    whyZh: "",
    sourceStatus: `translation-fallback:${String(error?.message || error).slice(0, 120)}`,
  };
}

function isVideoItem(item) {
  return item.kind === "video" || /(?:youtube\.com|youtu\.be)/iu.test(item.url);
}

function hasInsufficientSummary(summary) {
  if (!summary) return true;
  const text = String(summary.summaryZh || "").trim();
  const status = String(summary.sourceStatus || "");
  return text.length < 20
    || /^资料不足/u.test(text)
    || text.startsWith("模型未返回可解析")
    || status.startsWith("feed-summary:")
    || status.includes("llm-parse-fallback");
}

export async function buildDailyDoc({
  store,
  home,
  date,
  proxy = "",
  configPath,
  stateFile = path.join(home, "feishu-doc.json"),
  client = null,
  model = DEFAULT_MODEL,
  ytDlp = process.env.P5_YTDLP || "yt-dlp",
  windowDays = 7,
  limit = 200,
  maxItems = 50,
  log = () => {},
  renderOnly = false,
  docPublisher,
} = {}) {
  if (!store) throw new Error("每日文档缺少 store");
  if (!date) throw new Error("每日文档缺少 date");
  const since = new Date(Date.now() - Number(windowDays) * 86_400_000).toISOString();
  const allItems = store.listItemsForDoc({ since, limit });
  const shown = await historicalItemIds({ home, date });
  const items = allItems.filter((item) => !shown.has(Number(item.item_id)));
  const cached = new Map();
  const pending = [];
  const videos = [];
  const articlesToEnrich = [];
  for (const item of items) {
    const summary = store.getArticleSummary(item.item_id);
    if (isVideoItem(item)) {
      if (summary && String(summary.sourceStatus || "").startsWith("transcript")) cached.set(item.item_id, summary);
      else videos.push(item);
    } else if (!hasInsufficientSummary(summary)) {
      cached.set(item.item_id, summary);
    } else {
      articlesToEnrich.push(item);
    }
  }

  const ownsClient = client === null;
  const needsModel = pending.length > 0 || videos.length > 0 || articlesToEnrich.length > 0;
  const openCode = client || (needsModel ? await createOpenCodeClient({ model }) : null);
  const generated = new Map();
  try {
    // Videos are deep-read automatically, independent of the old profile score.
    // A video without subtitles falls back to its feed summary.
    for (const item of videos) {
      const full = store.getItem(item.item_id) ?? item;
      let transcript = String(full.content || "");
      const hasTimestamps = /\[\d{1,2}:\d{2}(?::\d{2})?\]/u.test(transcript);
      // A previously confirmed missing transcript is not retried every render;
      // otherwise one subtitle-less video adds ~2 minutes to every document.
      const knownMissing = transcript.length < 200 && full.transcript_status === "missing";
      if (!knownMissing && (transcript.length < 200 || !hasTimestamps)) {
        try {
          const fetched = await fetchTranscript(item.url, { ytDlp, proxy });
          transcript = fetched.timedText || fetched.text || "";
          store.updateItemContent(item.item_id, { content: transcript, transcriptStatus: fetched.status });
          if (fetched.status !== "ok") {
            log("p5-video-transcript-missing", { itemId: item.item_id, status: fetched.status });
          }
        } catch (error) {
          log("p5-video-transcript-failed", { itemId: item.item_id, error: String(error?.message || error).slice(0, 200) });
        }
      } else if (knownMissing) {
        log("p5-video-transcript-skip-missing", { itemId: item.item_id });
      }
      if (transcript.length >= 200) {
        try {
          const summary = await summarizeVideoDoc({
            item,
            transcript,
            client: openCode,
            model,
          });
          generated.set(item.item_id, summary);
          store.saveArticleSummary(item.item_id, {
            model: summary.model,
            titleZh: summary.titleZh,
            summaryZh: summary.summaryZh,
            points: summary.points,
            whyZh: summary.whyZh,
            sourceStatus: summary.sourceStatus,
          });
          continue;
        } catch (error) {
          log("p5-video-summary-failed", { itemId: item.item_id, error: String(error?.message || error).slice(0, 200) });
        }
      }
      pending.push(item);
    }

    // HF and some sources ship empty RSS descriptions. Enrich those articles
    // from their body via the proxy-backed curl fetcher instead of showing 资料不足.
    for (const item of articlesToEnrich) {
      try {
        const summary = await summarizeArticle({
          item: { ...item, source_name: item.source_name },
          client: openCode,
          model,
          proxy,
        });
        generated.set(item.item_id, summary);
        store.saveArticleSummary(item.item_id, {
          model: summary.model,
          titleZh: summary.titleZh,
          summaryZh: summary.summaryZh,
          points: summary.points,
          whyZh: summary.whyZh,
          sourceStatus: summary.sourceStatus,
        });
      } catch (error) {
        log("p5-article-enrich-failed", { itemId: item.item_id, error: String(error?.message || error).slice(0, 200) });
        pending.push(item);
      }
    }

    if (pending.length && openCode) {
      const results = await translateFeedItems({
        items: pending,
        client: openCode,
        model,
        log,
      });
      for (const summary of results) {
        generated.set(summary.itemId, summary);
        store.saveArticleSummary(summary.itemId, {
          model: summary.model || `${model.providerID}/${model.id}`,
          titleZh: summary.titleZh,
          summaryZh: summary.summaryZh,
          points: summary.points,
          whyZh: summary.whyZh,
          sourceStatus: summary.sourceStatus,
        });
      }
    }

    const entries = items.map((item) => ({
      item,
      summary: cached.get(item.item_id) || generated.get(item.item_id) || fallbackSummary(item, new Error("未生成中文摘要")),
    }));
    const preferences = await ensurePreferences({ store, home });
    applyRadarReactions({ preferences, reactions: await loadRadarReactions(home), store });
    const rankedEntries = rankEntries(entries, preferences, { maxItems });
    const shortMessage = [
      `今日 P5 信息雷达已整理：新增 ${rankedEntries.length} 条；以前展示过的 ${allItems.length - entries.length} 条不再重复进入今日新增。`,
      "未读条目仍保留在历史中。回复「跟进 日期 编号」创建真实收录任务，或「忽略 日期 编号」降低相关权重。",
    ].join("\n");
    if (renderOnly) return { entries: rankedEntries, itemCount: rankedEntries.length, totalItems: entries.length, candidateCount: allItems.length, message: shortMessage };

    const { createFeishuDailyDoc } = await import("./feishu-doc.mjs");
    const doc = await createFeishuDailyDoc({
      date,
      items: rankedEntries,
      configPath,
      stateFile,
      ...(docPublisher ? { publisher: docPublisher } : {}),
      log,
    });
    const manifestItems = rankedEntries.map((entry, index) => ({
      index: index + 1,
      itemId: entry.item.item_id,
      title: entry.item.title,
      titleZh: entry.summary.titleZh,
      publishedAt: entry.item.published_at,
      kind: entry.item.kind,
    }));
    const manifest = {
      date,
      link: doc.link,
      nodeToken: doc.nodeToken,
      docId: doc.docId,
      itemCount: doc.itemCount,
      unfiltered: true,
      windowDays,
      items: manifestItems,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(path.join(home, `daily-doc-${date}.json`), JSON.stringify(manifest, null, 2), { encoding: "utf8", mode: 0o600 });
    // Numbering for 跟进/忽略 must follow this document's latest-first order.
    await fs.writeFile(path.join(home, `digest-${date}.json`), JSON.stringify({ date, items: manifestItems }, null, 2), { encoding: "utf8", mode: 0o600 });
    const message = `今日 P5 信息雷达已整理：${doc.link}\n${shortMessage}`;
    return { ...doc, entries: rankedEntries, totalItems: entries.length, message };
  } finally {
    if (ownsClient && openCode) await openCode.close();
  }
}
