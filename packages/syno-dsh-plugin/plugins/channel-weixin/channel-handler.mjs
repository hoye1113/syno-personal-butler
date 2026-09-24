import { CapabilityPresenter } from "../../../../packages/syno-core/capability-presenter.mjs";
import { ChannelContinuationStore } from "../../../../packages/syno-core/channel-continuation-store.mjs";
import { ChannelConversationHandler } from "../../../../packages/syno-core/channel-conversation-handler.mjs";
import { ChannelIntentRouter } from "../../../../packages/syno-core/channel-intent-router.mjs";
import { IngestService } from "../../../../packages/syno-core/ingest-service.mjs";
import { IngestWorkflowCoordinator } from "../../../../packages/syno-core/ingest-workflow-coordinator.mjs";
import { InspirationStore } from "../../../../packages/syno-core/inspiration-store.mjs";
import { KnowledgeStore } from "../../../../packages/syno-core/knowledge-store.mjs";
import { PendingDecisionStore } from "../../../../packages/syno-core/pending-decision.mjs";

function createWeixinChannelHandler({
  runtime,
  core,
  knowledge = null,
  ingest = null,
  ingestWorkflows = null,
  pendingDecisions = null,
  channelContinuations = null,
  inspirationStore = null,
  journal = null,
} = {}) {
  if (!runtime) throw new Error("通道处理器需要 runtime");
  if (!core) throw new Error("通道处理器需要 core（SynoCore 门面）");
  const store = knowledge || new KnowledgeStore({});
  const ingestService = ingest || new IngestService({ knowledge: store });
  return new ChannelConversationHandler({
    runtime,
    core,
    ingest: ingestService,
    ingestWorkflows: ingestWorkflows || new IngestWorkflowCoordinator({ ingest: ingestService }),
    pendingDecisions: pendingDecisions || new PendingDecisionStore(),
    channelContinuations: channelContinuations || new ChannelContinuationStore(),
    inspirationStore: inspirationStore || new InspirationStore(),
    intentRouter: new ChannelIntentRouter(),
    capabilityPresenter: new CapabilityPresenter(),
    ...(journal ? { journal } : {}),
  });
}

export { createWeixinChannelHandler };
