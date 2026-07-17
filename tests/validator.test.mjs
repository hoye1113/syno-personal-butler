import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { frontmatterData, validateVaultContract } from "../apps/syno/syno/validator.mjs";

const execFileAsync = promisify(execFile);

test("frontmatter tag parsing stops at the next top-level field", () => {
  const parsed = frontmatterData("---\ntags:\n  - notes\naliases:\n  - Must Not Become A Tag\n---\nbody\n");
  assert.deepEqual(parsed.tags, ["notes"]);
});

test("vault contract accepts source_url and rejects duplicate sources or new tags", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-vault-contract-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "config"), { recursive: true });
  await fs.mkdir(path.join(root, "vault"), { recursive: true });
  await fs.writeFile(path.join(root, "config", "vault-contract.json"), JSON.stringify({
    requiredFrontmatter: ["title", "tags", "created", "source", "description"],
    approvedTags: ["notes"],
    maxFilenameLength: 50,
    requireSemanticLinkOrOrphan: true,
  }));
  await fs.writeFile(path.join(root, "vault", "Existing.md"), note({ source: "https://example.test/existing" }));
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.name", "Syno Tests"]);
  await git(root, ["config", "user.email", "syno-tests@example.invalid"]);
  await git(root, ["add", "--", "config/vault-contract.json", "vault/Existing.md"]);
  await git(root, ["commit", "-m", "fixture"]);

  await fs.writeFile(path.join(root, "vault", "Valid.md"), note({ source: "https://example.test/new" }));
  await validateVaultContract(root, ["vault/Valid.md"], { intent: "curate_note" });

  await fs.writeFile(path.join(root, "vault", "Duplicate.md"), note({ source: "https://example.test/existing" }));
  await assert.rejects(
    validateVaultContract(root, ["vault/Duplicate.md"], { intent: "curate_note" }),
    /source 已存在/,
  );

  await fs.writeFile(path.join(root, "vault", "BadTag.md"), note({ source: "https://example.test/tag", tag: "invented_tag" }));
  await assert.rejects(
    validateVaultContract(root, ["vault/BadTag.md"], { intent: "curate_note" }),
    /未批准或非法 tag/,
  );
});

function note({ source, tag = "notes" }) {
  return [
    "---",
    "title: Contract fixture",
    "tags:",
    `  - ${tag}`,
    "created: 2026-07-17",
    `source_url: ${source}`,
    "description: Contract fixture",
    "status: orphan",
    "---",
    "",
    "Contract body.",
    "",
  ].join("\n");
}

async function git(cwd, args) {
  await execFileAsync("git", args, { cwd, windowsHide: true });
}
