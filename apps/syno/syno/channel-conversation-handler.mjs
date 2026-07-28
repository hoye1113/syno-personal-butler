import { isDecisionReply } from "./pending-decision.mjs";

class ChannelConversationHandler {
  constructor({ runtime, core, ingest, pendingDecisions, attachmentToPayload } = {}) {
    if (!runtime || !core || !ingest || !pendingDecisions) throw new Error("ChannelConversationHandler 缺少 Runtime、Core、Ingest 或 PendingDecision Store");
    this.runtime = runtime;
    this.core = core;
    this.ingest = ingest;
    this.pendingDecisions = pendingDecisions;
    this.attachmentToPayload = attachmentToPayload;
  }

  async #receive(payload, message) {
    const receipt = await this.ingest.receive(payload, {
      ownerId: message.ownerKey,
      channel: message.channel,
      messageId: message.id,
    });
    this.ingest.propose(receipt.artifact.id).catch(() => {});
    return receipt;
  }

  async handle(message) {
    try {
      const ownerKey = String(message.ownerKey || "local-user");
      const threadKey = String(message.threadKey || "main");
      const text = String(message.text || "").trim();
      // Attachments always become isolated Artifacts before any text is
      // interpreted as an approval command. Embedded content is never authority.
      if (Array.isArray(message.artifacts) && message.artifacts.length) {
        if (!this.attachmentToPayload) throw new Error("当前渠道没有附件安全转换器");
        const ids = [];
        const rejected = [];
        for (const artifact of message.artifacts) {
          try {
            const receipt = await this.#receive(await this.attachmentToPayload(artifact), { ...message, ownerKey });
            ids.push(receipt.artifact.id);
          } catch (error) {
            rejected.push(error.message);
          }
        }
        if (!ids.length) return { text: `附件未进入收录队列：${rejected.join("；") || "没有通过安全检查"}` };
        return { text: `已接收附件，Artifact ID：${ids.join("、")}。正在后台安全提取、查重并生成收录方案${rejected.length ? `；另有 ${rejected.length} 个附件未通过检查` : ""}。` };
      }
      if (isDecisionReply(text)) {
        if (message.privateConversation !== true) {
          throw Object.assign(new Error("审批只允许已绑定 Owner 的明确私聊会话"), { code: "DECISION_PRIVATE_CHAT_REQUIRED" });
        }
        const resolved = await this.pendingDecisions.parse(text, {
          ownerKey,
          threadKey,
          diffDigest: message.diffDigest,
          getDiffDigest: typeof this.core.inspect === "function"
            ? async (jobId) => (await this.core.inspect(jobId))?.result?.diffHash
            : undefined,
        });
        if (resolved.action === "modify") {
          let revised;
          try {
            if (resolved.decision.artifactId) revised = await this.ingest.revise(resolved.decision.artifactId, resolved.modification);
            if (typeof this.core.requestModification === "function") {
              await this.core.requestModification(resolved.decision.jobId, resolved.modification);
            }
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
          } catch (error) {
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null }).catch(() => {});
            throw error;
          }
          return {
            text: revised
              ? `已生成修订方案 ${revised.proposal.id}：${resolved.modification}。原审批已失效，请等待新方案确认。`
              : `已持久记录修改要求：${resolved.modification}。原审批已失效，请等待新方案确认。`,
          };
        }
        let result;
        try {
          if (resolved.action === "reject") {
            result = await this.core.reject(resolved.decision.jobId, "主人通过私聊拒绝");
            await this.pendingDecisions.update(resolved.decision.id, { reservedAt: null, consumedAt: new Date().toISOString() });
            return { text: `已拒绝任务 ${result.job.id}。` };
          }
          result = await this.core.approve(resolved.decision.jobId, {
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
        if (result.requiresApproval && result.job?.phase === "merge") {
          const next = await this.pendingDecisions.add({
            jobId: result.job.id,
            ownerKey,
            threadKey,
            kind: "double",
            phase: "merge",
            summary: result.job.result?.preview || `应用任务 ${result.job.id} 的真实差异`,
            options: result.job.changedPaths || [],
            diffDigest: result.job.result?.diffHash,
            approvalCode: result.job.approvalCode,
          });
          return {
            text: `差异已生成：${(result.job.changedPaths || []).join("、") || "没有可列出的路径"}。差异摘要 ${next.diffDigest || "不可用"}。确认应用请回复：确认应用 ${next.approvalCode}`,
          };
        }
        return {
          text: result.requiresApproval
            ? `已确认生成差异。任务 ${result.job.id} 仍需最终确认。`
            : `已确认任务 ${result.job.id}，当前状态：${result.job.status}。`,
        };
      }
      if (text === "/新对话") {
        await this.runtime.newConversation({ ownerKey, threadKey });
        return { text: "已开启新对话。" };
      }
      if (/^https?:\/\/\S+$/i.test(text)) {
        const receipt = await this.#receive({ kind: "url", value: text }, { ...message, ownerKey });
        return { text: `已接收，Artifact ID：${receipt.artifact.id}。正在后台安全提取、查重并生成收录方案。` };
      }
      try {
        const result = await this.runtime.run({ text }, {
          ownerKey,
          threadKey,
          channel: message.channel,
          messageId: message.id,
        });
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
      return { text: `未能处理：${error.message}` };
    }
  }
}

export { ChannelConversationHandler };
