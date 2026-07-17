import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { validateContractRecord } from "./schema-registry.mjs";

const STAGES = Object.freeze(["captured", "curated", "understood", "applied", "expressed", "retained", "integrated"]);
const ASSISTANCE = Object.freeze({ none: 1, prompted: 0.9, outlined: 0.7, "heavily-assisted": 0.4 });

function reviewIntervalDays(score) {
  if (score < 0.4) return 1;
  if (score < 0.6) return 3;
  if (score < 0.75) return 7;
  if (score < 0.9) return 14;
  return 30;
}

function demonstratedStage(inputMode, score, evidenceCount = 1) {
  if (score < 0.4) return "curated";
  if (["voice", "typed"].includes(inputMode)) return "understood";
  if (inputMode === "practice") return score >= 0.8 ? "applied" : "understood";
  if (inputMode === "quiz") return score >= 0.85 && evidenceCount >= 2 ? "retained" : "understood";
  if (inputMode === "teach-back") {
    if (score >= 0.92 && evidenceCount >= 3) return "integrated";
    if (score >= 0.75) return "expressed";
    return "understood";
  }
  return "curated";
}

function stateId(knowledgeRef) { return `learning-${createHash("sha256").update(knowledgeRef).digest("hex").slice(0, 12)}`; }

class LearningService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) { this.opsRoot = opsRoot; this.clock = clock; }

  async record(input, { opsRoot = this.opsRoot } = {}) {
    if (input.producer !== "user") throw Object.assign(new Error("只有主人亲自输出才能成为 LearningEvidence"), { code: "AI_EVIDENCE_FORBIDDEN" });
    const now = this.clock();
    const effectiveScore = Math.max(0, Math.min(1, Number(input.rubricScore) * (ASSISTANCE[input.assistedLevel] ?? 0)));
    const id = `learning-evidence-${randomUUID().slice(0, 8)}`;
    const next = new Date(now.getTime() + reviewIntervalDays(effectiveScore) * 86_400_000);
    const evidence = {
      id, knowledgeRef: input.knowledgeRef, producer: "user", inputMode: input.inputMode,
      rawArtifactRef: input.rawArtifactRef, assistedLevel: input.assistedLevel,
      rubricScore: effectiveScore, misconceptions: input.misconceptions || [],
      demonstratedAt: now.toISOString(), nextReviewAt: next.toISOString(),
    };
    await validateContractRecord("learning-evidence", evidence);
    const stateFile = path.join(opsRoot, "reviews", "learning", "states", `${stateId(input.knowledgeRef)}.md`);
    let previous = null;
    try { previous = parseRecord(await fs.readFile(stateFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const refs = [...new Set([...(previous?.evidenceRefs || []), id])];
    const observed = demonstratedStage(input.inputMode, effectiveScore, refs.length);
    const previousIndex = Math.max(0, STAGES.indexOf(previous?.stage || "captured"));
    const observedIndex = STAGES.indexOf(observed);
    const stage = STAGES[Math.max(previousIndex, observedIndex)];
    const mastery = Number(Math.max(Number(previous?.mastery || 0) * 0.7, effectiveScore).toFixed(3));
    const state = { id: stateId(input.knowledgeRef), knowledgeRef: input.knowledgeRef, stage, mastery, evidenceRefs: refs, nextReviewAt: next.toISOString(), updated: now.toISOString() };
    await validateContractRecord("learning-state", state);
    const evidenceFile = path.join(opsRoot, "reviews", "learning", "evidence", `${id}.md`);
    await writeRecord(evidenceFile, evidence, { schema: "learning-evidence", title: `Learning evidence ${id}`, summaryKeys: ["id", "knowledgeRef", "producer", "inputMode", "assistedLevel", "rubricScore", "demonstratedAt", "nextReviewAt"] });
    await writeRecord(stateFile, state, { schema: "learning-state", title: `Learning state: ${input.knowledgeRef}`, summaryKeys: ["id", "knowledgeRef", "stage", "mastery", "nextReviewAt", "updated"] });
    return { evidence, state, changedPaths: [evidenceFile, stateFile].map((file) => path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")) };
  }

  async due({ opsRoot = this.opsRoot, now = this.clock(), limit = 20 } = {}) {
    const root = path.join(opsRoot, "reviews", "learning", "states");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const states = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const state = parseRecord(await fs.readFile(path.join(root, entry.name), "utf8"));
      if (state.nextReviewAt && new Date(state.nextReviewAt) <= now) states.push(state);
    }
    return states.sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt)).slice(0, limit);
  }
}

export { ASSISTANCE, LearningService, STAGES, demonstratedStage, reviewIntervalDays, stateId };
