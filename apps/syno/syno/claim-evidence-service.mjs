import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { validateContractRecord } from "./schema-registry.mjs";

class ClaimEvidenceService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) { this.opsRoot = opsRoot; this.clock = clock; }

  async createClaim(input, { opsRoot = this.opsRoot } = {}) {
    const now = this.clock().toISOString();
    const claim = {
      id: `claim-${randomUUID().slice(0, 8)}`, statement: String(input.statement || "").trim(),
      stability: input.stability, status: "candidate", evidenceRefs: [], conflictsWith: [],
      ...(input.reviewAfter ? { reviewAfter: input.reviewAfter } : {}), updated: now,
    };
    await validateContractRecord("claim", claim);
    const file = path.join(opsRoot, "evidence", "claims", `${claim.id}.md`);
    await writeRecord(file, claim, { schema: "claim", title: claim.statement, summaryKeys: ["id", "stability", "status", "reviewAfter", "updated"] });
    return { claim, changedPaths: [path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")] };
  }

  async createEvidenceCandidate(input, { opsRoot = this.opsRoot } = {}) {
    const now = this.clock().toISOString();
    const claimFile = path.join(opsRoot, "evidence", "claims", `${String(input.claimId || "")}.md`);
    try { await fs.access(claimFile); } catch (error) { if (error.code === "ENOENT") throw new Error(`Claim 不存在：${input.claimId}`); throw error; }
    const evidence = {
      id: `evidence-${randomUUID().slice(0, 8)}`, sourceRef: input.sourceRef, sourceTier: input.sourceTier,
      stance: input.stance, status: "candidate", excerpt: String(input.excerpt || "").slice(0, 2_000), observedAt: input.observedAt || now,
    };
    await validateContractRecord("evidence", evidence);
    const candidate = { id: `evidence-candidate-${randomUUID().slice(0, 8)}`, claimId: input.claimId, evidence, status: "pending", created: now };
    await validateContractRecord("evidence-candidate", candidate);
    const file = path.join(opsRoot, "evidence", "candidates", `${candidate.id}.md`);
    await writeRecord(file, candidate, { schema: "evidence-candidate", title: `Evidence candidate for ${input.claimId}`, summaryKeys: ["id", "claimId", "status", "created"] });
    return { candidate, changedPaths: [path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")] };
  }

  async approveCandidate(input, { opsRoot = this.opsRoot } = {}) {
    const candidateId = String(input.candidateId || "");
    if (!/^evidence-candidate-[a-z0-9-]+$/.test(candidateId)) throw new Error("EvidenceCandidate ID 无效");
    const candidateFile = path.join(opsRoot, "evidence", "candidates", `${candidateId}.md`);
    const candidate = parseRecord(await fs.readFile(candidateFile, "utf8"));
    if (candidate.status !== "pending") throw new Error("EvidenceCandidate 已处理");
    const now = this.clock().toISOString();
    const evidence = { ...candidate.evidence, status: "verified", verifiedAt: now };
    await validateContractRecord("evidence", evidence);
    const evidenceFile = path.join(opsRoot, "evidence", "records", `${evidence.id}.md`);
    await writeRecord(evidenceFile, evidence, { schema: "evidence", title: `Evidence ${evidence.id}`, summaryKeys: ["id", "sourceRef", "sourceTier", "stance", "status", "observedAt", "verifiedAt"] });
    const claimFile = path.join(opsRoot, "evidence", "claims", `${candidate.claimId}.md`);
    const claim = parseRecord(await fs.readFile(claimFile, "utf8"));
    const evidenceRefs = [...new Set([...(claim.evidenceRefs || []), evidence.id])];
    const conflictsWith = evidence.stance === "contradicts"
      ? [...new Set([...(claim.conflictsWith || []), evidence.id])]
      : [...new Set(claim.conflictsWith || [])];
    const updatedClaim = {
      ...claim,
      evidenceRefs,
      conflictsWith,
      status: conflictsWith.length ? "contested" : "supported",
      updated: now,
    };
    await validateContractRecord("claim", updatedClaim);
    await writeRecord(claimFile, updatedClaim, { schema: "claim", title: updatedClaim.statement, summaryKeys: ["id", "stability", "status", "reviewAfter", "updated"] });
    const updated = { ...candidate, evidence, status: "approved" };
    await writeRecord(candidateFile, updated, { schema: "evidence-candidate", title: `Evidence candidate for ${candidate.claimId}`, summaryKeys: ["id", "claimId", "status", "created"] });
    return {
      evidence, claimId: candidate.claimId,
      changedPaths: [candidateFile, evidenceFile, claimFile].map((file) => path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")),
    };
  }

  async dueClaims({ opsRoot = this.opsRoot, now = this.clock(), limit = 50 } = {}) {
    const root = path.join(opsRoot, "evidence", "claims");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const claims = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const claim = parseRecord(await fs.readFile(path.join(root, entry.name), "utf8"));
      if (claim.reviewAfter && new Date(claim.reviewAfter) <= now && claim.status !== "superseded") claims.push(claim);
    }
    return claims.sort((a, b) => a.reviewAfter.localeCompare(b.reviewAfter)).slice(0, limit);
  }
  async listClaims({ opsRoot = this.opsRoot, status } = {}) {
    const root = path.join(opsRoot, "evidence", "claims");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const claims = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const claim = parseRecord(await fs.readFile(path.join(root, entry.name), "utf8"));
      if (!status || claim.status === status) claims.push(claim);
    }
    return claims;
  }
}

export { ClaimEvidenceService };
