// P3.0 unified host: one fact log, one rule set and replaceable Domain Specialists.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { executeNative, openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { parseRules } from "../../packages/syno-autoloop/protocol/rules.ts";
import { GitGuard } from "../../packages/syno-core/git-guard.mjs";
import { TaskWorkspaceManager } from "../../packages/syno-core/task-workspace.mjs";
import { openHostHandover } from "./host-handover.mjs";
import { openHostOperations } from "./host-operations.mjs";
import { ideaContextId, ideaIndexKey } from "./idea-object.mjs";
import { openNativeCaptureRuntime } from "./native-capture-runtime.mjs";
import { openNativeDecisionRuntime } from "./native-decision-runtime.mjs";
import { openNativeIdeaRuntime } from "./native-idea-runtime.mjs";
import { openNativeKnowledgeRuntime } from "./native-knowledge-runtime.mjs";
import { openNativeMemoryRuntime } from "./native-memory-runtime.mjs";
import { openNativeProjectRuntime } from "./native-project-runtime.mjs";
import { projectContextId, projectIndexKey } from "./project-object.mjs";
import { routeRoot } from "./root-router.mjs";

const ENVIRONMENT = { secret: "syno-p3-isolated-native-test", publicUrl: "" };

export function openNativeButlerRuntime({
  databasePath, vaultRoot, sourcePath, sourceUrl, indexFile, resultRoot,
  ideaRoot = path.join(vaultRoot, "03-Ideas"), projectRoot = path.join(vaultRoot, "04-Projects"),
  memoryRoot = path.join(vaultRoot, "05-Memory"), now = () => Date.now(), decisionTtlMs,
  // A Git knowledge repository opts the Host into isolated project writes: the project Specialist then produces
  // candidates in TaskWorkspaceManager worktrees and merges only pinned, Result-Lane-approved commits.
  repoRoot = null, worktreeRoot = null, gitGuard = null, projectWorkspaceManager = null,
  legacyProjectRoot = null,
}) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  const rules = parseRules(JSON.stringify({
    timezone: "Asia/Shanghai",
    sources: { "feishu-test": { name: "独立飞书测试" } },
    agents: {
      capture: { name: "OpenCode 收录", worker: "syno-p1", use: "command", command: ["true"] },
      knowledge: { name: "本地知识查询", worker: "syno-p2", use: "command", command: ["true"] },
      idea: { name: "想法候选 Worker", worker: "syno-p3-idea", use: "command", command: ["true"] },
      project: { name: "项目执行 Worker", worker: "syno-p3-project", use: "command", command: ["true"] },
      memory: { name: "记忆状态变更 Worker", worker: "syno-p3-memory", use: "command", command: ["true"] },
    },
    rules: [
      {
        name: "公开文章收录", when: { source: "feishu-test", types: ["capture.request"] }, to: "capture",
        cwd: vaultRoot, prompt: "由宿主沙箱 Worker 执行；原生 done 不结算业务 Task", group: "syno-p1-capture", tell: "never",
      },
      {
        name: "对象知识查询", when: { source: "feishu-test", types: ["knowledge.query"] }, to: "knowledge",
        cwd: vaultRoot, prompt: "只读 Worker 生成候选；宿主独立复核引用后结算", group: "syno-p2-knowledge", parallel: 2, tell: "never",
      },
      {
        name: "想法对象处理", when: { source: "feishu-test", types: ["idea.request"] }, to: "idea",
        cwd: vaultRoot, prompt: "Worker 只生成想法候选；宿主独立复核版本与引用后结算", group: "syno-p3-idea", parallel: 4, tell: "never",
      },
      {
        name: "项目执行", when: { source: "feishu-test", types: ["project.request"] }, to: "project",
        cwd: vaultRoot, prompt: "Worker 只生成项目步骤正文；宿主独立复核步骤依赖与 manifest 后结算", group: "syno-p3-project", parallel: 3, tell: "never",
      },
      {
        name: "记忆状态变更", when: { source: "feishu-test", types: ["memory.request"] }, to: "memory",
        cwd: vaultRoot, prompt: "Worker 只返回记忆候选快照；宿主独立复核版本、Owner、值哈希与 Result Lane 后结算",
        group: "syno-p3-memory", parallel: 3, tell: "never",
      },
    ],
  }), now(), "Asia/Shanghai");
  const currentRules = openBusinessView(db).get("config", "rules");
  if (!currentRules || JSON.stringify(currentRules.value) !== JSON.stringify(rules)) {
    executeNative(db, "rules", [rules], now(), ENVIRONMENT);
  }
  const contextVersion = (contextId) => openBusinessView(db).get("records", `context:${contextId}`)?.version ?? null;
  const decisions = openNativeDecisionRuntime({
    databasePath, now, db, decisionTtlMs,
    objectVersion: (contextId) => contextVersion(contextId),
  });
  // Scope is host-resolved: the referenced idea/project must exist in the shared fact log before anything is written.
  const scopeObjectExists = ({ kind, objectId }) => Boolean(
    openBusinessView(db).get("records", kind === "idea" ? ideaIndexKey(objectId) : projectIndexKey(objectId)),
  );
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : (gitGuard?.repoRoot ? path.resolve(gitGuard.repoRoot) : null);
  const resolvedWorktreeRoot = worktreeRoot ?? gitGuard?.worktreeRoot
    ?? (resolvedRepoRoot ? path.join(resolvedRepoRoot, ".worktrees") : null);
  const workspaceManager = projectWorkspaceManager ?? (resolvedRepoRoot
    ? new TaskWorkspaceManager({
      // D13.4: the auto-assembled Host guard keeps the product hard gate — project artifacts only merge back to main.
      gitGuard: gitGuard ?? new GitGuard({ repoRoot: resolvedRepoRoot, worktreeRoot: resolvedWorktreeRoot, productBranch: "main" }),
      sharedRoot: resolvedRepoRoot,
      worktreeRoot: resolvedWorktreeRoot,
    })
    : null);
  const specialists = new Map([
    ["capture", openNativeCaptureRuntime({ databasePath, vaultRoot, sourcePath, sourceUrl, now, db, configureRules: false })],
    ["knowledge", openNativeKnowledgeRuntime({ databasePath, vaultRoot, indexFile, resultRoot, now, db, configureRules: false })],
    ["idea", openNativeIdeaRuntime({ databasePath, vaultRoot, ideaRoot, now, db, configureRules: false })],
    ["project", openNativeProjectRuntime({
      databasePath, vaultRoot, projectRoot, now, db, configureRules: false, workspaceManager, legacyProjectRoot,
    })],
    ["memory", openNativeMemoryRuntime({ databasePath, vaultRoot, memoryRoot, now, db, configureRules: false, decisions, scopeObjectExists })],
  ]);
  const captureSources = new Map([["default", specialists.get("capture")]]);
  const captureSource = ({ sourcePath: dynamicPath, sourceUrl: dynamicUrl, sourceMaterial }) => {
    const key = `${dynamicPath}\0${dynamicUrl}\0${sourceMaterial || ""}`;
    if (!captureSources.has(key)) {
      captureSources.set(key, openNativeCaptureRuntime({
        databasePath, vaultRoot, sourcePath: dynamicPath, sourceUrl: dynamicUrl, sourceMaterial, now, db, configureRules: false,
      }));
    }
    return captureSources.get(key);
  };
  const handover = openHostHandover({ db, now });
  const operations = openHostOperations({ db, now, handover });

  function route(text, documentIds) {
    const ideas = specialists.get("idea").ideas();
    const projects = specialists.get("project").projects();
    const versions = {};
    for (const idea of ideas) versions[ideaContextId(idea.ideaId)] = contextVersion(ideaContextId(idea.ideaId));
    for (const project of projects) versions[projectContextId(project.projectId)] = contextVersion(projectContextId(project.projectId));
    return routeRoot({
      text,
      sourceUrl,
      documentIds,
      ideaIds: ideas.map((idea) => idea.ideaId),
      projectIds: projects.map((project) => project.projectId),
      versions,
    });
  }

  /** Create (but never auto-select) a route.select Decision from a genuine multi-candidate question. */
  function createRouteDecision(message, routed = null) {
    const result = routed ?? route(message.text, message.documentIds);
    if (result.status !== "ambiguous" || !result.decisionCandidates?.length || !result.frozen) {
      return { status: result.status, routed: result };
    }
    const decision = decisions.createRouteDecision({
      ownerId: message.ownerId,
      appId: message.appId,
      originMessageId: message.messageId,
      originContext: result.decisionCandidates[0].contextId,
      action: result.frozen,
      candidates: result.decisionCandidates,
    });
    return { status: "ambiguous", domain: result.domain, decision, routed: result };
  }

  function selectRoute(message, { decisionId, candidateId }) {
    const consumed = decisions.consume({
      ownerId: message.ownerId, appId: message.appId, messageId: message.messageId, decisionId, candidateId,
    });
    if (consumed.status !== "consumed") return consumed;
    const receipt = consumed.receipt;
    const specialist = specialists.get(receipt.domain);
    const args = {
      appId: message.appId, messageId: message.messageId, chatId: message.chatId,
      ownerId: message.ownerId, worker: message.worker, action: receipt.action,
    };
    if (receipt.domain === "idea") {
      args.ideaId = receipt.objectId;
      args.prompt = receipt.frozen.prompt;
    } else {
      args.projectId = receipt.objectId;
      args.revision = receipt.frozen.revision;
    }
    const execution = specialist.begin(args);
    // Isolated project writes prepare a worktree during begin; non-isolated Specialists stay synchronous.
    if (execution instanceof Promise) {
      return execution.then((resolved) => ({ status: "routed", domain: receipt.domain, decisionId, candidateId, receipt, execution: resolved }));
    }
    return { status: "routed", domain: receipt.domain, decisionId, candidateId, receipt, execution };
  }

  function confirmDecision(message, { decisionId }) {
    const decision = decisions.get(decisionId);
    if (!decision) throw new Error(`未知 Decision：${decisionId}`);
    if (decision.decisionKind !== "memory.confirm") return { status: "requires_candidate", decisionId };
    const execution = specialists.get("memory").begin({
      ...message, decisionId, action: decision.binding.operation,
    });
    return { status: execution.status ?? "routed", domain: "memory", decisionId, execution };
  }

  /** Minimal host wiring: parse one inbound text, then either ask, select, confirm or dispatch to a Specialist. */
  function handle(message) {
    const routed = route(message.text, message.documentIds);
    if (routed.status === "routed" && routed.domain === "memory") {
      const memory = specialists.get("memory");
      if (routed.action === "propose") {
        return {
          ...routed,
          result: memory.propose({
            ...message, scope: routed.scope, sourceText: routed.sourceText,
            preference: message.preference ?? routed.sourceText,
          }),
        };
      }
      if (routed.action === "correct") {
        return {
          ...routed,
          result: memory.correct({
            ...message, memoryId: routed.memoryId, expectedVersion: routed.expectedVersion,
            preference: message.preference ?? routed.preference,
          }),
        };
      }
      return {
        ...routed,
        result: memory.forget({
          ...message, memoryId: routed.memoryId, expectedVersion: routed.expectedVersion,
        }),
      };
    }
    if (routed.status === "routed" && routed.domain === "decision") {
      return routed.action === "select" ? selectRoute(message, routed) : confirmDecision(message, routed);
    }
    if (routed.status === "ambiguous" && routed.decisionCandidates?.length) {
      return createRouteDecision(message, routed);
    }
    return routed;
  }

  return {
    specialists,
    decisions,
    handover,
    operations,
    status: () => operations.status(),
    migrationSnapshot: () => operations.migrationSnapshot(),
    specialist: (domain) => specialists.get(domain),
    captureSource,
    route,
    createRouteDecision,
    selectRoute,
    confirmDecision,
    handle,
    queued: (domain) => specialists.get(domain)?.queued() ?? [],
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => db.close(),
  };
}
