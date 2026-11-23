#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { collectSources } from "./p5-radar/collect.mjs";
import { buildDailyDoc } from "./p5-radar/daily-doc.mjs";
import { formatDigest, formatStatus } from "./p5-radar/format.mjs";
import { DEFAULT_MODEL, createOpenCodeClient } from "./p5-radar/opencode.mjs";
import { DEFAULT_SOURCES, resolveProxy } from "./p5-radar/sources.mjs";
import { openStore } from "./p5-radar/store.mjs";
import { summarizeTranscript, summarizeYouTubeUrl } from "./p5-radar/summarize.mjs";
import { fetchTranscript } from "./p5-radar/youtube.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "../..");
const home = process.env.P5_RADAR_HOME || path.join(repoRoot, ".local-data", "p5-radar");
const runtimeConfigFile = process.env.P5_RADAR_CONFIG || path.join(home, "config.json");
let runtimeConfig = {};
try {
  runtimeConfig = JSON.parse(readFileSync(runtimeConfigFile, "utf8"));
} catch {
  runtimeConfig = {};
}
if (!process.env.P5_PROXY && runtimeConfig.proxy) process.env.P5_PROXY = String(runtimeConfig.proxy);
const dbFile = path.join(home, "p5-radar.db");
const bundledYtDlp = path.join(home, "bin", "yt-dlp");
const ytDlp = process.env.P5_YTDLP || (existsSync(bundledYtDlp) ? bundledYtDlp : "yt-dlp");

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function openRadar() {
  const store = openStore({ file: dbFile });
  store.seedSources(DEFAULT_SOURCES);
  return store;
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function printHelp() {
  console.log(`P5 信息雷达

用法：
  node experiments/superagent-p0/p5-radar.mjs init
  node ... run [--once] [--youtube] [--proxy URL] [--source ID] [--max-youtube N]
  node ... status [--json]
  node ... list [--limit N] [--state new]
  node ... digest [--send-feishu]
  node ... daily-doc [--proxy URL]
  node ... summarize <编号|itemId> [--proxy URL]
  node ... summarize --url <YouTube URL> [--proxy URL]
  node ... follow <编号|itemId> [--note 文本]
  node ... ignore <编号|itemId> [--note 文本]
  node ... add-x --user-id <数字ID> [--username handle] [--name 显示名] [--id 信源ID]

环境：
  P5_RADAR_HOME   数据目录（默认 <repo>/.local-data/p5-radar）
  P5_RADAR_CONFIG 数据目录配置文件（默认 <P5_RADAR_HOME>/config.json；可含 proxy/youtube/maxYoutube）
  P5_PROXY        采集代理（优先；缺省读 config.json.proxy，再读 HTTPS_PROXY/HTTP_PROXY）
  P5_YTDLP        yt-dlp 路径（默认 yt-dlp）
  P5_X_BEARER_TOKEN  X API v2 只读 Bearer Token；仅 kind=x 信源使用，默认未启用，不写入数据库/日志
  P5_FEISHU_WEBHOOK 可选，飞书自定义机器人 webhook
`);
}

function latestDigestMap() {
  if (!existsSync(home)) return [];
  const files = readdirSync(home)
    .filter((name) => /^digest-\d{4}-\d{2}-\d{2}\.json$/u.test(name))
    .sort();
  if (!files.length) return [];
  const file = path.join(home, files[files.length - 1]);
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function resolveCandidateId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/u.test(raw)) {
    const number = Number(raw);
    const map = latestDigestMap();
    const mapped = map.find((entry) => Number(entry.index) === number);
    return mapped ? Number(mapped.itemId) : number;
  }
  return null;
}

async function postJson(url, payload, { proxy = "" } = {}) {
  const args = [
    "-sSL", "--compressed", "--max-time", "30",
    "-X", "POST",
    "-H", "Content-Type: application/json",
    "--data-binary", JSON.stringify(payload),
  ];
  if (proxy) args.push("-x", proxy);
  args.push(url);
  const { stdout } = await execFileAsync("curl", args, { maxBuffer: 2 * 1024 * 1024 });
  return stdout;
}

async function sendFeishu(text, { proxy = "" } = {}) {
  const webhook = process.env.P5_FEISHU_WEBHOOK;
  if (!webhook) return { sent: false, reason: "P5_FEISHU_WEBHOOK not set" };
  try {
    await postJson(webhook, { msg_type: "text", content: { text } }, { proxy });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: String(error?.message || error).slice(0, 300) };
  }
}

