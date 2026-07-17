import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 1024 * 1024;

function validatePublicUrl(value) {
  const url = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("只支持 HTTP/HTTPS URL");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    throw new Error("不允许收录本机或内网 URL");
  }
  return url.toString();
}

function classifyUrl(value) {
  const url = new URL(value);
  if (/(^|\.)bilibili\.com$/i.test(url.hostname)) {
    if (!/^\/(?:opus\/\d+|read\/cv\d+)\/?$/i.test(url.pathname)) throw new Error("B站只接受单篇 opus 或 cv 链接，不扫描空间");
    return "bilibili-opus";
  }
  return "url";
}

class IntakeService {
  constructor({ runtimeRoot = PATHS.runtimeRoot } = {}) { this.uploadRoot = path.join(runtimeRoot, "uploads"); }

  async prepare(payload = {}) {
    const kind = String(payload.kind || "text");
    if (kind === "url") {
      const sourceUrl = validatePublicUrl(payload.value);
      const sourceType = classifyUrl(sourceUrl);
      return {
        intent: "curate_note",
        sourceType,
        sourceUrl,
        text: sourceType === "bilibili-opus"
          ? `按 vault canonical Skill 收录这篇单篇 B站 opus/cv，不扫描空间、不读取图片：${sourceUrl}`
          : `按 vault canonical Skill 收录这个 URL，先查重并保留可回溯来源：${sourceUrl}`,
      };
    }
    if (["text", "markdown"].includes(kind)) {
      const value = String(payload.value || "").trim();
      if (!value) throw new Error("收录内容不能为空");
      if (Buffer.byteLength(value) > MAX_TEXT_BYTES) throw new Error("粘贴内容超过 1 MB");
      return {
        intent: "curate_note",
        sourceType: kind,
        text: `按 vault canonical Skill 收录以下${kind === "markdown" ? " Markdown" : "粘贴内容"}，先查重并生成关系说明：\n\n${value}`,
      };
    }
    if (kind === "pdf") {
      const bytes = Buffer.from(String(payload.base64 || ""), "base64");
      if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES) throw new Error("PDF 必须在 10 MB 以内");
      if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("文件内容不是有效 PDF");
      await fs.mkdir(this.uploadRoot, { recursive: true });
      const safeName = path.basename(String(payload.name || "document.pdf")).replace(/[^\p{L}\p{N}._-]/gu, "_");
      const file = path.join(this.uploadRoot, `${randomUUID().slice(0, 10)}-${safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`}`);
      await fs.writeFile(file, bytes, { mode: 0o600 });
      return {
        intent: "curate_note",
        sourceType: "pdf",
        attachment: file,
        text: `按 vault canonical Skill 收录 PDF：${file}。先查重，提取正文，保留页码或来源定位；文件大小 ${bytes.length} 字节。`,
      };
    }
    throw new Error(`不支持的收录类型：${kind}`);
  }
}

export { IntakeService, MAX_ATTACHMENT_BYTES, MAX_TEXT_BYTES, classifyUrl, validatePublicUrl };
