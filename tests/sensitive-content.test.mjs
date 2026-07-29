import assert from "node:assert/strict";
import test from "node:test";

import { inspectRemoteContent } from "../apps/syno/syno/sensitive-content.mjs";

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
