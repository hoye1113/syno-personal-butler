// 飞书入站附件：把消息里的 image/file 资源下载到隔离区，产出与微信通道同形状的 artifact，
// 让对话处理链（图片直传模型 / 文件走收录）无需区分通道。
//
// 2026-10-16 新增：飞书此前只接收文本，主人发图/发文件管家完全收不到。
// 资源接口：GET /open-apis/im/v1/messages/{message_id}/resources/{file_key}?type=image|file
// （SDK：rawClient.im.v1.messageResource.get(...)，返回对象带 getReadableStream/writeFile）。

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { mimeForAttachment } from "./attachment-mime.mjs";
import { resolveInside } from "./paths.mjs";

// 飞书单文件上限 100MB；管家侧只收真正需要进知识库/看图的，超过 25MB 直接如实拒绝。
const DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const DOWNLOADABLE_TYPES = Object.freeze(new Set(["image", "file"]));

function safeFileName(value) {
  const base = path.basename(String(value || "attachment.bin"));
  return base.replace(/[^\p{L}\p{N}._-]/gu, "_") || "attachment.bin";
}

async function readStreamCapped(stream, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error(`附件超过 ${Math.round(maxBytes / 1024 / 1024)}MB 上限`);
      error.code = "ATTACHMENT_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// 返回 artifact 列表：成功项 { path, size, mime, isolated: true, autoRead: false }，
// 失败项 { rejected: true, reason }——与微信侧完全同形，由 handler 统一决定后续。
async function quarantineFeishuResources({
  rawClient,
  messageId,
  resources = [],
  quarantineRoot,
  maxBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  loadResource = null,
} = {}) {
  const artifacts = [];
  const download = loadResource || (({ type, fileKey }) => rawClient?.im?.v1?.messageResource?.get({
    params: { type: type === "image" ? "image" : "file" },
    path: { message_id: String(messageId), file_key: String(fileKey) },
  }));
  for (const resource of resources) {
    const type = String(resource?.type || "");
    const fileKey = String(resource?.fileKey || "");
    if (!DOWNLOADABLE_TYPES.has(type) || !fileKey) {
      artifacts.push({ rejected: true, reason: `暂不支持的消息资源类型：${type || "未知"}` });
      continue;
    }
    try {
      const response = await download({ type, fileKey, fileName: resource.fileName });
      const stream = response?.getReadableStream?.();
      if (!stream) throw Object.assign(new Error("飞书未返回资源流"), { code: "FEISHU_RESOURCE_STREAM_MISSING" });
      const bytes = await readStreamCapped(stream, maxBytes);
      const mime = mimeForAttachment({ fileName: resource.fileName, bytes });
      if (!mime) throw Object.assign(new Error("附件内容无法识别为受支持格式"), { code: "ATTACHMENT_MIME_UNKNOWN" });
      await fs.mkdir(quarantineRoot, { recursive: true });
      const file = resolveInside(quarantineRoot, `${randomUUID().slice(0, 10)}-${safeFileName(resource.fileName)}`);
      await fs.writeFile(file, bytes, { mode: 0o600 });
      artifacts.push({ path: file, size: bytes.length, mime, isolated: true, autoRead: false });
    } catch (error) {
      artifacts.push({ rejected: true, reason: String(error?.message || error) });
    }
  }
  return artifacts;
}

export { DEFAULT_MAX_ATTACHMENT_BYTES, quarantineFeishuResources };
