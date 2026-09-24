import path from "node:path";

import { AgentHost } from "../../../../packages/syno-core/agent-host.mjs";
import { ClaimEvidenceService } from "../../../../packages/syno-core/claim-evidence-service.mjs";
import { executeDomainOperation } from "../../../../packages/syno-core/domain-operations.mjs";
import { GitGuard } from "../../../../packages/syno-core/git-guard.mjs";
import { GoalService } from "../../../../packages/syno-core/goal-service.mjs";
import { IngestService } from "../../../../packages/syno-core/ingest-service.mjs";
import { JobStore } from "../../../../packages/syno-core/job-store.mjs";
import { remoteSafeJobSummary } from "../../../../packages/syno-core/job-summary.mjs";
import { KnowledgeMaintenanceSource } from "../../../../packages/syno-core/knowledge-maintenance-source.mjs";
import { KnowledgeStore } from "../../../../packages/syno-core/knowledge-store.mjs";
import { OperationExecutor } from "../../../../packages/syno-core/operation-executor.mjs";
import { buildOperationRequest } from "../../../../packages/syno-core/operation-registry.mjs";
import { OutputService } from "../../../../packages/syno-core/output-service.mjs";
import { PATHS } from "../../../../packages/syno-core/paths.mjs";
import { PlannerService } from "../../../../packages/syno-core/planner-service.mjs";
import { ReportService } from "../../../../packages/syno-core/reports.mjs";
import { SettingsRegistry } from "../../../../packages/syno-core/settings-registry.mjs";
import { SignalSourceRegistry } from "../../../../packages/syno-core/signal-source-registry.mjs";
import { SynoCore } from "../../../../packages/syno-core/syno-core.mjs";
import { TodayService } from "../../../../packages/syno-core/today-service.mjs";

const JOBS_LIST_TOOL_NAME = "syno_core_jobs_list";
const JOBS_SUBMIT_TOOL_NAME = "syno_core_jobs_submit";
const TODAY_READ_TOOL_NAME = "syno_core_today_read";
const DEFAULT_OWNER_KEY = "local-user";
const MAX_JOBS = 100;
const MAX_CAPACITY = 20;

function unsupportedOperation(operation) {
  const error = new Error(`in-process 暂不支持的操作：${operation}`);
  error.code = "UNKNOWN_CORE_OPERATION";
  return error;
}

function createOpsRuntime(overrides = {}) {
  const knowledge = overrides.knowledge || new KnowledgeStore({});
  const claims = overrides.claims || new ClaimEvidenceService();
  const maintenance = overrides.maintenance || new KnowledgeMaintenanceSource();
  const outputs = overrides.outputs || new OutputService();
  const ingest = overrides.ingest || new IngestService({ knowledge });
  const goals = overrides.goals || new GoalService();
  const planner = overrides.planner || new PlannerService({ knowledge, goals, claims, ingest, maintenance, outputs });
  const signalSources = overrides.signalSources || new SignalSourceRegistry({ claims, ingest, outputs, maintenance });
  const settingsRegistry = overrides.settingsRegistry || new SettingsRegistry();
  const jobStore = overrides.jobStore || new JobStore();
  const gitGuard = overrides.gitGuard || new GitGuard({ productBranch: "main" });

  let reports = null;
  const executor = new OperationExecutor({
    fallback: {
      submit: async () => { throw unsupportedOperation("fallback"); },
      inspect: () => null,
      cancel: () => false,
    },
    execute: async (operation, payload, { workspace } = {}) => {
      const root = workspace || PATHS.knowledgeRoot;
      if (operation === "actions.create" || operation === "memory.proposals.create") {
        return executeDomainOperation(operation, payload, { workspace: root });
      }
      if (operation === "outputs.opportunity.create") {
        return outputs.createOpportunity(payload, { opsRoot: path.join(root, "ops") });
      }
      if (operation === "reports.create") {
        return reports.create(payload.kind || "manual", { commit: false, deliver: false, opsRoot: path.join(root, "ops") });
      }
      throw unsupportedOperation(operation);
    },
  });
  const host = overrides.host || new AgentHost({
    store: jobStore,
    executor,
    gitGuard,
    ...(overrides.validator ? { validator: overrides.validator } : {}),
    onCommitted: async () => ({}),
  });
  reports = overrides.reports || new ReportService({ host, knowledge });
  const today = overrides.today || new TodayService({ goals, host, settingsRegistry, signalSources, planner });
  const core = overrides.core || new SynoCore({ host, knowledge, today });
  return { core, host, knowledge, today };
}

function createOpsTools({ host, today } = {}) {
  if (!host || !today) throw new Error("ops tools 需要 AgentHost 与 TodayService");
  const submitRequests = {
    action: (text) => buildOperationRequest("actions.create", { title: text }),
    memory: (text, reason) => buildOperationRequest("memory.proposals.create", { statement: text, reason }),
    report: (text) => buildOperationRequest("reports.create", { kind: text }),
    output: (text, reason) => buildOperationRequest("outputs.opportunity.create", {
      title: text,
      reason: reason || "基于当前目标和知识缺口",
      format: "deep-article",
      priority: 70,
    }),
  };
  return {
    async jobsList({ limit } = {}) {
      const bounded = Math.min(MAX_JOBS, Math.max(1, Number(limit) || 20));
      const jobs = await host.list({ limit: bounded, ownerKey: DEFAULT_OWNER_KEY });
      return JSON.stringify(jobs.map(remoteSafeJobSummary));
    },
    async jobsSubmit({ mode, text, reason } = {}) {
      const build = submitRequests[String(mode || "")];
      if (!build) {
        throw Object.assign(new Error(`jobs.submit 不支持的 mode：${mode}`), { code: "TOOL_INPUT_INVALID" });
      }
      if (!text) {
        throw Object.assign(new Error("jobs.submit 需要 text"), { code: "TOOL_INPUT_INVALID" });
      }
      const result = await host.receive(build(text, reason), {
        channel: "web",
        senderId: DEFAULT_OWNER_KEY,
        ownerKey: DEFAULT_OWNER_KEY,
        threadKey: "main",
      });
      return JSON.stringify({
        id: result.job.id,
        status: result.job.status,
        requiresApproval: result.requiresApproval === true,
        ...(result.job.approval ? { approval: result.job.approval } : {}),
      });
    },
    async todayRead({ capacity } = {}) {
      const bounded = capacity ? Math.min(MAX_CAPACITY, Math.max(1, Number(capacity))) : undefined;
      const snapshot = await today.snapshot(bounded ? { capacity: bounded } : {});
      return JSON.stringify(snapshot);
    },
  };
}

let defaultTools = null;

function defaultOpsTools() {
  if (!defaultTools) defaultTools = createOpsTools(createOpsRuntime());
  return defaultTools;
}

export {
  JOBS_LIST_TOOL_NAME,
  JOBS_SUBMIT_TOOL_NAME,
  TODAY_READ_TOOL_NAME,
  createOpsRuntime,
  createOpsTools,
  defaultOpsTools,
};
