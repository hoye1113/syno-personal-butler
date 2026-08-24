import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { KnowledgeStore, PROJECT_BOOST } from "../apps/syno/syno/knowledge-store.mjs";
import { ProjectService } from "../apps/syno/syno/project-service.mjs";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";

const PROJECT_A = "project-20260824-aaaaaaaa";
const PROJECT_B = "project-20260824-bbbbbbbb";

async function writeNote(vaultRoot, name, { title, projectRefs = [], body = "query" }) {
  const file = path.join(vaultRoot, "02-Resources", name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `---\ntitle: ${title}\ntags: [notes]\ncreated: 2026-08-24\nsource: test\n${projectRefs.length ? `project_refs: ${JSON.stringify(projectRefs)}\n` : ""}---\n\n# ${title}\n\n${body}\n`, "utf8");
  return path.relative(path.resolve(import.meta.dirname, ".."), file).replace(/\\/g, "/");
}

test("KnowledgeStore reads inline project_refs and applies only the fixed same-Project boost", async (t) => {
  const testRoot = path.join(path.resolve(import.meta.dirname, ".."), ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(testRoot, "syno-project-retrieval-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const vaultRoot = path.join(root, "vault");
  const indexFile = path.join(root, "index.json");
  const projectANote = await writeNote(vaultRoot, "project-a.md", { title: "Project Query", projectRefs: [PROJECT_A] });
  const projectBNote = await writeNote(vaultRoot, "project-b.md", { title: "General Query", projectRefs: [PROJECT_B] });
  const strongGeneral = await writeNote(vaultRoot, "strong-general.md", { title: "Strong Query", body: "query query query query query" });
  const weakProject = await writeNote(vaultRoot, "weak-project.md", { title: "Weak", projectRefs: [PROJECT_A], body: "query" });
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile });

  const baseline = await knowledge.search("query", { limit: 10 });
  const noProject = await knowledge.search("query", { limit: 10, projectRef: "" });
  assert.deepEqual(noProject.map(({ path: notePath, score, matchReasons }) => ({ path: notePath, score, matchReasons })), baseline.map(({ path: notePath, score, matchReasons }) => ({ path: notePath, score, matchReasons })));

  const aResults = await knowledge.search("query", { limit: 10, projectRef: PROJECT_A });
  const bResults = await knowledge.search("query", { limit: 10, projectRef: PROJECT_B });
  assert.equal(aResults[0].path, projectANote);
  assert.equal(bResults[0].path, projectBNote);
  assert.equal(aResults.find((item) => item.path === projectANote).score, baseline.find((item) => item.path === projectANote).score + PROJECT_BOOST);
  assert.ok(aResults.find((item) => item.path === projectANote).matchReasons.includes("project"));
  assert.equal(aResults.find((item) => item.path === projectBNote).score, baseline.find((item) => item.path === projectBNote).score);
  assert.equal(aResults.find((item) => item.path === strongGeneral).path, strongGeneral);
  assert.ok(aResults.find((item) => item.path === strongGeneral).score > aResults.find((item) => item.path === weakProject).score);

  const listed = await knowledge.list();
  assert.deepEqual(listed.find((item) => item.path === projectANote).projectRefs, [PROJECT_A]);
  assert.deepEqual(listed.find((item) => item.path === strongGeneral).projectRefs, []);
});

test("runtime injects Project context into knowledge.search without exposing it as model input and rejects wrong Owner", async (t) => {
  const testRoot = path.join(path.resolve(import.meta.dirname, ".."), ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(testRoot, "syno-project-runtime-search-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectService = new ProjectService({ opsRoot: path.join(root, "ops"), idFactory: () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" });
  await projectService.createProject({ title: "A", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a", projectRef: PROJECT_A });
  const knowledge = new KnowledgeStore({ vaultRoot: path.join(root, "vault"), indexFile: path.join(root, "index.json") });
  await writeNote(path.join(root, "vault"), "project-a.md", { title: "Project Query", projectRefs: [PROJECT_A] });
  const runtime = createSynoRuntime({ projects: projectService, knowledge });
  const definition = runtime.tools.resolve("knowledge.search");
  assert.equal(Object.hasOwn(definition.inputSchema.properties, "projectRef"), false);

  const result = await runtime.tools.execute("knowledge.search", { query: "query", limit: 5 }, { ownerId: "owner-a", projectRef: PROJECT_A });
  const expected = path.relative(path.resolve(import.meta.dirname, ".."), path.join(root, "vault", "02-Resources", "project-a.md")).replace(/\\/g, "/");
  assert.equal(result[0].path, expected);
  await assert.rejects(
    runtime.tools.execute("knowledge.search", { query: "query", limit: 5 }, { ownerId: "owner-b", projectRef: PROJECT_A }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
});
