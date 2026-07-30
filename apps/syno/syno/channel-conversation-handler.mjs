import { isDecisionReply } from "./pending-decision.mjs";
import { CapabilityPresenter } from "./capability-presenter.mjs";
import { ChannelIntentRouter } from "./channel-intent-router.mjs";
import { parseRecentReference } from "./recent-interaction.mjs";

// 链接字符集排除 CJK 与中文/全角标点：微信里链接后紧贴中文是常态，\S+ 会把中文粘进链接——
// 2026-07-30「<url>；帮我读一下讲了什么」就被整串当裸链接走进了收录管线。
const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s⺀-鿿豈-﫿＀-￯　-〿]+/gi;
const BARE_URL_PATTERN = /^https?:\/\/[^\s⺀-鿿豈-﫿＀-￯　-〿]+$/i;

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

// teach-back 软引导（纯函数，可单测）：有活跃复习时把"现在处于复习窗口"注入会话。
// 条件式指令——模型自己判断本条是否是主人原创讲解；不是则正常回答，不强行判分。
function buildTeachBackPriming(activeReviews) {
  const items = activeReviews.slice(0, 3)
    .map((review, index) => `${index + 1}. 「${review.title}」（knowledgeRef: ${review.knowledgeRef}）`)
    .join("\n");
  return [
    "以下新收录正在等待主人用自己的话讲解（teach-back 复习窗口）：",
    items,
    "若主人本条消息是在用自己的话原创讲解其中某条（≥20字），调用 learning.submit（knowledgeRef=对应条目, inputMode='teach-back', assistedLevel='none', isReview=true, rawOutput=主人原文, rubric 四维 0-1, selfAssessment 按语气推断、不明确用 'mostly'），并用一两句反馈判分结果与下次复习日期。",
    "若只是普通对话则正常回答，不要强行判分。主人可随时说「跳过复习」取消本次提醒。",
  ].join("\n");
}

class ChannelConversationHandler {
  constructor({ runtime, core, ingest, ingestWorkflows, pendingDecisions, attachmentToPayload, journal, intentRouter, capabilityPresenter, browserCapture, acceptedRequests, recentInteractions, channelDeliveryOutbox, mobileDeliveryMode, ownerChannelTargets, wakeDelivery, reviewReminders = null } = {}) {
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
    this.acceptedRequests = acceptedRequests;
    this.recentInteractions = recentInteractions;
    this.channelDeliveryOutbox = channelDeliveryOutbox;
    this.mobileDeliveryMode = mobileDeliveryMode;
    this.ownerChannelTargets = ownerChannelTargets;
    this.wakeDelivery = wakeDelivery;
    this.reviewReminders = reviewReminders;
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

  #deliveryTarget(message) {
    return message.channel === "feishu"
      ? { chatId: String(message.chatId || ""), replyTo: String(message.id || "") }
      : message.channel === "weixin"
        ? { toUserId: String(message.senderId || ""), contextToken: String(message.contextToken || "") }
        : null;
  }

