import { promises as fs } from "node:fs";
import path from "node:path";

import { AgentHost } from "./agent-host.mjs";
import { ChannelHub, WebChannelAdapter, WindowsNotificationAdapter } from "./channels.mjs";
import { ConversationStore } from "./conversation-store.mjs";
import { executeDomainOperation } from "./domain-operations.mjs";
import { FeishuChannelAdapter } from "./feishu-channel.mjs";
import { GitGuard } from "./git-guard.mjs";
import { GoalService } from "./goal-service.mjs";
import { IngestService } from "./ingest-service.mjs";
import { JobStore } from "./job-store.mjs";
import { IntakeService } from "./intake.mjs";
import { KnowledgeStore } from "./knowledge-store.mjs";
import { LearningService } from "./learning-service.mjs";
import { NotificationStore } from "./notification-store.mjs";
import { OperationExecutor } from "./operation-executor.mjs";
import { buildOperationRequest } from "./operation-registry.mjs";
import { PATHS } from "./paths.mjs";
import { OutputService } from "./output-service.mjs";
import { ProviderClient } from "./provider-client.mjs";
import { ProviderCredentialStore } from "./provider-credential-store.mjs";
import { ReportService } from "./reports.mjs";
import { Scheduler } from "./scheduler.mjs";
import { SettingsRegistry } from "./settings-registry.mjs";
import { SynoCore } from "./syno-core.mjs";
import { ToolLoopAgent } from "./tool-loop-agent.mjs";
import { ToolLoopExecutor } from "./tool-loop-executor.mjs";
import { ToolRegistry } from "./tool-registry.mjs";
import { TodayService } from "./today-service.mjs";
import { WeixinIlinkAdapter } from "./weixin-ilink.mjs";

function parseWeixinApproval(text) {
  const match = /^批准\s+(job-\d{8}-[a-f0-9]{8})\s+([a-f0-9]{6})$/iu.exec(String(text || "").trim());
  return match ? { jobId: match[1], code: match[2].toUpperCase() } : null;
}

const PUBLIC_COMMAND_INTENTS = Object.freeze({
  search: "search",
  create_content_idea: "create_content_idea",
  create_content_brief: "create_content_brief",
  create_action: "create_action",
  create_memory_proposal: "create_memory_proposal",
  complex_analysis: "complex_analysis",
});

