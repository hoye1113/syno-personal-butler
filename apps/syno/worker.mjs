import { createSynoRuntime } from "./syno/runtime.mjs";

const runtime = createSynoRuntime();
await runtime.initialize({ worker: true });
console.log("Syno Worker 已启动：08:30 晨报、22:00 轻复盘、周日 20:00 周报");

async function shutdown() {
  await runtime.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
