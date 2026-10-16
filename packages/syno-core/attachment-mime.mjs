// 附件格式识别：微信与飞书两条通道共用，先按内容嗅探、再用文件名兜底。
// 2026-10-16 从 weixin-ilink.mjs 抽出来复用（原实现只在微信侧）。

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function sniffMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05) && (bytes[3] === 0x04 || bytes[3] === 0x06)) return "application/zip";
  const sample = bytes.subarray(0, Math.min(bytes.length, 8_192));
  if (sample.length && !sample.includes(0)) {
    const decoded = sample.toString("utf8");
    const replacements = (decoded.match(/\uFFFD/g) || []).length;
    const controls = [...sample].filter((value) => value < 9 || (value > 13 && value < 32)).length;
    if (replacements <= 2 && controls / sample.length < 0.01) return "text/plain";
  }
  return "";
}

// 供通道侧把「文件名 + 字节」归一成一个可信 MIME；认不出来返回空串，由调用方如实拒绝。
function mimeForAttachment({ fileName = "", bytes } = {}) {
  const sniffed = sniffMime(bytes || Buffer.alloc(0));
  const name = String(fileName || "").toLowerCase();
  if (sniffed.startsWith("image/")) return sniffed;
  if (sniffed === "application/pdf") return "application/pdf";
  if (sniffed === "application/zip" && name.endsWith(".docx")) return DOCX_MIME;
  if (sniffed === "text/plain") {
    if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
    if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
    return "text/plain";
  }
  return "";
}

export { DOCX_MIME, mimeForAttachment, sniffMime };
