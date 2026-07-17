import { createSynoRuntime } from "./syno/runtime.mjs";

const runtime = createSynoRuntime();
await runtime.initialize({ worker: true });
console.log("Syno Worker 已启动：SignalEngine 主动节奏、每日最多 3 次、安静时间内不打扰");

async function shutdown() {
  await runtime.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
