import { isDecisionReply } from "./pending-decision.mjs";
import { CapabilityPresenter } from "./capability-presenter.mjs";
import { ChannelIntentRouter } from "./channel-intent-router.mjs";

const WORKFLOW_STATUS_LABELS = Object.freeze({
  received: "已接收",
  extracting: "正在直接抓取",
  classifying: "正在整理来源",
  proposed: "收录方案已生成",
  awaiting_decision: "等待你确认",
  approved: "已确认，准备写入",
  executing: "正在写入知识库",
  validating: "正在校验写入",
  committed: "已写入，正在更新索引",
  indexed: "已更新索引，准备回执",
  failed_retryable: "暂时失败，等待重试",
  failed_terminal: "无法继续，需要重新收录",
});

function workflowStatusText(workflow) {
  if (workflow.browserStatus === "interaction_required") return "等待你完成浏览器验证";
  if (workflow.browserStatus === "running") return "正在尝试浏览器抓取";
  if (workflow.browserStatus === "completed") return "浏览器内容已读取，正在生成收录方案";
  return WORKFLOW_STATUS_LABELS[workflow.stage] || workflow.stage;
}

class ChannelConversationHandler {
  constructor({ runtime, core, ingest, ingestWorkflows, pendingDecisions, attachmentToPayload, journal, intentRouter, capabilityPresenter, browserCapture } = {}) {
    if (!runtime || !core || (!ingest && !ingestWorkflows) || !pendingDecisions) throw new Error("ChannelConversationHandler 缺少 Runtime、Core、IngestWorkflow 或 PendingDecision Store");
    this.runtime = runtime;
    this.core = core;
    this.ingest = ingest;
    this.ingestWorkflows = ingestWorkflows;
    this.pendingDecisions = pendingDecisions;
    this.attachmentToPayload = attachmentToPayload;
    this.journal = journal;
    this.intentRouter = intentRouter || new ChannelIntentRouter();
    this.capabilityPresenter = capabilityPresenter || new CapabilityPresenter();
    this.browserCapture = browserCapture;
  }

