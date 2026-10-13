import assert from "node:assert/strict";
import { fork, execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { get } from "node:http";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url));
async function snapshot(root) {
  const result = {};
  async function visit(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else result[path.relative(root, file)] = await fs.readFile(file, "utf8");
    }
  }
  await visit(root);
  return result;
}

test("real isolated Host routes proactive status through its HTTP allowlist without writing facts", { timeout: 30_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-status-http-"));
  await fs.mkdir(path.join(root, "vault"));
  await fs.cp(path.join(repo, "config", "deepseek-harness"), path.join(root, "config", "deepseek-harness"), { recursive: true });
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  // Whitelist environment: never inherit real channel credentials, provider keys or legacy data roots.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(systemroot|windir|path|temp|tmp|comspec)$/i.test(key)));
  Object.assign(env, {
    NODE_ENV: "test", PORT: String(port), SYNO_REPO_ROOT: root,
    SYNO_LOCAL_DATA: path.join(root, "local"), SYNO_RUNTIME_ROOT: path.join(root, ".runtime"),
    SYNO_HARNESS_FAKE: "true", SYNO_DSH_FAKE_AGENT: path.join(repo, "tests", "support", "fake-dsh-jsonrpc-agent.mjs"),
  });
  const child = fork(path.join(repo, "tests", "support", "http-test-host.mjs"), [], { env, cwd: root, silent: true, windowsHide: true });
  let diagnostics = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { diagnostics = (diagnostics + chunk.toString("utf8")).slice(-6000); });
  const exited = new Promise((resolve) => child.once("exit", resolve));
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      if (child.connected) child.send("shutdown");
      if (await Promise.race([exited.then(() => true), delay(5000, false, { ref: false })]) === false) {
        if (process.platform === "win32") await promisify(execFile)("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
        else child.kill("SIGKILL");
        await exited;
        throw new Error("isolated test Host required forced cleanup");
      }
    }
    await fs.rm(root, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${origin}/api/syno/readiness`, { signal: AbortSignal.timeout(500) });
      if (response.ok && (await response.json()).state === "ready") { ready = true; break; }
    } catch {}
    await delay(200);
  }
  assert.equal(ready, true, diagnostics);
  const roots = [path.join(root, "local", "state"), path.join(root, "ops")];
  const before = await Promise.all(roots.map(snapshot));
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${origin}/api/syno/proactive/status`, { signal: AbortSignal.timeout(2000) });
    assert.equal(response.status, 200);
    const summary = await response.json();
    assert.equal(summary.enabled, false);
    assert.equal(typeof summary.homeChannel, "string");
    assert.equal(typeof summary.homeTargetAvailable, "boolean");
    assert.equal(summary.deliveryHealth.consecutiveFailures, 0);
    assert.equal(summary.deliveryHealth.lastDeliveryError, null);
    assert.equal(typeof summary.eligibleSignals, "number");
    assert.deepEqual(Object.keys(summary).sort(), ["bundle", "deliveryHealth", "eligibleSignals", "enabled", "homeChannel", "homeTargetAvailable"]);
    assert.doesNotMatch(JSON.stringify(summary), /contextToken|apiKey|payload|stack|senderId/);
  }
  assert.deepEqual(await Promise.all(roots.map(snapshot)), before, "GET must not persist state, settings, ledger or Outbox facts");
  for (const endpoint of ["/api/syno/proactive/preview", "/api/syno/proactive/unknown"]) {
    assert.equal((await fetch(origin + endpoint)).status, 404);
  }
  // Node fetch overwrites Host; use HTTP to actually send the hostile header.
  const hostileStatus = await new Promise((resolve, reject) => {
    const request = get(`${origin}/api/syno/proactive/status`, { headers: { host: "attacker.example" } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on("error", reject);
    request.setTimeout(2000, () => request.destroy(new Error("HTTP Host check timeout")));
  });
  assert.equal(hostileStatus, 403);
});
