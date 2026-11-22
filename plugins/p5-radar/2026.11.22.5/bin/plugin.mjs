#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { collectSources } from "../../../../experiments/superagent-p0/p5-radar/collect.mjs";
import { buildDocumentAst } from "../../../../experiments/superagent-p0/p5-radar/document-model.mjs";
import { buildDailyDoc } from "../../../../experiments/superagent-p0/p5-radar/daily-doc.mjs";
import { formatStatus } from "../../../../experiments/superagent-p0/p5-radar/format.mjs";
import {
  applyExplicitPreference,
  ensurePreferences,
  recordFeedback,
  savePreferences,
} from "../../../../experiments/superagent-p0/p5-radar/preferences.mjs";
import { DEFAULT_SOURCES } from "../../../../experiments/superagent-p0/p5-radar/sources.mjs";
import { openStore } from "../../../../experiments/superagent-p0/p5-radar/store.mjs";

const CONTRACT = "syno.p5-radar/1";
const CAPABILITIES = ["health", "collect", "renderDailyDoc", "feedback", "status", "preference"];
const version = JSON.parse(readFileSync(new URL("../plugin.json", import.meta.url), "utf8")).version;

async function readStdin() {
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  return JSON.parse(body || "{}");
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function runtimeConfig(home) {
  try {
    return JSON.parse(readFileSync(path.join(home, "config.json"), "utf8"));
  } catch {
    return {};
  }
}

function latestDigestMap(home) {
  try {
    const files = readdirSync(home).filter((name) => /^digest-\d{4}-\d{2}-\d{2}\.json$/u.test(name)).sort();
    if (!files.length) return [];
    const parsed = JSON.parse(readFileSync(path.join(home, files.at(-1)), "utf8"));
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function resolveItemId(home, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/u.test(raw)) {
    const number = Number(raw);
    return latestDigestMap(home).find((entry) => Number(entry.index) === number)?.itemId ?? number;
  }
  return null;
}

async function main() {
  const request = await readStdin();
  if (request.contract !== CONTRACT) {
    return { ok: false, contract: CONTRACT, requestId: request.requestId, error: { code: "P5_PLUGIN_CONTRACT_INVALID", message: `contract 必须是 ${CONTRACT}` } };
  }
  const action = String(request.action || "");
  if (action === "health") {
    return { ok: true, contract: CONTRACT, requestId: request.requestId, data: { version, capabilities: CAPABILITIES, home: process.env.P5_RADAR_HOME || null } };
  }
  const home = String(process.env.P5_RADAR_HOME || "");
  if (!home) throw Object.assign(new Error("缺少 P5_RADAR_HOME"), { code: "P5_HOME_MISSING" });
  const config = runtimeConfig(home);
  const proxy = String(process.env.P5_PROXY || config.proxy || "");
  const bundled = path.join(home, "bin", "yt-dlp");
  const ytDlp = process.env.P5_YTDLP || (existsSync(bundled) ? bundled : "yt-dlp");

  if (action === "collect") {
    const payload = request.payload || {};
    const store = openStore({ file: path.join(home, "p5-radar.db") });
    try {
      store.seedSources(DEFAULT_SOURCES);
      const summary = await collectSources({
        store,
        proxy,
        youtube: typeof payload.youtube === "boolean" ? payload.youtube : config.youtube === true,
        maxYoutube: Number.isSafeInteger(Number(payload.maxYoutube))
          ? Number(payload.maxYoutube)
          : Number.isSafeInteger(Number(config.maxYoutube)) ? Number(config.maxYoutube) : 2,
        maxItems: Number.isSafeInteger(Number(payload.maxItems)) ? Number(payload.maxItems) : 30,
        windowDays: Number.isSafeInteger(Number(payload.windowDays)) ? Number(payload.windowDays) : 7,
        only: typeof payload.only === "string" ? payload.only : null,
        ytDlp,
      });
      return { ok: true, contract: CONTRACT, requestId: request.requestId, data: summary };
    } finally {
      store.close();
    }
  }

  if (action === "status") {
    const store = openStore({ file: path.join(home, "p5-radar.db") });
    try {
      return { ok: true, contract: CONTRACT, requestId: request.requestId, data: formatStatus(store.status()) };
    } finally {
      store.close();
    }
  }

  if (action === "feedback") {
    const feedbackAction = String(request.payload?.action || "");
    if (!["follow", "ignore"].includes(feedbackAction)) throw Object.assign(new Error("feedback action 必须是 follow 或 ignore"), { code: "P5_FEEDBACK_INVALID" });
    const numbers = Array.isArray(request.payload?.numbers) ? request.payload.numbers.map(String) : [];
    if (!numbers.length) throw Object.assign(new Error("feedback 缺少编号"), { code: "P5_FEEDBACK_EMPTY" });
    const store = openStore({ file: path.join(home, "p5-radar.db") });
    try {
      const state = feedbackAction === "follow" ? "followed" : "ignored";
      const preferences = await ensurePreferences({ store, home });
      const outputs = [];
      let changed = false;
      for (const number of numbers) {
        const itemId = resolveItemId(home, number);
        if (!itemId) {
          outputs.push(`找不到编号 ${number}`);
          continue;
        }
        store.markCandidate(itemId, state);
        recordFeedback({
          preferences,
          item: store.getItem(itemId),
          score: store.getScore(itemId),
          action: feedbackAction,
        });
        changed = true;
        outputs.push(`已标记 item ${itemId} 为 ${state}。`);
      }
      if (changed) await savePreferences(home, preferences);
      return { ok: true, contract: CONTRACT, requestId: request.requestId, data: outputs.join("\n") };
    } finally {
      store.close();
    }
  }

  if (action === "preference") {
    const text = String(request.payload?.text || "").trim();
    if (!text) throw Object.assign(new Error("preference 缺少文本"), { code: "P5_PREFERENCE_EMPTY" });
    const store = openStore({ file: path.join(home, "p5-radar.db") });
    try {
      const preferences = await ensurePreferences({ store, home });
      const result = applyExplicitPreference({ preferences, text });
      if (result.matched.length) await savePreferences(home, preferences);
      return { ok: true, contract: CONTRACT, requestId: request.requestId, data: result.message };
    } finally {
      store.close();
    }
  }

  if (action === "renderDailyDoc") {
    const date = String(request.payload?.date || localDate());
    const store = openStore({ file: path.join(home, "p5-radar.db") });
    try {
      const result = await buildDailyDoc({
        store,
        home,
        date,
        proxy,
        ytDlp,
        windowDays: Number(request.payload?.windowDays) || Number(config.docWindowDays) || 7,
        renderOnly: true,
        log: (event, detail = {}) => console.error(JSON.stringify({ event, ...detail })),
      });
      const ast = buildDocumentAst({ date, entries: result.entries });
      return { ok: true, contract: CONTRACT, requestId: request.requestId, data: ast };
    } finally {
      store.close();
    }
  }

  return { ok: false, contract: CONTRACT, requestId: request.requestId, error: { code: "P5_PLUGIN_ACTION_UNSUPPORTED", message: `未实现 action：${action}` } };
}

try {
  const response = await main();
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ ok: false, contract: CONTRACT, error: { code: error.code || "P5_PLUGIN_FAILED", message: String(error.message || error).slice(0, 500) } })}\n`);
  process.exitCode = 1;
}
