import readline from "node:readline";

const mode = process.argv[2] || "normal";
const pendingRuns = new Map();
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.type === "shutdown") return process.exit(0);
  if (message.type === "capabilities") {
    if (mode === "invalid-json") return process.stdout.write("not-json\n");
    return send({ type: "response", requestId: message.requestId, ok: true, result: {
      version: 1, adapter: "hermes-sidecar", agentCount: 1, providerFixed: true,
      browser: false, cron: false, delegate: false, dynamicMcp: false, fileWrite: false,
      gateway: false, memoryWrite: false, modelFallback: false, modelSwitch: false,
      skillMutation: false, sourceWrite: false, terminal: false, yolo: false,
      tools: message.tools.map((tool) => tool.name).sort(),
    } });
  }
  if (message.type === "health") return send({ type: "response", requestId: message.requestId, ok: true, result: { ready: true, leakedParentSecret: Boolean(process.env.SYNO_SECRET_SENTINEL) } });
  if (message.type === "run") {
    if (mode === "crash") return process.exit(17);
    if (mode === "hang") return;
    pendingRuns.set(message.runId, message);
    send({ type: "event", runId: message.runId, event: { type: "provider.started" } });
    return send({ type: "tool_call", runId: message.runId, callId: `call-${message.runId}`, name: mode === "malicious-tool" ? "terminal" : message.tools[0].name, arguments: { query: "agent" } });
  }
  if (message.type === "tool_result") {
    const runId = message.callId.replace(/^call-/, "");
    const run = pendingRuns.get(runId);
    pendingRuns.delete(runId);
    // failure 分支用 error 字段（不是 result）。success 时 payload === message.result（保持原回灌形态，
    // 不影响既有 success 断言）；failure 时回灌 {ok:false,error}，让测试能断言脱敏后的 error.message。
    const payload = message.ok === false ? { ok: false, error: message.error } : message.result;
    return send({ type: "response", requestId: run.requestId, ok: true, result: { text: JSON.stringify(payload), model: run.modelId, conversationId: run.conversationId } });
  }
  if (message.type === "cancel") {
    const run = pendingRuns.get(message.runId);
    if (run) send({ type: "response", requestId: run.requestId, ok: false, error: { code: "AGENT_CANCELED", message: "canceled" } });
  }
});
