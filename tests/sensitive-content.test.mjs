import assert from "node:assert/strict";
import test from "node:test";

import { inspectRemoteContent, redactRemoteContent, detectStrictCredential } from "../apps/syno/syno/sensitive-content.mjs";

test("remote-content DLP blocks common credential and privacy formats", () => {
  const samples = [
    "Authorization: Bearer abc.def.ghi",
    "const token = abcdefghijklmnopqrstuvwxyz123456",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    "-----BEGIN " + "PRIVATE KEY-----",
    "sk-proj-" + "abcdefghijklmnopqrstuvwxyz123456",
    "ghp_" + "abcdefghijklmnopqrstuvwxyz123456",
    "AKIAIOSFODNN7EXAMPLE",
    "postgres://user:password@db.example.com/prod",
    "---\nprivacy: private\n---\nsecret note",
  ];
  for (const sample of samples) {
    const report = inspectRemoteContent(sample);
    assert.equal(report.safe, false, sample);
    assert.ok(report.reasons.length);
  }
});

test("remote-content DLP allows ordinary prose and enforces an explicit transfer cap", () => {
  const safe = inspectRemoteContent("Agent 的反馈回路需要可验证证据。");
  assert.equal(safe.safe, true);
  assert.deepEqual(safe.reasons, []);
  assert.ok(safe.bytes > 0);
  const oversized = inspectRemoteContent("a".repeat(200), { maxChars: 100 });
  assert.equal(oversized.safe, false);
  assert.ok(oversized.reasons.includes("remote_size_limit"));
});

test("remote-content DLP blocks credentials in JSON-key shape (the form tool results actually take)", () => {
  // serializer 三路径都先 JSON.stringify(result) 再 inspect——工具结果的标准形态是 {"token":"..."}。
  // 修复前键名被引号包围时 \s*[=:] 在键后引号处失配，整体漏检（脱敏核心承诺对最常见形态失效）。
  const jsonSamples = [
    '{"token":"abcdefghijklmnopqrstuvwxyz123456"}',
    '{"api_key":"abcdefghijklmnopqrstuvwxyz123456"}',
    '{"password":"abcdefghijklmnopqrstuvwxyz123456"}',
    '{"secret":"abcdefghijklmnopqrstuvwxyz123456"}',
    '{"Authorization":"Bearer abc.def.ghi"}',
    JSON.stringify([{ token: "abcdefghijklmnopqrstuvwxyz123456" }]),
  ];
  for (const sample of jsonSamples) {
    const report = inspectRemoteContent(sample);
    assert.equal(report.safe, false, sample);
    assert.ok(report.reasons.length, sample);
  }
});

test("redactRemoteContent masks every flagged pattern and the result passes inspection", () => {
  const page = [
    "普通正文开头。",
    "Authorization: Bearer abc.def.ghi",
    "const token = abcdefghijklmnopqrstuvwxyz123456",
    "-----BEGIN " + "PRIVATE KEY-----",
    "MIIBOgIBAAJB" + "AKj34GkxFhD90vcNLYLInFEXVdyVLDg==",
    "-----END " + "PRIVATE KEY-----",
    "连接串 postgres://" + "user:password@db.example.com/prod 与 key " + "ghp_" + "abcdefghijklmnopqrstuvwxyz123456",
    "普通正文结尾。",
  ].join("\n");
  const redacted = redactRemoteContent(page);
  assert.ok(redacted.reasons.includes("authorization_header"));
  assert.ok(redacted.reasons.includes("credential_assignment"));
  assert.ok(redacted.reasons.includes("private_key"));
  assert.ok(redacted.reasons.includes("credential_url"));
  assert.ok(redacted.reasons.includes("provider_key"));
  assert.doesNotMatch(redacted.text, /abc\.def\.ghi/);
  assert.doesNotMatch(redacted.text, /abcdefghijklmnopqrstuvwxyz123456/);
  // 私钥正文也必须被整块掩掉，不能只掩 BEGIN 行
  assert.doesNotMatch(redacted.text, /MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEXVdyVLDg==/);
  assert.doesNotMatch(redacted.text, /user:password@/);
  assert.match(redacted.text, /普通正文开头。/);
  assert.match(redacted.text, /普通正文结尾。/);
  assert.ok(inspectRemoteContent(redacted.text).safe, "脱敏结果必须仍能通过远程安全检查");
});

