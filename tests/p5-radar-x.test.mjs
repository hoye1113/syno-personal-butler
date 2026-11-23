import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { promisify } from "node:util";

import { collectSources } from "../experiments/superagent-p0/p5-radar/collect.mjs";
import {
  fetchX,
  parseXTimeline,
  resolveXMaxResults,
} from "../experiments/superagent-p0/p5-radar/sources.mjs";
import { openStore } from "../experiments/superagent-p0/p5-radar/store.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, "..");
const cliPath = path.join(repoRoot, "experiments/superagent-p0/p5-radar.mjs");
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.fixture-payload.fixture-signature";

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "p5-radar-x-test-"));
}

/**
 * Minimal curl child substitute: records argv and the stdin config, then emits
 * the fixture response. It never touches the network or a real X endpoint.
 */
function fakeCurl({ stdout = "", stderr = "", code = 0, onCall = () => {} } = {}) {
  return (file, args, options) => {
    const child = new EventEmitter();
    const stdin = new PassThrough();
    const out = new PassThrough();
    const err = new PassThrough();
    let input = "";
    stdin.on("data", (chunk) => { input += chunk; });
    child.stdin = stdin;
    child.stdout = out;
    child.stderr = err;
    child.kill = () => {};
    setImmediate(() => {
      onCall({ file, args, options, input });
      if (stdout) out.write(stdout);
      if (stderr) err.write(stderr);
      out.end();
      err.end();
      child.emit("close", code);
    });
    return child;
  };
}

function fixtureSource(config) {
  return {
    id: "x-test",
    name: "X · @karpathy",
    kind: "x",
    url: "",
    tier: "T1.5",
    weight: 0.9,
    config: config ?? { userId: "42", username: "@karpathy" },
  };
}

function timelineFixture(publishedAt = new Date().toISOString()) {
  return JSON.stringify({
    data: [
      {
        id: "1799000000000000001",
        text: "Agent harness, context engineering and MCP for coding agents. https://t.co/media",
        created_at: publishedAt,
        lang: "en",
        conversation_id: "1799000000000000000",
      },
      {
        id: "1799000000000000002",
        text: "中文帖子：记忆系统与 eval 实践。",
        created_at: "not-a-date",
        lang: "zh",
      },
    ],
    meta: { result_count: 2, newest_id: "1799000000000000001", oldest_id: "1799000000000000002" },
  });
}

test("X 时间线解析：externalId、URL、正文、时间、语言、作者与安全 raw 元数据", () => {
  const items = parseXTimeline(JSON.parse(timelineFixture("2026-11-22T09:30:00.000Z")), {
    source: fixtureSource(),
  });
  assert.equal(items.length, 2);
  const [first, second] = items;
  assert.equal(first.externalId, "1799000000000000001");
  assert.equal(first.url, "https://x.com/karpathy/status/1799000000000000001");
  assert.match(first.title, /Agent harness/);
  assert.match(first.summary, /context engineering/);
  assert.equal(first.publishedAt, "2026-11-22T09:30:00.000Z");
  assert.equal(first.lang, "en");
  assert.equal(first.kind, "post");
  assert.equal(first.author, "karpathy");
  assert.deepEqual(first.categories, ["x"]);
  assert.deepEqual(first.raw, {
    platform: "x",
    tweetId: "1799000000000000001",
    authorId: "42",
    authorName: "karpathy",
    lang: "en",
    conversationId: "1799000000000000000",
  });
  assert.equal(second.publishedAt, null);
  assert.equal(second.lang, "zh");
  // A non-handle display name falls back to the canonical status URL.
  const [displayName] = parseXTimeline(JSON.parse(timelineFixture()), {
    source: fixtureSource({ userId: "42", username: "卡帕西" }),
  });
  assert.equal(displayName.url, "https://x.com/i/web/status/1799000000000000001");
  assert.equal(displayName.author, "卡帕西");
  assert.doesNotMatch(JSON.stringify(items), /Bearer|eyJhbGci/u);
});

test("X 响应：无 data 且 result_count=0 是空结果，错误响应不冒充空成功", () => {
  assert.deepEqual(parseXTimeline({ meta: { result_count: 0 } }, { source: fixtureSource() }), []);
  assert.deepEqual(parseXTimeline({ data: [], meta: { result_count: 0 } }, { source: fixtureSource() }), []);
  assert.throws(
    () => parseXTimeline({ title: "Unauthorized", status: 401, detail: "Unauthorized" }, { source: fixtureSource() }),
    /X API 返回错误：Unauthorized/u,
  );
  assert.throws(
    () => parseXTimeline({ errors: [{ detail: "Usage cap exceeded" }] }, { source: fixtureSource() }),
    /X API 返回错误：Usage cap exceeded/u,
  );
  assert.throws(
    () => parseXTimeline({ meta: { result_count: 3 } }, { source: fixtureSource() }),
    /X API 返回错误/u,
  );
  assert.throws(
    () => parseXTimeline({ data: "nope" }, { source: fixtureSource() }),
    /响应格式异常/u,
  );
  assert.deepEqual(parseXTimeline({
    data: [{ id: "../escape?x=1", text: "invalid id" }],
  }, { source: fixtureSource() }), []);
});

