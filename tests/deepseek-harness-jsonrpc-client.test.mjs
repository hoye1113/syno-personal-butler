import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { DeepSeekHarnessJsonRpcClient } from "../apps/syno/syno/deepseek-harness-jsonrpc-client.mjs";

const fakeAgent = path.resolve("tests/support/fake-dsh-jsonrpc-agent.mjs");

function startFake(env = {}) {
  const child = spawn(process.execPath, [fakeAgent], {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const client = new DeepSeekHarnessJsonRpcClient({
    stdin: child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
    pid: child.pid,
    kill: () => child.kill(),
    initializeTimeoutMs: 5_000,
    requestTimeoutMs: 5_000,
  });
  return { child, client };
}

test("fake sidecar initialize/prompt/idle preserves UTF-8 Chinese JSON-RPC", async (t) => {
  const { child, client } = startFake();
  t.after(async () => {
    await client.close();
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  });
  const identity = await client.initialize({
    cwd: process.cwd(),
    provider: "deepseek-official",
    model: "deepseek-v4-flash",
  });
  assert.equal(identity.serverInfo.name, "deepseek-harness-sdk-runtime");
  const turn = await client.runTurn("session-zh", [{ type: "text", text: "你好，管家" }]);
  assert.equal(turn.finalResponse, "echo:你好，管家");
  assert.equal(turn.events.some((event) => event.type === "agent/inbox/spliced"), true);
});

test("empty assistant text is observable as a completed idle turn", async (t) => {
  const { child, client } = startFake({ DSH_FAKE_EMPTY: "1" });
  t.after(async () => {
    await client.close();
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  });
  await client.initialize({ cwd: process.cwd(), provider: "deepseek-official", model: "deepseek-v4-flash" });
  const turn = await client.runTurn("session-empty", [{ type: "text", text: "x" }]);
  assert.equal(turn.finalResponse, "");
});
