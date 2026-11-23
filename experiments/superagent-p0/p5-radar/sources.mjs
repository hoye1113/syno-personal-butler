import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const USER_AGENT = "syno-p5-radar/0.1 (+personal research)";
const X_API_BASE = "https://api.x.com/2/users";
const X_TOKEN_ENV = "P5_X_BEARER_TOKEN";
const X_DEFAULT_MAX_RESULTS = 20;

export const DEFAULT_SOURCES = Object.freeze([
  {
    id: "aihot-selected",
    name: "AIHOT 精选",
    kind: "aihot",
    url: "https://aihot.news/api/v1/items?mode=selected&window=24h&limit=100",
    tier: "T1.5",
    weight: 0.8,
  },
  {
    id: "rss-openai-news",
    name: "OpenAI News",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    tier: "T1",
    weight: 1,
  },
  {
    id: "rss-google-deepmind",
    name: "Google DeepMind",
    kind: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    tier: "T1",
    weight: 1,
  },
  {
    id: "rss-google-research",
    name: "Google Research",
    kind: "rss",
    url: "https://research.google/blog/rss/",
    tier: "T1",
    weight: 1,
  },
  {
    id: "rss-hugging-face",
    name: "Hugging Face Blog",
    kind: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    tier: "T1",
    weight: 0.9,
  },
  {
    id: "rss-latent-space",
    name: "Latent Space",
    kind: "rss",
    url: "https://www.latent.space/feed",
    tier: "T1.5",
    weight: 0.8,
  },
  {
    id: "rss-simon-willison",
    name: "Simon Willison",
    kind: "rss",
    url: "https://simonwillison.net/atom/everything/",
    tier: "T1.5",
    weight: 0.8,
  },
  {
    id: "rss-import-ai",
    name: "Import AI",
    kind: "rss",
    url: "https://importai.substack.com/feed",
    tier: "T1.5",
    weight: 0.7,
  },
  {
    id: "yt-karpathy",
    name: "YouTube · Andrej Karpathy",
    kind: "youtube",
    url: "",
    tier: "T1.5",
    weight: 0.9,
    config: { handle: "@AndrejKarpathy" },
  },
  {
    id: "yt-latent-space",
    name: "YouTube · Latent Space",
    kind: "youtube",
    url: "",
    tier: "T1.5",
    weight: 0.8,
    config: { handle: "@LatentSpacePod" },
  },
  {
    id: "yt-deepmind",
    name: "YouTube · Google DeepMind",
    kind: "youtube",
    url: "",
    tier: "T1",
    weight: 1,
    config: { handle: "@GoogleDeepMind" },
  },
]);

export function resolveProxy(env = process.env) {
  return env.P5_PROXY || env.HTTPS_PROXY || env.HTTP_PROXY || "";
}

function curlArgs(url, { proxy = "", timeout = 30 } = {}) {
  const args = ["-sSL", "--compressed", "--max-time", String(timeout), "-A", USER_AGENT];
  if (proxy) args.push("-x", proxy);
  return args;
}

function escapeCurlConfig(value) {
  return String(value).replace(/\\/gu, "\\\\").replace(/"/gu, "\\\"");
}

function spawnCurl(args, { input = "", maxBuffer = 20 * 1024 * 1024, spawnImpl = spawn } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnImpl("curl", args, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (settled) return;
      stdout += chunk;
      if (stdout.length > maxBuffer) {
        fail(new Error("curl 输出超过上限"));
        child.kill?.();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-2000);
    });
    child.on("error", (error) => fail(error));
    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0) {
        const detail = stderr.trim();
        fail(new Error(`curl 退出码 ${code}${detail ? `：${detail}` : ""}`.slice(0, 1000)));
        return;
      }
      settled = true;
      resolve(stdout);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

/**
 * curlText keeps the existing proxy/timeout behaviour. When headers are given
 * they are handed to curl through a `--config -` stdin channel so credentials
 * never enter the child process argv (visible with `ps`).
 */
export async function curlText(url, {
  proxy = "",
  timeout = 30,
  maxBuffer = 20 * 1024 * 1024,
  headers = [],
  spawnImpl = spawn,
} = {}) {
  const args = curlArgs(url, { proxy, timeout });
  const headerLines = (Array.isArray(headers) ? headers : []).map((line) => String(line)).filter(Boolean);
  if (!headerLines.length) {
    args.push(url);
    const { stdout } = await execFileAsync("curl", args, { maxBuffer });
    return stdout;
  }
  const config = `${headerLines.map((line) => `header = "${escapeCurlConfig(line)}"`).join("\n")}\n`;
  args.push("--config", "-", url);
  return spawnCurl(args, { input: config, maxBuffer, spawnImpl });
}

export async function curlJson(url, options = {}) {
  const text = await curlText(url, options);
  return JSON.parse(text);
}

const ENTITIES = new Map([
  ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", "\""], ["apos", "'"], ["nbsp", " "],
]);

