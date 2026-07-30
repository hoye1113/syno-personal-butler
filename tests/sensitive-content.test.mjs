import assert from "node:assert/strict";
import test from "node:test";

import { inspectRemoteContent, redactRemoteContent } from "../apps/syno/syno/sensitive-content.mjs";

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
