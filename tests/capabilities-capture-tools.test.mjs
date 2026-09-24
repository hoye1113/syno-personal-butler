import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { IngestService } from "../packages/syno-core/ingest-service.mjs";
import { IngestWorkflowCoordinator, IngestWorkflowStore } from "../packages/syno-core/ingest-workflow-coordinator.mjs";
import { IntakeService } from "../packages/syno-core/intake.mjs";
import { KnowledgeStore } from "../packages/syno-core/knowledge-store.mjs";
import {
  captureListPending,
  captureStatus,
  startCapture,
} from "../packages/syno-dsh-plugin/plugins/capabilities/capture-tools.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-capabilities-capture-"));
  const pending = [];
  t.after(async () => {
    await Promise.allSettled(pending);
    await fs.rm(root, { recursive: true, force: true });
  });
  const vaultRoot = path.join(root, "vault");
  await fs.mkdir(vaultRoot, { recursive: true });
  const coordinator = new IngestWorkflowCoordinator({
    ingest: new IngestService({
      intake: new IntakeService({ runtimeRoot: path.join(root, "runtime") }),
      knowledge: new KnowledgeStore({ vaultRoot, indexFile: path.join(root, "index.json") }),
      opsRoot: path.join(root, "ops"),
      stateRoot: path.join(root, "ingest-state"),
    }),
    store: new IngestWorkflowStore({ root: path.join(root, "workflows") }),
    schedule: (work) => {
      const task = Promise.resolve().then(work).catch(() => {});
      pending.push(task);
    },
  });
  return { coordinator };
}

test("capabilities capture start/status/list_pending share one workflow record", async (t) => {
  const { coordinator } = await fixture(t);

  assert.equal(JSON.parse(await captureListPending({ coordinator })).length, 0);

  const started = JSON.parse(await startCapture({ kind: "text", value: "收录测试内容" }, { coordinator }));
  assert.equal(started.duplicate, false);
  assert.ok(started.workflow.id);
  assert.equal(typeof started.artifact.id, "string");

  const status = JSON.parse(await captureStatus({ artifactId: started.artifact.id }, { coordinator }));
  assert.equal(status.found, true);
  assert.equal(status.item.artifactId, started.artifact.id);

  const pending = JSON.parse(await captureListPending({ coordinator }));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, started.workflow.id);
});

test("capabilities capture repeated start is a duplicate replay, not a second workflow", async (t) => {
  const { coordinator } = await fixture(t);
  const first = JSON.parse(await startCapture({ kind: "text", value: "同一份内容" }, { coordinator }));
  const again = JSON.parse(await startCapture({ kind: "text", value: "同一份内容" }, { coordinator }));
  assert.equal(first.duplicate, false);
  assert.equal(again.duplicate, true);
  assert.equal(again.workflow.id, first.workflow.id);
  assert.equal(JSON.parse(await captureListPending({ coordinator })).length, 1);
});