test("X maxResults 只接受 5–100 的整数，默认 20", () => {
  assert.equal(resolveXMaxResults({}), 20);
  assert.equal(resolveXMaxResults({ maxResults: 5 }), 5);
  assert.equal(resolveXMaxResults({ maxResults: 100 }), 100);
  assert.equal(resolveXMaxResults({ maxResults: "80" }), 80);
  for (const value of [4, 101, 0, -5, 20.5, "abc", Number.NaN]) {
    assert.throws(() => resolveXMaxResults({ maxResults: value }), /5–100/u);
  }
});

test("X 请求只打官方时间线端点，认证头经 stdin 传入而不进 argv", async () => {
  const calls = [];
  const result = await fetchX(fixtureSource(), {
    proxy: "http://127.0.0.1:7890",
    env: { P5_X_BEARER_TOKEN: TOKEN },
    spawnImpl: fakeCurl({ stdout: timelineFixture(), onCall: (call) => calls.push(call) }),
  });
  assert.equal(calls.length, 1);
  const [{ file, args, input }] = calls;
  assert.equal(file, "curl");
  const endpoint = new URL(args.at(-1));
  assert.equal(endpoint.origin, "https://api.x.com");
  assert.equal(endpoint.pathname, "/2/users/42/tweets");
  assert.equal(endpoint.searchParams.get("max_results"), "20");
  assert.equal(endpoint.searchParams.get("tweet.fields"), "created_at,lang");
  assert.deepEqual(args.slice(args.indexOf("-x"), args.indexOf("-x") + 2), ["-x", "http://127.0.0.1:7890"]);
  assert.ok(args.includes("--config") && args.includes("-"));
  assert.doesNotMatch(args.join(" "), /eyJhbGci|Bearer/u);
  assert.match(input, /^header = "Authorization: Bearer eyJhbGci/u);
  assert.equal(result.items.length, 2);
});

test("X 请求使用配置的 maxResults，非法值不发起网络调用", async () => {
  let calls = 0;
  await fetchX(fixtureSource({ userId: "42", maxResults: 75 }), {
    env: { P5_X_BEARER_TOKEN: TOKEN },
    spawnImpl: fakeCurl({ stdout: timelineFixture(), onCall: () => { calls += 1; } }),
  });
  assert.equal(calls, 1);

  await assert.rejects(
    fetchX(fixtureSource({ userId: "42", maxResults: 101 }), {
      env: { P5_X_BEARER_TOKEN: TOKEN },
      spawnImpl: fakeCurl({ stdout: timelineFixture(), onCall: () => { calls += 1; } }),
    }),
    /5–100/u,
  );
  assert.equal(calls, 1, "invalid maxResults must fail before curl runs");
});

test("X 缺 token / token 非法时 fail-closed，错误文本与 argv 均不含密钥", async () => {
  await assert.rejects(
    fetchX(fixtureSource(), { env: {}, spawnImpl: fakeCurl({ stdout: timelineFixture() }) }),
    (error) => {
      assert.match(error.message, /P5_X_BEARER_TOKEN/u);
      assert.doesNotMatch(error.message, /Bearer/u);
      return true;
    },
  );

  const injected = `abc\"\nheader = \"X-Leak`;
  await assert.rejects(
    fetchX(fixtureSource(), { env: { P5_X_BEARER_TOKEN: injected }, spawnImpl: fakeCurl() }),
    (error) => {
      assert.match(error.message, /格式无效/u);
      assert.ok(!error.message.includes("X-Leak"));
      return true;
    },
  );

  await assert.rejects(
    fetchX(fixtureSource({ userId: "not-a-number" }), {
      env: { P5_X_BEARER_TOKEN: TOKEN },
      spawnImpl: fakeCurl(),
    }),
    /userId/u,
  );
});

test("X API 与网络错误向上抛出，且不回显 token", async () => {
  await assert.rejects(
    fetchX(fixtureSource(), {
      env: { P5_X_BEARER_TOKEN: TOKEN },
      spawnImpl: fakeCurl({ stdout: JSON.stringify({ title: "Unauthorized", status: 401 }) }),
    }),
    /X API 返回错误：Unauthorized/u,
  );

  await assert.rejects(
    fetchX(fixtureSource(), {
      env: { P5_X_BEARER_TOKEN: TOKEN },
      spawnImpl: fakeCurl({ stderr: `curl: (22) header rejected ${TOKEN}`, code: 22 }),
    }),
    (error) => {
      assert.match(error.message, /curl 退出码 22/u);
      assert.ok(!error.message.includes(TOKEN), "token must be redacted from transport errors");
      assert.match(error.message, /\[redacted\]/u);
      return true;
    },
  );
});

test("collectSources：X 缺 token 只让该源失败，不影响其他信源", async () => {
  const root = temporaryRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([
      fixtureSource(),
      { id: "rss-ok", name: "RSS OK", kind: "rss", url: "https://example.com/feed.xml", tier: "T1", weight: 1 },
    ]);
    const summary = await collectSources({
      store,
      fetchSourceImpl: (source, options) => (source.kind === "x"
        ? fetchX(source, { ...options, env: {}, spawnImpl: fakeCurl() })
        : Promise.resolve({
          items: [{
            externalId: "rss-1",
            title: "Agent harness update",
            url: "https://example.com/rss-1",
            summary: "MCP and memory.",
            publishedAt: new Date().toISOString(),
            kind: "article",
          }],
        })),
    });
    assert.equal(summary.inserted, 1);
    assert.equal(summary.errors.length, 1);
    assert.equal(summary.errors[0].source, "x-test");
    assert.match(summary.errors[0].error, /P5_X_BEARER_TOKEN/u);
    const sources = store.listSources();
    assert.match(sources.find((source) => source.id === "x-test").last_error, /P5_X_BEARER_TOKEN/u);
    assert.equal(sources.find((source) => source.id === "rss-ok").last_error, null);
    assert.equal(store.listItemsForDoc({ limit: 10 }).length, 1);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("collectSources 走真实 X 适配器入库并去重，DB/raw 不含 token", async () => {
  const root = temporaryRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([fixtureSource()]);
    const run = () => collectSources({
      store,
      only: "x-test",
      windowDays: 3650,
      fetchSourceImpl: (source, options) => fetchX(source, {
        ...options,
        env: { P5_X_BEARER_TOKEN: TOKEN },
        spawnImpl: fakeCurl({ stdout: timelineFixture() }),
      }),
    });
    const first = await run();
    assert.equal(first.fetched, 2);
    assert.equal(first.inserted, 2);
    assert.equal(first.scored, 2);
    assert.equal(first.errors.length, 0);

    const second = await run();
    assert.equal(second.fetched, 2);
    assert.equal(second.inserted, 0, "重复帖子不得重复入库");
    assert.equal(second.errors.length, 0);
    assert.equal(store.listItemsForDoc({ limit: 10 }).length, 2);

    const saved = store.getSource("x-test");
    assert.deepEqual(saved.config, { userId: "42", username: "@karpathy" });
    assert.doesNotMatch(JSON.stringify(saved), /eyJhbGci|Bearer/u);

    for (const name of readdirSync(root)) {
      const bytes = readFileSync(path.join(root, name));
      assert.ok(!bytes.includes(Buffer.from(TOKEN)), `${name} 不得包含 token`);
    }
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI add-x 只在 P5_RADAR_HOME 写入 X 信源，重复 ID 不静默成功", async (t) => {
  const root = temporaryRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, "radar-home");
  const env = {
    ...process.env,
    P5_RADAR_HOME: home,
    P5_RADAR_CONFIG: path.join(root, "config.json"),
  };
  delete env.P5_X_BEARER_TOKEN;

  const first = await execFileAsync(process.execPath, [
    cliPath, "add-x", "--user-id", "42", "--username", "@karpathy",
  ], { env, cwd: repoRoot });
  assert.match(first.stdout, /已添加 X 只读信源 x-42/u);
  assert.match(first.stdout, /P5_X_BEARER_TOKEN/u);
  assert.doesNotMatch(first.stdout, /Bearer eyJ/u);

  const dbFile = path.join(home, "p5-radar.db");
  const store = openStore({ file: dbFile });
  try {
    const saved = store.getSource("x-42");
    assert.equal(saved.kind, "x");
    assert.equal(saved.name, "X · @karpathy");
    assert.deepEqual(saved.config, { userId: "42", username: "karpathy" });
    assert.equal(saved.enabled, true);
  } finally {
    store.close();
  }

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "add-x", "--user-id", "42"], { env, cwd: repoRoot }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /已存在/u);
      return true;
    },
  );

  for (const name of readdirSync(home)) {
    const bytes = readFileSync(path.join(home, name));
    assert.ok(!bytes.includes(Buffer.from("Bearer")), `${name} 不得写入认证头`);
  }
});

test("CLI help 与默认信源：X 默认未启用且说明只读", async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, "help"], { cwd: repoRoot });
  assert.match(stdout, /add-x --user-id/u);
  assert.match(stdout, /P5_X_BEARER_TOKEN/u);
  assert.match(stdout, /只读/u);

  const { DEFAULT_SOURCES } = await import("../experiments/superagent-p0/p5-radar/sources.mjs");
  assert.equal(DEFAULT_SOURCES.some((source) => source.kind === "x"), false);
});
