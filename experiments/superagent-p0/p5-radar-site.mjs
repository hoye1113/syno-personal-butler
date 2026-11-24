#!/usr/bin/env node
import { startRadarSiteServerFromEnv } from "./p5-radar/site-server.mjs";

const server = await startRadarSiteServerFromEnv();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
