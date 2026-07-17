import test from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { request } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

test("calendar failure degrades to durable Markdown on Windows", { timeout: 20_000 }, async (t) => {
  const fixture = await createFixture("failure");
  const server = await startFixtureServer(t, fixture, { LARK_FAKE_FAIL: "1" });
  const response = await queueAndApprove(server.port, "/api/topics/schedule", {
    path: "ops/content/topic.md",
    scheduledDate: "2026-07-10",
    scheduledStart: "10:00",
    scheduledEnd: "11:00",
    calendarProvider: "lark",
  });
  assert.equal(response.statusCode, 200, server.logs.text());
  assert.equal(response.body.job.result.operationResult.topic.calendarSyncStatus, "同步失败：forced calendar create failure");
  const saved = await fs.readFile(fixture.topicPath, "utf8");
  assert.match(saved, /scheduled_date: 2026-07-10/);
  assert.match(saved, /calendar_provider: lark/);
});

test("calendar Adapter sends selected calendar and configured timezone", { timeout: 20_000 }, async (t) => {
  const fixture = await createFixture("timezone", { calendarProvider: "lark" });
  const capture = path.join(fixture.tempRoot, "local-data", "event.json");
  const params = path.join(fixture.tempRoot, "local-data", "params.json");
  const server = await startFixtureServer(t, fixture, {
    LARK_CLI_CAPTURE_PATH: capture,
    LARK_CLI_CAPTURE_PARAMS_PATH: params,
    TOPIC_PLANNER_TIME_ZONE: "America/Vancouver",
  });
  const response = await queueAndApprove(server.port, "/api/topics/schedule", {
    path: "ops/content/topic.md",
    scheduledDate: "2026-07-10",
    scheduledStart: "10:00",
    scheduledEnd: "11:00",
    calendarProvider: "lark",
  });
  assert.equal(response.statusCode, 200, server.logs.text());
  assert.equal(response.body.job.result.operationResult.topic.calendarSyncStatus, "已同步");
  assert.deepEqual(JSON.parse(await fs.readFile(params, "utf8")), { calendar_id: "cal_selected" });
  const data = JSON.parse(await fs.readFile(capture, "utf8"));
  assert.deepEqual(data.start_time, { timestamp: "1783702800", timezone: "America/Vancouver" });
  assert.deepEqual(data.end_time, { timestamp: "1783706400", timezone: "America/Vancouver" });
});

async function createFixture(name, overrides = {}) {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), `syno-calendar-${name}-`));
  const vaultRoot = tempRoot;
  const topicDir = path.join(vaultRoot, "ops", "content");
  const configPath = path.join(tempRoot, "topic-planner.config.json");
  const fakeLarkCliPath = path.join(tempRoot, "fake-lark.mjs");
  const topicPath = path.join(topicDir, "topic.md");
  await fs.mkdir(topicDir, { recursive: true });
  await fs.mkdir(path.join(vaultRoot, "vault"), { recursive: true });
  await fs.mkdir(path.join(tempRoot, "local-data"), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify({
    workspaceMode: "obsidian", vaultRoot, topicDir: "ops/content", inboxDir: "ops/inbox", archiveDir: "ops/archive",
    calendarProvider: "none", larkCalendarId: "cal_selected", larkCalendarName: "Selected", ...overrides,
  }, null, 2));
  await fs.writeFile(topicPath, [
    "---", "topic_id: topic-calendar-test", "status: active", "stage: 待排期", "priority: ⭐⭐⭐",
    "created: 2026-07-01", "updated: 2026-07-01", "---", "# 日历 Adapter 回归", "", "本地 Markdown 必须保持可用。", "",
  ].join("\n"));
  await fs.writeFile(fakeLarkCliPath, `
import fs from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "--version") console.log("1.0.0-test");
else if (args[0] === "auth") console.log(JSON.stringify({ identities: { user: { tokenStatus: "valid", openId: "u-test", userName: "Tester" } } }));
else if (args[0] === "calendar" && args[1] === "calendars" && args[2] === "primary") console.log(JSON.stringify({ data: { calendars: [{ calendar: { calendar_id: "cal_primary", summary: "Primary" } }] } }));
else if (args[0] === "calendar" && args[1] === "events" && process.env.LARK_FAKE_FAIL === "1") { console.error("forced calendar create failure"); process.exit(42); }
else if (args[0] === "calendar" && args[1] === "events" && args[2] === "create") {
  fs.writeFileSync(process.env.LARK_CLI_CAPTURE_PARAMS_PATH, args[args.indexOf("--params") + 1]);
  fs.writeFileSync(process.env.LARK_CLI_CAPTURE_PATH, args[args.indexOf("--data") + 1]);
  console.log(JSON.stringify({ data: { event: { event_id: "evt-test" } } }));
} else { console.error("unexpected args: " + args.join(" ")); process.exit(43); }
`);
  await fs.writeFile(path.join(tempRoot, ".gitignore"), "runtime/\nlocal-data/\n");
  await runGit(tempRoot, ["init", "-b", "main"]);
  await runGit(tempRoot, ["config", "user.name", "Syno Tests"]);
  await runGit(tempRoot, ["config", "user.email", "syno-tests@example.invalid"]);
  await runGit(tempRoot, ["add", "--", ".gitignore", "ops/content/topic.md", "topic-planner.config.json", "fake-lark.mjs"]);
  await runGit(tempRoot, ["commit", "-m", "test fixture"]);
  return { tempRoot, vaultRoot, configPath, fakeLarkCliPath, topicPath };
}

