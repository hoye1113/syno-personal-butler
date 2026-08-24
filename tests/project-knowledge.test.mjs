import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { ProjectService } from "../apps/syno/syno/project-service.mjs";
import { frontmatterData } from "../apps/syno/syno/validator.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

const PROJECT_REF = "project-20260824-a1b2c3d4";

function fixedClock() {
  return new Date("2026-08-24T10:00:00.000Z");
}

async function fixture(t, { existingNote = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-project-knowledge-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const opsRoot = path.join(root, "ops");
  const vaultRoot = path.join(root, "vault");
  const projectService = new ProjectService({
    opsRoot,
    clock: fixedClock,
    idFactory: () => "a1b2c3d4-a1b2-c3d4-a1b2-c3d4a1b2c3d4",
  });
  const project = await projectService.createProject({ title: "知识 MVP", objective: "验证项目关联", doneCondition: "往返通过" }, { ownerKey: "owner-a" });
  if (existingNote) {
    await fs.mkdir(path.join(vaultRoot, "02-Resources"), { recursive: true });
    await fs.writeFile(path.join(vaultRoot, "02-Resources", "existing.md"), "---\ntitle: Existing\ntags: [notes]\ncreated: 2026-08-24\nsource: local\ndescription: existing\nknowledge_state: captured\nlink_status: orphan\nfactual_status: unverified\n---\n\n# Existing\n\nExisting note.\n", "utf8");
  }
  const service = new IngestService({
    intake: { async prepare(payload) { return { sourceType: payload.kind, text: payload.value, content: payload.value, title: "Project knowledge" }; } },
    knowledge: existingNote
      ? { async search() { return [{ path: "vault/02-Resources/existing.md", title: "Existing", excerpt: "existing", sensitive: false }]; } }
      : { async search() { return []; } },
    opsRoot,
    stateRoot: path.join(root, "ingest-state"),
    projectService,
    clock: fixedClock,
  });
  return { root, opsRoot, vaultRoot, projectService, project: project.project, service };
}

test("Project references survive proposal, apply, Markdown frontmatter and lifecycle reload", async (t) => {
  const { root, projectService, project, service } = await fixture(t);
  assert.equal(project.projectRef, PROJECT_REF);
  const receipt = await service.receive({ kind: "text", value: "项目知识正文" }, { ownerId: "owner-a", projectRef: project.projectRef });
  const proposed = await service.propose(receipt.artifact.id);
  assert.deepEqual(proposed.proposal.suggestedProjectRefs, [PROJECT_REF]);
  await validateContractRecord("ingest-proposal", proposed.proposal);

  await projectService.updateProjectStatus(PROJECT_REF, "completed", { ownerKey: "owner-a" });
  const applied = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "create" } });
  const noteText = await fs.readFile(path.join(root, applied.path), "utf8");
  assert.match(noteText, /^project_refs: \["project-20260824-a1b2c3d4"\]$/m);
  assert.equal(frontmatterData(noteText).values.project_refs, `["${PROJECT_REF}"]`);
  assert.deepEqual(applied.lifecycle.proposal.suggestedProjectRefs, [PROJECT_REF]);
  assert.equal((await service.status(receipt.artifact.id)).proposal.suggestedProjectRefs[0], PROJECT_REF);
  await validateContractRecord("note", { path: applied.path, title: "Project knowledge", project_refs: [PROJECT_REF] });
});

test("Project relation validation fails before canonical write for invalid or wrong-owner references", async (t) => {
  const { root, project, service } = await fixture(t);
  await assert.rejects(
    service.receive({ kind: "text", value: "invalid" }, { ownerId: "owner-a", projectRef: "project-20260824-deadbeef" }),
    (error) => error.code === "PROJECT_NOT_FOUND",
  );
  await assert.rejects(
    service.receive({ kind: "text", value: "wrong owner" }, { ownerId: "owner-b", projectRef: project.projectRef }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
  const files = await fs.readdir(path.join(root, "ingest-state")).catch(() => []);
  assert.deepEqual(files, []);
  assert.equal((await fs.readdir(path.join(root, "vault"), { withFileTypes: true }).catch(() => [])).length, 0);
});

test("existing-note append keeps the deferred project-link behavior", async (t) => {
  const { root, project, service } = await fixture(t, { existingNote: true });
  const receipt = await service.receive({ kind: "text", value: "补充已有笔记" }, { ownerId: "owner-a", projectRef: project.projectRef });
  await service.propose(receipt.artifact.id);
  const applied = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "append-source" } });
  const existing = await fs.readFile(path.join(root, "vault/02-Resources/existing.md"), "utf8");
  assert.equal(applied.action, "append-source");
  assert.doesNotMatch(existing, /^project_refs:/m);
});

test("Project reference arrays are unique in Note and Proposal contracts", async () => {
  await assert.rejects(
    validateContractRecord("note", { path: "vault/00-Inbox/project.md", title: "Project", project_refs: [PROJECT_REF, PROJECT_REF] }),
    /含重复项/,
  );
  await assert.rejects(
    validateContractRecord("ingest-proposal", {
      id: "ingest-project", candidateId: "candidate-project", status: "proposed", suggestedPath: "vault/00-Inbox/project.md",
      suggestedTags: [], suggestedLinks: [], suggestedProjectRefs: [PROJECT_REF, PROJECT_REF],
      sourceDescriptor: { kind: "text", canonicalUrl: "", originalFilename: "", contentSha256: "", sourceTier: "C3", reliability: "unverified", verificationStatus: "unverified" },
      sourceType: "text", quality: { status: "pending", reasons: [] }, materialTier: "unrated", canonicalTags: [],
      duplicateAssessment: { matches: [], sameSource: false, updateStatus: "new" }, relations: [], mocChanges: [],
      claimCandidates: [], evidenceCandidates: [], unresolved: [], validators: [], risk: "additive", sourceDigest: "a".repeat(64),
      proposalDigest: "b".repeat(64), created: "2026-08-24T10:00:00.000Z",
    }),
    /含重复项/,
  );
});
