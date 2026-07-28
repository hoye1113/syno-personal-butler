import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function waitFor(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("test host timeout");
}

test("start:test launches the Syno Host and Fake OpenCode together", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-fake-host-"));
  const webPort = 19417;
  const openCodePort = 19418;
  const child = spawn(process.execPath, ["scripts/start-test-host.mjs"], {
    cwd: path.resolve("."),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(webPort),
      SYNO_OPENCODE_TEST_PORT: String(openCodePort),
      SYNO_LOCAL_DATA: path.join(root, "local"),
      SYNO_RUNTIME_ROOT: path.join(root, "runtime"),
      SYNO_WEB_ONLY: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => child.exitCode === null ? child.once("exit", resolve) : resolve());
    await fs.rm(root, { recursive: true, force: true });
  });
  const health = await waitFor(`http://127.0.0.1:${webPort}/api/syno/health`);
  const openCode = await waitFor(`http://127.0.0.1:${webPort}/api/syno/opencode`);
  assert.equal(health.ok, true);
  assert.equal(openCode.runtimeMode, "opencode");
  assert.equal(openCode.supervisor.testMode, true);
  assert.equal(openCode.supervisor.healthy, true, stderr);
});
