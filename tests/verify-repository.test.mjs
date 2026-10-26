import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("repository verification accepts Git file lists larger than 1 MB", { timeout: 60_000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-verify-large-list-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await execFileAsync("git", ["init", "--quiet"], { cwd: root });
  const scriptsDir = path.join(root, "scripts");
  await fs.mkdir(scriptsDir, { recursive: true });
  const script = path.join(scriptsDir, "verify-repository.mjs");
  await fs.copyFile(path.resolve(import.meta.dirname, "../scripts/verify-repository.mjs"), script);
  for (const relative of ["apps/syno/server.mjs", "packages/syno-core/syno-core.mjs", "contracts/job.schema.json", "docs/ARCHITECTURE.md"]) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, relative.endsWith(".json") ? "{}\n" : "// fixture\n");
  }
  const count = 6_000;
  const ops = path.join(root, "ops");
  await fs.mkdir(ops);
  await Promise.all(Array.from({ length: count }, (_, index) =>
    fs.writeFile(path.join(ops, `${"x".repeat(175)}-${String(index).padStart(4, "0")}.md`), "fixture\n"),
  ));

  const { stdout } = await execFileAsync(process.execPath, [script], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  assert.equal(stdout, `Repository verification passed (${count + 5} files).\n`);
});