async function run(args) {
  const proxy = String(args.proxy ?? resolveProxy());
  const youtube = args.youtube === true || process.env.P5_YOUTUBE === "1" || runtimeConfig.youtube === true;
  const maxYoutube = Number.isSafeInteger(Number(args["max-youtube"]))
    ? Number(args["max-youtube"])
    : Number.isSafeInteger(Number(runtimeConfig.maxYoutube))
      ? Number(runtimeConfig.maxYoutube)
      : 2;
  const maxItems = Number.isSafeInteger(Number(args["max-items"])) ? Number(args["max-items"]) : 30;
  const windowDays = Number.isSafeInteger(Number(args["window-days"])) ? Number(args["window-days"]) : 7;
  const only = typeof args.source === "string" ? args.source : null;
  const store = openRadar();
  try {
    const summary = await collectSources({
      store,
      proxy,
      youtube,
      maxYoutube,
      maxItems,
      windowDays,
      only,
      ytDlp,
    });
    console.log(JSON.stringify({ ok: summary.errors.length === 0, ...summary }, null, 2));
  } finally {
    store.close();
  }
}

function status(args) {
  const store = openRadar();
  try {
    const value = store.status();
    if (args.json) console.log(JSON.stringify(value, null, 2));
    else process.stdout.write(formatStatus(value));
  } finally {
    store.close();
  }
}

function list(args) {
  const store = openRadar();
  try {
    const limit = Number.isSafeInteger(Number(args.limit)) ? Number(args.limit) : 20;
    const state = typeof args.state === "string" ? args.state : "new";
    const rows = store.listCandidates({ limit, state });
    for (const row of rows) {
      console.log(`[${row.item_id}] ${row.score} 分 · ${row.source_name} · ${row.title}`);
      console.log(`     ${row.reason}`);
      console.log(`     ${row.url}`);
    }
    console.log(`\n${rows.length} 条 ${state} 候选。`);
  } finally {
    store.close();
  }
}

function latestCandidates(store, limit = 10) {
  return store.listCandidates({ limit: 100, state: "new" })
    .sort((left, right) => (Date.parse(right.published_at) || 0) - (Date.parse(left.published_at) || 0)
      || Number(right.score) - Number(left.score))
    .slice(0, limit);
}

async function digest(args) {
  const store = openRadar();
  try {
    const candidates = latestCandidates(store, 10);
    const date = localDate();
    const text = formatDigest(candidates, { date });
    const markdownFile = path.join(home, `digest-${date}.md`);
    const mapFile = path.join(home, `digest-${date}.json`);
    writeFileSync(markdownFile, text);
    writeFileSync(mapFile, JSON.stringify({
      date,
      items: candidates.map((candidate, index) => ({
        index: index + 1,
        itemId: candidate.item_id,
        title: candidate.title,
        score: candidate.score,
      })),
    }, null, 2));
    process.stdout.write(text);
    console.log(`\n已写入 ${markdownFile}`);
    if (args["send-feishu"]) {
      const result = await sendFeishu(text);
      console.log(result.sent ? "已发送飞书摘要。" : `飞书未发送：${result.reason}`);
    }
  } finally {
    store.close();
  }
}

async function dailyDoc(args) {
  const store = openRadar();
  try {
    const result = await buildDailyDoc({
      store,
      home,
      date: localDate(),
      proxy: String(args.proxy ?? resolveProxy()),
      ytDlp,
      windowDays: Number(args["window-days"]) > 0
        ? Number(args["window-days"])
        : Number(runtimeConfig.docWindowDays) > 0
          ? Number(runtimeConfig.docWindowDays)
          : 7,
      configPath: process.env.P5_PUBLISH_CONFIG || path.join(repoRoot, "config/knowledge-publishing.json"),
      log: (event, detail = {}) => console.error(JSON.stringify({ event, ...detail })),
    });
    console.log(result.message);
  } finally {
    store.close();
  }
}

