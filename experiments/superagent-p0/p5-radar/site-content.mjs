import { DatabaseSync } from "node:sqlite";
import { buildSourceEvidence, sourceStatusLabel } from "./document-model.mjs";

/** Read-only compatibility for manifests created before full HTML snapshots existed. */
export function openRadarContent({ databasePath }) {
  if (!databasePath) return { hydrate: async (items) => items, alerts: async () => [], close() {} };
  const db = new DatabaseSync(databasePath, { readOnly: true });
  db.exec("PRAGMA busy_timeout=5000;");
  const query = db.prepare(`
    SELECT i.id, i.title, i.url, i.summary AS feed_summary, i.published_at, i.kind, i.raw_json,
           s.name AS source_name, c.state AS candidate_state,
           a.title_zh, a.summary_zh, a.points_json, a.why_zh, a.source_status
    FROM items i
    JOIN sources s ON s.id = i.source_id
    LEFT JOIN candidates c ON c.item_id = i.id
    LEFT JOIN article_summaries a ON a.item_id = i.id
    WHERE i.id = ?
  `);
  const alertQuery = db.prepare(`
    SELECT name, last_fetch_at, last_error FROM sources
    WHERE enabled = 1 AND last_error IS NOT NULL AND TRIM(last_error) <> ''
    ORDER BY name
  `);
  return {
    async alerts() {
      return alertQuery.all().map((row) => ({
        kind: "source",
        label: `${row.name} 采集失败`,
        message: String(row.last_error).slice(0, 200),
        at: row.last_fetch_at || null,
      }));
    },
    async hydrate(items) {
      return items.map((item) => {
        const row = query.get(Number(item.itemId));
        if (!row) return item;
        let points = [];
        let raw = null;
        try { points = JSON.parse(row.points_json || "[]"); } catch { /* keep the readable summary */ }
        try { raw = JSON.parse(row.raw_json || "null"); } catch { /* evidence is optional */ }
        return {
          ...item,
          title: item.title || row.title,
          titleZh: item.titleZh || row.title_zh || row.title,
          url: item.url || row.url,
          source: item.source || item.sourceName || row.source_name || "未知",
          publishedAt: item.publishedAt || row.published_at,
          kind: item.kind || row.kind,
          summary: item.summary || row.summary_zh || row.feed_summary || "资料不足。",
          points: item.points ?? points,
          why: item.why || row.why_zh || "",
          sourceStatus: item.sourceStatus || sourceStatusLabel({ sourceStatus: row.source_status }),
          sourceEvidence: item.sourceEvidence || buildSourceEvidence({ raw }),
          candidateState: row.candidate_state || "new",
          follow: item.follow?.status !== "none" ? item.follow : row.candidate_state === "ignored"
            ? { status: "ignored" } : row.candidate_state === "followed" ? { status: "followed" } : item.follow,
        };
      });
    },
    close() { db.close(); },
  };
}
