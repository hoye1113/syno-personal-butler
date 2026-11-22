import { CANDIDATE_THRESHOLD, isCandidate, scoreItem } from "./score.mjs";
import { fetchSource } from "./sources.mjs";
import { fetchTranscript } from "./youtube.mjs";

/**
 * Pure-ish collection pass over the P5 source store. Network and clock effects
 * are injectable so the Host, CLI and plugin share one implementation.
 */
export async function collectSources({
  store,
  proxy = "",
  youtube = false,
  maxYoutube = 2,
  maxItems = 30,
  windowDays = 7,
  only = null,
  ytDlp = process.env.P5_YTDLP || "yt-dlp",
  fetchSourceImpl = fetchSource,
  fetchTranscriptImpl = fetchTranscript,
  log = () => {},
} = {}) {
  if (!store) throw new Error("collectSources 缺少 store");
  const runId = store.startRun();
  const summary = {
    fetched: 0,
    inserted: 0,
    scored: 0,
    candidates: 0,
    errors: [],
    youtubeBudget: maxYoutube,
  };
  try {
    const sources = store.listSources()
      .filter((source) => source.enabled)
      .filter((source) => !only || source.id === only)
      .filter((source) => youtube || source.kind !== "youtube");
    for (const source of sources) {
      try {
        const fetched = await fetchSourceImpl(source, { proxy });
        const cutoff = Date.now() - windowDays * 86_400_000;
        const items = fetched.items
          .filter((item) => !item.publishedAt || Date.parse(item.publishedAt) >= cutoff)
          .sort((left, right) => (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0))
          .slice(0, maxItems);
        for (const item of items) {
          summary.fetched += 1;
          const inserted = store.insertItem({
            sourceId: source.id,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            summary: item.summary,
            publishedAt: item.publishedAt,
            lang: item.lang,
            kind: item.kind,
            raw: item.raw,
          });
          if (inserted.inserted) summary.inserted += 1;
          if (!inserted.id) {
            summary.errors.push({ source: source.id, error: `invalid item url: ${item.url}` });
            continue;
          }
          if (!inserted.inserted) continue;

          const score = scoreItem(item, source);
          store.saveScore(inserted.id, score);
          summary.scored += 1;
          const candidate = isCandidate(score, CANDIDATE_THRESHOLD);
          if (candidate) {
            store.upsertCandidate(inserted.id);
            summary.candidates += 1;
          }
          // Transcripts are expensive and network-bound. Only candidates get one;
          // the profile filter decides first, then we spend the YouTube budget.
          if (candidate && source.kind === "youtube" && summary.youtubeBudget > 0) {
            summary.youtubeBudget -= 1;
            const transcript = await fetchTranscriptImpl(item.url, { ytDlp, proxy });
            store.updateItemContent(inserted.id, {
              content: transcript.timedText || transcript.text,
              transcriptStatus: transcript.status,
            });
          }
        }
        store.setSourceState(source.id, { error: null });
      } catch (error) {
        const message = String(error?.message || error).slice(0, 500);
        summary.errors.push({ source: source.id, error: message });
        store.setSourceState(source.id, { error: message });
      }
    }
  } finally {
    store.finishRun(runId, summary);
  }
  log("p5-collect-finished", summary);
  return { runId, ...summary };
}
