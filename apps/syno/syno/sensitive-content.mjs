const SENSITIVE_PATTERNS = Object.freeze([
  ["privacy_marker", /^(?:privacy|sensitive|private):\s*(?:private|sensitive|true|yes)$/imu],
  // ["']? 允许可选引号包围键名：工具结果经 JSON.stringify 后是 {"token":"xxx"} 形态，
  // 键名被引号包围，若不允可选引号则 \s*[=:] 会在键后引号处失配，整体漏检（serializer 三路径都先 JSON.stringify）。
  ["authorization_header", /\bauthorization["']?\s*:\s*["']?(?:bearer|basic)\s+\S+/iu],
  ["credential_assignment", /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|auth[_ -]?token|token|password|passwd|secret|cookie)\b["']?\s*[=:]\s*["']?[^\s"',;]{8,}/iu],
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

export { inspectRemoteContent, redactRemoteContent, SENSITIVE_PATTERNS };
