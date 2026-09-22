import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

test("all public contracts are JSON Schema objects with stable identifiers", async () => {
  const root = path.resolve("contracts");
  const files = (await fs.readdir(root)).filter((file) => file.endsWith(".json"));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const schema = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^https:\/\/syno\.local\/contracts\//);
    assert.equal(schema.type, "object");
    assert.ok(Array.isArray(schema.required));
  }
});

test("claim contracts reject stale volatile claims", async () => {
  const volatile = {
    id: "claim-1", statement: "当前模型支持某项能力", stability: "volatile", status: "candidate",
    evidenceRefs: [], updated: "2026-07-17T08:00:00.000Z",
  };
  await assert.rejects(validateContractRecord("claim", volatile), /复核时间/);
  await validateContractRecord("claim", { ...volatile, reviewAfter: "2026-07-24T08:00:00.000Z" });
});

test("job contract accepts an optional approval-advice cache field", async () => {
  const base = {
    id: "job-20260722-test", intent: "curate_note", status: "awaiting_approval",
    profile: "syno-curate", approval: "single", risk: "low", phase: "execution",
    approvalsReceived: 0, approvalCode: "178617",
    created: "2026-07-22T05:35:33.341Z", updated: "2026-07-22T05:35:33.341Z",
    request: { summary: "Syno operation: ingest.apply", payloadDigest: "x", fields: ["intent"] },
    decision: { intent: "curate_note", profile: "syno-curate", approval: "single", risk: "low", allowed: true, reason: "请求会修改长期事实源，需要一次审批" },
  };
  await validateContractRecord("job", base);
  await validateContractRecord("job", { ...base, advice: { whatIsIt: "《X》", recommendation: "approve", reason: "Y", via: "butler", generatedAt: "2026-07-22T06:00:00.000Z" } });
});

test("settings permissions are disjoint", async () => {
  const registry = {
    version: 1,
    agentAdjustable: ["notifications.quietHours"],
    confirmationRequired: ["provider.modelId"],
    immutable: ["provider.token", "policy.rules", "toolRegistry"],
  };
  await validateContractRecord("settings-registry", registry);
  await assert.rejects(validateContractRecord("settings-registry", {
    ...registry,
    confirmationRequired: ["notifications.quietHours"],
  }), /不能重叠/);
});

test("knowledge-profile contract validates dimensions and rejects unknown fields", async () => {
  const valid = {
    id: "profile-20260721-abcd1234",
    scope: "personal-knowledge",
    generatedAt: "2026-07-21T00:00:00.000Z",
    vaultFingerprint: "abc123",
    summary: { notes: 1, searchable: 1, mocCount: 0, tags: 1 },
    topics: [{ name: "AI", noteRefs: 1, tagRefs: ["AI"], stabilityMix: { practice: 1 }, coverage: 1 }],
    sources: [{ ref: "GitHub", count: 1, reliability: "traceable" }],
    stabilityBreakdown: { principle: 0, model: 0, practice: 1, fact: 0, volatile: 0, personal: 0, unknown: 0 },
    reliabilityBreakdown: { traceable: 1, needsSource: 0 },
    orphanNoteRefs: [],
    deadLinkRefs: [],
    outdatedNoteRefs: [],
    evidenceGaps: [],
    excludedSystemNotes: 0,
    nextMaintenanceWindow: "2026-07-28T00:00:00.000Z",
  };
  await validateContractRecord("knowledge-profile", valid);
  await assert.rejects(validateContractRecord("knowledge-profile", { ...valid, summary: { notes: 1 } }), /searchable/);
  await assert.rejects(validateContractRecord("knowledge-profile", { ...valid, noise: 1 }), /未知字段/);
});

test("artifact contract accepts docx and html kinds", async () => {
  const base = {
    id: "artifact-20260722-abcd1234", path: "local-state://ingest/artifact-20260722-abcd1234",
    created: "2026-07-22T12:00:00.000Z", isolated: true, status: "accepted",
    sourceDescriptor: {
      kind: "file", originalFilename: "document.bin", contentSha256: "a".repeat(64),
      observedAt: "2026-07-22T12:00:00.000Z", capturedAt: "2026-07-22T12:00:00.000Z",
      captureChannel: "test", sourceTier: "unknown", reliability: "unverified",
      userSuppliedSource: false, verificationStatus: "unverified",
    },
  };
  await validateContractRecord("artifact", { ...base, kind: "docx" });
  await validateContractRecord("artifact", { ...base, kind: "html" });
  await validateContractRecord("artifact", { ...base, kind: "pdf" });
  await assert.rejects(validateContractRecord("artifact", { ...base, kind: "epub" }), (err) => /枚举/.test(err.message));
});
