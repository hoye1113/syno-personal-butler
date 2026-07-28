import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { validateContractRecord } from "./schema-registry.mjs";
import { buildSourceDescriptor } from "./source-descriptor.mjs";

const STAGES = Object.freeze(["captured", "curated", "understood", "applied", "expressed", "retained", "integrated"]);
const ASSISTANCE = Object.freeze({ none: 1, prompted: 0.9, outlined: 0.7, "heavily-assisted": 0.4 });
const REVIEW_INTERVALS = Object.freeze([1, 3, 7, 14, 30, 60]);
const RUBRIC_KEYS = Object.freeze(["accurate", "explained", "applied", "discriminated"]);

function rubricScore(rubric = {}) {
  return RUBRIC_KEYS.reduce((sum, key) => sum + Math.max(0, Math.min(1, Number(rubric[key] || 0))), 0) / RUBRIC_KEYS.length;
}

function calibrationFor(selfAssessment, score) {
  const high = ["solid", "mostly"].includes(selfAssessment);
  const low = ["shaky", "lost"].includes(selfAssessment);
  if (high && score < 0.75) return "fluency-illusion";
  if (low && score >= 0.75) return "under-confidence";
  if (low && score < 0.75) return "both-low";
  return "aligned";
}

function reviewIntervalDays({ passed, isReview = false, reviewCount = 0 } = {}) {
  if (!passed) return 1;
  if (!isReview) return 1;
  return REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
}

function demonstratedStage(inputMode, score, evidenceCount = 1, reviewCount = 0, passed = score >= 0.75) {
  if (!passed || score < 0.4) return "curated";
  if (reviewCount >= 3 && score >= 0.8) return "retained";
  if (inputMode === "practice") return "applied";
  if (inputMode === "teach-back") {
    if (score >= 0.9 && evidenceCount >= 3) return "integrated";
    return "expressed";
  }
  if (["voice", "typed", "quiz"].includes(inputMode)) return "understood";
  return "curated";
}

function stateId(knowledgeRef) { return `learning-${createHash("sha256").update(knowledgeRef).digest("hex").slice(0, 12)}`; }

