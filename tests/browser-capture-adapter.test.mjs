import assert from "node:assert/strict";
import test from "node:test";

import { BrowserCaptureAdapter } from "../packages/syno-core/browser-capture-adapter.mjs";

function fakeRunner({ observations = [{ url: "https://example.com/article", title: "文章", observation: "中文正文" }], statusError = null, stopError = null, html = null } = {}) {
  const calls = [];
  let observationIndex = 0;
  const runner = async (_command, args, options) => {
    calls.push({ args, options });
    if (args[0] === "status") {
      if (statusError) throw statusError;
      return { stdout: JSON.stringify({ running: true, version: "v0.3.0" }) };
    }
    if (args[0] === "browsers") return { stdout: JSON.stringify({ browsers: [{ id: "chrome-1" }] }) };
    if (args[0] === "session" && args[1] === "start") return { stdout: JSON.stringify({ session_id: "bsk-session-1" }) };
    if (args[0] === "navigate") return { stdout: JSON.stringify({ url: args[1] }) };
    if (args[0] === "observe") {
      const value = observations[Math.min(observationIndex, observations.length - 1)];
      observationIndex += 1;
      return { stdout: JSON.stringify(value) };
    }
    if (args[0] === "get-html") {
      if (html == null) throw new Error(`unexpected bsk args: ${args.join(" ")}`);
      return { stdout: JSON.stringify({ html, truncated: false }) };
    }
    if (args[0] === "tab") return { stdout: JSON.stringify({ tabs: [] }) };
    if (args[0] === "session" && args[1] === "stop") {
      if (stopError) throw stopError;
      return { stdout: JSON.stringify({ stopped: true }) };
    }
    throw new Error(`unexpected bsk args: ${args.join(" ")}`);
  };
  return { calls, runner };
}

test("BrowserCaptureAdapter reports BSK daemon and connected browser health", async () => {
  const fake = fakeRunner();
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  assert.deepEqual(await adapter.health(), { available: true, provider: "bsk", connectedBrowsers: 1, daemonVersion: "0.3.0" });
  assert.deepEqual(fake.calls.map((call) => call.args.slice(0, 2)), [["status", "--json"], ["browsers", "--json"]]);
});

test("BrowserCaptureAdapter maps a stopped daemon JSON error without auto-starting it", async () => {
  const error = Object.assign(new Error("exit 2"), {
    stdout: JSON.stringify({ code: "daemon_unavailable", message: "daemon 未运行" }),
  });
  const fake = fakeRunner({ statusError: error });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const health = await adapter.health();
  assert.equal(health.available, false);
  assert.equal(health.error.code, "daemon_unavailable");
  assert.equal(fake.calls[0].options.env.BSK_AUTO_START, "0");
});

test("BrowserCaptureAdapter uses a background Agent Window and closes it after UTF-8 capture", async () => {
  const fake = fakeRunner();
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-abc", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "completed");
  assert.equal(result.content, "中文正文");
  const args = fake.calls.map((call) => call.args);
  assert.ok(args.some((item) => item[0] === "session" && item[1] === "start" && item.includes("--no-focus")));
  assert.ok(args.some((item) => item[0] === "navigate" && item.includes("bsk-session-1")));
  const navigate = args.find((item) => item[0] === "navigate");
  assert.equal(navigate[navigate.indexOf("--wait-until") + 1], "load", "动态页面至少等 load，不能在 domcontentloaded 读取 JS 壳页");
  assert.ok(args.some((item) => item[0] === "observe" && item.includes("bsk-session-1")));
  assert.ok(args.some((item) => item[0] === "session" && item[1] === "stop" && item[2] === "bsk-session-1"));
  assert.equal(args.flat().includes("borrow"), false);
  assert.equal(args.flat().includes("request-help"), false);
});

test("BrowserCaptureAdapter retries an auth wall once then returns an unattended blocker", async () => {
  const wall = { url: "https://example.com/login", title: "登录验证", observation: "请输入验证码完成登录" };
  const fake = fakeRunner({ observations: [wall, wall] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-login", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "failed");
  assert.equal(result.blocked, "unattended_auth");
  assert.equal(result.error.code, "BROWSER_BLOCKED_UNATTENDED");
  assert.doesNotMatch(result.error.message, /请.{0,8}(?:回复|接管|授权)|等待你/);
  assert.equal(fake.calls.filter((call) => call.args[0] === "navigate").length, 2);
  assert.equal(fake.calls.filter((call) => call.args[0] === "observe").length, 2);
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "stop").length, 1);
});

