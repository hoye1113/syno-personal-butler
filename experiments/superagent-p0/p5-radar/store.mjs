import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const nowIso = () => new Date().toISOString();

export function canonicalizeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return "";
  }
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$|source$|from$|scene$|subscene$|sessionid$|clicktime$|enterid$|ascene$|fasttmpl_)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  if (/(^|\.)youtube\.com$/i.test(url.hostname) && url.pathname === "/watch") {
    const video = url.searchParams.get("v");
    url.search = video ? `?v=${encodeURIComponent(video)}` : "";
  }
  url.searchParams.sort();
  const search = url.searchParams.toString();
  const pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return `${url.origin}${pathname}${search ? `?${search}` : ""}`;
}

export function titleFingerprint(title) {
  const normalized = String(title ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

export function openStore({ file }) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT 'T2',
      weight REAL NOT NULL DEFAULT 0.6,
      enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}',
      last_fetch_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL REFERENCES sources(id),
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      canonical_url TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      published_at TEXT,
      fetched_at TEXT NOT NULL,
      lang TEXT,
      kind TEXT NOT NULL DEFAULT 'article',
      fingerprint TEXT NOT NULL,
      transcript_status TEXT,
      raw_json TEXT,
      UNIQUE(source_id, external_id)
    );
    CREATE TABLE IF NOT EXISTS scores (
      item_id INTEGER PRIMARY KEY REFERENCES items(id),
      score INTEGER NOT NULL,
      reason TEXT NOT NULL,
      topics_json TEXT NOT NULL DEFAULT '[]',
      excluded INTEGER NOT NULL DEFAULT 0,
      source_weight REAL NOT NULL DEFAULT 1,
      scored_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidates (
      item_id INTEGER PRIMARY KEY REFERENCES items(id),
      state TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      fetched INTEGER NOT NULL DEFAULT 0,
      inserted INTEGER NOT NULL DEFAULT 0,
      scored INTEGER NOT NULL DEFAULT 0,
      candidates INTEGER NOT NULL DEFAULT 0,
      errors_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id),
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS summaries (
      item_id INTEGER PRIMARY KEY REFERENCES items(id),
      model TEXT NOT NULL,
      text TEXT NOT NULL,
      transcript_chars INTEGER NOT NULL DEFAULT 0,
      usage_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS article_summaries (
      item_id INTEGER PRIMARY KEY REFERENCES items(id),
      model TEXT NOT NULL,
      title_zh TEXT NOT NULL,
      summary_zh TEXT NOT NULL,
      points_json TEXT NOT NULL DEFAULT '[]',
      why_zh TEXT NOT NULL DEFAULT '',
      source_status TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
  const statements = {
    insertSource: db.prepare(`
      INSERT OR IGNORE INTO sources (id, name, kind, url, tier, weight, enabled, config_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    listSources: db.prepare("SELECT * FROM sources ORDER BY kind, id"),
    getSource: db.prepare("SELECT * FROM sources WHERE id = ?"),
    setSourceState: db.prepare("UPDATE sources SET last_fetch_at = ?, last_error = ? WHERE id = ?"),
    insertItem: db.prepare(`
      INSERT OR IGNORE INTO items
        (source_id, external_id, title, url, canonical_url, summary, content, published_at, fetched_at, lang, kind, fingerprint, transcript_status, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    itemByExternal: db.prepare("SELECT * FROM items WHERE source_id = ? AND external_id = ?"),
    itemByUrl: db.prepare("SELECT * FROM items WHERE canonical_url = ?"),
    itemById: db.prepare("SELECT * FROM items WHERE id = ?"),
    saveScore: db.prepare(`
      INSERT INTO scores (item_id, score, reason, topics_json, excluded, source_weight, scored_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        score = excluded.score, reason = excluded.reason, topics_json = excluded.topics_json,
        excluded = excluded.excluded, source_weight = excluded.source_weight, scored_at = excluded.scored_at
    `),
    insertCandidate: db.prepare("INSERT OR IGNORE INTO candidates (item_id, state, created_at, updated_at) VALUES (?, 'new', ?, ?)"),
    listCandidates: db.prepare(`
      SELECT c.item_id, c.state, c.created_at, c.updated_at, i.title, i.url, i.summary, i.published_at,
             i.source_id, s.name AS source_name, s.tier, sc.score, sc.reason, sc.topics_json
      FROM candidates c
      JOIN items i ON i.id = c.item_id
      JOIN sources s ON s.id = i.source_id
      JOIN scores sc ON sc.item_id = c.item_id
      WHERE (? = '' OR c.state = ?) AND sc.excluded = 0
      ORDER BY sc.score DESC, COALESCE(i.published_at, i.fetched_at) DESC
      LIMIT ?
    `),
    listItemsForDoc: db.prepare(`
      SELECT i.id AS item_id, i.title, i.url, i.summary, i.published_at, i.fetched_at,
             i.kind, i.source_id, i.raw_json, s.name AS source_name, s.tier, sc.score, sc.topics_json, sc.excluded
      FROM items i
      JOIN sources s ON s.id = i.source_id
      LEFT JOIN scores sc ON sc.item_id = i.id
      WHERE (? = '' OR COALESCE(i.published_at, i.fetched_at) >= ?)
      ORDER BY COALESCE(i.published_at, i.fetched_at) DESC, i.id DESC
      LIMIT ?
    `),
    getScore: db.prepare("SELECT * FROM scores WHERE item_id = ?"),
    markCandidate: db.prepare(`
      INSERT INTO candidates (item_id, state, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        state = excluded.state, updated_at = excluded.updated_at
    `),
    insertFeedback: db.prepare("INSERT INTO feedback (item_id, action, note, created_at) VALUES (?, ?, ?, ?)"),
    updateItemContent: db.prepare("UPDATE items SET content = ?, transcript_status = ? WHERE id = ?"),
    saveSummary: db.prepare(`
      INSERT INTO summaries (item_id, model, text, transcript_chars, usage_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        model = excluded.model, text = excluded.text, transcript_chars = excluded.transcript_chars,
        usage_json = excluded.usage_json, created_at = excluded.created_at
    `),
    getSummary: db.prepare("SELECT * FROM summaries WHERE item_id = ?"),
    saveArticleSummary: db.prepare(`
      INSERT INTO article_summaries (item_id, model, title_zh, summary_zh, points_json, why_zh, source_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        model = excluded.model, title_zh = excluded.title_zh, summary_zh = excluded.summary_zh,
        points_json = excluded.points_json, why_zh = excluded.why_zh,
        source_status = excluded.source_status, created_at = excluded.created_at
    `),
    getArticleSummary: db.prepare("SELECT * FROM article_summaries WHERE item_id = ?"),
    startRun: db.prepare("INSERT INTO runs (started_at) VALUES (?)"),
    finishRun: db.prepare("UPDATE runs SET ended_at = ?, fetched = ?, inserted = ?, scored = ?, candidates = ?, errors_json = ? WHERE id = ?"),
    lastRuns: db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 5"),
    counts: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM sources) AS sources,
        (SELECT COUNT(*) FROM items) AS items,
        (SELECT COUNT(*) FROM scores) AS scores,
        (SELECT COUNT(*) FROM candidates WHERE state = 'new') AS new_candidates,
        (SELECT COUNT(*) FROM candidates WHERE state = 'followed') AS followed,
        (SELECT COUNT(*) FROM candidates WHERE state = 'ignored') AS ignored
    `),
    sourceStats: db.prepare(`
      SELECT s.id, s.name, s.kind, s.tier, s.enabled, s.last_fetch_at, s.last_error,
             (SELECT COUNT(*) FROM items i WHERE i.source_id = s.id) AS item_count
      FROM sources s ORDER BY s.id
    `),
  };

  return {
    db,
    file,
    seedSources(sources) {
      const at = nowIso();
      for (const source of sources) {
        statements.insertSource.run(
          source.id, source.name, source.kind, source.url ?? "", source.tier ?? "T2",
          source.weight ?? 0.6, source.enabled === false ? 0 : 1,
          JSON.stringify(source.config ?? {}), at,
        );
      }
    },
    listSources() {
      return statements.listSources.all().map((row) => ({
        ...row,
        enabled: row.enabled === 1,
        config: JSON.parse(row.config_json || "{}"),
      }));
    },
    getSource(id) {
      const row = statements.getSource.get(id);
      return row ? { ...row, enabled: row.enabled === 1, config: JSON.parse(row.config_json || "{}") } : null;
    },
    setSourceState(id, { at = nowIso(), error = null } = {}) {
      statements.setSourceState.run(at, error, id);
    },
    insertItem(item) {
      const canonicalUrl = canonicalizeUrl(item.url);
      if (!canonicalUrl) return { inserted: false, reason: "invalid_url", id: null };
      const externalId = String(item.externalId ?? canonicalUrl);
      const title = String(item.title ?? "").trim() || canonicalUrl;
      const fingerprint = titleFingerprint(title);
      const result = statements.insertItem.run(
        item.sourceId, externalId, title, item.url, canonicalUrl,
        String(item.summary ?? ""), String(item.content ?? ""),
        item.publishedAt ?? null, nowIso(), item.lang ?? null, item.kind ?? "article",
        fingerprint, item.transcriptStatus ?? null, JSON.stringify(item.raw ?? null),
      );
      if (Number(result.changes) > 0) {
        return { inserted: true, id: Number(result.lastInsertRowid), canonicalUrl };
      }
      const existing = statements.itemByExternal.get(item.sourceId, externalId)
        ?? statements.itemByUrl.get(canonicalUrl);
      return { inserted: false, id: existing ? Number(existing.id) : null, canonicalUrl };
    },
    getItem(id) {
      return statements.itemById.get(id) ?? null;
    },
    updateItemContent(id, { content = "", transcriptStatus = null } = {}) {
      statements.updateItemContent.run(String(content), transcriptStatus, id);
    },
    saveSummary(itemId, { model, text, transcriptChars = 0, usage = null } = {}) {
      statements.saveSummary.run(
        itemId, String(model), String(text), Number(transcriptChars) || 0,
        JSON.stringify(usage ?? null), nowIso(),
      );
    },
    getSummary(itemId) {
      return statements.getSummary.get(itemId) ?? null;
    },
    saveArticleSummary(itemId, { model, titleZh, summaryZh, points = [], whyZh = "", sourceStatus = "" } = {}) {
      statements.saveArticleSummary.run(
        itemId, String(model), String(titleZh), String(summaryZh),
        JSON.stringify(points ?? []), String(whyZh), String(sourceStatus), nowIso(),
      );
    },
    getArticleSummary(itemId) {
      const row = statements.getArticleSummary.get(itemId) ?? null;
      if (!row) return null;
      let points = [];
      try {
        points = JSON.parse(row.points_json || "[]");
      } catch {
        points = [];
      }
      return {
        itemId: row.item_id,
        model: row.model,
        titleZh: row.title_zh,
        summaryZh: row.summary_zh,
        points: Array.isArray(points) ? points : [],
        whyZh: row.why_zh,
        sourceStatus: row.source_status,
        createdAt: row.created_at,
      };
    },
    saveScore(itemId, score) {
      statements.saveScore.run(
        itemId, score.score, score.reason, JSON.stringify(score.topics ?? []),
        score.excluded ? 1 : 0, score.sourceWeight ?? 1, nowIso(),
      );
    },
    upsertCandidate(itemId) {
      const at = nowIso();
      statements.insertCandidate.run(itemId, at, at);
    },
    listCandidates({ limit = 10, state = "new" } = {}) {
      return statements.listCandidates.all(state, state, limit).map((row) => ({
        ...row,
        topics: JSON.parse(row.topics_json || "[]"),
      }));
    },
    listItemsForDoc({ since = "", limit = 200 } = {}) {
      return statements.listItemsForDoc.all(since, since, limit).map((row) => {
        let topics = [];
        try {
          topics = JSON.parse(row.topics_json || "[]");
        } catch {
          topics = [];
        }
        let raw = null;
        try {
          raw = JSON.parse(row.raw_json || "null");
        } catch {
          raw = null;
        }
        return { ...row, topics, raw };
      });
    },
    getScore(itemId) {
      const row = statements.getScore.get(itemId) ?? null;
      if (!row) return null;
      let topics = [];
      try {
        topics = JSON.parse(row.topics_json || "[]");
      } catch {
        topics = [];
      }
      return { ...row, topics };
    },
    markCandidate(itemId, state, note = null) {
      const at = nowIso();
      statements.markCandidate.run(itemId, state, at, at);
      statements.insertFeedback.run(itemId, state, note, at);
      return true;
    },
    startRun() {
      return Number(statements.startRun.run(nowIso()).lastInsertRowid);
    },
    finishRun(id, summary) {
      statements.finishRun.run(
        nowIso(), summary.fetched, summary.inserted, summary.scored, summary.candidates,
        JSON.stringify(summary.errors ?? []), id,
      );
    },
    status() {
      const counts = statements.counts.get();
      return { ...counts, sources: statements.sourceStats.all(), runs: statements.lastRuns.all() };
    },
    close() {
      db.close();
    },
  };
}
