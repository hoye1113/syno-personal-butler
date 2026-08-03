import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveInside } from "../apps/syno/syno/paths.mjs";

// Guards the R1/R2(server) path-confinement fixes in apps/syno/server.mjs
// (editVaultNote / promoteMemoryProposal): they strip the literal sub-tree prefix and
// resolve against that sub-root, relying on resolveInside to reject any `..` escape PAST
// the sub-root (not merely past the repo root). These tests pin that semantics.

test("resolveInside confines to a sub-root and rejects '..' escapes past it", () => {
  const root = path.join(process.cwd(), "tmp-path-confinement-root");
  const vaultRoot = path.join(root, "vault");
  // legitimate vault path resolves inside the vault
  assert.equal(resolveInside(vaultRoot, "01-Areas/note.md"), path.join(vaultRoot, "01-Areas", "note.md"));
  // a payload whose string prefix looks valid ("vault/..") must be rejected once confined to vault root
  assert.throws(() => resolveInside(vaultRoot, "../ops/evil.md"), (error) => error.code === "PATH_OUTSIDE_ROOT");
  assert.throws(() => resolveInside(vaultRoot, "../../etc/passwd"), (error) => error.code === "PATH_OUTSIDE_ROOT");
});

test("resolveInside against the proposals root rejects a nested '..' the legacy regex would allow", () => {
  const root = path.join(process.cwd(), "tmp-path-confinement-root");
  const proposalsRoot = path.join(root, "ops", "memory", "proposals");
  // "ops/memory/proposals/../../content/x.md" matches /^ops\/memory\/proposals\/.*\.md$/ but escapes
  const stripped = "ops/memory/proposals/../../content/x.md".slice("ops/memory/proposals/".length);
  assert.throws(() => resolveInside(proposalsRoot, stripped), (error) => error.code === "PATH_OUTSIDE_ROOT");
});
