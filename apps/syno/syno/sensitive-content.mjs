const SENSITIVE_PATTERNS = Object.freeze([
  ["privacy_marker", /^(?:privacy|sensitive|private):\s*(?:private|sensitive|true|yes)$/imu],
  ["authorization_header", /\bauthorization\s*:\s*(?:bearer|basic)\s+\S+/iu],
  ["credential_assignment", /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|auth[_ -]?token|token|password|passwd|secret|cookie)\b\s*[=:]\s*["']?[^\s"',;]{8,}/iu],
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

export { inspectRemoteContent, SENSITIVE_PATTERNS };
