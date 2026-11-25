// Isolated real Feishu P1 consumer backed by native autoloop runs and one business fact log.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createFeishuDocFromAst } from "../../packages/syno-core/feishu-doc-ast.mjs";
import { runActivePlugin } from "../../packages/syno-core/plugin-runner.mjs";
import { RADAR_HELP } from "./p5-radar/command.mjs";
import { createP5HostRunner, createP5Scheduler } from "./p5-radar/host.mjs";
import { publishRadarSiteDigest } from "./p5-radar/site-digest.mjs";
import { createRadarSiteStore } from "./p5-radar/site-store.mjs";
import { applyRadarFeedback, prepareRadarCaptureSource, recoverableRadarFollows, resolveRadarCandidates, resolveRadarMarkedFollows } from "./p5-radar/follow.mjs";
import { executePluginCommand } from "./plugin-control.mjs";
import { resolveRealFeishuConfig } from "./real-feishu-config.mjs";

// Explicit runtime configuration: isolated-test by default, production only when fully specified.
// Resolution happens before any business module import, directory creation or Feishu connection.
const config = resolveRealFeishuConfig(process.env);
const execFileAsync = promisify(execFile);
const p5Home = path.join(config.localDataRoot, "p5-radar");
const p5StateHome = process.env.P5_RADAR_STATE_HOME || p5Home;
const radarSite = () => createRadarSiteStore({ home: p5Home, stateHome: p5StateHome });
const p5Runner = createP5HostRunner({
  cliPath: path.join(import.meta.dirname, "p5-radar.mjs"),
  home: p5Home,
  env: process.env,
});
const p5PluginRegistry = path.join(config.runtimeRoot, "plugins", "p5-radar", "active.json");
const p5DocStateFile = path.join(p5Home, "feishu-doc.json");
const p5SettingsFile = path.join(p5Home, "settings.json");
const readP5Settings = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(p5SettingsFile, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const p5PluginAction = async (action, payload = {}) => {
  const result = await runActivePlugin({
    registryFile: p5PluginRegistry,
    env: { ...process.env, P5_RADAR_HOME: p5Home },
    timeoutMs: 600_000,
    request: {
      contract: "syno.p5-radar/1",
      requestId: `p5-${action}-${Date.now()}`,
      action,
      payload,
    },
  });
  if (!result.ok) throw Object.assign(new Error(result.message || `P5 插件 ${action} 失败`), { code: result.code || "P5_PLUGIN_FAILED" });
  return result.data;
};
const p5PluginDailyDoc = async () => {
  const settings = await readP5Settings();
  const configured = Number(settings.maxItems);
  const maxItems = Number.isSafeInteger(configured) && configured >= 10 && configured <= 200 ? configured : 50;
  const ast = await p5PluginAction("renderDailyDoc", { windowDays: 7, maxItems });
  const siteOrigin = String(process.env.P5_RADAR_SITE_ORIGIN || "").trim();
  if (siteOrigin) {
    const published = await publishRadarSiteDigest({ home: p5Home, publicOrigin: siteOrigin, ast });
    return published.message;
  }
  const doc = await createFeishuDocFromAst({
    ast,
    configPath: path.resolve(import.meta.dirname, "../../config/knowledge-publishing.json"),
    stateFile: p5DocStateFile,
    log: (event, detail = {}) => console.log(JSON.stringify({ event, ...detail })),
  });
  try {
    const items = (ast.items || []).map((item) => ({
      index: item.index,
      itemId: item.itemId,
      title: item.title,
      titleZh: item.titleZh,
      publishedAt: item.publishedAt,
      kind: item.kind,
    }));
    const manifest = {
      date: ast.date,
      link: doc.link,
      nodeToken: doc.nodeToken,
      docId: doc.docId,
      itemCount: items.length,
      unfiltered: true,
      groups: true,
      items,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(path.join(p5Home, `daily-doc-${ast.date}.json`), JSON.stringify(manifest, null, 2), { encoding: "utf8", mode: 0o600 });
    await fs.writeFile(path.join(p5Home, `digest-${ast.date}.json`), JSON.stringify({ date: ast.date, items }, null, 2), { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    console.log(JSON.stringify({ event: "p5-doc-map-write-failed", error: String(error?.message || error).slice(0, 300) }));
  }
  return `今日 P5 信息雷达已整理：${doc.link}\n${ast.shortMessage}`;
};
const p5DailyDoc = async () => {
  try {
    return await p5PluginDailyDoc();
  } catch (error) {
    console.log(JSON.stringify({ event: "p5-plugin-daily-doc-fallback", error: String(error?.message || error).slice(0, 300) }));
    if (String(process.env.P5_RADAR_SITE_ORIGIN || "").trim()) throw error;
    return p5Runner.dailyDoc();
  }
};
const p5DailyCollect = async () => {
  try {
    return await p5PluginAction("collect", {});
  } catch (error) {
    console.log(JSON.stringify({ event: "p5-plugin-collect-fallback", error: String(error?.message || error).slice(0, 300) }));
    return p5Runner.collect();
  }
};
const p5Status = async () => {
  try {
    return await p5PluginAction("status", {});
  } catch {
    return p5Runner.status();
  }
};
const p5Preference = async (text) => {
  try {
    return await p5PluginAction("preference", { text });
  } catch (error) {
    return `当前 P5 插件不支持偏好命令，需要 v5 或更高版本：${String(error?.message || error).slice(0, 200)}`;
  }
};
const replayIndex = process.argv.indexOf("--replay-message-id");
const replayMessageId = replayIndex >= 0 ? process.argv[replayIndex + 1] : null;
if (replayMessageId !== null) assert.match(replayMessageId, /^[A-Za-z0-9_-]{1,48}$/, "恢复消息 ID 不符合隔离实验约束");
const replayIdeaIndex = process.argv.indexOf("--replay-idea-message-id");
const replayIdeaMessageId = replayIdeaIndex >= 0 ? process.argv[replayIdeaIndex + 1] : null;
if (replayIdeaMessageId !== null) assert.match(replayIdeaMessageId, /^[A-Za-z0-9_-]{1,48}$/, "恢复想法消息 ID 不符合隔离实验约束");
assert.ok(replayMessageId === null || replayIdeaMessageId === null, "恢复参数互斥：一次只能重放一个 capture 或 idea 消息");
process.env.NODE_ENV = config.nodeEnv;
process.env.SYNO_REPO_ROOT = config.root;
process.env.SYNO_KNOWLEDGE_ROOT = config.knowledgeRoot;
process.env.SYNO_RUNTIME_ROOT = config.runtimeRoot;
process.env.SYNO_LOCAL_DATA = config.localDataRoot;

const { FeishuChannelAdapter, FeishuCredentialStore, FeishuStateStore } = await import("../../packages/syno-core/feishu-channel.mjs");
const { openNativeButlerRuntime } = await import("./native-butler-runtime.mjs");
const { answerKnowledgeQuery, knowledgeDocumentId } = await import("./knowledge-query.mjs");
const { drainQueue } = await import("./idea-worker-drain.mjs");
const { parseCandidateMarkdown } = await import("./idea-object.mjs");
const { MODEL_LABEL: PROJECT_MODEL_LABEL, readFrozenPrevious } = await import("./project-worker-contract.mjs");
const { MODEL_LABEL: MEMORY_MODEL_LABEL } = await import("./memory-worker-contract.mjs");
const { canonicalMemorySnapshot, memorySnapshot, parseMemorySnapshot } = await import("./memory-object.mjs");
const { KnowledgeStore } = await import("../../packages/syno-core/knowledge-store.mjs");
const { ProcessFileLock } = await import("../../packages/syno-core/process-lock.mjs");
// Release verification loads the real entry's complete static/dynamic import graph, then exits before storage or credentials.
if (process.argv.includes("--verify-import")) process.exit(0);
const inboxRoot = config.inboxRoot;
const runtimeRoot = config.runtimeRoot;
const chatFile = config.chatFile;
const statusFile = config.statusFile;
const captureEvents = config.captureEvents;
await fs.mkdir(inboxRoot, { recursive: true });
await fs.mkdir(runtimeRoot, { recursive: true });

const credentials = new FeishuCredentialStore();
const configured = await credentials.status();
assert.equal(configured.configured, true, config.mode === "isolated-test" ? "独立测试凭据未配置" : "生产凭据未配置");
assert.equal(
  configured.appId,
  config.appId,
  config.mode === "isolated-test" ? "拒绝连接非独立测试 App" : "拒绝连接非配置的生产 App",
);
const stateStore = new FeishuStateStore({ file: config.stateFile });
// 项目写任务的隔离与合回要求知识根是 Git 仓。生产固定满足；未初始化 Git 的独立验收环境只能走
// standalone 直接写入（无可合并提交），启动事件会显式标记，绝不把运行目录伪装成 worktree。
const projectRepositoryRoot = existsSync(path.join(config.knowledgeRoot, ".git")) ? config.knowledgeRoot : null;
const butler = openNativeButlerRuntime({
  databasePath: config.databasePath,
  vaultRoot: config.vaultRoot,
  sourcePath: config.sourcePath,
  sourceUrl: config.sourceUrl,
  indexFile: config.knowledgeIndexFile,
  resultRoot: config.knowledgeResultRoot,
  ideaRoot: config.ideaRoot,
  projectRoot: config.projectRoot,
  memoryRoot: config.memoryRoot,
  // Real project writes go through TaskWorkspaceManager on the knowledge repository; the old runtime artifact
  // directory is no longer a valid final write target and is only read as a frozen revision input.
  repoRoot: projectRepositoryRoot,
  legacyProjectRoot: config.legacyProjectRoot,
  ...(projectRepositoryRoot ? { worktreeRoot: config.projectWorktreeRoot } : {}),
});
const native = butler.specialist("capture");
const knowledge = butler.specialist("knowledge");
const idea = butler.specialist("idea");
const project = butler.specialist("project");
const memory = butler.specialist("memory");
const projectRoot = config.projectRoot;
const knowledgeOptions = {
  vaultRoot: config.vaultRoot,
  indexFile: config.knowledgeIndexFile,
};
const knowledgeStore = new KnowledgeStore(knowledgeOptions);
const hostStatusFile = config.hostStatusFile;
const writeJson = (file, value, flag = "w") => fs.writeFile(file, JSON.stringify(value, null, 2), { mode: 0o600, flag });
const appendCaptureEvent = (value) => fs.appendFile(captureEvents, `${JSON.stringify(value)}\n`, { mode: 0o600 });
await appendCaptureEvent({
  status: projectRepositoryRoot ? "project-workspace-isolated" : "project-workspace-standalone",
  projectRoot: config.projectRoot,
  knowledgeRoot: config.knowledgeRoot,
  at: new Date().toISOString(),
});
// Stop-managed timers for isolated delivery backoff. Cleared on shutdown so no re-entry outlives this Host.
const deliveryTimers = new Set();
// One-shot fault-injection guards: an armed environment variable must never re-arm within one process.
let ideaBackoffInjected = false;
let ideaUnknownInjected = false;
let ideaDrainCrashInjected = false;
// Fault hooks accept a concrete messageId or the dynamic selector `1` / `*` (= the next match at that hook).
// A dynamic selector never widens the match domain: it only fires once, at the existing fault point.
const isNextMessageHook = (value) => value === "1" || value === "*";
const matchesMessageHook = (configured, messageId) =>
  typeof configured === "string" && configured.length > 0
  && (configured === messageId || isNextMessageHook(configured));
// Ready gate: created before the adapter so no onMessage can route before recovery/drain/unfreeze complete.
// It settles exactly once and never rejects: `ready` after a successful takeover, `aborted` on a stopped or
// failed startup. Waiters check the state before any immediate routing.
let readyState = "pending";
let readySettled = false;
let readyResolve;
const readyPromise = new Promise((resolve) => { readyResolve = resolve; });
const settleReadyGate = (state = "ready") => {
  if (readySettled) return;
  readySettled = true;
  readyState = state;
  readyResolve();
};
const readJson = async (file) => {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const readChat = () => readJson(chatFile);

const radarFromFeishu = async (command, message) => {
  if (command.action === "help") return { text: RADAR_HELP };
  if (!command.numbers?.length && ["follow", "ignore"].includes(command.action)) {
    return { text: "请提供候选编号，例如：跟进 1、4；忽略 8、9。" };
  }
  try {
    if (command.action === "digest") return { text: await p5DailyDoc() };
    if (command.action === "status") return { text: await p5Status() };
    if (command.action === "setLimit") {
      if (!Number.isSafeInteger(command.maxItems) || command.maxItems < 10 || command.maxItems > 200) {
        return { text: "每日展示条数需要在 10–200 之间。" };
      }
      await fs.writeFile(p5SettingsFile, JSON.stringify({ maxItems: command.maxItems, updatedAt: new Date().toISOString() }, null, 2), { encoding: "utf8", mode: 0o600 });
      return { text: `每日雷达展示条数已设为 ${command.maxItems}。` };
    }
    if (command.action === "preference") return { text: await p5Preference(command.text) };
    if (command.action === "followMarked") return { text: await followMarkedRadarItems(message, command) };
    if (command.action === "follow") return { text: await followRadarItems(message, command) };
    const items = await resolveRadarCommandItems(command);
    const outputs = [];
    for (const item of items) {
      const result = await applyRadarFeedback({ home: p5Home, itemId: item.itemId, action: "ignore" });
      const site = radarSite();
      const existing = await site.follow(item.itemId);
      await site.setFollow(item.itemId, {
        ...(existing || {}), status: existing?.taskId ? existing.status : "ignored", ignoredAt: new Date().toISOString(),
        itemId: item.itemId, date: item.date, index: item.index,
      });
      outputs.push(`已忽略 ${item.date} 第 ${item.index} 条（item ${result.itemId}），已降低相关主题或信源权重。`);
    }
    return { text: outputs.join("\n") };
  } catch (error) {
    return { text: `雷达操作失败：${String(error?.message || error).slice(0, 500)}` };
  }
};

const pluginFromFeishu = async (command) => {
  try {
    const repoRoot = path.resolve(import.meta.dirname, "../..");
    return executePluginCommand(command, {
      registryFile: p5PluginRegistry,
      canaryFile: path.join(path.dirname(p5PluginRegistry), "canary.json"),
      repoRoot,
      worktreeRoot: path.join(repoRoot, ".worktrees"),
    });
  } catch (error) {
    return { text: `插件操作失败：${String(error?.message || error).slice(0, 500)}` };
  }
};

const successText = async (trace, evidence = null) => {
  assert.equal(trace.taskState, "completed", "业务 Task 未完成");
  assert.equal(trace.nativeRunState, "done", "原生 run 未完成");
  assert.ok(trace.fileVersion && trace.deliveryKey, "缺少文件版本或 delivery 记录");
  const persisted = await fs.readFile(trace.path, "utf8");
  const actualVersion = createHash("sha256").update(persisted).digest("hex");
  assert.equal(actualVersion, trace.fileVersion, "通知前独立重读的文件版本不一致");
  assert.ok(persisted.includes(trace.sourceSha256), "通知前独立重读未找到来源版本");
  const elapsed = evidence?.workerModelPath?.elapsedMs ?? "未知（崩溃恢复）";
  const cost = typeof evidence?.costUsd === "number" ? `${evidence.costUsd} USD（CLI 回报）` : "未返回（OpenCode Go 订阅）";
  return [
    "公开文章收录完成（原生 Runtime；已核验冻结公开快照）。",
    "Result Lane：passed；通知前重读：passed",
    "Worker／模型：OpenCode／opencode-go/deepseek-v4.1-flash",
    `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
    `Task：${trace.taskId}`,
    `Attempt：${trace.attemptId}`,
    `产物：${trace.path}`,
    `文件 SHA-256：${trace.fileVersion}`,
    `耗时：${elapsed}${typeof elapsed === "number" ? "ms" : ""}；费用：${cost}`,
    "飞书投递为 at_least_once；送达不代表已读。",
  ].join("\n");
};

const ideaSuccessText = async (trace, evidence) => {
  assert.equal(trace.taskState, "completed", "想法业务 Task 未完成");
  assert.equal(trace.nativeRunState, "done", "想法原生 run 未完成");
  assert.ok(trace.fileVersion && trace.deliveryKey && trace.eventId, "缺少想法文件版本、delivery 或事件");
  const persisted = await fs.readFile(trace.path, "utf8");
  const actualVersion = createHash("sha256").update(persisted).digest("hex");
  assert.equal(actualVersion, trace.fileVersion, "想法通知前独立重读的文件版本不一致");
  const { metadata, generatedText } = parseCandidateMarkdown(persisted);
  assert.equal(metadata.ideaId, trace.ideaId, "想法候选对象与 Task 不一致");
  assert.equal(metadata.contextVersion, trace.contextVersion, "想法候选版本与 Context 不一致");
  assert.ok(generatedText.trim(), "想法通知缺少生成正文");
  const worker = evidence?.worker ?? "OpenCode";
  return [
    "想法处理完成（原生 Runtime）。",
    `动作：${metadata.action}`,
    `想法：${trace.ideaId}`,
    `Context 版本：${trace.contextVersion}`,
    "",
    "生成正文：",
    generatedText,
    "",
    `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
    `Task／Attempt：${trace.taskId}／${trace.attemptId}`,
    `产物：${trace.path}`,
    `文件 SHA-256：${trace.fileVersion}`,
    `Worker／模型：${worker}／opencode-go/deepseek-v4.1-flash`,
    "Result Lane：passed",
    "飞书投递为 at_least_once；送达不代表已读。",
  ].join("\n");
};


const projectSuccessText = async (trace, evidence) => {
  assert.equal(trace.taskState, "completed", "项目业务 Task 未完成");
  assert.equal(trace.nativeRunState, "done", "项目原生 run 未完成");
  assert.ok(trace.fileVersion && trace.deliveryKey && trace.eventId && trace.projectId, "缺少项目 manifest 版本、delivery 或事件");
  const persisted = await fs.readFile(trace.path, "utf8");
  const manifestVersion = createHash("sha256").update(persisted).digest("hex");
  assert.equal(manifestVersion, trace.fileVersion, "项目通知前独立重读的 manifest 版本不一致");
  const manifest = JSON.parse(persisted);
  assert.equal(manifest.projectId, trace.projectId, "manifest 项目与 Task 不一致");
  assert.equal(manifest.planVersion, trace.planVersion, "manifest 计划版本与 Context 不一致");
  assert.equal(manifest.action, trace.action, "manifest 动作与冻结输入不一致");
  assert.deepEqual(manifest.steps.map((step) => step.id), ["outline", "deliverable", "manifest"], "manifest 步骤顺序异常");
  const deliverableEntry = manifest.steps.find((step) => step.id === "deliverable");
  const outlineEntry = manifest.steps.find((step) => step.id === "outline");
  const deliverableText = await fs.readFile(path.join(projectRoot, deliverableEntry.path), "utf8");
  const outlineText = await fs.readFile(path.join(projectRoot, outlineEntry.path), "utf8");
  assert.equal(createHash("sha256").update(deliverableText).digest("hex"), deliverableEntry.sha256, "通知前重读 deliverable 哈希不一致");
  assert.equal(createHash("sha256").update(outlineText).digest("hex"), outlineEntry.sha256, "通知前重读 outline 哈希不一致");
  assert.ok(deliverableText.trim() && outlineText.trim(), "项目通知缺少步骤正文");
  for (const step of trace.steps) {
    const entry = manifest.steps.find((candidate) => candidate.id === step.stepId);
    assert.ok(entry, `manifest 缺少步骤：${step.stepId}`);
    assert.equal(step.state, "completed", `项目步骤未完成：${step.stepId}`);
    if (step.stepId === "manifest") {
      assert.equal(entry.sha256, null, "manifest 步骤不得自哈希");
      assert.equal(entry.bytes, null, "manifest 步骤不得自记字节数");
    } else {
      assert.equal(entry.sha256, step.sha256, `步骤 ${step.stepId} 的 manifest 哈希不一致`);
    }
    assert.equal(entry.taskId, trace.taskId, `步骤 ${step.stepId} 的 Task 不一致`);
    assert.equal(entry.attemptId, trace.attemptId, `步骤 ${step.stepId} 的 Attempt 不一致`);
  }
  const worker = evidence?.worker ?? "OpenCode";
  const stepLines = manifest.steps.map((step) => {
    const hash = step.sha256 ? ` sha256=${step.sha256}` : " sha256=null（manifest 不自哈希）";
    return `- ${step.id}（依赖：${step.dependsOn.length ? step.dependsOn.join("、") : "无"}）${hash}`;
  });
  return [
    "项目执行完成（原生 Runtime）。",
    `项目：${trace.projectId}`,
    `动作：${trace.action}`,
    `目标：${manifest.goal}`,
    `修订：${manifest.revision ?? "无"}`,
    `计划版本：v${trace.planVersion}`,
    "",
    "交付正文：",
    deliverableText,
    "",
    `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
    `Task／Attempt：${trace.taskId}／${trace.attemptId}`,
    `manifest：${trace.path}`,
    `manifest SHA-256：${trace.fileVersion}`,
    "步骤依赖与产物：",
    ...stepLines,
    `Worker／模型：${worker}／${PROJECT_MODEL_LABEL}`,
    "Result Lane：passed；通知前独立重读：passed",
    "飞书投递为 at_least_once；送达不代表已读。",
  ].join("\n");
};


const captureFromFeishu = async (message, native = butler.specialist("capture"), source = { sourcePath: config.sourcePath, sourceUrl: config.sourceUrl, sourceMaterial: "verified-public-browser-snapshot" }) => {
  let execution;
  try {
    execution = native.begin({
      appId: config.appId,
      messageId: message.id,
      chatId: message.chatId,
      ownerId: message.senderId,
      worker: message.worker,
    });
  } catch (error) {
    if (!String(error.message || error).includes("当前事件保持 queued")) throw error;
    await appendCaptureEvent({ messageId: message.id, status: "capture-queued-no-context-or-task", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
    return { queued: true, text: "同对象前序收录仍在执行；本次事件已持久化排队，未提前推进 Context 或创建 Task。前序完成后将按原事件自动续接，不会并行覆盖产物。" };
  }
  const base = path.join(inboxRoot, `capture-${message.id}`);
  const evidencePath = `${base}-evidence.json`;
  const attemptPath = `${base}-attempt.json`;
  let evidence = await readJson(evidencePath);
  let trace = native.trace(execution.taskId);

  const deliver = async () => {
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) {
      await appendCaptureEvent({ messageId: message.id, status: "delivery-claim-skipped", claimStatus: claim.status, trace: native.trace(execution.taskId), at: new Date().toISOString() });
      return { deferredDelivery: true };
    }
    const text = await successText(trace, evidence);
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.replyTo ?? message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      native.accept(trace.deliveryKey);
      trace = native.trace(execution.taskId);
      await appendCaptureEvent({ messageId: message.id, status: "delivery-accepted", trace, at: new Date().toISOString() });
    } catch (error) {
      native.unknown(trace.deliveryKey);
      await appendCaptureEvent({
        messageId: message.id,
        status: "delivery-unknown-no-resend",
        trace: native.trace(execution.taskId),
        error: String(error.message || error).slice(0, 300),
        at: new Date().toISOString(),
      });
    }
    return { deferredDelivery: true };
  };

  if (trace.taskState === "completed") {
    if (trace.deliveryState === "queued" && trace.maySend === true) return deliver();
    return { deferredDelivery: true };
  }
  const marker = await readJson(attemptPath);
  if (marker && !evidence) {
    try {
      await fs.access(execution.artifactPath);
      trace = native.complete(execution);
      await appendCaptureEvent({ messageId: message.id, status: "recovered-artifact-without-model-replay", trace, at: new Date().toISOString() });
      return deliver();
    } catch (error) {
      if (error.code !== "ENOENT") {
        await appendCaptureEvent({ messageId: message.id, status: "recovery-rejected", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
        return { text: `既有产物未通过复核，未自动重跑模型：${String(error.message || error).slice(0, 300)}` };
      }
      return { text: `该消息已有执行标记但没有产物或成功证据，未自动重跑模型；请先对账：${attemptPath}` };
    }
  }
  if (!marker) {
    await writeJson(attemptPath, {
      messageId: message.id,
      taskId: execution.taskId,
      attemptId: execution.attemptId,
      nativeRunId: execution.runId,
      nativeRunAttempt: execution.runAttempt,
      sourceUrl: source.sourceUrl,
      sourceMaterial: source.sourceMaterial,
      worker: "OpenCode",
      model: "opencode-go/deepseek-v4.1-flash",
      startedAt: new Date().toISOString(),
    }, "wx");
  }
  try {
    if (!evidence) {
      const { stdout } = await execFileAsync(process.execPath, [
        config.workerPath,
        "--capture", source.sourcePath,
        "--source-url", source.sourceUrl,
        "--source-material", source.sourceMaterial,
        "--message-id", message.id,
        "--task-id", execution.taskId,
        "--attempt-id", execution.attemptId,
        "--run-key", message.id,
        "--evidence", evidencePath,
        "--receipt", "Native Runtime delivery pending after Result Lane; at_least_once; delivery is not read receipt",
      ], { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
      evidence = JSON.parse(stdout);
      // Isolated fault injection: the artifact and evidence exist, but Result Lane has not run.
      if (process.env.SYNO_P1_TEST_CRASH_AFTER_WORKER === "1") process.exit(92);
    }
    trace = native.complete(execution, evidence);
    await appendCaptureEvent({
      messageId: message.id,
      status: "native-result-lane-passed",
      evidencePath,
      trace,
      workerModelPath: evidence.workerModelPath,
      usage: evidence.usage,
      costUsd: evidence.costUsd,
      at: new Date().toISOString(),
    });
    return deliver();
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "no-success-receipt", evidencePath, attemptPath, nativeRunId: execution.runId, error: detail, at: new Date().toISOString() });
    return { text: `本次收录未取得成功回执，不会自动重跑模型；请先对账：${attemptPath}\n错误：${detail}` };
  }
};

let captureDrainRunning = false;
let captureDrainRequested = false;
const drainCaptureQueue = async () => {
  if (captureDrainRunning) {
    captureDrainRequested = true;
    return;
  }
  captureDrainRunning = true;
  try {
    do {
      captureDrainRequested = false;
      for (const queued of native.queued()) {
        const result = await captureFromFeishu({ id: queued.messageId, chatId: queued.chatId, senderId: queued.ownerId, worker: queued.worker });
        if (result.queued) break;
      }
    } while (captureDrainRequested);
  } finally {
    captureDrainRunning = false;
  }
};
const requestCaptureDrain = async () => {
  captureDrainRequested = true;
  await drainCaptureQueue();
};

const finishIdea = async (message, execution) => {
  if (execution.state === "queued") {
    await appendCaptureEvent({ messageId: message.id, status: "idea-queued-no-context-or-task", ideaId: execution.ideaId, at: new Date().toISOString() });
    return { queued: true, text: "同一想法前序任务仍在执行；本次事件已持久化排队，未提前推进 Context 或创建 Task。前序完成后将按原事件自动续接。" };
  }

  const base = path.join(inboxRoot, `idea-${message.id}`);
  const evidencePath = `${base}-evidence.json`;
  const attemptPath = `${base}-attempt.json`;
  const requestPath = `${base}-request.json`;
  let evidence = await readJson(evidencePath);
  let trace = idea.trace(execution.taskId);

  const deliver = async () => {
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) {
      await appendCaptureEvent({ messageId: message.id, status: "idea-delivery-claim-skipped", claimStatus: claim.status, trace: idea.trace(execution.taskId), at: new Date().toISOString() });
      return { deferredDelivery: true };
    }
    const text = await ideaSuccessText(trace, evidence);
    // Isolated P3.4 fault injection: the claim has already marked this delivery unknown, but no transport call
    // happened yet. Only an explicitly unattempted delivery may be re-queued with a bounded backoff.
    if (!ideaBackoffInjected && matchesMessageHook(process.env.SYNO_P34_TEST_BACKOFF_MESSAGE_ID, message.id)) {
      ideaBackoffInjected = true;
      const configuredDelay = Number(process.env.SYNO_P34_TEST_BACKOFF_DELAY_MS ?? 1000);
      const delayMs = Number.isFinite(configuredDelay) && configuredDelay >= 0 ? Math.floor(configuredDelay) : 1000;
      const commandId = `p34-backoff:${message.id}`;
      const retry = butler.operations.scheduleDeliveryRetry({
        deliveryKey: trace.deliveryKey,
        attempted: false,
        delayMs,
        reason: "p34 isolated before-transport backoff",
        commandId,
      });
      await appendCaptureEvent({
        messageId: message.id, status: "idea-delivery-backoff-before-transport",
        deliveryKey: trace.deliveryKey, retryStatus: retry.status,
        notBefore: retry.receipt?.notBefore ?? null, retryCount: retry.receipt?.retryCount ?? null,
        delayMs, at: new Date().toISOString(),
      });
      if (retry.status === "queued") {
        const timer = setTimeout(() => {
          deliveryTimers.delete(timer);
          if (stopping) return;
          trackIdea(deliver().catch((error) => appendCaptureEvent({
            messageId: message.id, status: "idea-delivery-backoff-refire-failed",
            error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
          })));
        }, delayMs);
        deliveryTimers.add(timer);
      }
      return { deferredDelivery: true };
    }
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      // Isolated P3.4 fault injection: real transport returned delivered, but accept is not called. The delivery
      // stays unknown/may_send=false/provider_message_id=null and is never auto-resent.
      if (!ideaUnknownInjected && matchesMessageHook(process.env.SYNO_P34_TEST_UNKNOWN_MESSAGE_ID, message.id)) {
        ideaUnknownInjected = true;
        await appendCaptureEvent({
          messageId: message.id, status: "idea-delivery-injected-unknown-after-send",
          deliveryKey: trace.deliveryKey, at: new Date().toISOString(),
        });
        throw new Error("P3.4 隔离测试：真实发送已返回 delivered，但在 idea.accept 前注入 unknown");
      }
      idea.accept(trace.deliveryKey);
      trace = idea.trace(execution.taskId);
      await appendCaptureEvent({ messageId: message.id, status: "idea-delivery-accepted", trace, at: new Date().toISOString() });
    } catch (error) {
      idea.unknown(trace.deliveryKey);
      await appendCaptureEvent({
        messageId: message.id,
        status: "idea-delivery-unknown-no-resend",
        trace: idea.trace(execution.taskId),
        error: String(error.message || error).slice(0, 300),
        at: new Date().toISOString(),
      });
    }
    return { deferredDelivery: true };
  };

  if (trace.taskState === "completed") {
    if (trace.deliveryState === "queued" && trace.maySend === true) return deliver();
    return { deferredDelivery: true };
  }

  const marker = await readJson(attemptPath);
  if (marker) {
    try {
      await fs.access(execution.artifactPath);
      trace = idea.complete(execution);
      await appendCaptureEvent({ messageId: message.id, status: "idea-recovered-artifact-without-model-replay", trace, at: new Date().toISOString() });
      return deliver();
    } catch (error) {
      if (error.code !== "ENOENT") {
        await appendCaptureEvent({ messageId: message.id, status: "idea-recovery-rejected", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
        return { text: `既有想法候选未通过复核，未自动重跑模型：${String(error.message || error).slice(0, 300)}` };
      }
      return { text: `该消息已有想法执行标记但没有候选或证据，未自动重跑模型；请先对账：${attemptPath}` };
    }
  }

  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    ideaId: execution.ideaId,
    ideaIds: execution.ideaIds,
    action: execution.action,
    prompt: execution.prompt,
    contextVersion: execution.contextVersion,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: "opencode-go/deepseek-v4.1-flash",
    artifactPath: execution.artifactPath,
    inputs: execution.inputs,
  };
  await writeJson(attemptPath, { ...request, startedAt: new Date().toISOString() }, "wx");
  await writeJson(requestPath, request, "wx");
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      config.workerPath,
      "--idea-request", requestPath,
      "--evidence", evidencePath,
      "--worker", execution.worker,
      "--receipt", "Native Runtime delivery pending after Result Lane; at_least_once; delivery is not read receipt",
    ], { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
    evidence = JSON.parse(stdout);
    assert.equal(evidence.mode, "idea", "真实 Worker 未返回想法证据");
    assert.equal(evidence.idea?.messageId, execution.messageId, "真实 Worker 证据消息不匹配");
    assert.equal(evidence.idea?.taskId, execution.taskId, "真实 Worker 证据 Task 不匹配");
    assert.equal(evidence.idea?.attemptId, execution.attemptId, "真实 Worker 证据 Attempt 不匹配");
    assert.equal(evidence.idea?.artifactPath, execution.artifactPath, "真实 Worker 证据路径不匹配");
    trace = idea.complete(execution);
    await appendCaptureEvent({
      messageId: message.id,
      status: "idea-result-lane-passed",
      evidencePath,
      trace,
      workerModelPath: evidence.workerModelPath,
      usage: evidence.usage,
      costUsd: evidence.costUsd,
      at: new Date().toISOString(),
    });
    return deliver();
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "idea-no-success-receipt", evidencePath, attemptPath, nativeRunId: execution.runId, error: detail, at: new Date().toISOString() });
    return { text: `本次想法未取得成功回执，不会自动重跑模型；请先对账：${attemptPath}\n错误：${detail}` };
  }
};

const ideaFromFeishu = async (message, routed) => {
  let execution;
  try {
    execution = idea.begin({
      appId: config.appId,
      messageId: message.id,
      chatId: message.chatId,
      ownerId: message.senderId,
      worker: message.worker,
      action: routed.action,
      ideaId: routed.ideaId,
      ideaIds: routed.ideaIds,
      prompt: routed.prompt,
    });
  } catch (error) {
    if (!String(error.message || error).includes("当前事件保持 queued")) throw error;
    await appendCaptureEvent({ messageId: message.id, status: "idea-queued-no-context-or-task", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
    return { queued: true, text: "同一想法前序任务仍在执行；本次事件已持久化排队，未提前推进 Context 或创建 Task。前序完成后将按原事件自动续接。" };
  }
  return finishIdea(message, execution);
};

const applyProjectEvidence = async (execution, artifact) => {
  project.writeStep(execution, "outline", artifact.outline);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", artifact.deliverable);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
  // Isolated writes commit, pin, merge and only then settle; standalone runtimes settle synchronously.
  return project.complete(execution);
};

const finishProject = async (message, execution) => {
  if (execution.state === "queued") {
    await appendCaptureEvent({ messageId: message.id, status: "project-queued-no-context-or-task", projectId: execution.projectId, at: new Date().toISOString() });
    return { queued: true, text: "同一项目前序任务仍在执行；本次事件已持久化排队，未提前推进 Context 或创建 Task。前序完成后将按原事件自动续接。" };
  }

  const base = path.join(inboxRoot, `project-${message.id}`);
  const evidencePath = `${base}-evidence.json`;
  const attemptPath = `${base}-attempt.json`;
  const requestPath = `${base}-request.json`;
  // Candidates live in the Task's isolated worktree until Result Lane merges them; `projectRoot` stays the merged
  // repository location used for reading delivered artifacts. A frozen previous version may live in the legacy root,
  // so the Worker reads it through a separate read-only root instead of this Task's candidate write root.
  const writeRoot = execution.writeRoot ?? projectRoot;
  const previousRoot = execution.frozen?.root ?? writeRoot;
  let evidence = await readJson(evidencePath);
  let trace = project.trace(execution.taskId);

  const deliver = async () => {
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) {
      await appendCaptureEvent({ messageId: message.id, status: "project-delivery-claim-skipped", claimStatus: claim.status, trace: project.trace(execution.taskId), at: new Date().toISOString() });
      return { deferredDelivery: true };
    }
    const text = await projectSuccessText(trace, evidence);
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      project.accept(trace.deliveryKey);
      trace = project.trace(execution.taskId);
      await appendCaptureEvent({ messageId: message.id, status: "project-delivery-accepted", trace, at: new Date().toISOString() });
    } catch (error) {
      project.unknown(trace.deliveryKey);
      await appendCaptureEvent({
        messageId: message.id,
        status: "project-delivery-unknown-no-resend",
        trace: project.trace(execution.taskId),
        error: String(error.message || error).slice(0, 300),
        at: new Date().toISOString(),
      });
    }
    return { deferredDelivery: true };
  };

  if (trace.taskState === "completed") {
    if (trace.deliveryState === "queued" && trace.maySend === true) return deliver();
    return { deferredDelivery: true };
  }

  const marker = await readJson(attemptPath);
  if (marker) {
    if (evidence?.mode === "project" && evidence.project) {
      try {
        assert.equal(evidence.project.messageId, execution.messageId, "既有项目证据消息不匹配");
        assert.equal(evidence.project.taskId, execution.taskId, "既有项目证据 Task 不匹配");
        assert.equal(evidence.project.attemptId, execution.attemptId, "既有项目证据 Attempt 不匹配");
        assert.equal(evidence.project.planVersion, execution.planVersion, "既有项目证据计划版本不匹配");
        trace = await applyProjectEvidence(execution, evidence.project);
        await appendCaptureEvent({ messageId: message.id, status: "project-recovered-evidence-without-model-replay", trace, at: new Date().toISOString() });
        return deliver();
      } catch (error) {
        await appendCaptureEvent({ messageId: message.id, status: "project-recovery-rejected", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
        return { text: `既有项目证据未通过复核，未自动重跑模型：${String(error.message || error).slice(0, 300)}` };
      }
    }
    try {
      trace = await project.complete(execution);
      await appendCaptureEvent({ messageId: message.id, status: "project-recovered-artifacts-without-model-replay", trace, at: new Date().toISOString() });
      return deliver();
    } catch (error) {
      return { text: `该消息已有项目执行标记但没有完整产物或证据，未自动重跑模型；请先对账：${attemptPath}` };
    }
  }

  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    projectId: execution.projectId,
    action: execution.action,
    goal: execution.goal,
    revision: execution.revision,
    planVersion: execution.planVersion,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: PROJECT_MODEL_LABEL,
    previous: execution.frozen ?? null,
  };
  await writeJson(attemptPath, { mode: "project", ...request, startedAt: new Date().toISOString() }, "wx");
  await writeJson(requestPath, request, "wx");
  try {
    if (request.previous) {
      const frozen = readFrozenPrevious(request, previousRoot);
      assert.equal(frozen.manifestSha256, request.previous.manifestSha256, "调用 Worker 前冻结 manifest 已变化");
    }
    const { stdout } = await execFileAsync(process.execPath, [
      config.workerPath,
      "--project-request", requestPath,
      "--project-root", writeRoot,
      "--previous-root", previousRoot,
      "--evidence", evidencePath,
      "--worker", execution.worker,
      "--receipt", "Native Runtime delivery pending after Result Lane; at_least_once; delivery is not read receipt",
    ], { timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
    evidence = JSON.parse(stdout);
    assert.equal(evidence.mode, "project", "真实 Worker 未返回项目证据");
    assert.equal(evidence.project?.messageId, execution.messageId, "真实 Worker 证据消息不匹配");
    assert.equal(evidence.project?.taskId, execution.taskId, "真实 Worker 证据 Task 不匹配");
    assert.equal(evidence.project?.attemptId, execution.attemptId, "真实 Worker 证据 Attempt 不匹配");
    assert.equal(evidence.project?.projectId, execution.projectId, "真实 Worker 证据项目不匹配");
    assert.equal(evidence.project?.planVersion, execution.planVersion, "真实 Worker 证据计划版本不匹配");
    assert.equal(evidence.project?.resultLane, "delegated_to_host", "真实 Worker 探针不得冒充 Result Lane");
    // Isolated fault injection: the evidence exists but the host has not written project artifacts yet.
    if (process.env.SYNO_P3_PROJECT_TEST_CRASH_AFTER_WORKER === "1") process.exit(93);
    trace = await applyProjectEvidence(execution, evidence.project);
    await appendCaptureEvent({
      messageId: message.id,
      status: "project-result-lane-passed",
      evidencePath,
      trace,
      workerModelPath: evidence.workerModelPath,
      usage: evidence.usage,
      costUsd: evidence.costUsd,
      at: new Date().toISOString(),
    });
    return deliver();
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "project-no-success-receipt", evidencePath, attemptPath, nativeRunId: execution.runId, error: detail, at: new Date().toISOString() });
    return { text: `本次项目未取得成功回执，不会自动重跑模型；请先对账：${attemptPath}\n错误：${detail}` };
  }
};

const projectFromFeishu = async (message, routed) => {
  let execution;
  try {
    execution = await project.begin({
      appId: config.appId,
      messageId: message.id,
      chatId: message.chatId,
      ownerId: message.senderId,
      worker: message.worker,
      action: routed.action,
      projectId: routed.projectId,
      goal: routed.goal,
      revision: routed.revision,
    });
  } catch (error) {
    if (!String(error.message || error).includes("当前事件保持 queued")) throw error;
    await appendCaptureEvent({ messageId: message.id, status: "project-queued-no-context-or-task", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
    return { queued: true, text: "同一项目前序任务仍在执行；本次事件已持久化排队，未提前推进 Context 或创建 Task。前序完成后将按原事件自动续接。" };
  }
  return finishProject(message, execution);
};

const projectClarify = async (message, routed, factCountBefore) => {
  assert.equal(project.factCount(), factCountBefore, "歧义或未知项目请求不得新增业务事实");
  const known = project.projects();
  const ids = routed.candidates?.length ? routed.candidates : known.map((entry) => entry.projectId);
  const lines = ids.map((projectId) => {
    const entry = known.find((candidate) => candidate.projectId === projectId);
    const latest = entry?.latestVersion ? `最新 v${entry.latestVersion}` : "尚无已完成计划";
    return `${projectId}｜${entry?.goal ?? "未知对象"}（${latest}）`;
  });
  await appendCaptureEvent({
    messageId: message.id, status: "project-ambiguous-no-task", routed,
    factCountBefore, factCountAfter: project.factCount(), at: new Date().toISOString(),
  });
  return {
    text: [
      "项目对象不明确，未创建任务或调用 Worker。",
      routed.status === "unknown" ? `未找到项目：${routed.projectId}` : "请写明要操作的项目编号；新建项目需要目标。",
      "示例：新建项目：…；修订项目 <projectId>：…",
      lines.length ? `现有项目：\n${lines.join("\n")}` : "当前还没有项目。",
    ].join("\n"),
  };
};

const knowledgeFromFeishu = async (message, routed, candidates) => {
  const resolved = routed;
  if (resolved.status === "ambiguous") {
    const before = knowledge.factCount();
    const event = {
      messageId: message.id, status: "knowledge-ambiguous-no-task", candidates,
      factCountBefore: before, factCountAfter: knowledge.factCount(), at: new Date().toISOString(),
    };
    assert.equal(event.factCountAfter, before, "歧义请求不得新增业务事实");
    await appendCaptureEvent(event);
    return { text: `查询对象不明确，未创建任务或调用 Worker。请发送「查询 <documentId>：<问题>」。\n${candidates.map((candidate) => `${candidate.documentId}｜${candidate.title}`).join("\n")}` };
  }
  try {
    const execution = await knowledge.begin({
      appId: config.appId, messageId: message.id, chatId: message.chatId,
      ownerId: message.senderId, documentId: resolved.documentId, query: resolved.query,
    });
    let trace = knowledge.trace(execution.taskId);
    if (trace.taskState !== "completed") {
      try {
        await fs.access(execution.artifactPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        const answer = await answerKnowledgeQuery(knowledgeOptions, execution);
        await fs.writeFile(execution.artifactPath, JSON.stringify({
          ...answer, messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
        }), { flag: "wx", mode: 0o600 });
      }
      trace = await knowledge.complete(execution);
      await appendCaptureEvent({ messageId: message.id, status: "knowledge-result-lane-passed", trace, at: new Date().toISOString() });
    }
    if (trace.deliveryState !== "queued" || trace.maySend !== true) return { deferredDelivery: true };
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) return { deferredDelivery: true };
    const persisted = await fs.readFile(trace.path, "utf8");
    const answer = JSON.parse(persisted);
    assert.equal(createHash("sha256").update(persisted).digest("hex"), trace.fileVersion, "知识通知前重读版本不一致");
    const text = [
      answer.text,
      "",
      `对象：${resolved.documentId}`,
      `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
      `Task／Attempt：${trace.taskId}／${trace.attemptId}`,
      `Context 版本：${trace.contextVersion}；Result Lane：passed`,
      "本地只读知识查询；未调用模型。送达不代表已读。",
    ].join("\n");
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      knowledge.accept(trace.deliveryKey);
      await appendCaptureEvent({ messageId: message.id, status: "knowledge-delivery-accepted", trace: knowledge.trace(execution.taskId), at: new Date().toISOString() });
    } catch (error) {
      knowledge.unknown(trace.deliveryKey);
      await appendCaptureEvent({ messageId: message.id, status: "knowledge-delivery-unknown-no-resend", trace: knowledge.trace(execution.taskId), error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
    }
    return { deferredDelivery: true };
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "knowledge-rejected", error: detail, at: new Date().toISOString() });
    return { text: `知识查询未通过复核，未自动重跑：${detail}` };
  }
};

async function resolveRadarCommandItems(command) {
  let date = command.date;
  if (!date) {
    const names = (await fs.readdir(p5Home)).filter((name) => /^digest-\d{4}-\d{2}-\d{2}\.json$/u.test(name)).sort();
    if (!names.length) throw new Error("还没有可操作的日报");
    date = names.at(-1).slice(7, 17);
  }
  return resolveRadarCandidates({ home: p5Home, date, numbers: command.numbers });
}

function radarFollowText(status, item, taskId) {
  const prefix = `${item.date} 第 ${item.index} 条`;
  if (status === "captured") return `${prefix}已收录，Task ${taskId} 已通过 Result Lane。`;
  if (status === "running") return `${prefix}正在收录，Task ${taskId} 已存在，不重复创建。`;
  if (status === "failed") return `${prefix}的收录执行未取得回执，Task ${taskId} 保持待对账，不自动重跑。`;
  return `${prefix}真实收录 Task：${taskId}；状态：待收录。系统按 itemId 复用任务，完成后另行通知。`;
}

async function followMarkedRadarItems(message, command) {
  const { marked, selected } = await resolveRadarMarkedFollows({
    home: p5Home, stateHome: p5StateHome, numbers: command.numbers, all: command.all,
  });
  if (!marked.length) return "没有网站标记的待处理跟进。";
  if (!selected.length) {
    const lines = marked.map((item, index) => `${index + 1}. ${item.date} 第 ${item.index} 条｜${item.title || `item ${item.itemId}`}`);
    return [`待管家处理 ${marked.length} 条，尚未创建收录 Task：`, ...lines, "回复“处理网站跟进 编号”选择一条；明确全部收录请回复“处理网站跟进 全部”。"].join("\n");
  }
  const outputs = [];
  for (const item of selected) {
    try {
      outputs.push(await followRadarItems(message, { action: "follow", date: item.date, numbers: [String(item.index)] }));
    } catch (error) {
      if (selected.length === 1) throw error;
      outputs.push(`${item.date} 第 ${item.index} 条未创建 Task：${String(error.message || error).slice(0, 300)}`);
    }
  }
  return outputs.join("\n");
}

async function followRadarItems(message, command) {
  const items = await resolveRadarCommandItems(command);
  if (items.length !== 1) return "真实收录每次只创建一条 Task，请分别发送「跟进 日期 编号」。";
  const item = items[0];
  const site = radarSite();
  const existing = await site.follow(item.itemId);
  if (existing?.taskId && ["pending", "running", "captured", "failed"].includes(existing.status)) {
    return radarFollowText(existing.status, item, existing.taskId);
  }
  const source = await prepareRadarCaptureSource({ home: p5Home, itemId: item.itemId, proxy: process.env.P5_PROXY || "" });
  const capture = butler.captureSource(source);
  const messageId = `radar${item.itemId}`;
  const execution = capture.begin({
    appId: config.appId, messageId, chatId: message.chatId, ownerId: message.senderId, worker: message.worker,
  });
  const follow = {
    ...(existing || {}),
    status: "pending", itemId: item.itemId, date: item.date, index: item.index, title: item.titleZh || item.title,
    taskId: execution.taskId, messageId, sourcePath: source.sourcePath, sourceUrl: source.sourceUrl, sourceMaterial: source.sourceMaterial,
    chatId: message.chatId, ownerId: message.senderId, worker: message.worker, replyTo: message.id,
  };
  await site.setFollow(item.itemId, follow);
  await applyRadarFeedback({ home: p5Home, itemId: item.itemId, action: "follow" });
  trackCapture(executeRadarFollow(follow).catch(async (error) => {
    await site.setFollow(item.itemId, { ...follow, status: "failed", error: String(error.message || error).slice(0, 500) });
    await notifyRadarFollowFailure(follow, error);
    await appendCaptureEvent({ messageId, status: "background-radar-follow-failed", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
  }));
  return radarFollowText("pending", item, execution.taskId);
}

async function executeRadarFollow(follow) {
  const site = radarSite();
  const source = { sourcePath: follow.sourcePath, sourceUrl: follow.sourceUrl, sourceMaterial: follow.sourceMaterial || "verified-public-radar-snapshot" };
  const capture = butler.captureSource(source);
  const followMessage = {
    id: follow.messageId, replyTo: follow.replyTo, chatId: follow.chatId, senderId: follow.ownerId, worker: follow.worker,
  };
  await site.setFollow(follow.itemId, { ...follow, status: "running" });
  const result = await captureFromFeishu(followMessage, capture, source);
  const trace = capture.trace(follow.taskId);
  if (trace.taskState === "completed") {
    await site.setFollow(follow.itemId, { ...follow, status: "captured", taskState: trace.taskState, path: trace.path, fileVersion: trace.fileVersion, deliveryState: trace.deliveryState });
  } else if (result?.text) {
    await site.setFollow(follow.itemId, { ...follow, status: "failed", error: result.text.slice(0, 500), taskState: trace.taskState });
    await notifyRadarFollowFailure(follow, result.text);
  } else {
    await site.setFollow(follow.itemId, { ...follow, status: "pending", taskState: trace.taskState });
  }
  return result;
}

async function notifyRadarFollowFailure(follow, error) {
  const detail = String(error?.message || error).slice(0, 500);
  try {
    const delivery = await adapter.send({
      chatId: follow.chatId,
      text: `雷达条目收录未完成：${follow.title || `item ${follow.itemId}`}\nTask ${follow.taskId} 未通过完成复核，已标为失败待对账，不自动重跑。\n${detail}`,
      replyTo: follow.replyTo,
      deliveryKey: `radar-follow-failed:${follow.taskId}`,
    });
    if (!delivery?.delivered) throw new Error(delivery?.reason || "飞书未确认送达");
  } catch (deliveryError) {
    await appendCaptureEvent({
      messageId: follow.messageId, status: "radar-follow-failure-delivery-unknown-no-resend",
      error: String(deliveryError.message || deliveryError).slice(0, 300), at: new Date().toISOString(),
    });
  }
}

async function recoverRadarFollows() {
  const state = await readJson(path.join(p5StateHome, "radar-follow-state.json"));
  for (const follow of recoverableRadarFollows(state)) {
    trackCapture(executeRadarFollow(follow).catch(async (error) => {
      const site = radarSite();
      await site.setFollow(follow.itemId, { ...follow, status: "failed", error: String(error.message || error).slice(0, 500) });
      await notifyRadarFollowFailure(follow, error);
      await appendCaptureEvent({
        messageId: follow.messageId, status: "radar-follow-recovery-failed", error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
      });
    }));
  }
}

const backgroundCaptures = new Set();
const trackCapture = (promise) => {
  backgroundCaptures.add(promise);
  void promise.finally(() => backgroundCaptures.delete(promise));
  return promise;
};
const startCapture = (message) => {
  trackCapture(captureFromFeishu(message)
    .then((result) => result?.queued ? null : requestCaptureDrain())
    .catch((error) => appendCaptureEvent({ messageId: message.id, status: "background-capture-failed", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() })));
};

const backgroundIdeas = new Set();
const trackIdea = (promise) => {
  backgroundIdeas.add(promise);
  void promise.finally(() => backgroundIdeas.delete(promise));
  return promise;
};
let ideaDrainRequested = false;
let ideaDrainPromise = null;
const ideaMessageOf = (queued) => ({ id: queued.messageId, chatId: queued.chatId, senderId: queued.ownerId, worker: queued.worker });
const drainIdeaQueue = () => drainQueue({
  queued: () => idea.queued(),
  run: (queued) => ideaFromFeishu(ideaMessageOf(queued), queued),
  consumeRequest: () => {
    const requested = ideaDrainRequested;
    ideaDrainRequested = false;
    return requested;
  },
  isStopping: () => stopping,
  onError: (queued, error) => appendCaptureEvent({
    messageId: queued.messageId, status: "background-idea-failed",
    error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
  }),
});
const requestIdeaDrain = async () => {
  if (stopping) return;
  // Isolated restart fault injection: exit only when the target message is genuinely still queued and its same
  // object has no unsettled Task. That never fires at cold startup with no queued work, and never impersonates the
  // target scenario while the preceding same-object Task is still running.
  const crashHook = process.env.SYNO_P34_TEST_CRASH_BEFORE_IDEA_DRAIN;
  let crashTarget = null;
  if (crashHook && !ideaDrainCrashInjected) {
    const unsettledContexts = new Set(butler.status().domains.idea.activeTasks.map((task) => task.contextId));
    const settled = (queued) => !unsettledContexts.has(`idea:${queued.ideaId}`);
    // `1` / `*` pick the next queued message whose own object is already settled, so the preceding same-object
    // Task must finish first and the target stays queued. An exact ID keeps the original behaviour.
    crashTarget = isNextMessageHook(crashHook)
      ? idea.queued().find(settled)
      : idea.queued().find((queued) => queued.messageId === crashHook && settled(queued));
  }
  if (crashTarget) {
    ideaDrainCrashInjected = true;
    await appendCaptureEvent({
      messageId: crashTarget.messageId, status: "p34-crash-before-idea-drain",
      queuedMessageId: crashTarget.messageId, ideaId: crashTarget.ideaId ?? null,
      hookMode: isNextMessageHook(crashHook) ? "next" : "exact",
      queued: true, taskCreatedForQueuedMessage: false,
      at: new Date().toISOString(),
    });
    process.exit(95);
  }
  if (ideaDrainPromise) {
    ideaDrainRequested = true;
    await ideaDrainPromise;
    return;
  }
  ideaDrainPromise = drainIdeaQueue().finally(() => { ideaDrainPromise = null; });
  await ideaDrainPromise;
};
const startIdea = (message, routed) => {
  if (stopping) return null;
  return trackIdea(ideaFromFeishu(message, routed)
    .then((result) => result?.queued ? null : requestIdeaDrain())
    .catch((error) => appendCaptureEvent({
      messageId: message.id, status: "background-idea-failed",
      error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    })));
};

const backgroundProjects = new Set();
const trackProject = (promise) => {
  backgroundProjects.add(promise);
  void promise.finally(() => backgroundProjects.delete(promise));
  return promise;
};
let projectDrainRequested = false;
let projectDrainPromise = null;
const projectMessageOf = (queued) => ({ id: queued.messageId, chatId: queued.chatId, senderId: queued.ownerId, worker: queued.worker });
const drainProjectQueue = () => drainQueue({
  queued: () => project.queued(),
  run: (queued) => projectFromFeishu(projectMessageOf(queued), queued),
  consumeRequest: () => {
    const requested = projectDrainRequested;
    projectDrainRequested = false;
    return requested;
  },
  isStopping: () => stopping,
  onError: (queued, error) => appendCaptureEvent({
    messageId: queued.messageId, status: "background-project-failed",
    error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
  }),
});
const requestProjectDrain = async () => {
  if (stopping) return;
  if (projectDrainPromise) {
    projectDrainRequested = true;
    await projectDrainPromise;
    return;
  }
  projectDrainPromise = drainProjectQueue().finally(() => { projectDrainPromise = null; });
  await projectDrainPromise;
};
const startProject = (message, routed) => {
  if (stopping) return null;
  return trackProject(projectFromFeishu(message, routed)
    .then((result) => result?.queued ? null : requestProjectDrain())
    .catch((error) => appendCaptureEvent({
      messageId: message.id, status: "background-project-failed",
      error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    })));
};

const startIdeaExecution = (message, execution) => {
  if (stopping) return null;
  return trackIdea(finishIdea(message, execution)
    .then((result) => result?.queued ? null : requestIdeaDrain())
    .catch((error) => appendCaptureEvent({
      messageId: message.id, status: "background-idea-failed",
      error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    })));
};

const startProjectExecution = (message, execution) => {
  if (stopping) return null;
  return trackProject(finishProject(message, execution)
    .then((result) => result?.queued ? null : requestProjectDrain())
    .catch((error) => appendCaptureEvent({
      messageId: message.id, status: "background-project-failed",
      error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    })));
};

const backgroundMemories = new Set();
const trackMemory = (promise) => {
  backgroundMemories.add(promise);
  void promise.finally(() => backgroundMemories.delete(promise));
  return promise;
};
let memoryDrainPromise = null;
const memoryMessageOf = (outcome) => ({
  id: outcome.messageId, chatId: outcome.chatId, senderId: outcome.ownerId, worker: outcome.worker,
});
const drainMemoryQueue = async () => {
  for (;;) {
    if (stopping) return;
    const outcomes = memory.drainQueued();
    if (!outcomes.length) return;
    let progressed = false;
    for (const outcome of outcomes) {
      if (outcome.status === "stale") {
        await appendCaptureEvent({
          messageId: outcome.messageId, status: "memory-drain-stale",
          decisionId: outcome.decisionId, memoryId: outcome.memoryId,
          reason: outcome.reason, at: new Date().toISOString(),
        });
        try {
          await adapter.send({
            chatId: outcome.chatId,
            text: "此前排队的记忆确认已失效，未创建任务，也未重发。请重新发送纠正或遗忘命令。",
            replyTo: outcome.messageId,
          });
        } catch (error) {
          await appendCaptureEvent({
            messageId: outcome.messageId, status: "memory-drain-stale-reply-failed",
            error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
          });
        }
        progressed = true;
        continue;
      }
      if (outcome.status === "queued" || !outcome.execution) continue;
      const queuedMessage = memoryMessageOf(outcome);
      try {
        const result = outcome.action === "propose"
          ? await finishMemoryProposal(queuedMessage, outcome.execution)
          : await finishMemoryConfirmation(queuedMessage, outcome.execution, outcome.decisionId);
        if (!result?.queued) progressed = true;
      } catch (error) {
        progressed = true;
        await appendCaptureEvent({
          messageId: outcome.messageId, status: "background-memory-drain-failed",
          error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
        });
      }
    }
    if (!progressed) return;
  }
};
const requestMemoryDrain = async () => {
  if (stopping) return;
  if (memoryDrainPromise) {
    await memoryDrainPromise;
    return;
  }
  memoryDrainPromise = drainMemoryQueue().finally(() => { memoryDrainPromise = null; });
  await memoryDrainPromise;
};
const startMemoryProposal = (message, routed) => {
  if (stopping) return null;
  return trackMemory(memoryProposalFromFeishu(message, routed)
    .then((result) => result?.queued ? null : requestMemoryDrain())
    .catch((error) => appendCaptureEvent({
      messageId: message.id, status: "background-memory-failed",
      error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    })));
};

const ideaClarify = async (message, routed, factCountBefore) => {
  assert.equal(idea.factCount(), factCountBefore, "歧义或未知想法请求不得新增业务事实");
  const known = idea.ideas();
  const ids = routed.candidates?.length ? routed.candidates : known.map((entry) => entry.ideaId);
  const lines = ids.map((ideaId) => {
    const entry = known.find((candidate) => candidate.ideaId === ideaId);
    return `${ideaId}｜${entry?.title ?? "未知对象"}`;
  });
  await appendCaptureEvent({
    messageId: message.id, status: "idea-ambiguous-no-task", routed,
    factCountBefore, factCountAfter: idea.factCount(), at: new Date().toISOString(),
  });
  return {
    text: [
      "想法对象不明确，未创建任务或调用 Worker。",
      routed.status === "unknown" ? `未找到想法：${routed.ideaId}` : "请写明要操作的想法编号。",
      "示例：新建想法：…；继续想法 <ideaId>：…；比较想法 <ideaIdA> <ideaIdB>：…",
      lines.length ? `现有想法：\n${lines.join("\n")}` : "当前还没有想法。",
    ].join("\n"),
  };
};


const memoryStatusText = (outcome) => {
  switch (outcome?.status) {
    case "already_consumed":
      return `该 Decision 已被其他消息消费（${outcome.consumedByMessageId ?? "未知"}），本次未执行任何业务。`;
    case "owner_mismatch":
      return "该 Decision 不属于当前 Owner，本次未执行任何业务。";
    case "app_mismatch":
      return "该 Decision 不属于当前测试 App，本次未执行任何业务。";
    case "expired":
      return "该 Decision 已过期，本次未执行任何业务；请重新发送命令。";
    case "cancelled":
      return "该 Decision 已取消，本次未执行任何业务。";
    case "self_confirmation":
      return "提出该候选的消息不能确认自己，请用后续消息确认。";
    case "stale":
      return "该 Decision 绑定的对象版本已变化，本次未执行任何业务；请重新发送命令。";
    case "consumed":
      return "该 Decision 已消费，本次为幂等重放。";
    default:
      return `记忆确认未执行：${outcome?.status ?? "unknown"}`;
  }
};

const memoryChangeRequest = async (message, routed) => {
  const action = routed.action;
  try {
    const result = action === "correct"
      ? memory.correct({
        appId: config.appId, messageId: message.id, chatId: message.chatId,
        ownerId: message.senderId, worker: message.worker,
        memoryId: routed.memoryId, expectedVersion: routed.expectedVersion, preference: routed.preference,
      })
      : memory.forget({
        appId: config.appId, messageId: message.id, chatId: message.chatId,
        ownerId: message.senderId, worker: message.worker,
        memoryId: routed.memoryId, expectedVersion: routed.expectedVersion,
      });
    await appendCaptureEvent({
      messageId: message.id, status: `memory-${action}-decision-pending-no-task`,
      memoryId: result.memoryId, decisionId: result.decisionId, at: new Date().toISOString(),
    });
    return {
      text: [
        `记忆${action === "correct" ? "纠正" : "遗忘"}已登记，尚未生效。`,
        `记忆：${result.memoryId}`,
        `Decision：${result.decisionId}`,
        `作用域：${result.scope}`,
        `期望版本：v${result.expectedVersion}`,
        `状态：${result.status}`,
        `请回复：确认 ${result.decisionId}`,
        "确认前不会改变 active 值。",
      ].join("\n"),
    };
  } catch (error) {
    const detail = String(error.message || error).slice(0, 500);
    await appendCaptureEvent({ messageId: message.id, status: `memory-${action}-rejected`, error: detail, at: new Date().toISOString() });
    return { text: `记忆变更未登记：${detail}` };
  }
};

const memoryConfirmText = async (trace) => {
  assert.equal(trace.taskState, "completed", "记忆确认 Task 未完成");
  assert.equal(trace.nativeRunState, "done", "记忆确认原生 run 未完成");
  assert.ok(trace.fileVersion && trace.deliveryKey, "缺少记忆版本或 delivery");
  const persisted = await fs.readFile(trace.artifactPath, "utf8");
  const actualVersion = createHash("sha256").update(persisted).digest("hex");
  assert.equal(actualVersion, trace.fileVersion, "记忆通知前独立重读的文件版本不一致");
  const snapshot = parseMemorySnapshot(persisted);
  assert.equal(snapshot.memoryId, trace.memoryId, "记忆快照对象与 Task 不一致");
  assert.equal(snapshot.version, trace.version, "记忆快照版本与 Task 不一致");
  const status = snapshot.operation === "forget" ? "revoked（已遗忘）" : "active";
  return [
    "记忆确认已结算（原生 Runtime）。",
    `记忆：${trace.memoryId}`,
    `Decision：${trace.decisionId}`,
    `操作：${snapshot.operation}`,
    `作用域：${snapshot.scope}`,
    `版本：v${trace.version}；状态：${status}`,
    `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
    `Task／Attempt：${trace.taskId}／${trace.attemptId}`,
    `产物：${trace.artifactPath}`,
    `文件 SHA-256：${trace.fileVersion}`,
    "Result Lane：passed；通知前独立重读：passed",
    "飞书投递为 at_least_once，provider_message_id=null；送达不代表已读。",
  ].join("\n");
};

const memoryProposalText = async (trace) => {
  assert.equal(trace.taskState, "completed", "记忆候选 Task 未完成");
  assert.equal(trace.nativeRunState, "done", "记忆候选原生 run 未完成");
  assert.ok(trace.decisionId && trace.fileVersion && trace.deliveryKey, "缺少记忆候选 Decision、文件版本或 delivery");
  const persisted = await fs.readFile(trace.artifactPath, "utf8");
  const actualVersion = createHash("sha256").update(persisted).digest("hex");
  assert.equal(actualVersion, trace.fileVersion, "记忆候选通知前独立重读的文件版本不一致");
  const candidate = JSON.parse(persisted);
  assert.equal(candidate.memoryId, trace.memoryId, "记忆候选文件对象与 Task 不一致");
  assert.equal(candidate.version, 1, "记忆候选文件版本非法");
  assert.equal(candidate.operation, "propose", "记忆候选文件操作非法");
  const index = memory.index(trace.memoryId);
  const stateLine = index?.status === "pending"
    ? "候选版本：v1（pending）"
    : `记忆状态：v${index?.currentVersion ?? trace.version}（${index?.status ?? "unknown"}）`;
  return [
    "记忆候选已生成，等待确认（原生 Runtime）。",
    `记忆：${trace.memoryId}`,
    `Decision：${trace.decisionId}`,
    `作用域：${trace.scope}`,
    stateLine,
    `Event／Run：${trace.eventId}／${trace.nativeRunId}`,
    `Task／Attempt：${trace.taskId}／${trace.attemptId}`,
    `产物：${trace.artifactPath}`,
    `文件 SHA-256：${trace.fileVersion}`,
    `Worker／模型：${trace.worker ?? "OpenCode"}／${MEMORY_MODEL_LABEL}`,
    "Result Lane：passed；确认前不会写入 active。",
    `请回复：确认 ${trace.decisionId}`,
    "飞书投递为 at_least_once；送达不代表已读。",
  ].join("\n");
};

const MEMORY_OPERATION_STATUS = { activate: "active", correct: "active", forget: "revoked" };
// A completed native Task only proves the Result Lane ran. On completed replay the native path re-reads the
// persisted candidate and never parses this placeholder, so it carries no acceptance or model effect.
const COMPLETED_PROPOSAL_PLACEHOLDER = Object.freeze({});

const assertMemoryConfirmationReconciled = (execution, trace) => {
  const expectedStatus = MEMORY_OPERATION_STATUS[execution.operation];
  assert.ok(expectedStatus, "记忆确认操作非法");
  assert.equal(trace.taskState, "completed", "记忆确认 Task 未完成");
  assert.equal(trace.memoryStatus, expectedStatus, "记忆确认后状态与操作不一致");
  assert.equal(trace.version, execution.targetVersion, "记忆确认后版本与目标不一致");
  assert.equal(trace.appliedDecisionId, execution.decisionId, "缺少本 Decision 的 memory_apply");
  assert.equal(trace.appliedVersion, execution.targetVersion, "memory_apply 版本与目标不一致");
  assert.equal(trace.appliedStatus, expectedStatus, "memory_apply 状态与操作不一致");
  const index = memory.index(execution.memoryId);
  assert.ok(index, "记忆确认后缺少索引");
  assert.equal(index.status, expectedStatus, "记忆索引状态与操作不一致");
  assert.equal(index.currentVersion, execution.targetVersion, "记忆索引当前版本与目标不一致");
  const current = memory.version(execution.memoryId);
  assert.equal(current?.version, execution.targetVersion, "当前记忆版本与目标不一致");
  assert.equal(current?.valueSha256 ?? null, execution.valueSha256 ?? null, "当前记忆值与确认值不一致");
  return trace;
};

const assertMemoryProposalReconciled = async (execution, trace) => {
  assert.equal(trace.taskState, "completed", "记忆候选 Task 未完成");
  const persisted = await fs.readFile(trace.artifactPath, "utf8");
  const candidate = JSON.parse(persisted);
  assert.equal(candidate.memoryId, execution.memoryId, "记忆候选文件对象与执行记录不一致");
  assert.equal(candidate.taskId, execution.taskId, "记忆候选文件 Task 与执行记录不一致");
  assert.equal(candidate.attemptId, execution.attemptId, "记忆候选文件 Attempt 与执行记录不一致");
  assert.equal(candidate.operation, "propose", "记忆候选文件操作非法");
  assert.equal(candidate.version, 1, "记忆候选文件版本非法");
  const decision = butler.decisions.get(trace.decisionId);
  assert.ok(decision, "记忆候选缺少 activate Decision");
  assert.equal(decision.decisionKind, "memory.confirm", "记忆候选 Decision 类型非法");
  assert.equal(decision.ownerId, execution.ownerId, "记忆候选 Decision Owner 不一致");
  assert.equal(decision.binding.operation, "activate", "记忆候选 Decision 动作非法");
  assert.equal(decision.binding.memoryId, execution.memoryId, "记忆候选 Decision 对象不一致");
  const index = memory.index(execution.memoryId);
  assert.ok(index, "记忆候选缺少 pending index");
  const proposed = index.versions.find((version) => version.version === 1);
  assert.ok(proposed, "记忆候选缺少 v1 版本");
  assert.equal(proposed.operation, "propose", "记忆候选 v1 操作非法");
  assert.equal(proposed.valueSha256, candidate.valueSha256, "记忆候选 v1 值哈希与文件不一致");
  if (index.status === "pending") {
    assert.equal(index.currentVersion, 1, "pending 记忆候选必须停留在 v1");
    assert.equal(index.pendingDecisionId, trace.decisionId, "pending 记忆候选未绑定 Decision");
    assert.equal(proposed.status, "pending", "pending 记忆候选 v1 状态非法");
    assert.equal(decision.status, "pending", "pending 记忆候选 Decision 状态非法");
  } else {
    // A later Owner confirmation may already have advanced the memory; that is the only allowed later state.
    assert.ok(["active", "revoked"].includes(index.status), "记忆候选后续状态非法");
    assert.ok(index.currentVersion >= 2, "记忆候选后续版本非法");
  }
  return trace;
};

const finishMemoryConfirmation = async (message, execution, decisionId) => {
  if (execution?.status === "queued") {
    await appendCaptureEvent({ messageId: message.id, status: "memory-confirm-queued-no-task", decisionId, at: new Date().toISOString() });
    return { text: "同一记忆前序任务仍在执行；本次确认已排队，未提前创建 Task。前序完成后会自动续接。" };
  }
  if (!execution?.taskId) return { text: memoryStatusText(execution) };
  let trace = memory.trace(execution.taskId);
  const deliver = async () => {
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) {
      await appendCaptureEvent({ messageId: message.id, status: "memory-delivery-claim-skipped", claimStatus: claim.status, trace: memory.trace(execution.taskId), at: new Date().toISOString() });
      return { deferredDelivery: true };
    }
    const text = await memoryConfirmText(trace);
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      memory.accept(trace.deliveryKey);
      trace = memory.trace(execution.taskId);
      await appendCaptureEvent({ messageId: message.id, status: "memory-delivery-accepted", trace, at: new Date().toISOString() });
    } catch (error) {
      memory.unknown(trace.deliveryKey);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-delivery-unknown-no-resend",
        trace: memory.trace(execution.taskId), error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
      });
    }
    return { deferredDelivery: true };
  };
  if (trace.taskState === "completed") {
    // A completed Task may still be missing applyTransition if the process died after finalizeTask. Reconcile
    // through idempotent memory.complete before any success notification; no Worker call or new preference.
    try {
      trace = memory.complete(execution);
      assertMemoryConfirmationReconciled(execution, trace);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-completed-reconciled",
        decisionId, trace, at: new Date().toISOString(),
      });
    } catch (error) {
      const detail = String(error.message || error).slice(0, 500);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-confirm-reconcile-rejected",
        decisionId, error: detail, at: new Date().toISOString(),
      });
      return { text: `本次记忆确认的业务效果对账未通过，未发送成功通知：${detail}` };
    }
    if (trace.deliveryState === "queued" && trace.maySend === true) return deliver();
    return { deferredDelivery: true };
  }
  try {
    try {
      await fs.access(execution.artifactPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const snapshot = memorySnapshot({
        memoryId: execution.memoryId,
        ownerId: execution.ownerId,
        scope: execution.scope,
        operation: execution.operation,
        decisionId: execution.decisionId,
        expectedVersion: execution.expectedVersion,
        version: execution.targetVersion,
        preference: execution.preference,
        expectedValueSha256: execution.expectedValueSha256,
        valueSha256: execution.valueSha256,
        sourceMessageId: execution.messageId,
        taskId: execution.taskId,
        attemptId: execution.attemptId,
        inputSha256: execution.inputSha256,
      });
      await fs.mkdir(path.dirname(execution.artifactPath), { recursive: true });
      await fs.writeFile(execution.artifactPath, canonicalMemorySnapshot(snapshot), { flag: "wx", mode: 0o600 });
    }
    trace = memory.complete(execution);
    await appendCaptureEvent({ messageId: message.id, status: "memory-result-lane-passed", decisionId, trace, at: new Date().toISOString() });
    return deliver();
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "memory-confirm-rejected", decisionId, error: detail, at: new Date().toISOString() });
    return { text: `本次记忆确认未通过复核，未自动重跑：${detail}` };
  }
};

const memoryConfirmFromFeishu = async (message, decisionId) => {
  let decision;
  try {
    decision = butler.decisions.get(decisionId);
  } catch (error) {
    return { text: `记忆确认未执行：${String(error.message || error).slice(0, 300)}` };
  }
  if (!decision) return { text: `未知 Decision：${decisionId}` };
  if (decision.decisionKind !== "memory.confirm") {
    return { text: "该 Decision 需要候选选择，请使用：选择 <decisionId>：<candidateId>" };
  }
  let execution;
  try {
    execution = memory.begin({
      appId: config.appId, messageId: message.id, chatId: message.chatId,
      ownerId: message.senderId, worker: message.worker,
      decisionId, action: decision.binding.operation,
    });
  } catch (error) {
    return { text: `记忆确认未执行：${String(error.message || error).slice(0, 500)}` };
  }
  const result = await finishMemoryConfirmation(message, execution, decisionId);
  if (!stopping) await requestMemoryDrain();
  return result;
};

const finishMemoryProposal = async (message, execution) => {
  if (!execution?.taskId) {
    await appendCaptureEvent({ messageId: message.id, status: "memory-proposal-queued-no-task", at: new Date().toISOString() });
    return { queued: true, text: "同一记忆前序任务仍在执行；本次候选已持久化排队，未提前推进 Context 或创建 Task。前序完成后会自动续接。" };
  }
  const base = path.join(inboxRoot, `memory-${message.id}`);
  const evidencePath = `${base}-evidence.json`;
  const attemptPath = `${base}-attempt.json`;
  const requestPath = `${base}-request.json`;
  let evidence = await readJson(evidencePath);
  let trace = memory.trace(execution.taskId);

  const deliver = async () => {
    const claim = butler.operations.claimDueDelivery({ deliveryKey: trace.deliveryKey });
    if (!claim.claimed) {
      await appendCaptureEvent({ messageId: message.id, status: "memory-proposal-delivery-claim-skipped", claimStatus: claim.status, trace: memory.trace(execution.taskId), at: new Date().toISOString() });
      return { deferredDelivery: true };
    }
    const text = await memoryProposalText(trace);
    try {
      const delivery = await adapter.send({ chatId: message.chatId, text, replyTo: message.id, deliveryKey: trace.deliveryKey });
      if (!delivery?.delivered) throw new Error(`飞书回复未送达：${delivery?.reason || "unknown"}`);
      memory.accept(trace.deliveryKey);
      trace = memory.trace(execution.taskId);
      await appendCaptureEvent({ messageId: message.id, status: "memory-proposal-delivery-accepted", trace, at: new Date().toISOString() });
    } catch (error) {
      memory.unknown(trace.deliveryKey);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-proposal-delivery-unknown-no-resend",
        trace: memory.trace(execution.taskId), error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
      });
    }
    return { deferredDelivery: true };
  };

  if (trace.taskState === "completed") {
    // Reconcile the business effect through idempotent completeProposal: the native completed branch re-reads
    // the persisted candidate, and COMPLETED_PROPOSAL_PLACEHOLDER is never parsed as Worker evidence.
    try {
      trace = memory.completeProposal(execution, COMPLETED_PROPOSAL_PLACEHOLDER);
      await assertMemoryProposalReconciled(execution, trace);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-proposal-completed-reconciled",
        trace, at: new Date().toISOString(),
      });
    } catch (error) {
      const detail = String(error.message || error).slice(0, 500);
      await appendCaptureEvent({
        messageId: message.id, status: "memory-proposal-reconcile-rejected",
        error: detail, at: new Date().toISOString(),
      });
      return { text: `本次记忆候选的业务效果对账未通过，未发送成功通知：${detail}` };
    }
    if (trace.deliveryState === "queued" && trace.maySend === true) return deliver();
    return { deferredDelivery: true };
  }

  const marker = await readJson(attemptPath);
  const reconcileExistingEvidence = async () => {
    try {
      assert.equal(evidence.mode, "memory", "既有记忆证据模式不匹配");
      assert.ok(evidence.memory, "既有记忆证据缺少 memory");
      assert.equal(evidence.memory.messageId, execution.messageId, "既有记忆证据消息不匹配");
      assert.equal(evidence.memory.taskId, execution.taskId, "既有记忆证据 Task 不匹配");
      assert.equal(evidence.memory.attemptId, execution.attemptId, "既有记忆证据 Attempt 不匹配");
      assert.equal(evidence.memory.memoryId, execution.memoryId, "既有记忆证据对象不匹配");
      assert.equal(evidence.memory.scope, execution.scope, "既有记忆证据作用域不匹配");
      assert.equal(evidence.memory.inputSha256, execution.inputSha256, "既有记忆证据输入哈希不匹配");
      trace = memory.completeProposal(execution, { preference: evidence.memory.preference });
      await appendCaptureEvent({ messageId: message.id, status: "memory-recovered-evidence-without-model-replay", trace, at: new Date().toISOString() });
      return deliver();
    } catch (error) {
      await appendCaptureEvent({ messageId: message.id, status: "memory-recovery-rejected", error: String(error.message || error).slice(0, 300), at: new Date().toISOString() });
      return { text: `既有记忆证据未通过复核，未自动重跑模型：${String(error.message || error).slice(0, 300)}` };
    }
  };
  if (evidence) return reconcileExistingEvidence();
  if (marker) {
    return { text: `该消息已有记忆执行标记，但缺少可核对的 Worker 证据，未自动重跑模型；请先对账：${attemptPath}` };
  }
  if (execution.recovered) {
    return { text: `该消息已有记忆 Task／Attempt，但缺少执行标记与 Worker 证据，未自动重跑模型；请先对账：${attemptPath}` };
  }

  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    memoryId: execution.memoryId,
    ownerId: execution.ownerId,
    scope: execution.scope,
    sourceText: execution.sourceText,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: MEMORY_MODEL_LABEL,
    artifactPath: execution.artifactPath,
    recalled: execution.recalled,
  };
  await writeJson(attemptPath, { mode: "memory", ...request, startedAt: new Date().toISOString() }, "wx");
  await writeJson(requestPath, request, "wx");
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      config.workerPath,
      "--memory-request", requestPath,
      "--evidence", evidencePath,
      "--worker", execution.worker,
      "--receipt", "Native Runtime delivery pending after Result Lane; at_least_once; delivery is not read receipt",
    ], { timeout: 240_000, maxBuffer: 2 * 1024 * 1024 });
    evidence = JSON.parse(stdout);
    assert.equal(evidence.mode, "memory", "真实 Worker 未返回记忆证据");
    assert.equal(evidence.memory?.messageId, execution.messageId, "真实 Worker 证据消息不匹配");
    assert.equal(evidence.memory?.taskId, execution.taskId, "真实 Worker 证据 Task 不匹配");
    assert.equal(evidence.memory?.attemptId, execution.attemptId, "真实 Worker 证据 Attempt 不匹配");
    assert.equal(evidence.memory?.memoryId, execution.memoryId, "真实 Worker 证据对象不匹配");
    assert.equal(evidence.memory?.scope, execution.scope, "真实 Worker 证据作用域不匹配");
    assert.equal(evidence.memory?.inputSha256, execution.inputSha256, "真实 Worker 证据输入哈希不匹配");
    assert.equal(evidence.memory?.resultLane, "delegated_to_host", "真实 Worker 探针不得冒充 Result Lane");
    // Isolated fault injection: evidence exists, but the host has not settled the Result Lane.
    if (process.env.SYNO_P3_MEMORY_TEST_CRASH_AFTER_WORKER === "1") process.exit(94);
    trace = memory.completeProposal(execution, { preference: evidence.memory.preference });
    await appendCaptureEvent({
      messageId: message.id, status: "memory-proposal-result-lane-passed",
      evidencePath, trace, workerModelPath: evidence.workerModelPath,
      usage: evidence.usage, costUsd: evidence.costUsd, at: new Date().toISOString(),
    });
    return deliver();
  } catch (error) {
    const detail = String(error.stderr || error.message || error).slice(-1200);
    await appendCaptureEvent({ messageId: message.id, status: "memory-proposal-no-success-receipt", evidencePath, attemptPath, nativeRunId: execution.runId, error: detail, at: new Date().toISOString() });
    return { text: `本次记忆候选未取得成功回执，不会自动重跑模型；请先对账：${attemptPath}\n错误：${detail}` };
  }
};

const memoryProposalFromFeishu = async (message, routed) => {
  let execution;
  try {
    execution = memory.beginProposal({
      appId: config.appId, messageId: message.id, chatId: message.chatId,
      ownerId: message.senderId, worker: message.worker,
      scope: routed.scope, sourceText: routed.sourceText,
    });
  } catch (error) {
    return { text: `记忆候选未执行：${String(error.message || error).slice(0, 500)}` };
  }
  return finishMemoryProposal(message, execution);
};

const memoryClarify = async (message, routed) => ({
  text: [
    "记忆命令不完整，未创建任务或调用 Worker。",
    routed.reason === "malformed-memory-command" ? "请检查作用域、记忆 ID 与版本格式。" : "未知记忆命令。",
    "示例：记忆候选 <owner|idea:id|project:id>：<内容>",
    "示例：纠正记忆 <memoryId>：v<版本>：<新值>；遗忘记忆 <memoryId>：v<版本>",
  ].join("\n"),
});

const routeDecisionReply = async (message, routed, factCountBefore) => {
  const created = butler.createRouteDecision({
    appId: config.appId,
    messageId: message.id,
    ownerId: message.senderId,
  }, routed);
  if (!created.decision) return { text: "多候选请求未形成 Decision，未创建任务或调用 Worker。" };
  const decision = created.decision;
  const factCountAfter = routed.domain === "idea" ? idea.factCount() : project.factCount();
  const lines = decision.candidates.map((candidate) => {
    const version = candidate.expectedObjectVersion === null ? "未创建" : `v${candidate.expectedObjectVersion}`;
    return `${candidate.candidateId} → ${candidate.objectId}（${candidate.domain}；预期版本 ${version}；动作 ${candidate.action}）`;
  });
  await appendCaptureEvent({
    messageId: message.id, status: "route-decision-created-no-task", domain: routed.domain,
    decisionId: decision.decisionId, candidates: decision.candidates,
    factCountBefore, factCountAfter, at: new Date().toISOString(),
  });
  return {
    text: [
      "存在多个可选对象，未创建任务或调用 Worker。",
      `Decision：${decision.decisionId}`,
      "候选：",
      ...lines,
      `冻结动作：${JSON.stringify(decision.action)}`,
      `请回复：选择 ${decision.decisionId}：<candidateId>`,
    ].join("\n"),
  };
};

const selectionFailureText = (outcome) => {
  switch (outcome?.status) {
    case "already_consumed":
      return `该 Decision 已被其他消息消费（${outcome.consumedByMessageId ?? "未知"}），本次未执行任何业务。`;
    case "app_mismatch":
      return "该 Decision 不属于当前测试 App，本次未执行任何业务。";
    case "owner_mismatch":
      return "该 Decision 不属于当前 Owner，本次未执行任何业务。";
    case "expired":
      return "该 Decision 已过期，本次未执行任何业务。";
    case "stale":
      return "候选对象版本已变化，该 Decision 已失效；本次未执行任何业务。";
    case "cancelled":
      return "该 Decision 已取消，本次未执行任何业务。";
    default:
      return `选择未执行：${outcome?.status ?? "unknown"}`;
  }
};

const selectFromFeishu = async (message, routed) => {
  let outcome;
  try {
    outcome = await butler.selectRoute({
      appId: config.appId, messageId: message.id, chatId: message.chatId,
      ownerId: message.senderId, worker: message.worker,
    }, { decisionId: routed.decisionId, candidateId: routed.candidateId });
  } catch (error) {
    return { text: `选择未执行：${String(error.message || error).slice(0, 500)}` };
  }
  if (outcome.status !== "routed") return { text: selectionFailureText(outcome) };
  await appendCaptureEvent({
    messageId: message.id, status: "route-decision-selected",
    decisionId: routed.decisionId, candidateId: routed.candidateId,
    domain: outcome.domain, objectId: outcome.receipt?.objectId, at: new Date().toISOString(),
  });
  if (outcome.domain === "idea") {
    startIdeaExecution(message, outcome.execution);
    return { deferredDelivery: true };
  }
  if (outcome.domain === "project") {
    startProjectExecution(message, outcome.execution);
    return { deferredDelivery: true };
  }
  return { text: `未知候选领域：${outcome.domain}` };
};

// Business body shared by normal inbound and frozen-spool drain. Extract verbatim: one router, no second copy.
const handleMessage = async (message) => {
  let testChat = await readChat();
  if (testChat && message.chatId !== testChat.chatId) return { text: "非白名单测试 Chat，未处理。" };
  if (!testChat) {
    testChat = { chatId: message.chatId, senderId: message.senderId, boundAt: new Date().toISOString() };
    await writeJson(chatFile, testChat);
  }
  const notes = await knowledgeStore.list({ searchable: true });
  const candidates = notes.map((note) => ({ documentId: knowledgeDocumentId(note.path), path: note.path, title: note.title }));
  const ideaFactsBefore = idea.factCount();
  const projectFactsBefore = project.factCount();
  const routed = butler.route(message.text, candidates.map((candidate) => candidate.documentId));
  if (routed.domain === "radar") return radarFromFeishu(routed, message);
  if (routed.domain === "plugin") return pluginFromFeishu(routed);
  if (routed.domain === "capture") {
    startCapture(message);
    return { deferredDelivery: true };
  }
  if (routed.domain === "knowledge") return knowledgeFromFeishu(message, routed, candidates);
  if (routed.domain === "decision") {
    if (routed.status !== "routed") return { text: "Decision 命令不完整，未执行任何业务。请使用：选择 <decisionId>：<candidateId> 或 确认 <decisionId>" };
    if (routed.action === "select") return selectFromFeishu(message, routed);
    if (routed.action === "confirm") return memoryConfirmFromFeishu(message, routed.decisionId);
    return { text: "未知 Decision 命令，未执行任何业务。" };
  }
  if (routed.domain === "memory") {
    if (routed.status !== "routed") return memoryClarify(message, routed);
    if (routed.action === "propose") {
      startMemoryProposal(message, routed);
      return { deferredDelivery: true };
    }
    return memoryChangeRequest(message, routed);
  }
  if (routed.domain === "idea") {
    if (routed.decisionCandidates?.length) return routeDecisionReply(message, routed, ideaFactsBefore);
    if (routed.status !== "routed") return ideaClarify(message, routed, ideaFactsBefore);
    startIdea(message, routed);
    return { deferredDelivery: true };
  }
  if (routed.domain === "project") {
    if (routed.decisionCandidates?.length) return routeDecisionReply(message, routed, projectFactsBefore);
    if (routed.status !== "routed") return projectClarify(message, routed, projectFactsBefore);
    startProject(message, routed);
    return { deferredDelivery: true };
  }
  const event = {
    messageId: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    text: message.text,
    receivedAt: new Date().toISOString(),
    handledBy: "fixed-test-response; no model",
  };
  await fs.appendFile(path.join(inboxRoot, "events.jsonl"), `${JSON.stringify(event)}\n`, { mode: 0o600 });
  return { text: "Syno P0 独立测试客户端已收到；本次未调用模型。" };
};

// Text replies use the handover reply state machine: `sending` is persisted before transport, only a real
// delivered===true receipt maps to accepted, and a hold never lets the adapter fall back and send again.
const deliverHandoverReply = async ({ messageId, chatId, text }) => {
  const delivery = await adapter.send({ chatId, text, replyTo: messageId });
  if (delivery?.delivered !== true) return { accepted: false, reason: delivery?.reason || "not_delivered" };
  // Only a real provider receipt field is carried; adapter.send currently returns none, so this stays null.
  const providerMessageId = typeof delivery.providerMessageId === "string" ? delivery.providerMessageId : null;
  return { accepted: true, providerMessageId };
};

const dispatchMessage = async (message) => {
  const result = await handleMessage(message);
  if (result?.deferredDelivery === true) return result;
  // Preserve the adapter's original default text when a handler returns no text.
  const text = result?.text || "任务已记录，请在 Syno 查看状态。";
  const outcome = await butler.handover.sendOrdinaryReply({
    appId: config.appId,
    messageId: message.id,
    chatId: message.chatId,
    ownerId: message.senderId,
    text,
    deliver: deliverHandoverReply,
  });
  await appendCaptureEvent({
    messageId: message.id,
    status: outcome.status === "accepted" ? "handover-reply-accepted" : "handover-reply-hold",
    replyId: outcome.item?.id ?? null,
    providerMessageId: outcome.item?.providerMessageId ?? null,
    ...(outcome.status === "accepted" ? {} : { reason: outcome.reason ?? outcome.item?.holdReason ?? "hold" }),
    at: new Date().toISOString(),
  });
  // The handover already delivered or held the text, so the adapter must never send a second copy.
  return { deferredDelivery: true };
};

const adapter = new FeishuChannelAdapter({
  credentials,
  stateStore,
  processLock: new ProcessFileLock({ file: config.lockFile, failFast: true }),
  typingIndicator: false,
  onMessage: async (message) => {
    // 1. Never route an adapter pending message before recover/drain/unfreeze finished.
    await readyPromise;
    // A process that never owned the consumer lock must not touch shared handover state at all.
    if (!hostOwnsConsumer) throw new Error("本实例未持有消费锁：消息保留在 adapter pending，由唯一 Host 对账");
    const inbound = { ...message, worker: message.worker || "OpenCode" };
    // 2. The freeze gate decides immediate routing vs durable spool in one transaction.
    const intake = butler.handover.intake({
      appId: config.appId,
      messageId: inbound.id,
      chatId: inbound.chatId,
      ownerId: inbound.senderId,
      worker: inbound.worker,
      text: inbound.text,
    });
    if (intake.status === "immediate") {
      // Invariant: only an owner that finished takeover and is not stopping may route immediate work. A waiter
      // released by a failed/aborted startup must not route business or let the adapter silently complete it;
      // throwing keeps the message pending for reconciliation by the single Host.
      if (readyState !== "ready" || stopping || !hostOwnsConsumer) {
        throw new Error("Host 未完成接管或正在停止：消息保留在 adapter pending，等待唯一 Host 对账");
      }
      return dispatchMessage(inbound);
    }
    // 3. Spooled: no routing, no Task, no immediate reply; only sanitized evidence and unified status.
    await appendCaptureEvent({
      messageId: inbound.id, status: "handover-spooled-intake",
      duplicate: intake.duplicate === true, generation: intake.control?.generation ?? null,
      at: new Date().toISOString(),
    });
    await writeHostStatus({ running: true, phase: "spool-intake" }).catch(() => {});
    return { deferredDelivery: true };
  },
});

const p5Scheduler = createP5Scheduler({
  runner: { ...p5Runner, collect: p5DailyCollect, dailyDoc: p5DailyDoc },
  send: (payload) => adapter.send(payload),
  readChat,
  stateFile: path.join(config.runtimeRoot, "p5-scheduler.json"),
  logger: (event, detail) => console.log(JSON.stringify({ event, ...detail })),
});

// Read-only unified Host status: butler.status() plus non-body metadata. It never advances Specialist/Decision/
// delivery state and never writes spool/reply text, memory values or Worker prompts.
const writeHostStatus = async (extra = {}) => {
  const status = butler.status();
  // A process without the consumer lock never rewrites shared Host status, even if a status writer runs late.
  if (!hostOwnsConsumer) return status;
  const adapterStatus = adapter.status();
  await writeJson(hostStatusFile, {
    ...status,
    host: {
      instanceId: butler.handover.instanceId,
      pid: process.pid,
      appId: config.appId,
      observedAt: new Date().toISOString(),
      adapter: { running: adapterStatus.running, available: adapterStatus.available },
      ...extra,
    },
  });
  return status;
};

let stopping = false;
// Consumer-lock ownership of this instance. Set only when adapter.start() reports running===true. A process
// without it may clean up only its own adapter/timers/db handle and must never freeze, recover, drain, unfreeze
// or rewrite shared status files.
let hostOwnsConsumer = false;
const stop = async () => {
  if (stopping) return;
  // Freeze first: anything arriving between here and teardown can only be spooled, not lost to a stopping check.
  // A failed second instance that never acquired the lock must leave the active Host's state untouched.
  try {
    if (hostOwnsConsumer) butler.handover.freeze({ reason: "host-stop" });
  } catch (error) {
    adapter.lastError = String(error.message || error);
    await appendCaptureEvent({
      status: "host-stop-freeze-failed", error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
    }).catch(() => {});
  }
  stopping = true;
  // Release the ready gate (never rejects) so an onMessage awaiting startup cannot deadlock adapter.stop().
  // Aborted only matters when the gate was still pending; an aborted waiter never routes immediate work.
  settleReadyGate("aborted");
  for (const timer of deliveryTimers) clearTimeout(timer);
  deliveryTimers.clear();
  p5Scheduler.stop();
  if (hostOwnsConsumer) await writeHostStatus({ running: true, phase: "host-stop-frozen" }).catch(() => {});
  try {
    await Promise.all([...backgroundCaptures]);
    await Promise.all([...backgroundIdeas]);
    if (ideaDrainPromise) await ideaDrainPromise;
    await Promise.all([...backgroundIdeas]);
    await Promise.all([...backgroundProjects]);
    if (projectDrainPromise) await projectDrainPromise;
    await Promise.all([...backgroundProjects]);
    await Promise.all([...backgroundMemories]);
    if (memoryDrainPromise) await memoryDrainPromise;
    await Promise.all([...backgroundMemories]);
    const status = await adapter.stop();
    if (hostOwnsConsumer) {
      await writeJson(statusFile, { ...status, appId: config.appId, stoppedAt: new Date().toISOString() });
      await writeHostStatus({ running: false, phase: "stopped", stoppedAt: new Date().toISOString() }).catch(() => {});
    }
  } finally {
    butler.close();
  }
};
process.on("SIGTERM", () => { stop().then(() => process.exit(0)).catch(() => process.exit(1)); });
process.on("SIGINT", () => { stop().then(() => process.exit(0)).catch(() => process.exit(1)); });
// In-process cutover control signals. SIGUSR1 freezes and refreshes status; SIGUSR2 only refreshes status.
// Both are ownership-gated: a non-owner must not touch shared handover control or status files.
process.on("SIGUSR1", () => {
  if (!hostOwnsConsumer) return;
  void (async () => {
    try {
      butler.handover.freeze({ reason: "host-signal-usr1" });
      await writeHostStatus({ running: true, phase: "sigusr1-freeze" });
    } catch (error) {
      adapter.lastError = String(error.message || error);
      await appendCaptureEvent({
        status: "host-sigusr1-failed", error: String(error.message || error).slice(0, 300), at: new Date().toISOString(),
      }).catch(() => {});
    }
  })();
});
process.on("SIGUSR2", () => {
  if (!hostOwnsConsumer) return;
  void writeHostStatus({ running: true, phase: "sigusr2-refresh" }).catch((error) => {
    adapter.lastError = String(error.message || error);
  });
});

try {
  const started = await adapter.start();
  // Ownership is decided by the adapter's own consumer lock result, not by a wish to take over.
  hostOwnsConsumer = started.running === true;
  assert.equal(hostOwnsConsumer, true, `测试客户端未运行：${started.lastError || "unknown"}`);
  // From here on this process holds the adapter's exclusive consumer lock and may freeze/recover shared state.
  await writeJson(statusFile, { ...started, appId: config.appId, startedAt: new Date().toISOString() });
  // Takeover order: running lock -> recover interrupted (hold, never replay) -> drain all frozen -> unfreeze -> gate.
  const recovered = butler.handover.recoverInterrupted();
  await appendCaptureEvent({
    status: "handover-recover-interrupted",
    spoolRecovered: recovered.spool, replyRecovered: recovered.reply,
    at: new Date().toISOString(),
  });
  // drainFrozen is bounded per batch, so keep draining until no `frozen` row is pending. `hold`/`forwarded`/
  // `dispatching` are not pending and are never replayed to make the count drop.
  const drained = [];
  let drainedBatches = 0;
  let pendingAfterDrain = null;
  for (;;) {
    const batch = await butler.handover.drainFrozen({
      forward: async (item) => {
        const result = await dispatchMessage({
          id: item.messageId, chatId: item.chatId, senderId: item.ownerId, text: item.text, worker: item.worker,
        });
        // Only an explicit deferred result proves the original Specialist path took over.
        if (result?.deferredDelivery !== true) return { accepted: false, reason: "dispatch_not_deferred" };
        return { accepted: true, receipt: `handover-forward:${item.messageId}` };
      },
    });
    drainedBatches += 1;
    drained.push(...batch);
    pendingAfterDrain = butler.handover.status().pendingCount;
    if (pendingAfterDrain === 0) break;
    // No claimable progress while rows stay pending means a genuinely stuck spool: keep frozen and fail loudly
    // instead of unfreezing with leftovers or spinning forever.
    if (batch.length === 0) throw new Error(`冻结 spool 仍有 ${pendingAfterDrain} 条 pending 但无法继续 drain，拒绝 unfreeze`);
  }
  await appendCaptureEvent({
    status: "handover-drain-frozen",
    batches: drainedBatches,
    pendingAfterDrain,
    outcomes: drained.map((outcome) => ({ status: outcome.status, id: outcome.item?.id ?? null, reason: outcome.reason ?? null })),
    at: new Date().toISOString(),
  });
  await writeHostStatus({ running: true, phase: "spool-drain" });
  if (butler.handover.status().pendingCount !== 0) throw new Error("冻结 spool 未清空，拒绝 unfreeze");
  butler.handover.unfreeze({ reason: "host-start-complete" });
  await writeHostStatus({ running: true, phase: "startup-takeover" });
  settleReadyGate("ready");
  await recoverRadarFollows();
  if (config.mode === "production") void p5Scheduler.start();
  await requestCaptureDrain();
  await requestIdeaDrain();
  await requestProjectDrain();
  await requestMemoryDrain();
  console.log(JSON.stringify({ running: true, appId: config.appId, statusFile, hostStatusFile, runtime: "native-autoloop-p3-unified-root-router" }));
  if (replayMessageId) {
    const marker = await readJson(path.join(inboxRoot, `capture-${replayMessageId}-attempt.json`));
    const testChat = await readChat();
    assert.ok(marker && testChat, "恢复重放缺少原执行标记或 Chat 绑定");
    assert.equal(marker.messageId, replayMessageId, "恢复重放消息不匹配");
    await appendCaptureEvent({ messageId: replayMessageId, status: "real-client-recovery-replay", at: new Date().toISOString() });
    await captureFromFeishu({ id: replayMessageId, chatId: testChat.chatId, senderId: testChat.senderId });
    await requestCaptureDrain();
  }
  if (replayIdeaMessageId) {
    const marker = await readJson(path.join(inboxRoot, `idea-${replayIdeaMessageId}-attempt.json`));
    const testChat = await readChat();
    assert.ok(marker && testChat, "想法恢复重放缺少原执行标记或 Chat 绑定");
    assert.equal(marker.messageId, replayIdeaMessageId, "想法恢复重放消息不匹配");
    await appendCaptureEvent({
      messageId: replayIdeaMessageId, status: "real-client-idea-recovery-replay",
      ideaId: marker.ideaId, action: marker.action, taskId: marker.taskId, at: new Date().toISOString(),
    });
    const result = await ideaFromFeishu(
      { id: replayIdeaMessageId, chatId: testChat.chatId, senderId: testChat.senderId, worker: marker.worker },
      { action: marker.action, ideaId: marker.ideaId, ideaIds: marker.ideaIds, prompt: marker.prompt },
    );
    await appendCaptureEvent({
      messageId: replayIdeaMessageId, status: "real-client-idea-recovery-replay-result",
      queued: result?.queued === true, deferredDelivery: result?.deferredDelivery === true,
      ...(result?.text ? { text: String(result.text).slice(0, 300) } : {}),
      at: new Date().toISOString(),
    });
    // Same contract as startIdea: a settled non-queued replay must hand the queue to the next message.
    if (result?.queued !== true) await requestIdeaDrain();
  }
  await new Promise(() => {});
} catch (error) {
  // stop() freezes before releasing the ready gate, so even a failed start spools rather than routes.
  await stop().catch(() => {});
  throw error;
}
