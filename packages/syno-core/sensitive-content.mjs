const SENSITIVE_PATTERNS = Object.freeze([
  ["privacy_marker", /^(?:privacy|sensitive|private):\s*(?:private|sensitive|true|yes)$/imu],
  // ["']? 允许可选引号包围键名：工具结果经 JSON.stringify 后是 {"token":"xxx"} 形态，
  // 键名被引号包围，若不允可选引号则 \s*[=:] 会在键后引号处失配，整体漏检（serializer 三路径都先 JSON.stringify）。
  ["authorization_header", /\bauthorization["']?\s*:\s*["']?(?:bearer|basic)\s+\S+/iu],
  // S2：前导 \b 在 camelCase 复合键（clientSecret/userPassword/adminPassword）处失配——
  // 关键词前一字符是小写字母（如 userPassword 的 'r'）时无词边界。放宽为「词边界 或 前一字符为小写字母」，
  // 覆盖 camelCase 后缀；尾部 \b 仍拦截 passwordless/secretpath 等后缀词（= 不紧跟关键词）。
  ["credential_assignment", /(?:\b|(?<=[a-z]))(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|auth[_ -]?token|token|password|passwd|secret|cookie)\b["']?\s*[=:]\s*["']?[^\s"',;]{8,}/iu],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/u],
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u],
  ["provider_key", /\b(?:sk-(?:proj-)?|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{16,}\b/u],
  ["aws_access_key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u],
  ["credential_url", /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^/\s:@]+:[^@\s/]+@/iu],
  ["secret_query", /[?&](?:access_token|api_key|token|secret|password)=[^&\s]+/iu],
]);

function inspectRemoteContent(value, { maxChars = 192_000 } = {}) {
  const text = String(value || "");
  const reasons = [];
  if (text.length > maxChars) reasons.push("remote_size_limit");
  for (const [reason, pattern] of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) reasons.push(reason);
  }
  return {
    safe: reasons.length === 0,
    reasons: [...new Set(reasons)],
    bytes: Buffer.byteLength(text),
  };
}

// 本地脱敏（Owner 2026-07-30 批准：公开网页含凭据示例时先打码再发远程模型）。
// 与 inspectRemoteContent 共用同一组模式，保证"凭据形状不出本机"的不变量不变；
// 掩码文本本身不含凭据形状，不会二次命中。调用方脱敏后必须复查 inspectRemoteContent，
// 仍不安全则 fail-closed 拒绝，不得降级放行。
function redactRemoteContent(value) {
  let text = String(value || "");
  const applied = [];
  // 私钥先整块（含正文）脱敏——只掩 BEGIN 行会把 key 本体漏出去。
  text = text.replace(
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
    () => { applied.push("private_key"); return "【已脱敏:private_key】"; },
  );
  for (const [reason, pattern] of SENSITIVE_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    text = text.replace(new RegExp(pattern.source, flags), () => {
      applied.push(reason);
      return `【已脱敏:${reason}】`;
    });
  }
  return { text, reasons: [...new Set(applied)] };
}

// S1：仅高精度凭据模式（按凭据「值形状」匹配，不依赖键名）。
// 刻意排除松模式 credential_assignment（键名 + 8+ 字符值，会误杀正常通知文案，如引用「api_key = xxx」字段说明）。
// 用于 #deliverBundle 的 defense-in-depth 净化门：local-only 收录的凭据形标题/正文会原样入微信，命中即降级为回退文案。
const STRICT_CREDENTIAL_REASONS = new Set([
  "provider_key", "jwt", "authorization_header", "aws_access_key", "private_key", "credential_url", "secret_query",
]);
// 返回首个命中的高精度凭据理由，或 null。复用 inspectRemoteContent 的同一组模式（不变量不变）。
function detectStrictCredential(value) {
  const { reasons } = inspectRemoteContent(value);
  return reasons.find((reason) => STRICT_CREDENTIAL_REASONS.has(reason)) || null;
}

export { inspectRemoteContent, redactRemoteContent, detectStrictCredential, SENSITIVE_PATTERNS };
