import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Web shell exposes the five knowledge-loop areas and always-reachable approvals", async () => {
  const html = await fs.readFile(path.join(root, "apps", "syno", "public", "index.html"), "utf8");
  for (const area of ["Today", "Capture", "Knowledge", "Learn", "Create"]) assert.match(html, new RegExp(`>${area}<`));
  assert.match(html, /data-syno-panel="jobs">审批中心/);
  assert.match(html, /id="synoProviderForm"/);
  assert.match(html, /id="synoLearningForm"/);
  assert.match(html, /id="synoOutputForm"/);
  assert.match(html, /id="synoIntakeProposal"/);
  assert.match(html, /id="synoOutputOpportunities"/);
  assert.match(html, /id="synoPreferenceForm"/);
  assert.match(html, /id="synoLearningArtifact"[^>]*minlength="20"/);
  assert.doesNotMatch(html, /value="conversation-outline"/);
  assert.match(html, /class="ghost-btn mobile-settings-trigger"[^>]*data-syno-panel="settings">连接设置</);
});

test("knowledge-loop Web actions use inline evidence and explicit lifecycle decisions", async () => {
  const script = await fs.readFile(path.join(root, "apps", "syno", "public", "syno.js"), "utf8");
  assert.match(script, /decision: \{ action \}/);
  assert.match(script, /rawOutput: document\.querySelector\("#synoLearningArtifact"\)/);
  assert.match(script, /loadOutputOpportunities/);
  assert.match(script, /savePreferences/);
  assert.doesNotMatch(script, /window\.prompt/);
});

test("Weixin login auto-polls without a manual scan-confirm button", async () => {
  const publicRoot = path.join(root, "apps", "syno", "public");
  const [html, script] = await Promise.all([
    fs.readFile(path.join(publicRoot, "index.html"), "utf8"),
    fs.readFile(path.join(publicRoot, "syno.js"), "utf8"),
  ]);
  assert.doesNotMatch(html, /id="synoWeixinPoll"/);
  assert.match(script, /scheduleWeixinLoginPoll\(generation, 0\)/);
  assert.match(script, /扫码状态连接暂时中断，正在自动重试/);
});

test("paper-cut guardian is layered and reduced-motion safe", async () => {
  const publicRoot = path.join(root, "apps", "syno", "public");
  const [html, css] = await Promise.all([
    fs.readFile(path.join(publicRoot, "index.html"), "utf8"),
    fs.readFile(path.join(publicRoot, "styles.css"), "utf8"),
  ]);
  const assets = ["papyrus-background.png", "rear.png", "guardian.png", "foreground.png"];
  for (const asset of assets) {
    assert.match(html, new RegExp(`assets/syno/${asset.replace(".", "\\.")}`));
    const stats = await fs.stat(path.join(publicRoot, "assets", "syno", asset));
    assert.ok(stats.size > 10_000, `${asset} should be a real generated asset`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.guardian-layer \{ transform: none !important; \}/);
  assert.match(css, /:focus-visible/);
});

test("Provider secret form exposes username semantics without exposing a real identity", async () => {
  const html = await fs.readFile(path.join(root, "apps", "syno", "public", "index.html"), "utf8");
  assert.match(html, /name="username" value="syno-local-provider" autocomplete="username"/);
  assert.match(html, /id="synoProviderToken" type="password"/);
});

test("closed work drawer is inert and restores a bounded modal focus loop when opened", async () => {
  const publicRoot = path.join(root, "apps", "syno", "public");
  const [html, script] = await Promise.all([
    fs.readFile(path.join(publicRoot, "index.html"), "utf8"),
    fs.readFile(path.join(publicRoot, "syno.js"), "utf8"),
  ]);
  assert.match(html, /id="synoDrawer"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="synoDrawerTitle"[^>]*aria-hidden="true"[^>]*inert hidden/);
  assert.match(script, /drawer\.hidden = false/);
  assert.match(script, /drawer\.inert = false/);
  assert.match(script, /drawer\.inert = true/);
  assert.match(script, /drawer\.hidden = true/);
  assert.match(script, /function keepFocusInside\(event\)/);
  assert.match(script, /lastTrigger\?\.focus\?\.\(\)/);
});
