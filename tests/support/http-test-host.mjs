// Only the parent test owns this Host; IPC requests graceful shutdown of its own workers.
if (process.env.NODE_ENV !== "test" || !process.send) throw new Error("test IPC Host required");
process.on("message", (message) => {
  if (message === "shutdown") {
    process.emit("SIGTERM");
    process.disconnect();
  }
});
await import("../../scripts/start-test-host.mjs");