  async #persistAccepted(message, trace, text) {
    if (!this.acceptedRequests || !trace.messageId) return null;
    const attachmentRefs = Array.isArray(message.artifacts)
      ? message.artifacts.map((artifact) => ({
        id: String(artifact.id || artifact.artifactId || artifact.path || artifact.sha256 || ""),
        kind: String(artifact.kind || "file"),
      })).filter((artifact) => artifact.id)
      : [];
    try {
      const accepted = await this.acceptedRequests.accept({
        ownerKey: trace.ownerKey,
        originChannel: trace.channel,
        platformMessageId: trace.messageId,
        messageDedupKey: message.messageDedupKey,
        threadKey: trace.threadKey,
        payloadKind: attachmentRefs.length ? "message_with_attachments" : "text",
        payload: { text, attachments: attachmentRefs },
        deliveryTarget: this.#deliveryTarget(message),
      });
      const deliveryTarget = this.#deliveryTarget(message);
      if (deliveryTarget && this.ownerChannelTargets?.set) {
        try {
          await this.ownerChannelTargets.set(trace.ownerKey, trace.channel, deliveryTarget);
          await this.channelDeliveryOutbox?.wakeTarget?.(trace.ownerKey, trace.channel);
          await this.wakeDelivery?.();
        } catch (error) {
          await this.#record("proactive.target_unavailable", {
            ownerKey: trace.ownerKey,
            channel: trace.channel,
            status: "target_persist_failed",
            error: { code: error.code || "CHANNEL_TARGET_PERSIST_FAILED" },
          }, { level: "error" });
        }
      }
      await this.#record("accepted_request.shadow_persisted", { ...trace, created: accepted.created === true });
      return accepted;
    } catch (error) {
      await this.#record("accepted_request.shadow_failed", {
        ...trace,
        error: { code: error.code || "ACCEPTED_REQUEST_SHADOW_FAILED", message: error.message },
      }, { level: "error" });
      throw error;
    }
  }

  async #runV2(request, message) {
    const response = await this.handle({ ...message, __synoV2Worker: true });
    const text = String(response?.text || "Syno 已处理，但没有生成可显示的文本。");
    const deliveryTarget = request.payload?.deliveryTarget || this.#deliveryTarget(message);
    const final = await this.channelDeliveryOutbox.enqueue({
      sourceType: "accepted_request",
      sourceId: request.requestId,
      ownerKey: request.ownerKey,
      targetChannel: request.originChannel,
      deliveryTargetRef: deliveryTarget,
      responseKind: "final",
      businessVersion: 1,
      payload: { text },
      deliveryKey: `${request.requestId}:final:v1`,
    });
    await this.acceptedRequests.update(request.requestId, {
      status: "final_pending",
      route: { kind: "mobile", mode: "v2" },
      finalEventId: final.event.eventId,
      claim: null,
    });
    this.wakeDelivery?.();
    return { status: "final_pending", finalEventId: final.event.eventId };
  }

  async processAcceptedRequest(request) {
    if (!request?.requestId || !request.payload) throw new Error("AcceptedRequest 恢复载荷不完整");
    if (!this.channelDeliveryOutbox || !this.acceptedRequests) return { status: "waiting_provider", lastErrorCode: "MOBILE_V2_STORE_UNAVAILABLE" };
    const deliveryTarget = request.payload.deliveryTarget || {};
    const message = {
      channel: request.originChannel,
      id: request.platformMessageId,
      ownerKey: request.ownerKey,
      threadKey: request.threadKey,
      text: String(request.payload.text || ""),
      senderId: deliveryTarget.toUserId || request.ownerKey,
      contextToken: deliveryTarget.contextToken,
      chatId: deliveryTarget.chatId,
      privateConversation: true,
    };
    return this.#runV2(request, message);
  }

  async #handleV2(message, trace, text) {
    if (!this.acceptedRequests || !this.channelDeliveryOutbox) {
      throw Object.assign(new Error("移动 v2 需要 AcceptedRequest 与 ChannelDeliveryOutbox"), { code: "MOBILE_V2_UNAVAILABLE" });
    }
    const accepted = await this.#persistAccepted(message, trace, text);
    const request = accepted.request;
    const target = request.payload?.deliveryTarget || this.#deliveryTarget(message);
    const ack = await this.channelDeliveryOutbox.enqueue({
      sourceType: "accepted_request",
      sourceId: request.requestId,
      ownerKey: request.ownerKey,
      targetChannel: request.originChannel,
      deliveryTargetRef: target,
      responseKind: "ack",
      payload: { text: "已接收，正在处理。" },
      deliveryKey: `${request.requestId}:ack:v1`,
    });
    await this.acceptedRequests.update(request.requestId, {
      ackEventId: ack.event.eventId,
      route: { kind: "mobile", mode: "v2" },
    });
    if (accepted.created) queueMicrotask(() => this.#runV2(request, message).catch(async (error) => {
      await this.#record("accepted_request.v2_failed", {
        requestId: request.requestId,
        error: { code: error.code || "MOBILE_V2_PROCESS_FAILED", message: error.message },
      }, { level: "error" });
    }));
    this.wakeDelivery?.();
    return { deferredDelivery: true, requestId: request.requestId };
  }

  async handle(message) {
    const trace = {
      channel: String(message.channel || "unknown"),
      messageId: String(message.id || ""),
      ownerKey: String(message.ownerKey || "local-user"),
      threadKey: String(message.threadKey || "main"),
    };
    const text = String(message.text || "").trim();
    if (!message.__synoV2Worker && this.mobileDeliveryMode?.is?.("v2")) {
      try {
        return await this.#handleV2(message, trace, text);
      } catch (error) {
        await this.#record("channel.message.failed", {
          ...trace,
          error: { code: error.code || "CHANNEL_MESSAGE_FAILED", message: error.message },
        }, { level: "error" });
        return { text: `未能接收：${error.message}` };
      }
    }
    try {
      const ownerKey = String(message.ownerKey || "local-user");
      const threadKey = String(message.threadKey || "main");
      const localOnly = /(?:^|\s)仅本地(?:\s|$)/u.test(text);
      if (!message.__synoV2Worker && this.acceptedRequests && trace.messageId) await this.#persistAccepted(message, trace, text);
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
      const recentReference = parseRecentReference(text);
      if (recentReference && this.recentInteractions) {
        const resolution = await this.recentInteractions.resolve(recentReference, { ownerKey, channel: message.channel, threadKey });
        await this.#record("channel.recent_interaction.resolved", { ...trace, action: recentReference.action, kind: resolution.kind, itemId: resolution.item?.id || null });
        return { text: resolution.text };
      }
      if (isDecisionReply(text)) {
        await this.#record("channel.decision.requested", { ...trace });
        if (message.privateConversation !== true) {
          throw Object.assign(new Error("澄清回复只允许已绑定 Owner 的明确私聊会话"), { code: "DECISION_PRIVATE_CHAT_REQUIRED" });
        }
        const presentation = await this.pendingDecisions.present?.({ ownerKey, threadKey, channel: message.channel, businessVersion: message.businessVersion || "1" });
        const resolved = await this.pendingDecisions.parse(text, {
          ownerKey,
          threadKey,
          channel: message.channel,
          ...(presentation?.presentationId ? { presentationId: presentation.presentationId } : {}),
          ...(message.businessVersion ? { businessVersion: message.businessVersion } : {}),
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
      // 「跳过复习」确定性出口：直接 dismiss 最近一条活跃复习，全程不过模型。
      // reviewReminders 为空时（未装配）不拦截，行为与现状一致（回落普通对话）。
      if (intent.kind === "skip_review" && this.reviewReminders) {
        const skipped = await this.reviewReminders.dismissLatest({ now: new Date() });
        if (!skipped) return { text: "当前没有等待你复习的新收录。" };
        await this.#record("channel.review.dismissed", { ...trace, workflowId: skipped.workflowId, knowledgeRef: skipped.knowledgeRef });
        return { text: `已跳过「${skipped.title}」的复习提醒，它会留在复习曲线里，之后仍会到期。` };
      }
      const urls = [...text.matchAll(URL_IN_TEXT_PATTERN)].map((item) => item[0]);
      const explicitCapture = /(?:收录|保存到知识库|记下来)/u.test(text);
      // 裸链接容忍尾随中文标点（「https://a.com。」仍是裸链接），但链接后粘着正文不算。
      const bareText = text.replace(/[，。；、？！\s]+$/u, "");
      const isBareUrl = BARE_URL_PATTERN.test(bareText);
      if (isBareUrl || (explicitCapture && urls.length)) {
        await this.#record("channel.capture.requested", { ...trace, sourceKind: "url" });
        const targets = (isBareUrl ? [bareText] : urls).slice(0, 10);
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
      // 「读链接」意图（Owner 2026-07-30 二次修订：只读不收录——先读内容，主人自行判断是否收录）：
      // 恰好一个链接、去掉链接后剩余文字 ≤30 字且命中读/看/访问/总结类动词 → 注入系统提示让模型
      // 用 knowledge.fetch_url 读正文直接回答，不走收录管线。仅本地模式不自动抓取远端；
      // 剩余文字长或多链接的消息保持普通对话（模型仍可用 fetch_url 工具）。
      let runText = text;
      if (!localOnly && urls.length === 1) {
        const residual = text.replace(urls[0], "").replace(/^[：:；;、，。\s]+|[？?！!。…\s]+$/gu, "").trim();
        if (residual.length > 0 && residual.length <= 30
          && /(?:访问|读取|获取|看看|看一下|读一读|读一下|读读|帮我读|打开|总结|分析|讲一讲|解读|解释|什么意思|说了啥|说了什么|内容)/u.test(residual)) {
          await this.#record("channel.read_link.requested", { ...trace, sourceKind: "url" });
          runText = `${text}\n\n（系统提示：主人想让你读取这个链接并回答问题。请调用 knowledge.fetch_url 读取正文后回答；抓取失败或内容被安全策略拦截时如实说明原因，不要编造。主人没有要求收录，不要主动调用收录类工具。）`;
        }
      }
      // teach-back 门（所有确定性协议之后、runtime.run 正前方）：
      // 有真实送达且 72h 内的活跃复习时，先把复习窗口软引导注入会话，再照常进模型。
      // 门只加上下文、不改写主人原文，模型保留退出路径；引导失败退化为普通对话。
      const activeReviews = this.reviewReminders
        ? await this.reviewReminders.active({ now: new Date() }).catch(() => [])
        : [];
      if (activeReviews.length) {
        try {
          await this.runtime.appendSystemEvent?.({ ownerKey, threadKey, text: buildTeachBackPriming(activeReviews) });
        } catch (error) {
          await this.#record("channel.teach_back.priming_failed", { ...trace, errorCode: error.code || "TEACH_BACK_PRIMING_FAILED" });
        }
      }
      try {
        await this.#record("channel.runtime.requested", { ...trace });
        const result = await this.runtime.run({ text: runText }, {
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
      return { text: error.code === "PENDING_DECISION_REPLAYED" ? "该事项已处理，当前渠道不会重复执行。" : `未能处理：${error.message}` };
    }
  }
}

export { ChannelConversationHandler, buildTeachBackPriming };
