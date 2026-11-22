#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildDocumentAst } from "../../../../experiments/superagent-p0/p5-radar/document-model.mjs";
import { buildDailyDoc } from "../../../../experiments/superagent-p0/p5-radar/daily-doc.mjs";
import { openStore } from "../../../../experiments/superagent-p0/p5-radar/store.mjs";

const CONTRACT = "syno.p5-radar/1";
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

async function main() {
  const request = await readStdin();
  if (request.contract !== CONTRACT) {
    return { ok: false, contract: CONTRACT, requestId: request.requestId, error: { code: "P5_PLUGIN_CONTRACT_INVALID", message: `contract 必须是 ${CONTRACT}` } };
  }
  const action = String(request.action || "");
  if (action === "health") {
    return {
      ok: true,
      contract: CONTRACT,
      requestId: request.requestId,
      data: { version, capabilities: ["health", "renderDailyDoc"], home: process.env.P5_RADAR_HOME || null },
    };
  }
  if (action !== "renderDailyDoc") {
    return { ok: false, contract: CONTRACT, requestId: request.requestId, error: { code: "P5_PLUGIN_ACTION_UNSUPPORTED", message: `未实现 action：${action}` } };
  }
  const home = String(process.env.P5_RADAR_HOME || "");
  if (!home) throw Object.assign(new Error("缺少 P5_RADAR_HOME"), { code: "P5_HOME_MISSING" });
  const config = runtimeConfig(home);
  const proxy = String(process.env.P5_PROXY || config.proxy || "");
  const bundled = path.join(home, "bin", "yt-dlp");
  const ytDlp = process.env.P5_YTDLP || (existsSync(bundled) ? bundled : "yt-dlp");
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

try {
  const response = await main();
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify({ ok: false, contract: CONTRACT, error: { code: error.code || "P5_PLUGIN_FAILED", message: String(error.message || error).slice(0, 500) } })}\n`);
  process.exitCode = 1;
}
