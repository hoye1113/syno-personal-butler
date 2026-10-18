import { MemoryStore } from "./memory-store.mjs";
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
const memoryFields = { statement: string("主人原意，不得推断", 500), reason: string("长期保存的依据", 200), kind: { type: "string", enum: ["preference", "background", "standing_instruction"] }, scope: string("global 或主人明确表达的主题", 120), triggers: { type: "array", maxItems: 20, items: string("原意有依据的触发词", 80) } };
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
  { name: "memory.propose", description: "主人明确表达长期偏好、个人背景或长期约定时提出记忆候选；不保存一般资料或临时任务。候选生成后需要主人另行确认，不能本轮自动批准。", write: true, inputSchema: schema(memoryFields, ["statement"]) },
  { name: "knowledge.sync_status", description: "查询既有知识发布的本地、Wiki、目录和图片真实状态。", inputSchema: schema({ id }, ["id"]) },
  { name: "knowledge.sync_retry", description: "恢复已登记发布请求，仅补失败端；人工冲突先展示差异和覆盖预览，后续确认才恢复。不重新抓取或收录。", write: true, inputSchema: schema({ id }, ["id"]) },
  { name: "knowledge.update", description: "按明确要求修改单条知识正文，保留身份与来源；不能用来删除或隐式合并多条笔记。", write: true, inputSchema: schema({ id, version, body: string("完整的新正文（不含 frontmatter）", 1000000) }, ["id", "version", "body"]) },
  { name: "knowledge.move", description: "移动明确笔记到指定 PARA 分类，稳定 ID 不变。", write: true, inputSchema: schema({ id, version, destination: { type: "string", enum: ["inbox", "areas", "resources", "archive"] } }, ["id", "version", "destination"]) },
  { name: "knowledge.delete", description: "仅生成删除预览；主人另条消息明确确认后才能执行。", write: true, inputSchema: schema({ id, version }, ["id", "version"]) },
  { name: "knowledge.merge", description: "仅生成合并预览；指定保留目标，主人另条消息确认后保留所有来源原文并合并。", write: true, inputSchema: schema({ targetId: id, targetVersion: version, sources: { type: "array", minItems: 1, maxItems: 19, items: schema({ id, version }, ["id", "version"]) } }, ["targetId", "targetVersion", "sources"]) },
  { name: "knowledge.maintenance", description: "只读检查知识维护问题与证据，不自动清理。", inputSchema: schema() },
  { name: "memory.search", description: "按当前问题查询主人已确认的独立记忆，返回来源、版本与命中原因。", inputSchema: schema({ query: string("当前问题", 4000), limit }, ["query"]) },
  { name: "memory.get", description: "查看一条个人记忆的状态与当前有效内容；失效记录不返回事实正文。", inputSchema: schema({ id }, ["id"]) },
  { name: "memory.correct", description: "根据明确纠正要求创建替换候选；另条消息确认前旧事实仍有效。", write: true, inputSchema: schema({ id, version, ...memoryFields }, ["id", "version", "statement"]) },
  { name: "memory.forget", description: "主人明确要求忘记指定记忆时撤销并清理当前正文；不会擦除历史 Git 或聊天。", write: true, inputSchema: schema({ id, version }, ["id", "version"]) },
  { name: "decisions.list", description: "查询当前会话待处理的收录方案和长期记忆候选；返回准确 ID、version、内容与可用选项。", inputSchema: schema({ limit }) },
  { name: "decisions.resolve", description: "根据主人本轮对具体方案的明确选择执行确认、拒绝、修改或选择收录方式。存在多个可能对象时先澄清；不要自行批准记忆。", write: true, inputSchema: schema({ id, version, action: { type: "string", enum: ["approve", "reject", "modify", "select"] }, modification: string("主人要求怎样修改", 1000), option: { type: "string", enum: ["create", "keep-separate", "append-source", "link-only"] } }, ["id", "version", "action"]) },
]);
const BUSINESS_TOOL_NAMES = Object.freeze(BUSINESS_TOOL_SPECS.map((spec) => spec.name));
function publicRecord({ record, version }) { return { ...record, version }; }
function workflowSummary(item) {
  if (!item) throw new Error("收录流程不存在");
  const stage = String(item.stage || "");
  // 对主人的状态说明用确定性文案：重试中不是失败，模型不得把内部 stage 当结论。
  const userMessage = stage === "failed_retryable"
    ? "后台正在重试这一条，不需要重新提交；完成后会给出最终结果。"
    : stage === "failed_terminal"
      ? "收录失败；可以换来源或稍后重新提交。"
      : stage === "awaiting_decision"
        ? "方案已生成，等你确认。"
        : stage === "reported" || stage === "committed"
          ? "本地已保存；云端发布未启用。"
          : "正在后台处理。";
  return { id: item.id, stage, retrying: stage === "failed_retryable", userMessage, artifactId: item.artifactId, updatedAt: item.updatedAt, browserStatus: item.browserStatus, error: item.lastError?.message, jobId: item.jobId };
}
function trustedContext(context) {
  if (!context.ownerId || !context.originalMessageId || !context.harnessSessionId) throw Object.assign(new Error("业务工具必须绑定主人的真实聊天回合"), { code: "BUSINESS_CONTEXT_REQUIRED" });
  return { ownerKey: context.ownerId, threadKey: context.threadKey, channel: context.channel, senderId: context.senderId || context.ownerId, messageId: context.messageId, conversationId: context.conversationId };
}
function createBusinessTools(getServices, { opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
  const memoryStore = new MemoryStore({ opsRoot });
  async function pending(s, ctx) {
    let decisions = (await s.pendingDecisions.list({ ownerKey: ctx.ownerKey, threadKey: ctx.threadKey })).filter((d) => Date.parse(d.expiresAt) > clock().getTime());
    for (const d of decisions.filter(d => d.kind === "knowledge" && d.executingJob)) {
      const job = await s.core.inspect(d.executingJob, { ownerKey: ctx.ownerKey });
      if (job && ["completed", "failed", "rejected", "canceled"].includes(job.status)) {
        await s.pendingDecisions.update(d.id, { consumedAt: clock().toISOString(), resolutionStatus: job.status });
        decisions = decisions.filter(x => x.id !== d.id);
      }
    }
    const memories = (await listDomainRecords(opsRoot, "memory", ctx.ownerKey)).filter(({ record }) => record.status === "proposed");
    return [
      ...decisions.map((d) => ({ id: d.id, version: decisionVersion(d), kind: d.kind === "knowledge" ? "knowledge" : "capture", summary: d.summary, options: d.options, expiresAt: d.expiresAt })),
      ...memories.map(({ record, version }) => ({ id: record.id, version, kind: "memory", summary: record.statement, reason: record.reason, kindOfMemory: record.kind, scope: record.scope, triggers: record.triggers, supersedes: record.supersedes, options: ["approve", "reject"] })),
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
      return { generatedAt: clock().toISOString(), localDate: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(clock()), actions: actions.filter(({ record }) => ["pending", "scheduled"].includes(record.status)).slice(0, count).map(publicRecord), decisions: decisions.slice(0, count), captures: captures.slice(0, count).map(workflowSummary), jobs: jobs.filter((j) => !["completed", "failed", "rejected", "canceled"].includes(j.status)).slice(0, count).map((j) => ({ id: j.id, status: j.status, operation: j.request?.operation, error: j.error?.message })) };
    }
    if (name === "actions.list") return { actions: (await listDomainRecords(opsRoot, "actions", ctx.ownerKey)).filter(({ record }) => input.status === "all" || (!input.status || input.status === "active" ? ["pending", "scheduled"].includes(record.status) : record.status === input.status)).slice(0, count).map(publicRecord) };
    if (name === "actions.create" || name === "actions.update") {
      if (name === "actions.update") assertRecordVersion(await findDomainRecord(opsRoot, "actions", input.id, ctx.ownerKey), input.version);
      return operate(s, name, input, ctx, context.originalMessageId);
    }
    if (name === "knowledge.sync_status") return s.publisher.status(ctx.ownerKey, input.id);
    if (name === "knowledge.sync_retry") {
      const status = await s.publisher.status(ctx.ownerKey, input.id);
      if (["disabled", "not_registered"].includes(status.status)) throw new Error("没有可恢复的已登记发布请求");
      if (Object.values(status.targets || {}).some(t => t.errorCode === "SYNC_REMOTE_CONFLICT")) return s.publisher.conflictPreview(ctx.ownerKey, input.id, { ...ctx, messageId: context.originalMessageId });
      s.ingestWorkflows.schedule(() => s.publisher.retry(ctx.ownerKey, input.id));
      return { id: input.id, status: "queued", targets: status.targets };
    }
    if (["knowledge.update", "knowledge.move"].includes(name)) return operate(s, name === "knowledge.update" ? "notes.edit" : "notes.move", input, ctx, context.originalMessageId);
    if (["knowledge.delete", "knowledge.merge"].includes(name)) return s.knowledgeChanges.preview(name === "knowledge.delete" ? "notes.delete" : "notes.merge", input, { ...ctx, messageId: context.originalMessageId });
    if (name === "knowledge.maintenance") return s.knowledgeMaintenance.weeklySummary();
    if (name === "memory.search") return { memories: await memoryStore.search(ctx.ownerKey, input.query, { limit: input.limit }) };
    if (name === "memory.get") return { record: await memoryStore.get(ctx.ownerKey, input.id) };
    if (name === "memory.correct") return operate(s, "memory.proposals.correct", input, ctx, context.originalMessageId);
    if (name === "memory.forget") {
      const result = await operate(s, "memory.forget", input, ctx, context.originalMessageId);
      await s.forgetMemoryPayloads?.(ctx.ownerKey, input.id);
      return result;
    }
    if (name === "memory.propose") return operate(s, "memory.proposals.create", input, ctx, context.originalMessageId);
    if (name === "capture.list") return { workflows: (await s.ingestWorkflows.listPending(ctx.ownerKey)).slice(0, count).map(workflowSummary) };
    if (name === "capture.get") {
      const workflow = await s.ingestWorkflows.status(input.id, ctx);
      const summary = workflowSummary(workflow);
      const job = workflow.jobId ? await s.core.inspect(workflow.jobId, { ownerKey: ctx.ownerKey }) : null;
      const result = job?.result?.operationResult;
      return { ...summary, jobStatus: job?.status, ...(result?.id && s.publisher ? { sync: await s.publisher.status(ctx.ownerKey, result.id) } : {}), ...(result ? { result: { path: result.path, completionStatus: result.completionStatus, resources: result.resourceManifest, source: result.source, unverifiedIssues: result.unverifiedIssues } } : {}) };
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
        } else {
          payload = { ...attachment.payload };
          if (payload.kind === "markdown") payload.attachments = (context.attachments || []).flatMap(a => a.resource ? [a.resource] : []);
        }
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
      if (decision.kind === "knowledge") {
        try {
          if (input.action === "reject") { await s.pendingDecisions.update(input.id, { consumedAt: clock().toISOString(), reservedAt: null }); return { id: input.id, status: "rejected" }; }
          if (input.action !== "approve" || decision.authorization?.messageId !== context.originalMessageId) throw Object.assign(new Error("需要主人在另一条消息中明确确认具体预览"), { code: "OWNER_CONFIRMATION_REQUIRED" });
          const result = await operate(s, decision.plan.operation, { decisionId: input.id }, ctx, context.originalMessageId);
          await s.pendingDecisions.update(input.id, { consumedAt: clock().toISOString(), reservedAt: null });
          return result;
        } catch (error) { await s.pendingDecisions.update(input.id, { reservedAt: null }); throw error; }
      }
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
