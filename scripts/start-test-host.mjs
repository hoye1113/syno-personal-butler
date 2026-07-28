if (process.env.NODE_ENV && process.env.NODE_ENV !== "test") {
  throw new Error("start:test 只能在 NODE_ENV=test 下运行");
}
process.env.NODE_ENV = "test";
process.env.SYNO_OPENCODE_FAKE_SERVER = "true";
await import("../apps/syno/server.mjs");
