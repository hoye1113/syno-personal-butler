import { createHash } from "node:crypto";

const TRACKING_PARAMETERS = new Set([
  "fbclid", "gclid", "mc_cid", "mc_eid", "spm", "utm_campaign", "utm_content",
  "utm_medium", "utm_source", "utm_term",
]);

function canonicalizeUrl(raw) {
  const parsed = new URL(String(raw));
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  return parsed.toString();
}

function buildSourceDescriptor({ payload = {}, prepared = {}, channel = "web", messageId = "", now = new Date().toISOString() } = {}) {
  const rawUrl = prepared.sourceUrl || (payload.kind === "url" ? payload.value : payload.sourceUrl);
  if (rawUrl) {
    const canonicalUrl = canonicalizeUrl(rawUrl);
    return {
      kind: "url",
      originalUrl: String(rawUrl),
      canonicalUrl,
      publisher: prepared.publisher || new URL(canonicalUrl).hostname,
      observedAt: now,
      capturedAt: now,
      captureChannel: channel,
      ...(messageId ? { platformMessageId: messageId } : {}),
      sourceTier: prepared.sourceTier || "secondary",
      reliability: prepared.reliability || "unverified",
      userSuppliedSource: true,
      verificationStatus: prepared.verificationStatus || "unverified",
      ...(prepared.author ? { author: prepared.author } : {}),
      ...(prepared.publishedAt ? { publishedAt: prepared.publishedAt } : {}),
    };
  }
  const personal = payload.sourceKind === "personal" || payload.personal === true;
  const filename = payload.filename || payload.originalFilename || payload.name;
  if (filename || ["markdown", "txt", "pdf", "docx", "html", "file"].includes(payload.kind)) {
    const content = payload.base64
      ? Buffer.from(String(payload.base64), "base64")
      : Buffer.isBuffer(payload.value) ? payload.value : Buffer.from(String(payload.value || ""));
    return {
      kind: "file",
      originalFilename: String(filename || "unnamed"),
      contentSha256: String(payload.contentSha256 || createHash("sha256").update(content).digest("hex")),
      observedAt: now,
      capturedAt: now,
      captureChannel: channel,
      ...(messageId ? { platformMessageId: messageId } : {}),
      sourceTier: "secondary",
      reliability: "unverified",
      userSuppliedSource: payload.userSuppliedSource !== false,
      verificationStatus: "unverified",
    };
  }
  return {
    kind: personal ? "personal" : "unknown",
    observedAt: now,
    capturedAt: now,
    captureChannel: channel,
    ...(messageId ? { platformMessageId: messageId } : {}),
    sourceTier: personal ? "personal" : "unknown",
    reliability: personal ? "personal" : "unverified",
    userSuppliedSource: personal,
    verificationStatus: personal ? "personal" : "needs_source",
  };
}

export { buildSourceDescriptor, canonicalizeUrl };
