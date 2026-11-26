#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

import { refreshPolymarketBoard } from "./p5-radar/polymarket.mjs";

const home = process.env.P5_RADAR_HOME;
if (!home) {
  console.error("请显式设置隔离的 P5_RADAR_HOME 后再运行 Polymarket 采集。");
  process.exitCode = 2;
} else {
  const runtimeConfigFile = process.env.P5_RADAR_CONFIG || path.join(home, "config.json");
  try {
    const runtimeConfig = JSON.parse(readFileSync(runtimeConfigFile, "utf8"));
    if (!process.env.P5_PROXY && runtimeConfig.proxy) process.env.P5_PROXY = String(runtimeConfig.proxy);
  } catch {}
  const result = await refreshPolymarketBoard({
    home,
    force: process.argv.includes("--force"),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ok") process.exitCode = 1;
}