function createSynoRuntime(options = {}) {
  const notifications = options.notifications || new NotificationStore();
  const web = new WebChannelAdapter({ notifications });
  const windows = options.windowsChannel || new WindowsNotificationAdapter();
  const jobStore = options.jobStore || new JobStore();
  const knowledge = options.knowledge || new KnowledgeStore();
  const credentials = options.credentials || new ProviderCredentialStore();
  const provider = options.provider || new ProviderClient({ credentials });
  const conversations = options.conversations || new ConversationStore();
  const settingsRegistry = options.settingsRegistry || new SettingsRegistry();
  const sourceIntake = options.intake || new IntakeService();
  const ingest = options.ingest || new IngestService({ intake: sourceIntake, knowledge });
  const learning = options.learning || new LearningService();
  const outputs = options.outputs || new OutputService();
  const goals = options.goals || new GoalService();
  let host;
  let core;
  const tools = options.tools || new ToolRegistry([
    {
      name: "knowledge.search", description: "搜索 Syno 知识库", risk: "read", permission: "syno-read", retry: "safe", version: "1",
      inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 1 }, limit: { type: "integer", minimum: 1, maximum: 20 } }, additionalProperties: false },
      execute: ({ query, limit }) => knowledge.search(query, { limit: limit || 8 }),
    },
    {
      name: "knowledge.read", description: "读取搜索结果中的完整知识笔记", risk: "read", permission: "syno-read", retry: "safe", version: "1",
      inputSchema: { type: "object", required: ["path"], properties: { path: { type: "string", minLength: 1 } }, additionalProperties: false },
      execute: ({ path: notePath }) => knowledge.read(notePath),
    },
    {
      name: "jobs.list", description: "查看任务和审批状态", risk: "read", permission: "syno-read", retry: "safe", version: "1",
      inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false },
      execute: ({ limit }) => host.list({ limit: limit || 20 }),
    },
    {
      name: "jobs.submit", description: "提交需经 Policy 和审批的行动、记忆候选或报告 Job", risk: "low", permission: "syno-ops", retry: "idempotent", version: "1", approvalBoundary: true,
      inputSchema: { type: "object", required: ["mode", "text"], properties: { mode: { enum: ["action", "memory", "report", "output"] }, text: { type: "string", minLength: 1 }, reason: { type: "string" } }, additionalProperties: false },
      execute: async ({ mode, text, reason }, context) => {
        const requests = {
          action: () => buildOperationRequest("actions.create", { title: text }),
          memory: () => buildOperationRequest("memory.proposals.create", { statement: text, reason }),
          report: () => buildOperationRequest("reports.create", { kind: text }),
          output: () => buildOperationRequest("outputs.opportunity.create", { title: text, reason: reason || "基于当前目标和知识缺口", format: "deep-article", priority: 70 }),
        };
        const result = await host.receive(requests[mode](), { channel: context.channel, senderId: context.ownerId, messageId: context.conversationId });
        return { id: result.job.id, status: result.job.status, requiresApproval: result.requiresApproval === true, approval: result.job.approval };
      },
    },
  ]);
  const agent = options.agent || new ToolLoopAgent({ provider, tools, conversations });
  const baseExecutor = options.executor || new ToolLoopExecutor({ agent });
  let reports;
  const executor = new OperationExecutor({
    fallback: baseExecutor,
    execute: async (operation, payload, { workspace } = {}) => {
      const root = workspace || PATHS.repoRoot;
      if (operation === "ingest.apply") return ingest.apply(payload.artifactId, { workspace: root });
      if (operation === "learning.evidence.record") return learning.record(payload, { opsRoot: path.join(root, "ops") });
      if (operation === "outputs.opportunity.create") return outputs.createOpportunity(payload, { opsRoot: path.join(root, "ops") });
      if (operation === "goals.create") return goals.create(payload, { opsRoot: path.join(root, "ops") });
      const domain = await executeDomainOperation(operation, payload, { workspace: root });
      if (domain) return domain;
      if (operation === "reports.create") {
        return reports.create(payload.kind || "manual", {
          commit: false,
          deliver: false,
          opsRoot: path.join(root, "ops"),
          pathResolver: (file) => path.relative(root, file).replace(/\\/g, "/"),
        });
      }
      if (options.operationHandler) return options.operationHandler(operation, payload, { workspace: root });
      const error = new Error(`未知核心操作：${operation}`);
      error.code = "UNKNOWN_CORE_OPERATION";
      throw error;
    },
  });
  const gitGuard = options.gitGuard || new GitGuard();
  host = options.host || new AgentHost({
    store: jobStore,
    executor,
    gitGuard,
    onCommitted: async ({ job, changedPaths, execution }) => {
      const effects = {};
      if (changedPaths.some((item) => item.startsWith("vault/"))) knowledge.invalidate();
      if (job.request?.operation === "reports.create") {
        const report = execution?.operationResult;
        if (report) {
          const deliveries = await reports.deliver(report);
          const records = Object.values(deliveries).map((item) => item?.recordPath).filter(Boolean);
          if (records.length) await gitGuard.commitPaths(records, `syno: deliver ${report.id}`);
          effects.reportDeliveries = deliveries;
        }
      }
      if (options.onCommitted) effects.external = await options.onCommitted({ job, changedPaths, execution });
      return effects;
    },
  });
  const weixin = options.weixin || new WeixinIlinkAdapter({
    onMessage: async (message) => {
      try {
        const approval = parseWeixinApproval(message.text);
        if (approval) {
          const result = await core.approve(approval.jobId, {
            channel: "weixin",
            senderId: message.senderId,
            code: approval.code,
          });
          return {
            text: result.requiresApproval
              ? `任务 ${result.job.id} 仍等待审批`
              : `任务 ${result.job.id} 已批准并进入 ${result.job.status}`,
          };
        }
        const trimmed = String(message.text || "").trim();
        if (/^https?:\/\/\S+$/i.test(trimmed)) {
          const receipt = await ingest.receive({ kind: "url", value: trimmed }, { channel: "weixin", ownerId: message.senderId });
          ingest.propose(receipt.artifact.id).catch(() => {});
          return { text: `已接收，Artifact ID：${receipt.artifact.id}。正在后台查重并生成收录方案。` };
        }
        const request = {
          text: trimmed || `收到 ${message.artifacts?.length || 0} 个隔离附件候选，请在 Web 中查看后决定是否收录。`,
          artifacts: message.artifacts || [],
        };
        const result = await core.execute(request, {
          channel: "weixin",
          senderId: message.senderId,
          messageId: message.id,
        });
        return { text: result.error?.message || (result.requiresApproval ? `任务 ${result.job.id} 等待审批，审批码 ${result.job.approvalCode}` : result.job?.result?.text || `任务 ${result.job?.id || ""} 已处理`) };
      } catch (error) {
        return { text: `未能处理：${error.message}` };
      }
    },
  });
  const feishu = options.feishu || new FeishuChannelAdapter({
    onMessage: async (message) => {
      const trimmed = String(message.text || "").trim();
      if (/^https?:\/\/\S+$/i.test(trimmed)) {
        const receipt = await ingest.receive({ kind: "url", value: trimmed }, { channel: "feishu", ownerId: message.senderId });
        ingest.propose(receipt.artifact.id).catch(() => {});
        return { text: `已接收 Artifact ${receipt.artifact.id}，正在生成收录方案。` };
      }
      const result = await core.execute({ text: trimmed }, { channel: "feishu", senderId: message.senderId, messageId: message.id });
      return { text: result.error?.message || result.job?.result?.text || `任务 ${result.job?.id || ""} 已记录` };
    },
  });
  const channels = options.channels || new ChannelHub({ web, windows, weixin, feishu });
  reports = new ReportService({ host, knowledge, notifications, channels, gitGuard });
  const today = options.today || new TodayService({ goals, learning, host });
  core = new SynoCore({ host, knowledge, notifications, channels, reports, today });
  const scheduler = new Scheduler({
    onDue: (kind) => core.report(kind, { channel: "scheduler", senderId: "syno-worker", trustedAutomation: true }),
  });
  let channelRecoveryTimer = null;

  return {
    core,
    host,
    knowledge,
    intake: sourceIntake,
    ingest,
    learning,
    outputs,
    goals,
    today,
    notifications,
    channels,
    scheduler,
    weixin,
    feishu,
    credentials,
    provider,
    conversations,
    tools,
    agent,
    settingsRegistry,
    developmentMode: options.developmentMode === true || process.env.SYNO_DEVELOPMENT_MODE === "true",
    async initialize({ worker = false } = {}) {
      await Promise.all([
        fs.mkdir(PATHS.opsRoot, { recursive: true }),
        fs.mkdir(PATHS.runtimeRoot, { recursive: true }),
        fs.mkdir(PATHS.stateRoot, { recursive: true }),
      ]);
      await host.recover();
      await channels.start();
      if (worker) {
        await scheduler.start();
        channelRecoveryTimer = setInterval(() => weixin.start().catch(() => {}), 60_000);
      }
      return core.snapshot();
    },
    async close() {
      scheduler.stop();
      if (channelRecoveryTimer) clearInterval(channelRecoveryTimer);
      channelRecoveryTimer = null;
      await channels.stop();
    },
  };
}

