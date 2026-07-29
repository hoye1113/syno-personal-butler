import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the deprecated standalone Worker cannot construct a second Runtime", async () => {
  const source = await readFile(new URL("../apps/syno/worker.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createSynoRuntime|initialize\s*\(/);
  assert.match(source, /已废弃/);
  assert.match(source, /唯一 Syno Host/);
});
