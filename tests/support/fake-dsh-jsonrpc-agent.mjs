/**
 * Stdio JSON-RPC 2.0 fake of `dsh-jsonrpc-agent` for Syno tests and UTF-8 probes.
 * stdout is protocol-only; diagnostics go to stderr.
 */
import readline from "node:readline";

process.stdin.setEncoding("utf8");

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function textFrom(params) {
  const blocks = Array.isArray(params?.contentBlocks) ? params.contentBlocks : [];
  return blocks.filter((block) => block?.type === "text").map((block) => String(block.text || "")).join("");
}

function inboxEvent(sessionId, messageId) {
  return {
    jsonrpc: "2.0",
    method: "session.event",
    params: {
      sessionId,
      event: { type: "agent/inbox/spliced", data: { inserted: [{ id: messageId }] } },
    },
  };
}

function assistantEvent(sessionId, text) {
  return {
    jsonrpc: "2.0",
    method: "session.event",
    params: {
      sessionId,
      event: {
        type: "assistant/message",
        data: { message: { content: [{ type: "text", text }] } },
      },
    },
  };
}

function idleEvent(sessionId) {
  return {
    jsonrpc: "2.0",
    method: "session.status",
    params: { sessionId, status: "idle" },
  };
}

if (process.env.DSH_FAKE_FAIL_SPAWN === "1") {
  process.stderr.write("fake harness refused to start\n");
  process.exit(2);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    process.stderr.write("fake harness ignored non-JSON line\n");
    return;
  }
  const id = message.id;
  const method = message.method;
  const params = message.params || {};
  if (method === "initialize") {
    if (process.env.DSH_FAKE_GARBAGE_LINE === "1") {
      process.stdout.write("this is not json\n");
    }
    if (process.env.DSH_FAKE_FAIL_INIT === "1") {
      send({ jsonrpc: "2.0", id, error: { code: -32000, message: "fake initialize failed" } });
      return;
    }
    send({
      jsonrpc: "2.0",
      id,
      result: { serverInfo: { name: "deepseek-harness-sdk-runtime", version: "0.0.1" } },
    });
    return;
  }
  if (method === "session/prompt") {
    const sessionId = String(params.sessionId || "session");
    const messageId = `fake-msg-${Date.now()}`;
    send({ jsonrpc: "2.0", id, result: { messageId } });
    send(inboxEvent(sessionId, messageId));
    if (process.env.DSH_FAKE_EXIT_AFTER_PROMPT === "1") {
      process.exit(0);
      return;
    }
    if (process.env.DSH_FAKE_HANG_AFTER_PROMPT === "1") {
      return;
    }
    if (process.env.DSH_FAKE_EMPTY === "1") {
      send(idleEvent(sessionId));
      return;
    }
    const prompt = textFrom(params);
    const reply = process.env.DSH_FAKE_REPLY || `echo:${prompt}`;
    send(assistantEvent(sessionId, reply));
    send(idleEvent(sessionId));
    return;
  }
  if (method === "shutdown") {
    send({ jsonrpc: "2.0", id, result: {} });
    process.exit(0);
    return;
  }
  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown method: ${method}` } });
  }
});
rl.on("close", () => {
  process.exit(0);
});
