import { promises as fs } from "node:fs";
import path from "node:path";

import { AgentHost } from "./agent-host.mjs";
import { ChannelHub, WebChannelAdapter, WindowsNotificationAdapter } from "./channels.mjs";
import { ExecutorRouter } from "./executors.mjs";
import { GitGuard } from "./git-guard.mjs";
import { JobStore } from "./job-store.mjs";
import { IntakeService } from "./intake.mjs";
import { KnowledgeStore } from "./knowledge-store.mjs";
import { NotificationStore } from "./notification-store.mjs";
import { OperationExecutor } from "./operation-executor.mjs";
import { PATHS } from "./paths.mjs";
import { ReportService } from "./reports.mjs";
import { Scheduler } from "./scheduler.mjs";
import { SynoCore } from "./syno-core.mjs";
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
  const baseExecutor = options.executor || new ExecutorRouter();
  let reports;
  const executor = new OperationExecutor({
    fallback: baseExecutor,
    operations: ["reports.create"],
    execute: async (operation, payload, { workspace } = {}) => {
      if (operation !== "reports.create") {
        const error = new Error(`未知核心操作：${operation}`);
        error.code = "UNKNOWN_CORE_OPERATION";
        throw error;
      }
      const root = workspace || PATHS.repoRoot;
      return reports.create(payload.kind || "manual", {
        commit: false,
        deliver: false,
        opsRoot: path.join(root, "ops"),
        pathResolver: (file) => path.relative(root, file).replace(/\\/g, "/"),
      });
    },
  });
  const gitGuard = options.gitGuard || new GitGuard();
  const host = options.host || new AgentHost({
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
  const intake = options.intake || new IntakeService();
  let core;
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
        const request = /^https?:\/\/\S+$/i.test(trimmed)
          ? await intake.prepare({ kind: "url", value: trimmed })
          : {
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
  const channels = options.channels || new ChannelHub({ web, windows, weixin });
  reports = new ReportService({ host, knowledge, notifications, channels, gitGuard });
  core = new SynoCore({ host, knowledge, notifications, channels, reports });
  const scheduler = new Scheduler({
    onDue: (kind) => core.report(kind, { channel: "scheduler", senderId: "syno-worker", trustedAutomation: true }),
  });
  let channelRecoveryTimer = null;

  return {
    core,
    host,
    knowledge,
    intake,
    notifications,
    channels,
    scheduler,
    weixin,
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
    return runtime.core.execute({
      text: String(request.text || request.message || ""),
      attachments: request.attachments || [],
      ...(mappedIntent ? { intent: mappedIntent } : {}),
    }, webContext);
  }
  if (method === "POST" && url.pathname === "/api/syno/intake") {
    const request = await runtime.intake.prepare(await readBody(req));
    return runtime.core.execute(request, webContext);
  }
  if (method === "POST" && url.pathname === "/api/syno/index/rebuild") return runtime.core.rebuildIndex();
  if (method === "POST" && url.pathname === "/api/syno/reports/run") return runtime.core.report((await readBody(req)).kind || "manual", webContext);
  if (method === "POST" && url.pathname === "/api/syno/weixin/login/start") return runtime.weixin.beginLogin();
  if (method === "POST" && url.pathname === "/api/syno/weixin/login/poll") return runtime.weixin.pollLogin();
  if (method === "POST" && url.pathname === "/api/syno/weixin/connect") return runtime.weixin.start();
  if (method === "POST" && url.pathname === "/api/syno/weixin/disconnect") return runtime.weixin.stop();
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
  const error = new Error(`未知 Syno API：${method} ${url.pathname}`);
  error.statusCode = 404;
  throw error;
}

export { PUBLIC_COMMAND_INTENTS, createSynoRuntime, parseWeixinApproval, routeSynoApi };
