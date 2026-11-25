import { promises as fs } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { fetchArticleText } from "./article.mjs";
import { ensurePreferences, recordFeedback, savePreferences } from "./preferences.mjs";
import { openStore } from "./store.mjs";
import { createRadarSiteStore } from "./site-store.mjs";

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const RADAR_SOURCE_MATERIAL = "verified-public-radar-snapshot";

export async function resolveRadarCandidates({ home, date, numbers }) {
  if (!DATE.test(date || "")) throw new Error("历史操作必须提供日期，格式：跟进 YYYY-MM-DD 编号");
  const file = path.join(home, `digest-${date}.json`);
  let digest;
  try { digest = JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") throw new Error(`找不到 ${date} 的日报编号`);
    throw error;
  }
  if (digest.date !== date || !Array.isArray(digest.items)) throw new Error(`${date} 的日报编号无效`);
  return numbers.map((value) => {
    const index = Number(value);
    const item = digest.items.find((candidate) => Number(candidate.index) === index);
    if (!item) throw new Error(`${date} 没有编号 ${value}`);
    return { ...item, itemId: Number(item.itemId), date };
  });
}

export async function resolveRadarMarkedFollows({ home, stateHome = home, numbers = [], all = false }) {
  const marked = await createRadarSiteStore({ home, stateHome }).markedFollows();
  if (!numbers.length) return { marked, selected: all || marked.length === 1 ? marked : [] };
  if (all) throw new Error("“全部”不能和编号同时选择");
  const positions = [...new Set(numbers.map((value) => Number(value)))];
  if (positions.some((value) => !Number.isSafeInteger(value) || value < 1 || value > marked.length)) {
    throw new Error("待处理编号无效，请重新发送“处理网站跟进”查看清单");
  }
  if (positions.length !== 1) throw new Error("每次选择一条；如需全部收录，请发送“处理网站跟进 全部”");
  return { marked, selected: [marked[positions[0] - 1]] };
}

export function recoverableRadarFollows(state) {
  return Object.values(state?.items || {}).filter((follow) =>
    ["pending", "running"].includes(follow.status) && follow.taskId && follow.sourcePath);
}

export async function applyRadarFeedback({ home, itemId, action }) {
  if (!["follow", "ignore"].includes(action)) throw new Error("未知雷达反馈");
  const store = openStore({ file: path.join(home, "p5-radar.db") });
  try {
    const item = store.getItem(Number(itemId));
    if (!item) throw new Error(`找不到雷达条目 ${itemId}`);
    const state = action === "follow" ? "followed" : "ignored";
    store.markCandidate(Number(itemId), state);
    const preferences = await ensurePreferences({ store, home });
    recordFeedback({ preferences, item, score: store.getScore(Number(itemId)), action });
    await savePreferences(home, preferences);
    return { itemId: Number(itemId), state };
  } finally { store.close(); }
}

/** Freeze the exact public source before a capture Task is created; retries reuse this snapshot. */
export async function prepareRadarCaptureSource({ home, itemId, proxy = "", fetchArticle = fetchArticleText }) {
  const id = Number(itemId);
  const directory = path.join(home, "capture-sources");
  const sourcePath = path.join(directory, `radar-${id}.md`);
  try {
    await fs.access(sourcePath);
    const existing = await fs.readFile(sourcePath, "utf8");
    const match = /^Source-URL: (https?:\/\/\S+)$/mu.exec(existing);
    if (!match) throw new Error("既有雷达来源快照缺少 URL");
    return { sourcePath, sourceUrl: match[1], sourceMaterial: RADAR_SOURCE_MATERIAL };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const db = new DatabaseSync(path.join(home, "p5-radar.db"), { readOnly: true });
  let item;
  try { item = db.prepare("SELECT id, title, url, content, summary, kind, published_at FROM items WHERE id = ?").get(id); }
  finally { db.close(); }
  if (!item) throw new Error(`找不到雷达条目 ${id}`);
  let sourceUrl;
  try { sourceUrl = new URL(item.url); } catch { throw new Error("雷达条目 URL 无效"); }
  if (!["http:", "https:"].includes(sourceUrl.protocol)) throw new Error("只收录公开 HTTP/HTTPS 内容");
  let content = String(item.content || "").trim();
  if (item.kind !== "video" && content.length < 500) {
    const fetched = await fetchArticle(item.url, { proxy });
    content = String(fetched.text || fetched.content || fetched || "").trim();
  }
  if (content.length < 200) throw new Error("公开正文或字幕不足，未创建收录 Task；请先对账来源");
  const snapshot = [
    `Source-URL: ${item.url}`,
    `Source-Material: ${RADAR_SOURCE_MATERIAL}`,
    `Title: ${item.title}`,
    `Published-At: ${item.published_at || "unknown"}`,
    `Kind: ${item.kind}`,
    "",
    content,
    "",
  ].join("\n");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(sourcePath, snapshot, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return { sourcePath, sourceUrl: item.url, sourceMaterial: RADAR_SOURCE_MATERIAL };
}
