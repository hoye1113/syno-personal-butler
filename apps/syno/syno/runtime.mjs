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

function createSynoRuntime(options = {}) {
  const notifications = options.notifications || new NotificationStore();
  const web = new WebChannelAdapter({ notifications });
  const windows = options.windowsChannel || new WindowsNotificationAdapter();
  const jobStore = options.jobStore || new JobStore();
  const baseExecutor = options.executor || new ExecutorRouter();
  let reports;
  const executor = new OperationExecutor({
    fallback: baseExecutor,
    operations: ["reports.create"],
    execute: async (operation, payload) => {
      if (operation !== "reports.create") {
        const error = new Error(`未知核心操作：${operation}`);
        error.code = "UNKNOWN_CORE_OPERATION";
        throw error;
      }
      return reports.create(payload.kind || "manual", { commit: false });
    },
  });
  const gitGuard = options.gitGuard || new GitGuard();
  const host = options.host || new AgentHost({ store: jobStore, executor, gitGuard });
  const knowledge = options.knowledge || new KnowledgeStore();
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
        const result = await core.execute({ text: message.text }, { channel: "weixin", senderId: message.senderId });
        return { text: result.error?.message || (result.requiresApproval ? `任务 ${result.job.id} 等待审批，审批码 ${result.job.approvalCode}` : result.job?.result?.text || `任务 ${result.job?.id || ""} 已处理`) };
      } catch (error) {
        return { text: `未能处理：${error.message}` };
      }
    },
  });
  const channels = options.channels || new ChannelHub({ web, windows, weixin });
  reports = new ReportService({ host, knowledge, notifications, channels, gitGuard });
  core = new SynoCore({ host, knowledge, notifications, channels, reports });
  const scheduler = new Scheduler({ onDue: (kind) => reports.create(kind) });

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
      await channels.start();
      if (worker) await scheduler.start();
      return core.snapshot();
    },
    async close() { scheduler.stop(); await channels.stop(); },
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
  if (method === "POST" && url.pathname === "/api/syno/jobs") return runtime.core.execute(await readBody(req), webContext);
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

export { createSynoRuntime, parseWeixinApproval, routeSynoApi };
