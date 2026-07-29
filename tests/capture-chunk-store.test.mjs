import { promises as fs } from "node:fs";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureChunkStore, chunkIdentity } from "../apps/syno/syno/capture-chunk-store.mjs";

async function temporaryRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-capture-chunks-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("CaptureChunkStore resumes completed chunks and preserves identity versions", async (t) => {
  const root = await temporaryRoot(t);
  const store = new CaptureChunkStore({ root });
  const first = await store.ensure({
    workflowId: "workflow-chunk-1",
    sourceHash: "source-a",
    chunks: ["one", "two"],
    canonicalRulesDigest: "rules-a",
  });
  const claim = await store.claim(first.manifestId, first.chunks[0].chunkId);
  assert.equal(claim.chunk.status, "running");
  await store.complete(first.manifestId, first.chunks[0].chunkId, { value: "ONE" });
  const same = await store.ensure({
    workflowId: "workflow-chunk-1",
    sourceHash: "source-a",
    chunks: ["one", "two"],
    canonicalRulesDigest: "rules-a",
  });
  assert.equal(same.manifestId, first.manifestId);
  assert.equal((await store.get(first.manifestId)).chunks[0].status, "completed");
  assert.deepEqual(store.coverage(await store.get(first.manifestId)), { completed: 1, total: 2, ratio: 0.5, complete: false, incomplete: true });

  const changed = await store.ensure({
    workflowId: "workflow-chunk-1",
    sourceHash: "source-a",
    chunks: ["one", "two"],
    canonicalRulesDigest: "rules-b",
  });
  assert.notEqual(changed.manifestId, first.manifestId);
  assert.equal((await store.get(first.manifestId)).status, "invalidated");
  assert.equal((await store.get(first.manifestId)).chunks[0].status, "invalidated");
  assert.notEqual(chunkIdentity({ sourceHash: "source-a", chunkHash: "one", index: 1, total: 2, canonicalRulesDigest: "rules-a" }), chunkIdentity({ sourceHash: "source-a", chunkHash: "one", index: 1, total: 2, canonicalRulesDigest: "rules-b" }));
});

test("CaptureChunkStore recovers running chunks and refuses a second claim", async (t) => {
  const root = await temporaryRoot(t);
  const store = new CaptureChunkStore({ root });
  const manifest = await store.ensure({ workflowId: "workflow-chunk-2", sourceHash: "source-b", chunks: ["one"] });
  const first = await store.claim(manifest.manifestId, manifest.chunks[0].chunkId);
  assert.ok(first);
  assert.equal(await store.claim(manifest.manifestId, manifest.chunks[0].chunkId), null);
  assert.deepEqual(await store.recoverRunning(), { recovered: 1 });
  assert.ok(await store.claim(manifest.manifestId, manifest.chunks[0].chunkId));
});
