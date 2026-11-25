#!/usr/bin/env node
import { refreshGrowthRankings } from "./p5-radar/growth.mjs";

const home = process.env.P5_RADAR_HOME;
if (!home) {
  console.error("请显式设置隔离的 P5_RADAR_HOME 后再运行增长榜采集。");
  process.exitCode = 2;
} else {
  const result = await refreshGrowthRankings({
    home,
    force: process.argv.includes("--force"),
    log(event, fields) { console.error(JSON.stringify({ event, ...fields })); },
  });
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result.boards).some((board) => board.status !== "ok")) process.exitCode = 1;
}
