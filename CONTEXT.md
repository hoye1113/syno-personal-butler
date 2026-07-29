# Syno Personal Butler

Syno is a single-owner knowledge butler that turns captured material into auditable knowledge, learning, review, and creation work without treating model output as the owner's mastery.

## Language

**ConversationSession**:
An OpenCode conversation context used to preserve dialogue continuity for one owner and thread.
_Avoid_: Workflow, task state, knowledge fact

**IngestWorkflow**:
The durable progress record for one capture from receipt through proposal, approval, validation, and reporting.
_Avoid_: Session, chat, Artifact

**Artifact**:
The isolated original input and its source metadata before it becomes accepted knowledge.
_Avoid_: Note, mastered knowledge

**IngestProposal**:
An auditable recommendation describing where and how an Artifact should become knowledge, including conflicts, relations, risk, and unresolved issues.
_Avoid_: Completed ingest, approval

**PendingDecision**:
One unexpired owner decision bound to an exact Job, thread, phase, and proposal or diff digest.
_Avoid_: Model recommendation, implicit consent

**KnowledgeRecord**:
An approved canonical record in `vault/` or `ops/`, with source and factual status preserved.
_Avoid_: Conversation memory, runtime cache

**LearningEvidence**:
Owner-produced typed, spoken, quiz, or practice evidence that may advance mastery.
_Avoid_: AI summary, captured note, recommendation
