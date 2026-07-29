import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceDescriptor } from "../apps/syno/syno/source-descriptor.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

test("SourceDescriptor preserves URL provenance and canonicalizes tracking parameters", async () => {
  const descriptor = buildSourceDescriptor({
    payload: { kind: "url", value: "https://Example.com/article?utm_source=wechat&id=7" },
    prepared: { sourceUrl: "https://Example.com/article?utm_source=wechat&id=7" },
    channel: "weixin",
    messageId: "wx-1",
    now: "2026-07-28T08:00:00.000Z",
  });
  assert.equal(descriptor.originalUrl, "https://Example.com/article?utm_source=wechat&id=7");
  assert.equal(descriptor.canonicalUrl, "https://example.com/article?id=7");
  assert.equal(descriptor.publisher, "example.com");
  assert.equal(descriptor.captureChannel, "weixin");
  assert.equal(descriptor.platformMessageId, "wx-1");
  assert.equal(descriptor.verificationStatus, "unverified");
  await validateContractRecord("source-descriptor", descriptor);
});

test("SourceDescriptor distinguishes personal knowledge from unknown retellings", async () => {
  const personal = buildSourceDescriptor({
    payload: { kind: "text", value: "我的判断", sourceKind: "personal" },
    channel: "web",
    now: "2026-07-28T08:00:00.000Z",
  });
  assert.equal(personal.kind, "personal");
  assert.equal(personal.sourceTier, "personal");
  assert.equal(personal.verificationStatus, "personal");

  const unknown = buildSourceDescriptor({
    payload: { kind: "text", value: "听说某模型已经支持 X" },
    channel: "feishu",
    now: "2026-07-28T08:00:00.000Z",
  });
  assert.equal(unknown.kind, "unknown");
  assert.equal(unknown.verificationStatus, "needs_source");
  assert.equal(unknown.reliability, "unverified");
  await validateContractRecord("source-descriptor", unknown);
});

test("SourceDescriptor hashes files and never treats a filename as verified evidence", async () => {
  const descriptor = buildSourceDescriptor({
    payload: { kind: "markdown", value: "# note", filename: "notes.md", contentSha256: "a".repeat(64) },
    channel: "weixin",
    now: "2026-07-28T08:00:00.000Z",
  });
  assert.equal(descriptor.originalFilename, "notes.md");
  assert.equal(descriptor.contentSha256, "a".repeat(64));
  assert.equal(descriptor.verificationStatus, "unverified");
  await validateContractRecord("source-descriptor", descriptor);
});

test("Artifact and IngestProposal validate embedded SourceDescriptor fields", async () => {
  const sourceDescriptor = buildSourceDescriptor({
    payload: { kind: "text", value: "转述" },
    channel: "weixin",
    now: "2026-07-28T08:00:00.000Z",
  });
  await validateContractRecord("artifact", {
    id: "artifact-1",
    kind: "text",
    path: "local-state://ingest/artifact-1",
    created: "2026-07-28T08:00:00.000Z",
    isolated: true,
    sourceDescriptor,
  });
  await validateContractRecord("ingest-proposal", {
    id: "ingest-1",
    candidateId: "candidate-1",
    status: "proposed",
    suggestedPath: "vault/00-Inbox/example.md",
    suggestedTags: [],
    suggestedLinks: [],
    sourceType: "text",
    quality: { status: "pending", reasons: [] },
    materialTier: "unrated",
    canonicalTags: [],
    duplicateAssessment: { matches: [], sameSource: false, updateStatus: "new" },
    relations: [],
    mocChanges: [],
    claimCandidates: [],
    evidenceCandidates: [],
    unresolved: ["尚未核验"],
    validators: ["source-traceability"],
    sourceDigest: "a".repeat(64),
    proposalDigest: "b".repeat(64),
    risk: "additive",
    created: "2026-07-28T08:00:00.000Z",
    sourceDescriptor,
  });
  await assert.rejects(
    validateContractRecord("artifact", {
      id: "artifact-1",
      kind: "text",
      path: "local-state://ingest/artifact-1",
      created: "2026-07-28T08:00:00.000Z",
      isolated: true,
      sourceDescriptor: { kind: "unknown" },
    }),
    /observedAt/,
  );
  await assert.rejects(
    validateContractRecord("artifact", {
      id: "artifact-without-source",
      kind: "text",
      path: "local-state://ingest/artifact-without-source",
      created: "2026-07-28T08:00:00.000Z",
      isolated: true,
    }),
    /sourceDescriptor/,
  );
  await assert.rejects(
    validateContractRecord("ingest-proposal", {
      id: "ingest-without-source",
      candidateId: "candidate-1",
      status: "proposed",
      suggestedPath: "vault/00-Inbox/example.md",
      suggestedTags: [],
      suggestedLinks: [],
      risk: "additive",
      created: "2026-07-28T08:00:00.000Z",
    }),
    /sourceDescriptor/,
  );
});