export function decodeEntities(text) {
  return String(text ?? "").replace(/&(#x?[0-9a-f]+|[a-z]+);/giu, (match, entity) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES.get(entity.toLowerCase()) ?? match;
  });
}

export function stripHtml(text) {
  return decodeEntities(String(text ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
}

function firstTag(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "iu");
    const match = block.match(re);
    if (match) return match[1];
    const selfClosing = block.match(new RegExp(`<${name}\\b[^>]*href="([^"]+)"[^>]*/?>`, "iu"));
    if (selfClosing) return selfClosing[1];
  }
  return "";
}

function attr(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}="([^"]*)"`, "iu"));
  return match ? decodeEntities(match[1]) : "";
}

function absoluteUrl(value, base) {
  const text = decodeEntities(String(value ?? "").trim());
  if (!text) return "";
  try {
    return new URL(text, base).toString();
  } catch {
    return "";
  }
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function feedBlocks(xml, name) {
  return [...String(xml).matchAll(new RegExp(`<${name}\\b[\\s\\S]*?<\\/${name}>`, "giu"))].map((match) => match[0]);
}

export function parseFeed(xml, { source = {} } = {}) {
  const text = String(xml ?? "");
  const isAtom = /<feed\b/iu.test(text);
  const blocks = isAtom ? feedBlocks(text, "entry") : feedBlocks(text, "item");
  const items = [];
  for (const block of blocks) {
    const title = stripHtml(firstTag(block, ["title"]));
    const linkTag = block.match(/<link\b[^>]*>/iu)?.[0] ?? "";
    const link = isAtom
      ? (attr(linkTag, "href") || absoluteUrl(firstTag(block, ["id"]), source.url))
      : (absoluteUrl(firstTag(block, ["link", "guid"]), source.url) || absoluteUrl(attr(linkTag, "href"), source.url));
    if (!title || !link) continue;
    const summaryRaw = firstTag(block, ["description", "summary", "content:encoded", "content"]);
    const summary = stripHtml(summaryRaw).slice(0, 1600);
    const published = firstTag(block, isAtom ? ["published", "updated"] : ["pubDate", "published", "updated"]);
    const id = stripHtml(firstTag(block, isAtom ? ["id"] : ["guid"])) || link;
    const author = stripHtml(firstTag(block, ["author", "dc:creator"]));
    const categories = [...block.matchAll(/<category\b[^>]*?(?:term="([^"]+)"[^>]*)?>([^<]*)<\/category>/giu)]
      .map((match) => stripHtml(match[1] || match[2]))
      .filter(Boolean);
    items.push({
      externalId: id,
      title,
      url: link,
      summary,
      publishedAt: isoDate(published),
      lang: null,
      kind: source.kind === "youtube" ? "video" : "article",
      author,
      categories,
    });
  }
  return items;
}

export async function fetchAihot(source, { proxy = "" } = {}) {
  const payload = await curlJson(source.url, { proxy });
  const list = Array.isArray(payload?.items) ? payload.items : [];
  return list.map((item) => ({
    externalId: String(item.id ?? item.links?.aihot ?? ""),
    title: String(item.title ?? "").trim(),
    url: item.links?.original || item.links?.aihot || "",
    summary: [item.summary, item.reason ? `推荐理由：${item.reason}` : ""].filter(Boolean).join("\n"),
    publishedAt: isoDate(item.publishedAt),
    lang: null,
    kind: "article",
    author: item.source?.name ?? "",
    categories: item.category ? [item.category] : [],
    raw: {
      aihotScore: item.score ?? null,
      category: item.category ?? null,
      sourceName: item.source?.name ?? null,
      attribution: item.attribution ?? null,
    },
  })).filter((item) => item.externalId && item.title && item.url);
}

export function parseYouTubeFeed(xml, { channelId, channelName } = {}) {
  const entries = feedBlocks(xml, "entry");
  return entries.map((entry) => {
    const videoId = stripHtml(firstTag(entry, ["yt:videoId"]));
    const title = stripHtml(firstTag(entry, ["title"]));
    const published = firstTag(entry, ["published", "updated"]);
    const description = stripHtml(firstTag(entry, ["media:description", "description"]));
    const linkTag = entry.match(/<link\b[^>]*>/iu)?.[0] ?? "";
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : attr(linkTag, "href");
    return {
      externalId: videoId || url,
      title,
      url,
      summary: description,
      publishedAt: isoDate(published),
      lang: null,
      kind: "video",
      author: channelName ?? "",
      categories: ["youtube"],
      raw: { videoId, channelId, channelName },
    };
  }).filter((item) => item.externalId && item.title && item.url);
}

export async function resolveYouTubeChannelId(handle, { proxy = "" } = {}) {
  const normalized = String(handle ?? "").trim();
  if (!normalized) throw new Error("YouTube handle 为空");
  const url = `https://www.youtube.com/${normalized.startsWith("@") ? normalized : `@${normalized}`}`;
  const html = await curlText(url, { proxy });
  const patterns = [
    /"channelId":"(UC[0-9A-Za-z_-]{20,})"/u,
    /channel_id=(UC[0-9A-Za-z_-]{20,})/u,
    /<meta\s+itemprop="identifier"\s+content="(UC[0-9A-Za-z_-]{20,})"/u,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  throw new Error(`无法解析 YouTube 频道 ID：${normalized}`);
}

export async function fetchYouTube(source, { proxy = "" } = {}) {
  const config = source.config ?? {};
  const channelId = config.channelId || await resolveYouTubeChannelId(config.handle, { proxy });
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const xml = await curlText(feedUrl, { proxy });
  const items = parseYouTubeFeed(xml, { channelId, channelName: config.handle });
  return { channelId, items };
}

export function readXBearerToken(env = process.env) {
  const token = String(env?.[X_TOKEN_ENV] ?? "").trim();
  if (!token) throw new Error(`未配置 ${X_TOKEN_ENV}，X 信源未启用`);
  // RFC 6750 b64token. Rejecting anything else also rules out curl config injection.
  if (!/^[A-Za-z0-9\-._~+/]+=*$/u.test(token)) throw new Error(`${X_TOKEN_ENV} 格式无效`);
  return token;
}

export function resolveXUserId(source = {}) {
  const userId = String(source.config?.userId ?? "").trim();
  if (!/^\d{1,25}$/u.test(userId)) throw new Error("X 信源缺少有效的数字 userId");
  return userId;
}

export function resolveXMaxResults(config = {}) {
  const raw = config?.maxResults;
  if (raw === undefined || raw === null || raw === "") return X_DEFAULT_MAX_RESULTS;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 5 || value > 100) {
    throw new Error("X maxResults 必须是 5–100 的整数");
  }
  return value;
}

export function xPostUrl(tweetId, username = "") {
  const handle = String(username ?? "").trim().replace(/^@/u, "");
  return /^[A-Za-z0-9_]{1,15}$/u.test(handle)
    ? `https://x.com/${handle}/status/${tweetId}`
    : `https://x.com/i/web/status/${tweetId}`;
}

export function parseXTimeline(payload, { source = {} } = {}) {
  const data = payload?.data;
  if (data !== undefined && !Array.isArray(data)) throw new Error("X API 响应格式异常");
  if (!Array.isArray(data)) {
    if (Number(payload?.meta?.result_count) === 0) return [];
    const detail = String(payload?.detail || payload?.title || payload?.errors?.[0]?.detail || "").trim();
    throw new Error(`X API 返回错误${detail ? `：${detail}` : ""}`.slice(0, 300));
  }
  const config = source.config ?? {};
  const userId = String(config.userId ?? "").trim();
  const username = String(config.username ?? "").trim().replace(/^@/u, "");
  const author = username || userId;
  return data.map((tweet) => {
    const id = String(tweet?.id ?? "").trim();
    const text = String(tweet?.text ?? "").replace(/\r\n/gu, "\n").trim();
    if (!/^\d{1,25}$/u.test(id) || !text) return null;
    const lang = tweet.lang ? String(tweet.lang) : null;
    return {
      externalId: id,
      title: text.replace(/\s+/gu, " ").slice(0, 120),
      url: xPostUrl(id, username),
      summary: text.slice(0, 1600),
      publishedAt: isoDate(tweet.created_at),
      lang,
      kind: "post",
      author,
      categories: ["x"],
      raw: {
        platform: "x",
        tweetId: id,
        authorId: userId || null,
        authorName: username || null,
        lang,
        conversationId: tweet.conversation_id ? String(tweet.conversation_id) : null,
      },
    };
  }).filter(Boolean);
}

export async function fetchX(source, {
  proxy = "",
  env = process.env,
  curlTextImpl = curlText,
  spawnImpl = spawn,
} = {}) {
  const token = readXBearerToken(env);
  try {
    const userId = resolveXUserId(source);
    const maxResults = resolveXMaxResults(source.config ?? {});
    const endpoint = new URL(`${X_API_BASE}/${encodeURIComponent(userId)}/tweets`);
    endpoint.searchParams.set("max_results", String(maxResults));
    endpoint.searchParams.set("tweet.fields", "created_at,lang");
    const text = await curlTextImpl(endpoint.toString(), {
      proxy,
      headers: [`Authorization: Bearer ${token}`],
      spawnImpl,
    });
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("X API 响应不是合法 JSON");
    }
    return { items: parseXTimeline(payload, { source }) };
  } catch (error) {
    // Defence in depth: never let a transport error echo the bearer token.
    const message = String(error?.message || error).split(token).join("[redacted]").slice(0, 500);
    throw new Error(message);
  }
}

export async function fetchSource(source, options = {}) {
  const { proxy = "" } = options;
  if (source.kind === "aihot") return { items: await fetchAihot(source, { proxy }) };
  if (source.kind === "rss") {
    const xml = await curlText(source.url, { proxy });
    return { items: parseFeed(xml, { source }) };
  }
  if (source.kind === "youtube") return fetchYouTube(source, { proxy });
  if (source.kind === "x") return fetchX(source, options);
  throw new Error(`未知信源类型：${source.kind}`);
}