class LearningService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) { this.opsRoot = opsRoot; this.clock = clock; }

  async record(input, { opsRoot = this.opsRoot } = {}) {
    if (input.producer !== "user") throw Object.assign(new Error("只有主人亲自输出才能成为 LearningEvidence"), { code: "AI_EVIDENCE_FORBIDDEN" });
    const rawOutput = String(input.rawOutput || "").trim();
    if (rawOutput.length < 20) throw Object.assign(new Error("必须提交至少 20 个字符的主人原始输出，不能只填写或伪造引用"), { code: "LEARNING_RAW_OUTPUT_REQUIRED" });
    const now = this.clock();
    const rawScore = Number(rubricScore(input.rubric).toFixed(3));
    const effectiveScore = Number((rawScore * (ASSISTANCE[input.assistedLevel] ?? 0)).toFixed(3));
    const passed = rawScore >= 0.75 && effectiveScore >= 0.6;
    const calibration = calibrationFor(input.selfAssessment, rawScore);
    const id = `learning-evidence-${randomUUID().slice(0, 8)}`;
    const artifactId = `artifact-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const artifactFile = path.join(opsRoot, "artifacts", "learning", `${artifactId}.md`);
    const rawArtifactRef = path.relative(path.dirname(opsRoot), artifactFile).replace(/\\/g, "/");
    const stateFile = path.join(opsRoot, "reviews", "learning", "states", `${stateId(input.knowledgeRef)}.md`);
    let previous = null;
    try { previous = parseRecord(await fs.readFile(stateFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const isReview = input.isReview === true;
    const reviewCount = isReview ? (passed ? Number(previous?.reviewCount || 0) + 1 : 0) : Number(previous?.reviewCount || 0);
    const intervalDays = reviewIntervalDays({ passed, isReview, reviewCount });
    const next = new Date(now.getTime() + intervalDays * 86_400_000);
    const evidence = {
      id, knowledgeRef: input.knowledgeRef, producer: "user", inputMode: input.inputMode,
      rawArtifactRef, assistedLevel: input.assistedLevel,
      rubric: Object.fromEntries(RUBRIC_KEYS.map((key) => [key, Number(input.rubric?.[key] || 0)])),
      rubricScore: effectiveScore, selfAssessment: input.selfAssessment, calibration,
      passed, isReview, misconceptions: input.misconceptions || [],
      demonstratedAt: now.toISOString(), nextReviewAt: next.toISOString(),
    };
    await validateContractRecord("learning-evidence", evidence);
    const artifact = {
      id: artifactId, kind: input.inputMode === "voice" ? "voice" : "text", path: rawArtifactRef,
      created: now.toISOString(), isolated: false, status: "accepted", size: Buffer.byteLength(rawOutput),
      ownerId: "local-user", content: rawOutput, purpose: "learning-evidence",
      sourceDescriptor: buildSourceDescriptor({
        payload: { kind: "text", value: rawOutput, sourceKind: "personal" },
        channel: input.inputMode === "voice" ? "voice" : "learning",
        now: now.toISOString(),
      }),
    };
    await validateContractRecord("artifact", artifact);
    const refs = [...new Set([...(previous?.evidenceRefs || []), id])];
    const observed = demonstratedStage(input.inputMode, effectiveScore, refs.length, reviewCount, passed);
    const previousIndex = Math.max(0, STAGES.indexOf(previous?.stage || "captured"));
    const observedIndex = STAGES.indexOf(observed);
    const stage = STAGES[Math.max(previousIndex, observedIndex)];
    const mastery = Number((passed ? Math.max(Number(previous?.mastery || 0) * 0.75, effectiveScore) : Number(previous?.mastery || 0) * 0.65).toFixed(3));
    const calibrationFlags = [...new Set([...(previous?.calibrationFlags || []), ...(calibration === "aligned" ? [] : [calibration])])];
    const state = {
      id: stateId(input.knowledgeRef), knowledgeRef: input.knowledgeRef, stage, mastery, evidenceRefs: refs,
      reviewCount, reviewIntervalDays: intervalDays, calibrationFlags,
      lastTestedAt: now.toISOString(), nextReviewAt: next.toISOString(), updated: now.toISOString(),
    };
    await validateContractRecord("learning-state", state);
    const evidenceFile = path.join(opsRoot, "reviews", "learning", "evidence", `${id}.md`);
    await writeRecord(artifactFile, artifact, { schema: "artifact", title: `User learning artifact ${artifactId}`, summaryKeys: ["id", "kind", "path", "created", "status", "size", "purpose"] });
    await writeRecord(evidenceFile, evidence, { schema: "learning-evidence", title: `Learning evidence ${id}`, summaryKeys: ["id", "knowledgeRef", "producer", "inputMode", "assistedLevel", "rubricScore", "selfAssessment", "calibration", "passed", "isReview", "demonstratedAt", "nextReviewAt"] });
    await writeRecord(stateFile, state, { schema: "learning-state", title: `Learning state: ${input.knowledgeRef}`, summaryKeys: ["id", "knowledgeRef", "stage", "mastery", "reviewCount", "reviewIntervalDays", "lastTestedAt", "nextReviewAt", "updated"] });
    return { artifact, evidence, state, changedPaths: [artifactFile, evidenceFile, stateFile].map((file) => path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")) };
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
  async listStates({ opsRoot = this.opsRoot } = {}) {
    const root = path.join(opsRoot, "reviews", "learning", "states");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const states = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      states.push(parseRecord(await fs.readFile(path.join(root, entry.name), "utf8")));
    }
    return states;
  }
}

export { ASSISTANCE, LearningService, REVIEW_INTERVALS, RUBRIC_KEYS, STAGES, calibrationFor, demonstratedStage, reviewIntervalDays, rubricScore, stateId };
