import assert from "node:assert/strict";
import test from "node:test";

import { mergeCaptureAnalyses, splitSourceText } from "../apps/syno/syno/capture-analysis.mjs";

test("splitSourceText keeps every paragraph in bounded sequential chunks", () => {
  const source = ["first paragraph", "second paragraph", "third paragraph"].join("\n\n");
  const chunks = splitSourceText(source, { maxChars: 20 });
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join("\n\n"), source);
  assert.ok(chunks.every((chunk) => chunk.length <= 20));
});

test("mergeCaptureAnalyses deterministically unions candidates without inventing mastery", () => {
  const merged = mergeCaptureAnalyses([
    {
      quality: { status: "limited", reasons: ["缺少作者"] },
      materialTier: "A",
      suggestedPath: "vault/00-Inbox/Long note.md",
      canonicalTags: ["ai_agent"],
      relations: [{ type: "supports", target: "A", reason: "reason A" }],
      mocChanges: [],
      claimCandidates: [{ statement: "claim A" }],
      evidenceCandidates: [],
      unresolved: ["核验日期"],
      validators: ["frontmatter"],
    },
    {
      quality: { status: "limited", reasons: ["缺少作者"] },
      materialTier: "A",
      suggestedPath: "vault/00-Inbox/Long note.md",
      canonicalTags: ["ai_agent", "ai_coding"],
      relations: [{ type: "supports", target: "A", reason: "reason A" }],
      mocChanges: [],
      claimCandidates: [{ statement: "claim B" }],
      evidenceCandidates: [{ source: "official" }],
      unresolved: ["核验日期", "核验版本"],
      validators: ["frontmatter", "links"],
    },
  ]);
  assert.deepEqual(merged.canonicalTags, ["ai_agent", "ai_coding"]);
  assert.equal(merged.relations.length, 1);
  assert.equal(merged.claimCandidates.length, 2);
  assert.deepEqual(merged.unresolved, ["核验日期", "核验版本"]);
  assert.equal("learningState" in merged, false);
});

test("mergeCaptureAnalyses keeps the most conservative quality across all chunks", () => {
  const merged = mergeCaptureAnalyses([
    { quality: { status: "accepted", reasons: [] }, materialTier: "A" },
    { quality: { status: "rejected", reasons: ["后半段包含无法安全处理的内容"] }, materialTier: "B" },
  ]);
  assert.equal(merged.quality.status, "rejected");
  assert.deepEqual(merged.quality.reasons, ["后半段包含无法安全处理的内容"]);
});