async function routeSynoApi(runtime, req, url, readBody) {
  const method = req.method || "GET";
  const webContext = { channel: "web", senderId: "local-user", developmentMode: runtime.developmentMode };
  if (!url.pathname.startsWith("/api/syno/")) return null;
  if (method === "GET" && url.pathname === "/api/syno/snapshot") return runtime.core.snapshot({ search: url.searchParams.get("q") || "" });
  if (method === "GET" && url.pathname === "/api/syno/search") return { results: await runtime.core.search(url.searchParams.get("q") || "", { limit: url.searchParams.get("limit") }) };
  if (method === "GET" && url.pathname === "/api/syno/note") return runtime.core.read(url.searchParams.get("path") || "");
  if (method === "GET" && url.pathname === "/api/syno/jobs") return { jobs: await runtime.host.list({ limit: 100 }) };
  if (method === "GET" && url.pathname === "/api/syno/notifications") return { notifications: await runtime.notifications.list({ limit: 100 }) };
  if (method === "GET" && url.pathname === "/api/syno/channels") return { channels: runtime.channels.status() };
  if (method === "GET" && url.pathname === "/api/syno/provider") return runtime.credentials.status();
  if (method === "POST" && url.pathname === "/api/syno/provider") return runtime.credentials.save(await readBody(req));
  if (method === "POST" && url.pathname === "/api/syno/jobs") {
    const request = await readBody(req);
    const reserved = ["intent", "kind", "operation", "profile", "decision", "approval", "risk", "complexity"]
      .filter((field) => Object.hasOwn(request, field));
    if (reserved.length) {
      const error = new Error(`公共 Job API 不接受 Policy 字段：${reserved.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    const mappedIntent = request.mode ? PUBLIC_COMMAND_INTENTS[request.mode] : "";
    if (request.mode && !mappedIntent) {
      const error = new Error("未知的公共任务模式");
      error.statusCode = 400;
      throw error;
    }
    if (mappedIntent === "create_action") return runtime.core.execute(buildOperationRequest("actions.create", { title: String(request.text || request.message || "") }), webContext);
    if (mappedIntent === "create_memory_proposal") return runtime.core.execute(buildOperationRequest("memory.proposals.create", { statement: String(request.text || request.message || ""), reason: "主人通过 Web 提交" }), webContext);
    return runtime.core.execute({
      text: String(request.text || request.message || ""),
      attachments: request.attachments || [],
      ...(mappedIntent ? { intent: mappedIntent } : {}),
    }, webContext);
  }
  if (method === "POST" && url.pathname === "/api/syno/intake") {
    const receipt = await runtime.ingest.receive(await readBody(req), { channel: "web", ownerId: "local-user" });
    runtime.ingest.propose(receipt.artifact.id).catch(() => {});
    return receipt;
  }
  const intakeStatus = /^\/api\/syno\/intake\/([^/]+)$/.exec(url.pathname);
  if (method === "GET" && intakeStatus) return runtime.ingest.status(decodeURIComponent(intakeStatus[1]));
  const intakeApply = /^\/api\/syno\/intake\/([^/]+)\/apply$/.exec(url.pathname);
  if (method === "POST" && intakeApply) return runtime.core.execute(buildOperationRequest("ingest.apply", { artifactId: decodeURIComponent(intakeApply[1]) }), webContext);
  if (method === "GET" && url.pathname === "/api/syno/learning/due") return { reviews: await runtime.learning.due() };
  if (method === "POST" && url.pathname === "/api/syno/learning/evidence") {
    const body = await readBody(req);
    return runtime.core.execute(buildOperationRequest("learning.evidence.record", { ...body, producer: "user" }), webContext);
  }
  if (method === "POST" && url.pathname === "/api/syno/learning/teach-back") return runtime.outputs.teachBackPrompt(await readBody(req));
  if (method === "POST" && url.pathname === "/api/syno/outputs/opportunities") return runtime.core.execute(buildOperationRequest("outputs.opportunity.create", await readBody(req)), webContext);
  if (method === "GET" && url.pathname === "/api/syno/goals") return { goals: await runtime.goals.list() };
  if (method === "POST" && url.pathname === "/api/syno/goals") return runtime.core.execute(buildOperationRequest("goals.create", await readBody(req)), webContext);
  if (method === "GET" && url.pathname === "/api/syno/today") return runtime.today.snapshot();
  if (method === "POST" && url.pathname === "/api/syno/index/rebuild") return runtime.core.rebuildIndex();
  if (method === "POST" && url.pathname === "/api/syno/reports/run") return runtime.core.report((await readBody(req)).kind || "manual", webContext);
  if (method === "POST" && url.pathname === "/api/syno/weixin/login/start") return runtime.weixin.beginLogin();
  if (method === "POST" && url.pathname === "/api/syno/weixin/login/poll") return runtime.weixin.pollLogin();
  if (method === "POST" && url.pathname === "/api/syno/weixin/connect") return runtime.weixin.start();
  if (method === "POST" && url.pathname === "/api/syno/weixin/disconnect") return runtime.weixin.stop();
  if (method === "POST" && url.pathname === "/api/syno/feishu/register/start") return runtime.feishu.beginRegistration();
  if (method === "GET" && url.pathname === "/api/syno/feishu/register/status") return runtime.feishu.registrationStatus();
  if (method === "POST" && url.pathname === "/api/syno/feishu/connect") return runtime.feishu.start();
  if (method === "POST" && url.pathname === "/api/syno/feishu/disconnect") return runtime.feishu.stop();
  if (method === "POST" && url.pathname === "/api/syno/channels/home") {
    const body = await readBody(req);
    return { channels: await runtime.channels.setHome(String(body.channel || "")) };
  }
  const match = /^\/api\/syno\/jobs\/([^/]+)\/(approve|reject|cancel)$/.exec(url.pathname);
  if (method === "POST" && match) {
    const body = await readBody(req);
    if (match[2] === "approve") return runtime.core.approve(decodeURIComponent(match[1]), { channel: "web", senderId: "local-user", code: body.code });
    if (match[2] === "reject") return runtime.core.reject(decodeURIComponent(match[1]), body.reason);
    return runtime.core.cancel(decodeURIComponent(match[1]));
  }
  const retryMatch = /^\/api\/syno\/jobs\/([^/]+)\/retry$/.exec(url.pathname);
  if (method === "POST" && retryMatch) return runtime.host.retry(decodeURIComponent(retryMatch[1]));
  const error = new Error(`未知 Syno API：${method} ${url.pathname}`);
  error.statusCode = 404;
  throw error;
}

export { PUBLIC_COMMAND_INTENTS, createSynoRuntime, parseWeixinApproval, routeSynoApi };