  #record(event, data = {}, options) {
    if (!this.journal?.record) return Promise.resolve();
    return this.journal.record(event, data, options).catch(() => null);
  }

  async #receive(payload, message) {
    if (this.ingestWorkflows) {
      return this.ingestWorkflows.receive(payload, {
        ownerKey: message.ownerKey,
        channel: message.channel,
        threadKey: message.threadKey || "main",
        messageId: message.id,
        replyTarget: message.channel === "feishu"
          ? { chatId: String(message.chatId || ""), replyTo: String(message.id || "") }
          : message.channel === "weixin"
            ? { toUserId: String(message.senderId || "") }
            : undefined,
      });
    }
    const receipt = await this.ingest.receive(payload, {
      ownerId: message.ownerKey,
      channel: message.channel,
      messageId: message.id,
    });
    queueMicrotask(async () => {
      try {
        await this.ingest.propose(receipt.artifact.id);
      } catch (error) {
        await this.#record("channel.legacy_ingest.failed", {
          artifactId: receipt.artifact.id,
          error: { code: error.code || "LEGACY_INGEST_FAILED", message: error.message },
        }, { level: "error" });
      }
    });
    return receipt;
  }

  async handle(message) {
    const trace = {
      channel: String(message.channel || "unknown"),
      messageId: String(message.id || ""),
      ownerKey: String(message.ownerKey || "local-user"),
      threadKey: String(message.threadKey || "main"),
    };
    try {
      const ownerKey = String(message.ownerKey || "local-user");
      const threadKey = String(message.threadKey || "main");
      const text = String(message.text || "").trim();
      const localOnly = /(?:^|\s)仅本地(?:\s|$)/u.test(text);
      await this.#record("channel.message.received", {
        ...trace,
        hasAttachments: Array.isArray(message.artifacts) && message.artifacts.length > 0,
        privateConversation: message.privateConversation === true,
      });
      // Attachments always become isolated Artifacts before any text is
      // interpreted as an approval command. Embedded content is never authority.
      if (Array.isArray(message.artifacts) && message.artifacts.length) {
        await this.#record("channel.attachment.requested", { ...trace, count: message.artifacts.length });
        if (!this.attachmentToPayload) throw new Error("当前渠道没有附件安全转换器");
        const ids = [];
        const rejected = [];
        for (const artifact of message.artifacts) {
          try {
            const payload = await this.attachmentToPayload(artifact);
            if (localOnly) payload.analysisMode = "local-only";
            const receipt = await this.#receive(payload, { ...message, ownerKey });
            ids.push(receipt.workflow?.id || receipt.artifact.id);
          } catch (error) {
            rejected.push(error.message);
          }
        }
        if (!ids.length) {
          await this.#record("channel.attachment.failed", { ...trace, rejectedCount: rejected.length }, { level: "error" });
          return { text: `附件未进入收录队列：${rejected.join("；") || "没有通过安全检查"}` };
        }
        await this.#record("channel.attachment.completed", { ...trace, artifactIds: ids, rejectedCount: rejected.length });
        return { text: `已接收附件，收录编号：${ids.join("、")}。正在后台安全提取、查重并生成收录方案${rejected.length ? `；另有 ${rejected.length} 个附件未通过检查` : ""}。` };
      }
      if (isDecisionReply(text)) {
        await this.#record("channel.decision.requested", { ...trace });
        if (message.privateConversation !== true) {
          throw Object.assign(new Error("澄清回复只允许已绑定 Owner 的明确私聊会话"), { code: "DECISION_PRIVATE_CHAT_REQUIRED" });
        }
        const resolved = await this.pendingDecisions.parse(text, {
          ownerKey,
          threadKey,
          diffDigest: message.diffDigest,
          getDiffDigest: typeof this.core.inspect === "function"
            ? async (jobId) => (await this.core.inspect(jobId))?.result?.diffHash
            : undefined,
        });
        const workflow = resolved.decision.artifactId && this.ingestWorkflows
          ? await this.ingestWorkflows.status(resolved.decision.artifactId)
          : null;
        if (resolved.action === "modify") {
          let revised;
          try {
            if (workflow) {
              const decisionResult = await this.ingestWorkflows.decide(workflow.id, {
                action: "modify",
                modification: resolved.modification,
              }, { ownerKey, channel: message.channel, senderId: message.senderId });
              revised = { proposal: { id: decisionResult.workflow.proposalId } };
            } else if (resolved.decision.artifactId) revised = await this.ingest.revise(resolved.decision.artifactId, resolved.modification);
            if (!workflow && typeof this.core.requestModification === "function") {
              await this.core.requestModification(resolved.decision.jobId, resolved.modification);
            }
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
          } catch (error) {
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null }).catch(() => {});
            throw error;
          }
          return {
            text: revised
              ? `已生成修订方案 ${revised.proposal.id}：${resolved.modification}。原方案已失效，请等待新方案确认。`
              : `已持久记录修改要求：${resolved.modification}。原方案已失效，请等待新方案确认。`,
          };
        }
        if (resolved.action === "select") {
          if (!workflow) throw Object.assign(new Error("该选项只适用于收录方案"), { code: "PENDING_DECISION_OPTION_INVALID" });
          try {
            const selected = await this.ingestWorkflows.decide(workflow.id, {
              action: "select",
              option: resolved.option,
            }, { ownerKey, channel: message.channel, senderId: message.senderId });
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
            return {
              text: `已选择“${resolved.option}”，原方案已失效。新任务 ${selected.workflow.jobId} 已生成，请按新提示确认。`,
            };
          } catch (error) {
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null }).catch(() => {});
            throw error;
          }
        }
        let result;
        try {
          if (resolved.action === "reject") {
            result = workflow
              ? (await this.ingestWorkflows.decide(workflow.id, { action: "reject" }, { ownerKey, channel: message.channel, senderId: message.senderId })).result
              : await this.core.reject(resolved.decision.jobId, "主人通过私聊拒绝");
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
            return { text: `已拒绝任务 ${result.job.id}。` };
          }
          result = workflow
            ? (await this.ingestWorkflows.decide(workflow.id, {
              action: "approve",
              code: resolved.code,
              diffDigest: resolved.decision.diffDigest,
            }, { ownerKey, channel: message.channel, senderId: message.senderId })).result
            : await this.core.approve(resolved.decision.jobId, {
              channel: message.channel,
              senderId: message.senderId,
              ownerKey,
              threadKey,
              code: resolved.code,
              diffDigest: resolved.decision.diffDigest,
            });
          await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
        } catch (error) {
          if (typeof this.pendingDecisions.update === "function") {
            const current = typeof this.core.inspect === "function"
              ? await this.core.inspect(resolved.decision.jobId).catch(() => null)
              : null;
            await this.pendingDecisions.update(resolved.decision.id, current?.status === "awaiting_approval"
              ? { reservedAt: null }
              : { reservedAt: null, consumedAt: new Date().toISOString() }).catch(() => {});
          }
          throw error;
        }
        if (result.requiresApproval) {
          // 仅系统歧义澄清会回到 awaiting；trust-but-clarify 下审批恒为 none，
          // 正常确认后任务已执行完毕，不会进入二次确认。
          return { text: `任务 ${result.job.id} 仍需澄清，请按提示回复。` };
        }
        await this.#record("channel.decision.completed", { ...trace, jobId: result.job?.id, status: result.job?.status });
        return {
          text: `已确认任务 ${result.job.id}，当前状态：${result.job.status}。`,
        };
      }
      const intent = this.intentRouter.classify(text);
      if (intent.kind === "new_conversation") {
        await this.#record("channel.conversation.reset.requested", { ...trace });
        await this.runtime.newConversation({ ownerKey, threadKey });
        await this.#record("channel.conversation.reset.completed", { ...trace });
        return { text: "已开启新对话。" };
      }
      if (intent.kind === "show_capabilities") {
        const pendingCaptureCount = this.ingestWorkflows
          ? (await this.ingestWorkflows.listPending(ownerKey)).length
          : 0;
        const runtimeHealth = typeof this.runtime.health === "function"
          ? await this.runtime.health().catch(() => ({ ready: false }))
          : { ready: true };
        const browserCapture = typeof this.browserCapture?.health === "function"
          ? await this.browserCapture.health().catch(() => ({ available: false }))
          : {};
        return this.capabilityPresenter.describe({
          runtime: runtimeHealth,
          pendingCaptureCount,
          browserCapture,
        });
      }
      if (intent.kind === "continue_browser_capture" && this.ingestWorkflows) {
        const waiting = (await this.ingestWorkflows.listPending(ownerKey)).filter((item) => item.browserStatus === "interaction_required");
        if (!waiting.length) return { text: "当前没有等待浏览器验证的收录。" };
        if (waiting.length > 1) {
          if (Number.isInteger(intent.index) && intent.index >= 1 && intent.index <= waiting.length) {
            const selected = await this.ingestWorkflows.resumeBrowser(waiting[intent.index - 1].id, { ownerKey, channel: message.channel, senderId: message.senderId });
            return { text: `已继续收录 ${selected.id}，正在重新生成收录方案。` };
          }
          return { text: waiting.slice(0, 10).map((item, index) => `${index + 1}. ${item.id}：请明确要继续哪一项收录`).join("\n") };
        }
        const resumed = await this.ingestWorkflows.resumeBrowser(waiting[0].id, { ownerKey, channel: message.channel, senderId: message.senderId });
        return { text: `已继续收录 ${resumed.id}，正在重新生成收录方案。` };
      }
      if (intent.kind === "close_capture_tabs" && this.ingestWorkflows && this.browserCapture?.closeSession) {
        const workflows = (await this.ingestWorkflows.listPending(ownerKey)).filter((item) => item.browserSessionId);
        let closed = 0;
        for (const workflow of workflows) {
          const result = await this.browserCapture.closeSession({ workflowId: workflow.id });
          closed += Number(result?.closed || 0);
          await this.#record("capture.browser.session_closed", { ...trace, workflowId: workflow.id });
        }
        return { text: closed ? `已关闭 ${closed} 个收录浏览器标签。` : "当前没有可关闭的收录浏览器标签。" };
      }
      if (["capture_status", "list_pending_capture"].includes(intent.kind) && this.ingestWorkflows) {
        const pending = await this.ingestWorkflows.listPending(ownerKey);
        if (!pending.length) return { text: "当前没有未完成的收录。" };
        return {
          text: pending.slice(0, 10).map((item, index) =>
            `${index + 1}. ${item.id}：${workflowStatusText(item)}${item.lastError?.message ? `（${item.lastError.message}）` : ""}`,
          ).join("\n"),
        };
      }
      const urls = [...text.matchAll(/https?:\/\/[^\s]+/gi)].map((item) => item[0].replace(/[，。；、]+$/u, ""));
      const explicitCapture = /(?:收录|保存到知识库|记下来)/u.test(text);
      if (/^https?:\/\/\S+$/i.test(text) || (explicitCapture && urls.length)) {
        await this.#record("channel.capture.requested", { ...trace, sourceKind: "url" });
        const targets = (/^https?:\/\/\S+$/i.test(text) ? [text] : urls).slice(0, 10);
        const receipts = [];
        for (let index = 0; index < targets.length; index += 1) {
          receipts.push(await this.#receive(
            { kind: "url", value: targets[index], ...(localOnly ? { analysisMode: "local-only" } : {}) },
            { ...message, id: targets.length === 1 ? message.id : `${message.id || "capture"}:${index}`, ownerKey },
          ));
        }
        await this.#record("channel.capture.completed", { ...trace, artifactIds: receipts.map((item) => item.artifact.id), sourceKind: "url" });
        const ids = receipts.map((item) => item.workflow?.id || item.artifact.id);
        return { text: `已接收，收录编号：${ids.join("、")}。正在后台安全提取、查重并生成收录方案。` };
      }
      const personalMatch = /^(?:仅本地\s*)?(?:收录我的想法|记下我的想法)[：:]\s*([\s\S]+)$/u.exec(text);
      if (personalMatch) {
        const receipt = await this.#receive({
          kind: "personal",
          value: personalMatch[1],
          sourceKind: "personal",
          ...(localOnly ? { analysisMode: "local-only" } : {}),
        }, { ...message, ownerKey });
        return { text: `已接收个人想法，收录编号：${receipt.workflow?.id || receipt.artifact.id}。` };
      }
      try {
        await this.#record("channel.runtime.requested", { ...trace });
        const result = await this.runtime.run({ text }, {
          ownerKey,
          threadKey,
          channel: message.channel,
          messageId: message.id,
        });
        await this.#record("channel.runtime.completed", { ...trace, runId: result.runId || null });
        return { text: result.text || "Syno 已处理，但没有生成可显示的文本。" };
      } catch (error) {
        if (error.retryable !== true && error.code !== "OPENCODE_ATTEMPTS_EXHAUSTED") throw error;
        if (typeof this.core.execute !== "function") throw error;
        const queued = await this.core.execute({ text, intent: "chat" }, {
          channel: message.channel,
          senderId: message.senderId,
          ownerKey,
          threadKey,
          messageId: message.id,
          conversationId: threadKey,
        });
        return {
          text: queued.job?.status === "waiting_provider"
            ? `AI 服务暂时不可用，消息已保存为任务 ${queued.job.id}，恢复后继续处理。`
            : queued.job?.result?.text || `消息已保存为任务 ${queued.job?.id || "unknown"}。`,
        };
      }
    } catch (error) {
      await this.#record("channel.message.failed", {
        ...trace,
        error: { code: error.code || "CHANNEL_MESSAGE_FAILED", message: error.message },
      }, { level: "error" });
      return { text: `未能处理：${error.message}` };
    }
  }
}

export { ChannelConversationHandler };
