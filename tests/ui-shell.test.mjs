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

test("Today and settings disclose the daily decision before technical configuration", async () => {
  const html = await fs.readFile(path.join(root, "apps", "syno", "public", "index.html"), "utf8");
  assert.match(html, /<h1>今天先做这件事<\/h1>/);
  for (const id of ["synoTodayPrimary", "synoTodayPrimaryAction", "synoTodayNeedsYou", "synoTodayRecent", "synoTodayProgress", "synoHealthSummary", "synoOnboarding"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ["synoSettingAi", "synoSettingWeixin", "synoSettingFeishu", "synoSettingAutostart", "synoSettingData"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /<details[^>]*id="synoAdvancedSettings"/);
  assert.match(html, /id="synoShowOnboarding"/);
  assert.match(html, /id="synoQuickCaptureFileButton"/);
  for (const id of ["synoKnowledgeFilters", "synoKnowledgeTags", "synoKnowledgeSource", "synoKnowledgeStability", "synoKnowledgeFrom", "synoKnowledgeTo"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="synoDataSettings"[\s\S]*保留策略[\s\S]*诊断[\s\S]*id="synoPreferenceForm"/);
  assert.match(html, /src="\.\/syno-ui-model\.js"[\s\S]*src="\.\/syno\.js"/);
  assert.match(html, /id="synoSettingWeixin"[^>]*data-setting-target="synoWeixinSettings"/);
  assert.match(html, /<details[^>]*id="synoWeixinSettings"[\s\S]*id="synoWeixinLogin"/);
  assert.match(html, /id="synoWorkspaceSettings"[^>]*hidden/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /data-syno-panel="jobs">审批中心/);
  assert.ok(html.indexOf('id="synoKnowledgeQuery"') < html.indexOf('class="syno-intake"'), "Knowledge search should be first");
  assert.match(html, /<details[^>]*id="synoLearningDetails"[\s\S]*id="synoLearningForm"/);
  assert.ok(html.indexOf('id="synoOutputOpportunities"') < html.indexOf('id="synoOutputForm"'), "Create opportunity should precede creation forms");
});

test("knowledge-loop Web actions use inline evidence and explicit lifecycle decisions", async () => {
  const script = await fs.readFile(path.join(root, "apps", "syno", "public", "syno.js"), "utf8");
  assert.match(script, /decision: \{ action \}/);
  assert.match(script, /rawOutput: document\.querySelector\("#synoLearningArtifact"\)/);
  assert.match(script, /loadOutputOpportunities/);
  assert.match(script, /savePreferences/);
  assert.match(script, /uiModel\.todayTarget/);
  assert.match(script, /action\.addEventListener\("click", \(\) => show\(/);
  assert.match(script, /button\.addEventListener\("click", \(\) => show\(/);
  assert.match(script, /windowsServiceMutation/);
  assert.match(script, /uiModel\.outputActions/);
  assert.match(script, /descriptors\.some\(\(descriptor\) => descriptor\.needsOutput/);
  assert.match(script, /descriptors\.some\(\(descriptor\) => descriptor\.needsFeedback/);
  assert.match(script, /请先记录至少 5 个字符的发布反馈/);
  assert.match(script, /#synoWeixinStatus[\s\S]*weixin\?\.running/);
  assert.doesNotMatch(script, /\["published", "dismissed"\]\.includes\(opportunity\.status\)/);
  assert.match(script, /aria-busy/);
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

test("Feishu registration renders a local QR image with an official-link fallback", async () => {
  const [script, legacyScript] = await Promise.all([
    fs.readFile(path.join(root, "apps", "syno", "public", "syno.js"), "utf8"),
    fs.readFile(path.join(root, "apps", "syno", "public", "app.js"), "utf8"),
  ]);
  assert.match(script, /result\.qrDataUrl/);
  assert.match(script, /飞书扫码注册二维码/);
  assert.match(script, /打开飞书扫码注册/);
  assert.match(script, /scheduleFeishuRegistrationPoll\(generation, 0\)/);
  assert.match(script, /注册完成，正在建立飞书长连接/);
  assert.match(script, /注册状态连接暂时中断，正在自动重试/);
  assert.match(legacyScript, /npx @larksuite\/cli@1\.0\.72 install/);
  assert.doesNotMatch(legacyScript, /@larksuite\/lark-cli/);
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
