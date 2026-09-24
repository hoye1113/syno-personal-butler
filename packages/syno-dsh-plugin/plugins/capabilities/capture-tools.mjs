import { IngestWorkflowCoordinator } from "../../../../packages/syno-core/ingest-workflow-coordinator.mjs";
import { IngestService } from "../../../../packages/syno-core/ingest-service.mjs";
import { KnowledgeStore } from "../../../../packages/syno-core/knowledge-store.mjs";

const CAPTURE_START_TOOL_NAME = "syno_core_capture_start";
const CAPTURE_STATUS_TOOL_NAME = "syno_core_capture_status";
const CAPTURE_LIST_PENDING_TOOL_NAME = "syno_core_capture_list_pending";
const DEFAULT_OWNER_KEY = "local-user";

let sharedCoordinator = null;

function coordinatorFor({ coordinator } = {}) {
  if (coordinator) return coordinator;
  if (!sharedCoordinator) {
    sharedCoordinator = new IngestWorkflowCoordinator({
      ingest: new IngestService({ knowledge: new KnowledgeStore({}) }),
    });
  }
  return sharedCoordinator;
}

async function startCapture(input, { coordinator } = {}) {
  const result = await coordinatorFor({ coordinator }).receive(input, {
    ownerKey: DEFAULT_OWNER_KEY,
    channel: "web",
    threadKey: "main",
  });
  return JSON.stringify(result);
}

async function captureStatus({ artifactId } = {}, { coordinator } = {}) {
  const item = await coordinatorFor({ coordinator }).status(artifactId, { ownerKey: DEFAULT_OWNER_KEY });
  return JSON.stringify(item ? { found: true, item } : { found: false });
}

async function captureListPending({ coordinator } = {}) {
  return JSON.stringify(await coordinatorFor({ coordinator }).listPending(DEFAULT_OWNER_KEY));
}

export {
  CAPTURE_LIST_PENDING_TOOL_NAME,
  CAPTURE_START_TOOL_NAME,
  CAPTURE_STATUS_TOOL_NAME,
  captureListPending,
  captureStatus,
  startCapture,
};
