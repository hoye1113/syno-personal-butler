import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { APPROVED_TAGS, TAG_FORMAT, classifyTags, loadExtraApprovedTags, registerApprovedTags } from "../packages/syno-core/canonical-tags.mjs";

async function tmpOps(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "syno-tags-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test("classifyTags splits approved, applies aliases, keeps the rest as candidates", () => {
  const result = classifyTags(["article", "langgraphjs-tutorial", "agent_engineering", "  ", "article"]);
  assert.deepEqual(result.approved, ["article", "langgraphjs_tutorial"]);
  assert.deepEqual(result.candidates, ["agent_engineering"]);
});

test("classifyTags honors extra approved tags from the registry", () => {
  const result = classifyTags(["agent_engineering", "unknown_x"], new Set(["agent_engineering"]));
  assert.deepEqual(result.approved, ["agent_engineering"]);
  assert.deepEqual(result.candidates, ["unknown_x"]);
});

test("loadExtraApprovedTags returns empty set when registry file is missing", async (t) => {
  const ops = await tmpOps(t);
  assert.deepEqual([...(await loadExtraApprovedTags(ops))], []);
});

test("registerApprovedTags writes a sorted registry and is idempotent", async (t) => {
  const ops = await tmpOps(t);
  const first = await registerApprovedTags(ops, ["devops", "agent_engineering", " ci_cd "]);
  assert.deepEqual(first.added.sort(), ["agent_engineering", "ci_cd", "devops"]);
  assert.deepEqual(first.alreadyKnown, []);
  const file = JSON.parse(await fs.readFile(path.join(ops, "knowledge/approved-tags.json"), "utf8"));
  assert.deepEqual(file, { schema: "approved-tags", version: 1, approved: ["agent_engineering", "ci_cd", "devops"] });
  const second = await registerApprovedTags(ops, ["devops", "source_control", "article"]);
  assert.deepEqual(second.added, ["source_control"]);
  assert.deepEqual(second.alreadyKnown.sort(), ["article", "devops"]);
  const reloaded = await loadExtraApprovedTags(ops);
  for (const tag of ["agent_engineering", "ci_cd", "devops", "source_control"]) assert.ok(reloaded.has(tag));
  assert.ok(!reloaded.has("article"), "built-in tags stay out of the registry file");
  const classified = classifyTags(["agent_engineering", "source_control"], reloaded);
  assert.deepEqual(classified.candidates, []);
});

test("registerApprovedTags rejects malformed tags and out-of-range batches", async (t) => {
  const ops = await tmpOps(t);
  await assert.rejects(registerApprovedTags(ops, ["AgentOps", "ok_tag"]), { code: "TAGS_INVALID" });
  await assert.rejects(registerApprovedTags(ops, ["has-dash"]), { code: "TAGS_INVALID" });
  await assert.rejects(registerApprovedTags(ops, []), { code: "TAGS_INVALID" });
  await assert.rejects(registerApprovedTags(ops, Array.from({ length: 21 }, (_, i) => `tag_${i}`)), { code: "TAGS_INVALID" });
  await assert.rejects(fs.access(path.join(ops, "knowledge/approved-tags.json")), { code: "ENOENT" }, "rejected batches must not create the registry");
});

test("registry format matches TAG_FORMAT for every entry", async (t) => {
  const ops = await tmpOps(t);
  await registerApprovedTags(ops, ["agent_engineering"]);
  const file = JSON.parse(await fs.readFile(path.join(ops, "knowledge/approved-tags.json"), "utf8"));
  for (const tag of file.approved) assert.ok(TAG_FORMAT.test(tag));
  assert.ok(!file.approved.some((tag) => APPROVED_TAGS.has(tag)));
});