async function summarize(args) {
  const proxy = String(args.proxy ?? resolveProxy());
  const modelArg = typeof args.model === "string" ? args.model : "";
  const model = modelArg
    ? (modelArg.includes("/")
      ? { providerID: modelArg.slice(0, modelArg.indexOf("/")), id: modelArg.slice(modelArg.indexOf("/") + 1) }
      : { ...DEFAULT_MODEL, id: modelArg })
    : DEFAULT_MODEL;
  const timeout = Number(args.timeout) > 0 ? Number(args.timeout) * 1000 : 180_000;
  const url = typeof args.url === "string" ? args.url : "";
  if (url && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//iu.test(url)) {
    console.error("--url 只支持 YouTube 链接");
    process.exitCode = 2;
    return;
  }
  const store = url ? null : openRadar();
  const client = await createOpenCodeClient({ model });
  try {
    if (url) {
      const result = await summarizeYouTubeUrl({
        url, client, model, ytDlp, proxy, timeout,
      });
      process.stdout.write(`${result.text}\n`);
      console.log(`\n模型：${result.model}；字幕 ${result.transcriptChars} 字符；截断 ${result.clippedChars < result.transcriptChars ? "是" : "否"}`);
      return;
    }
    const id = resolveCandidateId(args._[1]);
    if (!id) {
      console.error("需要候选编号或 itemId，或使用 --url <YouTube URL>");
      process.exitCode = 2;
      return;
    }
    const item = store.getItem(id);
    if (!item) {
      console.error(`找不到 item ${id}`);
      process.exitCode = 1;
      return;
    }
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//iu.test(item.url)) {
      console.error(`item ${id} 不是 YouTube 视频`);
      process.exitCode = 2;
      return;
    }
    let transcript = item.content;
    if (!transcript || transcript.length < 200) {
      const fetched = await fetchTranscript(item.url, { ytDlp, proxy, timeout: 180_000 });
      store.updateItemContent(id, { content: fetched.text, transcriptStatus: fetched.status });
      if (fetched.status !== "ok") {
        console.error(`无法取得字幕：${fetched.error || fetched.status}`);
        process.exitCode = 1;
        return;
      }
      transcript = fetched.text;
    }
    const result = await summarizeTranscript({ item, transcript, client, model, timeout });
    store.saveSummary(id, {
      model: result.model,
      text: result.text,
      transcriptChars: result.transcriptChars,
      usage: result.usage,
    });
    process.stdout.write(`${result.text}\n`);
    console.log(`\n模型：${result.model}；字幕 ${result.transcriptChars} 字符；截断 ${result.clippedChars < result.transcriptChars ? "是" : "否"}；已保存到 item ${id}`);
  } finally {
    await client.close();
    store?.close();
  }
}

function mark(args, state) {
  const id = resolveCandidateId(args._[1]);
  if (!id) {
    console.error("需要候选编号或 itemId");
    process.exitCode = 2;
    return;
  }
  const store = openRadar();
  try {
    const changed = store.markCandidate(id, state, typeof args.note === "string" ? args.note : null);
    console.log(changed ? `已标记 item ${id} 为 ${state}。` : `找不到候选 item ${id}。`);
    if (!changed) process.exitCode = 1;
  } finally {
    store.close();
  }
}

/**
 * Add one read-only X account to the SQLite under P5_RADAR_HOME.
 * Never accepts or prints the bearer token; only userId/username are stored.
 */
function addXAccount(args) {
  const userId = typeof args["user-id"] === "string" ? args["user-id"].trim() : "";
  if (!/^\d{1,25}$/u.test(userId)) {
    console.error("需要 --user-id <数字用户 ID>");
    process.exitCode = 2;
    return;
  }
  const username = typeof args.username === "string" ? args.username.trim().replace(/^@/u, "") : "";
  const sourceId = typeof args.id === "string" && args.id.trim() ? args.id.trim() : `x-${userId}`;
  const name = typeof args.name === "string" && args.name.trim()
    ? args.name.trim()
    : username ? `X · @${username}` : `X · ${userId}`;
  const store = openRadar();
  try {
    if (store.getSource(sourceId)) {
      console.error(`信源 ${sourceId} 已存在，未变更（重复 ID 不覆盖）。`);
      process.exitCode = 1;
      return;
    }
    store.seedSources([{
      id: sourceId,
      name,
      kind: "x",
      url: "",
      tier: "T1.5",
      weight: 0.9,
      config: username ? { userId, username } : { userId },
    }]);
    const saved = store.getSource(sourceId);
    if (!saved || saved.kind !== "x") {
      console.error(`写入信源 ${sourceId} 失败。`);
      process.exitCode = 1;
      return;
    }
    console.log(`已添加 X 只读信源 ${sourceId}（userId=${userId}${username ? `, username=@${username}` : ""}）。`);
    console.log(`数据库：${dbFile}`);
    console.log("Bearer Token 仅从 P5_X_BEARER_TOKEN 读取，未写入数据库；默认信源未启用 X。");
  } finally {
    store.close();
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? "help";

if (command === "help" || command === "--help" || args.help) {
  printHelp();
} else if (command === "init") {
  const store = openRadar();
  try {
    console.log(`初始化完成：${store.listSources().length} 个信源，数据库 ${dbFile}`);
  } finally {
    store.close();
  }
} else if (command === "run") {
  await run(args);
} else if (command === "status") {
  status(args);
} else if (command === "list") {
  list(args);
} else if (command === "digest") {
  await digest(args);
} else if (command === "daily-doc") {
  await dailyDoc(args);
} else if (command === "summarize") {
  await summarize(args);
} else if (command === "follow") {
  mark(args, "followed");
} else if (command === "ignore") {
  mark(args, "ignored");
} else if (command === "add-x") {
  addXAccount(args);
} else {
  console.error(`未知命令：${command}`);
  printHelp();
  process.exitCode = 2;
}
