#!/usr/bin/env node
import { refreshPolymarketBoard } from "./p5-radar/polymarket.mjs";

const home = process.env.P5_RADAR_HOME;
if (!home) {
  console.error("请显式设置隔离的 P5_RADAR_HOME 后再运行 Polymarket 采集。");
  process.exitCode = 2;
} else {
  const result = await refreshPolymarketBoard({
    home,
    force: process.argv.includes("--force"),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ok") process.exitCode = 1;
}
