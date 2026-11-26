import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { fetchText } from "./growth.mjs";
import { curlText, resolveProxy } from "./sources.mjs";

export const POLYMARKET_SOURCE = "https://gamma-api.polymarket.com/markets?closed=false&limit=20&order=volume24hr&ascending=false";

function localDate(now) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value, limit = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]+/gu, " ").replace(/\s+/gu, " ").trim().slice(0, limit);
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

async function atomicJson(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function parseOutcomes(market) {
  try {
    const labels = JSON.parse(market.outcomes);
    const prices = JSON.parse(market.outcomePrices);
    if (!Array.isArray(labels) || !Array.isArray(prices) || labels.length !== prices.length || labels.length < 2) return null;
    const yesPrice = finiteNumber(prices[0]);
    if (String(labels[0]).toLowerCase() !== "yes" || yesPrice === null || yesPrice < 0 || yesPrice > 1) return null;
    return yesPrice;
  } catch {
    return null;
  }
}

function selectMarkets(payload, limit = 10) {
  if (!Array.isArray(payload)) throw new Error("Polymarket markets 响应不是数组");
  const seen = new Set();
  const items = [];
  for (const market of payload) {
    const id = String(market?.id || "");
    const question = cleanText(market?.question, 500);
    const slug = cleanText(market?.slug, 300);
    const yesPrice = parseOutcomes(market || {});
    const volume24hr = finiteNumber(market?.volume24hr);
    if (!/^\d+$/u.test(id) || seen.has(id) || !question || !slug || yesPrice === null) continue;
    if (market.active !== true || market.closed !== false || market.archived === true) continue;
    if (volume24hr === null || volume24hr < 0) continue;
    seen.add(id);
    const event = Array.isArray(market.events) ? market.events[0] : null;
    const eventSlug = cleanText(event?.slug, 300) || slug;
    items.push({
      id,
      question,
      slug,
      url: `https://polymarket.com/event/${encodeURIComponent(eventSlug)}`,
      yesPrice,
      volume24hr,
      liquidity: finiteNumber(market.liquidity),
      oneDayPriceChange: finiteNumber(market.oneDayPriceChange),
      startDate: cleanText(market.startDateIso, 50) || null,
      endDate: cleanText(market.endDateIso, 50) || null,
      event: event ? {
        id: cleanText(event.id, 100) || null,
        title: cleanText(event.title, 500) || null,
        slug: eventSlug,
      } : null,
    });
  }
  return items
    .sort((left, right) => right.volume24hr - left.volume24hr || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((item, index) => ({ ...item, index: index + 1 }));
}

async function updateStatus(home, value) {
  await atomicJson(path.join(home, "radar-polymarket-status.json"), { schema: 1, ...value });
}

export async function refreshPolymarketBoard({
  home,
  fetchImpl = fetch,
  proxy = resolveProxy(),
  curlTextImpl = curlText,
  now = () => new Date(),
  force = false,
} = {}) {
  if (!home) throw new Error("Polymarket 快照缺少 P5_RADAR_HOME");
  const current = now();
  const date = localDate(current);
  const fetchedAt = current.toISOString();
  const file = path.join(home, `radar-polymarket-${date}.json`);
  if (!force) {
    const cached = await readJson(file);
    if (cached?.schema === 1 && cached.board === "polymarket" && cached.date === date && Array.isArray(cached.items)) {
      await updateStatus(home, { status: "ok", date, updatedAt: fetchedAt, cached: true });
      return { status: "ok", cached: true, file, itemCount: cached.items.length };
    }
  }

  try {
    const raw = proxy
      ? {
        text: await curlTextImpl(POLYMARKET_SOURCE, {
          proxy,
          timeout: 30,
          maxBuffer: 4 * 1024 * 1024,
          headers: ["Accept: application/json", "User-Agent: p5-growth-radar/1"],
        }),
      }
      : await fetchText(POLYMARKET_SOURCE, { fetchImpl });
    const items = selectMarkets(JSON.parse(raw.text));
    const rawPath = path.join("polymarket-sources", date, "markets.json");
    const snapshot = {
      schema: 1,
      board: "polymarket",
      date,
      generatedAt: fetchedAt,
      title: "Polymarket 观察",
      window: "24h",
      coverage: "Polymarket 开放市场中按 24 小时成交量排序的 Top 10。价格反映交易市场价格，不是事实概率或投资建议。",
      attribution: {
        label: "Polymarket Gamma API",
        url: "https://docs.polymarket.com/market-data/discover-markets",
      },
      source: {
        url: POLYMARKET_SOURCE,
        fetchedAt,
        sourceDate: null,
        sha256: createHash("sha256").update(raw.text).digest("hex"),
        rawPath,
      },
      items,
    };
    await atomicWrite(path.join(home, rawPath), raw.text);
    await atomicJson(file, snapshot);
    await updateStatus(home, { status: "ok", date, updatedAt: fetchedAt, cached: false });
    return { status: "ok", cached: false, file, itemCount: items.length };
  } catch (error) {
    const rawMessage = String(error?.message || error);
    const safeMessage = proxy ? rawMessage.split(String(proxy)).join("[代理已脱敏]") : rawMessage;
    const message = cleanText(safeMessage, 200) || "未知错误";
    await updateStatus(home, { status: "error", date, updatedAt: fetchedAt, error: message });
    return { status: "error", error: message };
  }
}