async function startFixtureServer(t, fixture, extraEnv = {}) {
  const port = await getFreePort();
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ...extraEnv,
      NODE_ENV: "test",
      SYNO_REPO_ROOT: fixture.tempRoot,
      HOME: fixture.tempRoot,
      SYNO_LOCAL_DATA: path.join(fixture.tempRoot, "local-data"),
      SYNO_RUNTIME_ROOT: path.join(fixture.tempRoot, "runtime"),
      SYNO_EXECUTOR: "fake",
      LARK_CLI_PATH: fixture.fakeLarkCliPath,
      PORT: String(port),
      TOPIC_PLANNER_CONFIG: fixture.configPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = collectChildOutput(child);
  t.after(async () => { await stopChild(child); await fs.rm(fixture.tempRoot, { recursive: true, force: true }); });
  await waitForHealth(child, port, logs);
  return { child, port, logs };
}

async function queueAndApprove(port, pathname, body) {
  const queued = await requestJson(port, pathname, body);
  assert.equal(queued.statusCode, 200);
  assert.equal(queued.body.requiresApproval, true);
  const approved = await requestJson(port, `/api/syno/jobs/${encodeURIComponent(queued.body.job.id)}/approve`, {});
  assert.equal(approved.body.job.status, "completed", JSON.stringify(approved.body));
  return approved;
}

async function runGit(cwd, args) {
  await execFileAsync("git", args, { cwd, windowsHide: true });
}

function collectChildOutput(child) {
  const chunks = [];
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => chunks.push(chunk)); child.stderr.on("data", (chunk) => chunks.push(chunk));
  return { text: () => chunks.join("") };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer(); server.unref(); server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { const address = server.address(); assert.equal(typeof address, "object"); server.close(() => resolve(address.port)); });
  });
}

async function waitForHealth(child, port, logs) {
  const deadline = Date.now() + 7_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited\n${logs.text()}`);
    try { const response = await requestJson(port, "/api/health"); if (response.statusCode === 200) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`server did not become healthy\n${logs.text()}`);
}

async function requestJson(port, pathname, body) {
  const payload = body ? JSON.stringify(body) : "";
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path: pathname, method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {} }, (res) => {
      let raw = ""; res.setEncoding("utf8"); res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => { try { resolve({ statusCode: res.statusCode, body: raw ? JSON.parse(raw) : null }); } catch (error) { reject(error); } });
    });
    req.on("error", reject); req.setTimeout(10_000, () => req.destroy(new Error("request timed out")));
    if (payload) req.write(payload); req.end();
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => { child.once("close", resolve); child.kill(); });
}
