if (process.env.NODE_ENV && process.env.NODE_ENV !== "test") {
  throw new Error("start:test 只能在 NODE_ENV=test 下运行");
}
process.env.NODE_ENV = "test";
process.env.SYNO_HARNESS_FAKE = "true";
process.env.SYNO_COGNITIVE_RUNTIME ||= "deepseek-harness";
await import("../apps/syno/server.mjs");
