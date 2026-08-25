import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS, resolveInside } from "./paths.mjs";
import { isImageMime } from "./image-mime.mjs";
import { parseProjectDirective } from "./project-directive.mjs";

function parseWeixinApproval(text) {
  const match = /^批准\s+(job-\d{8}-[a-f0-9]{8})\s+([a-f0-9]{6})$/iu.exec(String(text || "").trim());
  return match ? { jobId: match[1], code: match[2].toUpperCase() } : null;
}

async function artifactToIntakePayload(artifact, { quarantineRoot = path.join(PATHS.runtimeRoot, "quarantine", "weixin") } = {}) {
  if (!artifact || artifact.rejected || artifact.isolated !== true || artifact.autoRead !== false) {
    throw new Error(artifact?.reason || "附件没有通过隔离校验");
  }
  const file = resolveInside(quarantineRoot, artifact.path);
  const bytes = await fs.readFile(file);
  if (Number.isFinite(Number(artifact.size)) && Number(artifact.size) !== bytes.length) throw new Error("附件隔离后的大小发生变化");
  const name = path.basename(file);
  if (artifact.mime === "application/pdf") return { kind: "pdf", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return { kind: "docx", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "text/html") return { kind: "html", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "text/markdown" || (artifact.mime === "text/plain" && /\.(?:md|markdown)$/iu.test(name))) {
    return { kind: "markdown", name, title: name, base64: bytes.toString("base64") };
  }
  if (artifact.mime === "text/plain") return { kind: "txt", name, title: name, base64: bytes.toString("base64") };
  throw new Error(`当前收录流程暂不支持 ${artifact.mime || "未知"} 附件`);
}

function createWeixinMessageHandler({
  core,
  ingest,
  conversationRouter,
  quarantineRoot = path.join(PATHS.runtimeRoot, "quarantine", "weixin"),
  onBackgroundError = (error) => console.error("[syno] legacy Weixin ingest proposal failed:", error?.message || error),
  } = {}) {
  if (!core || !ingest || !conversationRouter) throw new Error("微信消息处理器缺少 Core、IngestService 或 ConversationRouter");
  const scheduleProposal = (artifactId) => queueMicrotask(async () => {
    try {
      await ingest.propose(artifactId);
    } catch (error) {
      await onBackgroundError(error, { artifactId, channel: "weixin" });
    }
  });
  return async (message) => {
    try {
      const directive = parseProjectDirective(message.text);
      const approval = parseWeixinApproval(directive.textWithoutDirective);
      if (approval) {
        const result = await core.approve(approval.jobId, {
          channel: "weixin",
          senderId: message.senderId,
          ownerKey: "local-user",
          projectRef: directive.projectRef || "",
          code: approval.code,
        });
        return {
          text: result.requiresApproval
            ? `任务 ${result.job.id} 仍需确认`
            : `任务 ${result.job.id} 已确认并进入 ${result.job.status}`,
        };
      }

      const artifacts = message.artifacts || [];
      if (artifacts.length) {
        const receipts = [];
        const rejected = [];
        let skippedImages = 0;
        for (const artifact of artifacts) {
          if (isImageMime(artifact?.mime) && artifact.rejected !== true) {
            skippedImages += 1;
            continue;
          }
          try {
            const payload = await artifactToIntakePayload(artifact, { quarantineRoot });
            const receipt = await ingest.receive(payload, { channel: "weixin", ownerId: message.senderId });
            receipts.push(receipt);
            scheduleProposal(receipt.artifact.id);
          } catch (error) {
            rejected.push(error.message);
          }
        }
        if (!receipts.length && skippedImages && !rejected.length) {
          return { text: "图片已隔离。请通过主对话渠道识图；明确说「收录」才会把识图结果送进知识库方案。" };
        }
        if (!receipts.length) return { text: `附件未进入收录队列：${rejected.join("；") || "没有通过安全检查"}` };
        const ids = receipts.map((receipt) => receipt.artifact.id);
        return {
          text: `已接收附件，Artifact ID：${ids.join("、")}。正在后台安全提取、查重并生成收录方案${rejected.length ? `；另有 ${rejected.length} 个附件未通过检查` : ""}。`,
        };
      }

      const trimmed = String(message.text || "").trim();
      if (/^https?:\/\/\S+$/i.test(trimmed)) {
        const receipt = await ingest.receive({ kind: "url", value: trimmed }, { channel: "weixin", ownerId: message.senderId });
        scheduleProposal(receipt.artifact.id);
        return { text: `已接收，Artifact ID：${receipt.artifact.id}。正在后台查重并生成收录方案。` };
      }
      const conversationId = await conversationRouter.resolve({ ownerKey: "local-user" });
      const result = await core.execute({ text: trimmed }, {
        channel: "weixin",
        senderId: message.senderId,
        messageId: message.id,
        conversationId,
      });
      return { text: result.error?.message || (result.requiresApproval ? `任务 ${result.job.id} 需要确认，请按提示回复` : result.job?.result?.text || `任务 ${result.job?.id || ""} 已处理`) };
    } catch (error) {
      return { text: `未能处理：${error.message}` };
    }
  };
}

export { artifactToIntakePayload, createWeixinMessageHandler, parseWeixinApproval };
