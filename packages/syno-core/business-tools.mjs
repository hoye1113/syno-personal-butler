import { decisionVersion } from "./pending-decision.mjs";
import { buildOperationRequest } from "./operation-registry.mjs";
import { listDomainRecords, findDomainRecord, assertRecordVersion, recordVersion } from "./domain-records.mjs";
import { sliceKnowledgeText } from "./knowledge-read.mjs";
import { PATHS } from "./paths.mjs";
import { visionResultToIntakePayload } from "./vision-intake.mjs";

const string = (description, maxLength = 500) => ({ type: "string", minLength: 1, maxLength, description });
const version = string("查询工具返回的 version；内容改变后须重新查询", 64);
const id = string("查询工具返回的准确 ID", 120);
const limit = { type: "integer", minimum: 1, maximum: 50, description: "返回条数，默认 20" };
const dateTime = { type: "string", format: "date-time", description: "带时区的 ISO 时间" };
const schema = (properties = {}, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const BUSINESS_TOOL_SPECS = Object.freeze([
  { name: "work.overview", description: "按需查询主人的待办、待决策项与后台执行状态；不会生成计划或主动消息。", inputSchema: schema({ limit }) },
  { name: "attachments.read", description: "按当前会话附件 ID 分段读取临时文件正文，不收录、不读取任意本地路径。图片直接查看 image 输入。", inputSchema: schema({ attachmentId: string("系统提供的附件 ID", 120), offset: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER }, maxChars: { type: "integer", minimum: 200, maximum: 8000 } }, ["attachmentId"]) },
  { name: "capture.submit", description: "仅当主人要求保存资料到知识库时提交收录；单独的链接、附件、引用或否定语句不代表收录意图。返回 received 等状态不代表已经保存。", write: true, inputSchema: schema({ kind: { enum: ["url", "text", "personal", "attachment"], type: "string" }, value: string("网址或原始资料正文；附件时不传", 1000000), attachmentId: string("系统提供的当前会话临时附件 ID", 120), title: string("可选标题", 120) }, ["kind"]) },
  { name: "capture.list", description: "查询当前主人的未完成收录流程。", inputSchema: schema({ limit }) },
  { name: "capture.get", description: "根据明确 ID 查询收录流程及真实完成状态。", inputSchema: schema({ id }, ["id"]) },
  { name: "capture.resume", description: "恢复主人指定的可重试收录。先查询状态；不重新收录，不重做已完成操作。", write: true, inputSchema: schema({ id }, ["id"]) },
  { name: "actions.create", description: "记录主人需要完成的待办行动；系统后台收录流程不是主人待办。排期只记录时间，不承诺主动提醒。", write: true, inputSchema: schema({ title: string("待办内容"), scheduledStart: dateTime }, ["title"]) },
  { name: "actions.list", description: "查询主人的待办行动及版本；默认仅返回未完成项。", inputSchema: schema({ status: { type: "string", enum: ["active", "all", "completed", "archived"] }, limit }) },
  { name: "actions.update", description: "修改、完成或归档指定待办；必须使用查询结果的 ID 和 version。", write: true, inputSchema: schema({ id, version, title: string("新的待办内容"), status: { type: "string", enum: ["pending", "scheduled", "completed", "archived"] }, scheduledStart: { ...dateTime, type: ["string", "null"] } }, ["id", "version"]) },
  { name: "memory.propose", description: "主人明确表达长期偏好、个人背景或长期约定时提出记忆候选；不保存一般资料或临时任务。候选生成后需要主人另行确认，不能本轮自动批准。", write: true, inputSchema: schema({ statement: string("主人原意，不得推断或扩展", 500), reason: string("为何需要长期记住", 200) }, ["statement"]) },
  { name: "decisions.list", description: "查询当前会话待处理的收录方案和长期记忆候选；返回准确 ID、version、内容与可用选项。", inputSchema: schema({ limit }) },
  { name: "decisions.resolve", description: "根据主人本轮对具体方案的明确选择执行确认、拒绝、修改或选择收录方式。存在多个可能对象时先澄清；不要自行批准记忆。", write: true, inputSchema: schema({ id, version, action: { type: "string", enum: ["approve", "reject", "modify", "select"] }, modification: string("主人要求怎样修改", 1000), option: { type: "string", enum: ["create", "keep-separate", "append-source", "link-only"] } }, ["id", "version", "action"]) },
]);
const BUSINESS_TOOL_NAMES = Object.freeze(BUSINESS_TOOL_SPECS.map((spec) => spec.name));
function publicRecord({ record, version }) { return { ...record, version }; }
function workflowSummary(item) {
  if (!item) throw new Error("收录流程不存在");
  return { id: item.id, stage: item.stage, artifactId: item.artifactId, updatedAt: item.updatedAt, browserStatus: item.browserStatus, error: item.lastError?.message, jobId: item.jobId };
}
function trustedContext(context) {
  if (!context.ownerId || !context.originalMessageId || !context.harnessSessionId) throw Object.assign(new Error("业务工具必须绑定主人的真实聊天回合"), { code: "BUSINESS_CONTEXT_REQUIRED" });
  return { ownerKey: context.ownerId, threadKey: context.threadKey, channel: context.channel, senderId: context.senderId || context.ownerId, messageId: context.messageId, conversationId: context.conversationId };
}
function createBusinessTools(getServices, { opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
  async function pending(s, ctx) {
    const decisions = (await s.pendingDecisions.list({ ownerKey: ctx.ownerKey, threadKey: ctx.threadKey })).filter((d) => Date.parse(d.expiresAt) > clock().getTime());
    const memories = (await listDomainRecords(opsRoot, "memory", ctx.ownerKey)).filter(({ record }) => record.status === "proposed");
    return [
      ...decisions.map((d) => ({ id: d.id, version: decisionVersion(d), kind: "capture", summary: d.summary, options: d.options, expiresAt: d.expiresAt })),
      ...memories.map(({ record, version }) => ({ id: record.id, version, kind: "memory", summary: record.statement, reason: record.reason, options: ["approve", "reject"] })),
    ];
  }
  async function operate(s, operation, payload, ctx, originalMessageId) {
    const result = await s.core.execute(buildOperationRequest(operation, payload, { sourceMessageId: originalMessageId }), ctx);
    const job = result.job;
    if (!job || ["failed", "rejected", "canceled"].includes(job.status)) throw new Error(job?.error?.message || "业务操作未完成");
    const record = job.result?.operationResult?.record;
    return { id: job.id, status: job.status, ...(record ? { record, version: recordVersion(record) } : {}), requiresApproval: result.requiresApproval === true };
  }
  async function execute(name, input, context) {
    const ctx = trustedContext(context);
    const s = getServices();
    const count = input.limit || 20;
    if (name === "work.overview") {
      const [actions, decisions, jobs, captures] = await Promise.all([
        listDomainRecords(opsRoot, "actions", ctx.ownerKey), pending(s, ctx), s.core.host.list({ ownerKey: ctx.ownerKey, limit: 100 }), s.ingestWorkflows.listPending(ctx.ownerKey),
      ]);
      return { generatedAt: clock().toISOString(), localDate: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(clock()), actions: actions.filter(({ record }) => ["pending", "scheduled"].includes(record.status)).slice(0, count).map(publicRecord), decisions: decisions.slice(0, count), captures: captures.slice(0, count).map(workflowSummary), jobs: jobs.filter((j) => !["completed", "rejected", "canceled"].includes(j.status)).slice(0, count).map((j) => ({ id: j.id, status: j.status, operation: j.request?.operation, error: j.error?.message })) };
    }
    if (name === "actions.list") return { actions: (await listDomainRecords(opsRoot, "actions", ctx.ownerKey)).filter(({ record }) => input.status === "all" || (!input.status || input.status === "active" ? ["pending", "scheduled"].includes(record.status) : record.status === input.status)).slice(0, count).map(publicRecord) };
    if (name === "actions.create" || name === "actions.update") {
      if (name === "actions.update") assertRecordVersion(await findDomainRecord(opsRoot, "actions", input.id, ctx.ownerKey), input.version);
      return operate(s, name, input, ctx, context.originalMessageId);
    }
    if (name === "memory.propose") return operate(s, "memory.proposals.create", input, ctx, context.originalMessageId);
    if (name === "capture.list") return { workflows: (await s.ingestWorkflows.listPending(ctx.ownerKey)).slice(0, count).map(workflowSummary) };
    if (name === "capture.get") {
      const workflow = await s.ingestWorkflows.status(input.id, ctx);
      const summary = workflowSummary(workflow);
      const job = workflow.jobId ? await s.core.inspect(workflow.jobId, { ownerKey: ctx.ownerKey }) : null;
      const result = job?.result?.operationResult;
      return { ...summary, jobStatus: job?.status, ...(result ? { result: { path: result.path, completionStatus: result.completionStatus, source: result.source, unverifiedIssues: result.unverifiedIssues } } : {}) };
    }
    if (name === "capture.resume") {
      const current = await s.ingestWorkflows.status(input.id, ctx);
      if (!current) throw new Error("收录流程不存在");
      if (current.browserStatus === "interaction_required") return workflowSummary(await s.ingestWorkflows.resumeBrowser(input.id, ctx));
      if (!["received", "failed_retryable"].includes(current.stage)) throw new Error("该收录当前不可恢复");
      // Do not await analysis while the chat loop holds its session/bridge lease.
      s.ingestWorkflows.schedule(() => s.ingestWorkflows.retry(input.id));
      return { id: current.id, status: "queued" };
    }
    if (name === "attachments.read") {
      const attachment = context.attachments?.find((item) => item.id === input.attachmentId);
      if (!attachment || typeof attachment.content !== "string") throw new Error("附件没有可读取的临时正文，请重新发送文件；图片应直接查看 image 输入");
      return { id: attachment.id, name: attachment.name, ...sliceKnowledgeText(attachment.content, input.offset || 0, input.maxChars || 6000) };
    }
    if (name === "capture.submit") {
      let payload;
      if (input.kind === "attachment") {
        const attachment = context.attachments?.find((a) => a.id === input.attachmentId);
        if (!attachment) throw new Error("附件引用不属于当前会话或已过期，请重新发送附件");
        if (attachment.image) {
          const registered = s.imageStore.register(attachment.image);
          const vision = await s.imageTranscriber.read({ artifactId: registered.artifactId, question: "提取图中可见文字并概述画面，作为知识收录素材。" });
          payload = visionResultToIntakePayload(vision, { name: attachment.name });
        } else payload = attachment.payload;
      } else {
        if (!input.value?.trim()) throw new Error("缺少收录正文或网址");
        payload = { kind: input.kind, value: input.value, ...(input.title ? { title: input.title } : {}) };
      }
      const receipt = await s.ingestWorkflows.receive(payload, { ...ctx, replyTarget: context.replyTarget });
      return { ...workflowSummary(receipt.workflow), duplicate: receipt.duplicate === true };
    }
    if (name === "decisions.list") return { decisions: (await pending(s, ctx)).slice(0, count) };
    if (name === "decisions.resolve") {
      const choice = (await pending(s, ctx)).find((d) => d.id === input.id);
      if (!choice || choice.version !== input.version) throw new Error("待决策事项已过期、已处理或方案已变化，请重新查询");
      if (choice.kind === "memory") {
        if (!["approve", "reject"].includes(input.action)) throw new Error("记忆候选只支持确认或拒绝；修改时拒绝原候选后重新提出");
        const found = await findDomainRecord(opsRoot, "memory", input.id, ctx.ownerKey);
        if (input.action === "approve" && found.record.sourceMessageId === context.originalMessageId) throw new Error("记忆候选生成后须等待主人另行确认");
        return operate(s, input.action === "approve" ? "memory.promote" : "memory.reject", { id: input.id, version: input.version, confirmationMessageId: context.originalMessageId }, ctx, context.originalMessageId);
      }
      const decision = await s.pendingDecisions.reserve(input.id, { ...ctx, version: input.version });
      try {
        const job = await s.core.inspect(decision.jobId, { ownerKey: ctx.ownerKey });
        if (decision.diffDigest && job?.result?.diffHash !== decision.diffDigest) throw new Error("方案差异已变化，请重新查询");
        if (input.action === "select" && !decision.options.includes(input.option)) throw new Error("当前方案不支持该选项");
        if (input.action === "modify" && !input.modification) throw new Error("缺少修改要求");
        const workflow = decision.artifactId && await s.ingestWorkflows.status(decision.artifactId, ctx);
        let result;
        if (workflow) result = await s.ingestWorkflows.decide(workflow.id, { action: input.action, modification: input.modification, option: input.option, code: decision.approvalCode, diffDigest: decision.diffDigest }, ctx);
        else if (input.action === "approve") result = await s.core.approve(decision.jobId, { ...ctx, code: decision.approvalCode, diffDigest: decision.diffDigest });
        else if (input.action === "reject") result = await s.core.reject(decision.jobId, "主人拒绝当前方案", ctx);
        else if (input.action === "modify") result = await s.core.requestModification(decision.jobId, input.modification, ctx);
        else throw new Error("该选项只适用于收录方案");
        await s.pendingDecisions.update(input.id, { reservedAt: null, consumedAt: clock().toISOString() });
        return { id: input.id, action: input.action, status: result?.result?.job?.status || result?.job?.status || result?.workflow?.stage || "processed" };
      } catch (error) {
        await s.pendingDecisions.update(input.id, { reservedAt: null });
        throw error;
      }
    }
    throw new Error("未知业务工具");
  }
  return BUSINESS_TOOL_SPECS.map(({ write, ...spec }) => ({ ...spec, risk: write ? "low" : "read", permission: write ? "syno-ops" : "syno-read", approvalBoundary: write === true, retry: write ? "idempotent" : "safe", version: "1", outputSchema: { type: "object" }, execute: (input, context) => execute(spec.name, input, context) }));
}
export { BUSINESS_TOOL_SPECS, BUSINESS_TOOL_NAMES, createBusinessTools };