test("BrowserCaptureAdapter does not mistake a long article discussing login for an auth wall", async () => {
  const fake = fakeRunner({ observations: [{
    url: "https://example.com/article",
    title: "登录系统设计",
    observation: `这是一篇讨论登录与验证码设计的长文章。${"正文内容".repeat(1_000)}`,
  }] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-article", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "completed");
});

// 2026-10-21：微信验证页经 bsk 通道呈现为「空标题 + 压缩 JS 残留」，不能被当正文交出。
const SCRIPT_RESIDUE_OBS = {
  url: "https://mp.weixin.qq.com/s/abc",
  title: "",
  observation: `!function(e,t){"object"==typeof exports&&t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t(e.colorLib={})}(this,function(e){"use strict";var n=function(e,t){return e<t?-1:e>t?1:0};e.rgb=function(e){return e};const r=(e,t)=>e.map(e=>t(e));let o=0;for(o=0;o<256;o++){r([o],e=>e)};if(o>0){return o}});`.repeat(3),
};

test("BrowserCaptureAdapter treats an empty title plus script residue as an auth wall", async () => {
  const fake = fakeRunner({ observations: [SCRIPT_RESIDUE_OBS, SCRIPT_RESIDUE_OBS] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-residue", exactUrl: "https://mp.weixin.qq.com/s/abc" });
  assert.equal(result.status, "failed");
  assert.equal(result.blocked, "unattended_auth");
  assert.equal(result.error.code, "BROWSER_BLOCKED_UNATTENDED");
  assert.equal(fake.calls.some((call) => call.args[0] === "get-html"), false);
});

test("BrowserCaptureAdapter still completes a long untitled prose page", async () => {
  const fake = fakeRunner({ observations: [{
    url: "https://example.com/article",
    title: "",
    observation: `这是一篇没有标题栏的普通长文。${"正文内容，继续展开。".repeat(300)}`,
  }] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-untitled", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "completed");
});

// ---------- 2026-10-22 实证修复：微信文章真实形态 ----------
// observe 无 title 字段（标题在 VOM 的 RootWebArea 名字里）；extractReadableText 漏剥
// 内联脚本产出 JS 垃圾 → 正文必须降级到 VOM 文本，标题从 <title> 解析。

const VOM_ARTICLE_OBS = {
  url: "https://mp.weixin.qq.com/s/abc",
  text: [
    "@vom 1",
    "@view 1200x748",
    "@layers 1 focus=L1",
    "L1 page",
    '  RootWebArea "Agent 写得更快以后，时间花在了哪里？ 2026年10月21日 10:53 代码改完了，流水线还没跑完……"',
    '    heading "Agent 写得更快以后，时间花在了哪里？"',
    '    paragraph "代码改完了，流水线还没跑完。使用 Agent 做开发时，这段等待值得单独拿出来看。"',
    '    paragraph "如果接下来想优化整个任务的用时，我会先看：时间花在准备代码和环境上，还是花在真正的构建、测试上？"',
  ].join("\n"),
};
const LEAKY_SCRIPT = "function W(t,e){return t<e?-1:1}const r=(e,t)=>e.map(e=>t(e));let o=0;for(o=0;o<256;o++){r([o],e=>e)};if(o>0){return o};var n=function(e){return e};W.prototype.go=function(t){return t};";
const WX_HTML = '<html><head><title></title><meta property="og:title" content="Agent 写得更快以后，时间花在了哪里？"></head><body>'
  + '<img src="https://mmbiz.qpic.cn/x/1.png" alt="">'
  + "<script>var __=\"</scr" + "ipt>\";" + LEAKY_SCRIPT.repeat(6) + "</scr" + "ipt></body></html>";

test("BrowserCaptureAdapter falls back to the VOM text when HTML extraction yields script garbage", async () => {
  const fake = fakeRunner({ observations: [VOM_ARTICLE_OBS], html: WX_HTML });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-vom-fallback", exactUrl: "https://mp.weixin.qq.com/s/abc" });
  assert.equal(result.status, "completed");
  assert.equal(result.title, "Agent 写得更快以后，时间花在了哪里？");
  assert.match(result.content, /代码改完了，流水线还没跑完/);
  assert.doesNotMatch(result.content, /function W\(/);
});

test("BrowserCaptureAdapter prefers rendered VOM content over an X JavaScript shell from HTML", async () => {
  const rendered = {
    url: "https://x.com/Mileson07/status/2114746056005329363",
    text: ["@vom 1", "L1 page", '  RootWebArea "超级峰 on X"', '    StaticText "小红书全自动化运营，新手保姆级完整教程"', '    StaticText "我把一个小红书账号的日常内容运营交给了 Dot。"'].join("\n"),
  };
  const html = '<html><head><title>(1) X</title></head><body><img src="https://pbs.twimg.com/media/example.jpg"><p>JavaScript is not available.</p><p>We’ve detected that JavaScript is disabled in this browser. Please enable JavaScript.</p></body></html>';
  const fake = fakeRunner({ observations: [rendered], html });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-x-shell-fallback", exactUrl: "https://x.com/Mileson07/status/2114746056005329363" });
  assert.equal(result.status, "completed");
  assert.match(result.content, /小红书全自动化运营/);
  assert.doesNotMatch(result.content, /JavaScript is not available/);
});

test("BrowserCaptureAdapter fails instead of completing with only a JavaScript shell", async () => {
  const shell = {
    url: "https://x.com/Mileson07/status/2114746056005329363",
    text: ["@vom 1", "L1 page", '  RootWebArea "(1) X"', '    StaticText "JavaScript is not available."', '    StaticText "We’ve detected that JavaScript is disabled in this browser. Please enable JavaScript."'].join("\n"),
  };
  const fake = fakeRunner({ observations: [shell] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-x-shell-only", exactUrl: "https://x.com/Mileson07/status/2114746056005329363" });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "BROWSER_JAVASCRIPT_REQUIRED");
});

test("BrowserCaptureAdapter strips an X noscript notice from a fully rendered article", async () => {
  const html = '<html><head><title>超级峰 on X</title></head><body><p>JavaScript is not available.</p><p>We’ve detected that JavaScript is disabled in this browser. Please enable JavaScript or switch to a supported browser to continue using x.com.</p><img src="https://pbs.twimg.com/media/example.jpg"><article><p>小红书全自动化运营，新手保姆级完整教程</p><p>'
    + "真实正文内容。".repeat(400)
    + "</p></article></body></html>";
  const fake = fakeRunner({ observations: [{ url: "https://x.com/Mileson07/status/2114746056005329363", text: "小红书全自动化运营" }], html });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner, sleep: async () => {} });
  const result = await adapter.capture({ workflowId: "workflow-x-shell-residue", exactUrl: "https://x.com/Mileson07/status/2114746056005329363" });
  assert.equal(result.status, "completed");
  assert.match(result.content, /小红书全自动化运营/);
  assert.match(result.content, /真实正文内容/);
  assert.doesNotMatch(result.content, /JavaScript is not available|JavaScript is disabled/);
});

test("BrowserCaptureAdapter reobserves a thin dynamic page after load before completing", async () => {
  const url = "https://x.com/Mileson07/status/2114746056005329363";
  const partial = { url, title: "(1) X", observation: "X 正在加载" };
  const rendered = { url, title: "超级峰 on X", observation: "小红书全自动化运营，新手保姆级完整教程。浏览器稍后取得的完整正文。" };
  const fake = fakeRunner({ observations: [partial, rendered] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner, sleep: async () => {} });
  const result = await adapter.capture({ workflowId: "workflow-x-dynamic-settle", exactUrl: url });
  assert.equal(result.status, "completed");
  assert.match(result.content, /小红书全自动化运营/);
  assert.equal(fake.calls.filter((call) => call.args[0] === "observe").length, 2);
});

test("BrowserCaptureAdapter blocks a wall page that only exists as VOM text", async () => {
  const wallVom = {
    url: "https://mp.weixin.qq.com/s/abc",
    text: ["@vom 1", "L1 page", '  RootWebArea "环境异常"', '    StaticText "当前环境异常，完成验证后即可继续访问。"', '    button "去验证"'].join("\n"),
  };
  const fake = fakeRunner({ observations: [wallVom, wallVom] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-vom-wall", exactUrl: "https://mp.weixin.qq.com/s/abc" });
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "BROWSER_BLOCKED_UNATTENDED");
  assert.equal(fake.calls.some((call) => call.args[0] === "get-html"), false);
});

test("BrowserCaptureAdapter fails closed when its Agent Window cannot be stopped", async () => {
  const fake = fakeRunner({ stopError: new Error("stop failed") });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  await assert.rejects(
    () => adapter.capture({ workflowId: "workflow-cleanup", exactUrl: "https://example.com/article" }),
    /stop failed/,
  );
});

test("BrowserCaptureAdapter rejects unsafe URLs and arbitrary browser actions", async () => {
  const fake = fakeRunner();
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe", exactUrl: "http://127.0.0.1:4317/secret" }), /URL/);
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe-query", exactUrl: "https://example.com/article?token=secret" }), /URL/);
  adapter.authorize({ workflowId: "workflow-action", exactUrl: "https://example.com/article" });
  await assert.rejects(() => adapter.command({ workflowId: "workflow-action", action: "click", args: {} }), /不允许/);
});

test("BrowserCaptureAdapter expires logical sessions without launching BSK", async () => {
  let now = new Date("2026-09-22T10:00:00Z");
  const fake = fakeRunner();
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner, clock: () => now });
  const task = adapter.authorize({ workflowId: "workflow-expiry", exactUrl: "https://example.com/article" });
  assert.match(task.expiresAt, /2026-09-22T12:00:00/);
  now = new Date("2026-09-22T12:01:00Z");
  await assert.rejects(() => adapter.snapshot({ workflowId: "workflow-expiry" }), /过期/);
  assert.deepEqual(await adapter.closeSession({ workflowId: "workflow-expiry" }), { closed: 0 });
  assert.equal(fake.calls.length, 0);
});

// ---------- 2026-10-16「一步到位」：命中验证保窗等人，而非当场关窗 ----------

const WALL_OBS = { url: "https://example.com/login", title: "登录验证", observation: "请输入验证码完成登录" };
const ARTICLE_OBS = { url: "https://example.com/article", title: "文章", observation: "中文正文" };

test("BrowserCaptureAdapter keeps and focuses the Agent Window on an auth wall when asked", async () => {
  const fake = fakeRunner({ observations: [WALL_OBS, WALL_OBS] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  const result = await adapter.capture({ workflowId: "workflow-keep", exactUrl: "https://example.com/article", keepSessionOnBlock: true, focus: true });
  assert.equal(result.error.code, "BROWSER_BLOCKED_UNATTENDED");
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "stop").length, 0, "保窗：拦截时不得 stop session");
  assert.ok(fake.calls.some((call) => call.args[0] === "session" && call.args[1] === "start" && call.args.includes("--focus")), "需要人介入时必须把窗口带到前台");
  // 同一地址再读：复用同一个窗口，不新开会话
  await adapter.capture({ workflowId: "workflow-keep", exactUrl: "https://example.com/article", keepSessionOnBlock: true });
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "start").length, 1);
});

test("BrowserCaptureAdapter defaults to closing the window on an auth wall (capture pipeline unchanged)", async () => {
  const fake = fakeRunner({ observations: [WALL_OBS, WALL_OBS] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  await adapter.capture({ workflowId: "workflow-unattended", exactUrl: "https://example.com/article" });
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "stop").length, 1);
  assert.equal(fake.calls.some((call) => call.args.includes("--focus")), false, "无人值守路径不得抢焦点");
});

test("waitForClearance returns the article once the owner clears the verification", async () => {
  const fake = fakeRunner({ observations: [WALL_OBS, WALL_OBS, ARTICLE_OBS] });
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  await adapter.capture({ workflowId: "workflow-clear", exactUrl: "https://example.com/article", keepSessionOnBlock: true, focus: true });
  const cleared = await adapter.waitForClearance({ workflowId: "workflow-clear", timeoutMs: 5_000, intervalMs: 500, sleep: async () => {} });
  assert.equal(cleared.status, "completed");
  assert.match(cleared.content, /中文正文/);
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "start").length, 1, "轮询必须用同一个窗口");
});

test("waitForClearance gives up at the deadline and leaves the window open", async () => {
  const fake = fakeRunner({ observations: [WALL_OBS, WALL_OBS, WALL_OBS] });
  let now = Date.parse("2026-10-16T00:00:00Z");
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner, clock: () => new Date(now) });
  await adapter.capture({ workflowId: "workflow-stuck", exactUrl: "https://example.com/article", keepSessionOnBlock: true });
  const before = fake.calls.filter((call) => call.args[0] === "observe").length;
  const result = await adapter.waitForClearance({
    workflowId: "workflow-stuck", timeoutMs: 3_000, intervalMs: 1_000,
    sleep: async (ms) => { now += ms; },
  });
  assert.equal(result.error.code, "BROWSER_BLOCKED_UNATTENDED");
  assert.ok(fake.calls.filter((call) => call.args[0] === "observe").length > before, "超时前必须真的轮询过");
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "stop").length, 0, "超时也要留窗等主人");
});

test("BrowserCaptureAdapter discards the old window when the workflow switches URL", async () => {
  const fake = fakeRunner();
  const adapter = new BrowserCaptureAdapter({ command: "bsk", runner: fake.runner });
  await adapter.capture({ workflowId: "workflow-switch", exactUrl: "https://example.com/one" });
  await adapter.capture({ workflowId: "workflow-switch", exactUrl: "https://example.com/two" });
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "start").length, 2);
  assert.equal(fake.calls.filter((call) => call.args[0] === "session" && call.args[1] === "stop").length, 2);
});