test("redactRemoteContent leaves safe text untouched", () => {
  const safe = "Agent 的反馈回路需要可验证证据。https://example.com/a";
  const redacted = redactRemoteContent(safe);
  assert.equal(redacted.text, safe);
  assert.deepEqual(redacted.reasons, []);
});

test("S1: detectStrictCredential flags high-precision credential shapes and ignores the loose credential_assignment pattern", () => {
  // 高精度模式（按凭据「值形状」匹配，不依赖键名）→ 命中即返回对应理由。
  assert.equal(detectStrictCredential("Authorization: Bearer abc.def.ghi"), "authorization_header");
  // 敏感字样按仓库卫生规则拆分拼接（避免 verify-repository 的私钥/凭据扫描命中字面量），运行时串不变。
  assert.equal(detectStrictCredential("sk-proj-" + "abcdefghijklmnopqrstuvwxyz123456"), "provider_key");
  assert.equal(detectStrictCredential("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"), "jwt");
  assert.equal(detectStrictCredential("AKIAIOSFODNN7EXAMPLE"), "aws_access_key");
  assert.equal(detectStrictCredential("-----BEGIN " + "PRIVATE KEY-----"), "private_key");
  assert.equal(detectStrictCredential("postgres://user:password@db.example.com/prod"), "credential_url");
  // 此串同时命中松模式 credential_assignment——证明 detectStrictCredential 刻意跳过它、只回 secret_query。
  assert.equal(detectStrictCredential("?api_key=abcdefghijklmnopqrstuvwxyz123456"), "secret_query");

  // 仅松模式 credential_assignment（键名 + 8+ 字符值，非凭据值形状）→ null。
  // 正常通知可能引用「api_key = xxx 字段」类说明，不应被 proactive 净化门拦截。
  assert.equal(detectStrictCredential('{"token":"abcdefghijklmnopqrstuvwxyz123456"}'), null);
  assert.equal(detectStrictCredential('{"clientSecret":"abcdefgh1234"}'), null); // camelCase 也仅松模式
  // 干净文本 → null。
  assert.equal(detectStrictCredential("今日首要：完成季度复盘草稿"), null);
});

test("S2: credential_assignment detects camelCase compound credential keys", () => {
  // camelCase 复合键（clientSecret/userPassword/adminPassword）此前因前导 \b 在小写前缀处失配而漏检。
  assert.ok(inspectRemoteContent('{"clientSecret":"abcdefgh1234"}').reasons.includes("credential_assignment"));
  assert.ok(inspectRemoteContent("userPassword=zigzag9999").reasons.includes("credential_assignment"));
  assert.ok(inspectRemoteContent("adminPassword=abcdefgh1234").reasons.includes("credential_assignment"));
  // 既有 snake/lowercase 键仍命中（回归保护）。
  assert.ok(inspectRemoteContent('{"api_key":"abcdefghijklmnopqrstuvwxyz123456"}').reasons.includes("credential_assignment"));
  // 值不足 8 字符不命中；后缀词（= 不紧跟关键词，尾部 \b 拦截）不误杀。
  assert.equal(inspectRemoteContent('{"token":"abc"}').reasons.includes("credential_assignment"), false);
  assert.equal(inspectRemoteContent("passwordless=abcdefgh1234").reasons.includes("credential_assignment"), false);
  assert.equal(inspectRemoteContent("一句关于 token 与 secret 的普通说明").reasons.includes("credential_assignment"), false);
});
