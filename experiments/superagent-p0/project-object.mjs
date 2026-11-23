// P3.2 project objects: stable IDs, fixed step plan, versioned artifact paths, canonical manifest and a body-free router.
import { createHash } from "node:crypto";
import path from "node:path";

export const PROJECT_ID = /^project-[a-f0-9]{16}$/u;
export const PROJECT_CONTEXT_PREFIX = "project:";
export const PROJECT_INDEX_PREFIX = "project-index:";
export const PROJECT_INPUT_PREFIX = "project-input:";
export const PROJECT_STEP_PREFIX = "project-step:";
export const PROJECT_WORKSPACE_PREFIX = "project-workspace:";

/** The only project type the host may execute: a versioned local Markdown brief. */
export const PROJECT_TYPE = "markdown-brief-v1";
export const MANIFEST_SCHEMA = "syno-project-manifest-v1";

/** Fixed three-step plan. A caller can only supply step bodies; it can never choose dependencies or paths. */
export const STEPS = [
  { id: "outline", dependsOn: [], file: "outline.md" },
  { id: "deliverable", dependsOn: ["outline"], file: "deliverable.md" },
  { id: "manifest", dependsOn: ["outline", "deliverable"], file: "manifest.json" },
];
export const STEP_IDS = STEPS.map((step) => step.id);

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const stepById = (stepId) => STEPS.find((step) => step.id === stepId) ?? null;

export function assertProjectId(projectId) {
  if (!PROJECT_ID.test(String(projectId))) throw new Error(`非法项目 ID：${projectId}`);
  return projectId;
}

export function assertPlanVersion(planVersion) {
  if (!Number.isSafeInteger(planVersion) || planVersion < 1) throw new Error(`非法计划版本：${planVersion}`);
  return planVersion;
}

/** A new project's ID is bound to the inbound message, so replay and crash recovery resolve the same object. */
export const projectIdForMessage = ({ appId, messageId }) =>
  `project-${sha256(`${appId}:${messageId}`).slice(0, 16)}`;

export const projectContextId = (projectId) => `${PROJECT_CONTEXT_PREFIX}${projectId}`;
export const projectIndexKey = (projectId) => `${PROJECT_INDEX_PREFIX}${projectId}`;
export const projectInputKey = (taskId) => `${PROJECT_INPUT_PREFIX}${taskId}`;
export const projectStepKey = (taskId, stepId) => `${PROJECT_STEP_PREFIX}${taskId}:${stepId}`;
export const projectWorkspaceKey = (taskId) => `${PROJECT_WORKSPACE_PREFIX}${taskId}`;

/** Worktree identity is derived from the Task, never from a project or version, so a retry cannot fork a second one. */
export const projectWorkspaceTaskId = (taskId) => `syno-project-${sha256(`project-workspace:${taskId}`).slice(0, 32)}`;

export const projectVersionRelative = (projectId, planVersion) => {
  assertProjectId(projectId);
  assertPlanVersion(planVersion);
  return `${projectId}/v${planVersion}`;
};

export const projectStepRelativePath = (projectId, planVersion, stepId) => {
  const step = stepById(stepId);
  if (!step) throw new Error(`未知项目步骤：${stepId}`);
  return `${projectVersionRelative(projectId, planVersion)}/${step.file}`;
};

export const projectStepPath = (root, projectId, planVersion, stepId) =>
  path.join(root, projectStepRelativePath(projectId, planVersion, stepId));

export const projectStepAbsolute = (root, relativePath) => path.join(root, relativePath);

const ABSOLUTE_PATH = /(?:^|[\s"'`(])\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]*/u;
const WINDOWS_PATH = /(?:^|[\s"'`(])[A-Za-z]:[\\/]/u;
const PARENT_PATH = /(?:^|[\\/])\.\.(?:[\\/]|$)/u;
const PROJECT_REF = /project-[a-f0-9]{16}/gu;

/** A step body is free Markdown, but it may not smuggle in a path, an escape or another project's artifacts. */
export function assertStepBody(text, { projectId }) {
  const body = typeof text === "string" ? text : String(text ?? "");
  if (!body.trim()) throw new Error("步骤正文不能为空");
  if (ABSOLUTE_PATH.test(body) || WINDOWS_PATH.test(body)) throw new Error("步骤正文不得包含绝对路径");
  if (PARENT_PATH.test(body)) throw new Error("步骤正文不得包含上跳路径");
  const foreign = [...body.matchAll(PROJECT_REF)].map((match) => match[0]).filter((ref) => ref !== projectId);
  if (foreign.length) throw new Error("步骤正文不得引用其他项目");
  return body;
}

export function resolveProjectRequest(text, knownIds = []) {
  const normalized = String(text).trim();
  const candidates = [...knownIds];
  if (/^新建项目/u.test(normalized)) {
    const match = /^新建项目\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
    if (!match) return { status: "ambiguous", reason: "missing-project-goal", candidates };
    return { status: "resolved", action: "new", goal: match[1].trim(), projectId: null };
  }
  if (/^修订项目/u.test(normalized)) {
    const match = /^修订项目\s+(\S+)\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
    if (!match) {
      const loose = /^修订项目\s*[：:]/u.test(normalized);
      if (loose && candidates.length > 1) return { status: "ambiguous", reason: "multiple-projects", candidates };
      return { status: "ambiguous", reason: "missing-project-id", candidates };
    }
    const projectId = match[1];
    const revision = match[2].trim();
    if (!PROJECT_ID.test(projectId) || !knownIds.includes(projectId)) {
      return { status: "unknown", projectId, candidates };
    }
    if (!revision) return { status: "ambiguous", reason: "missing-revision", candidates };
    return { status: "resolved", action: "revise", projectId, revision };
  }
  return { status: "unsupported" };
}

const manifestStepEntry = (step, entry) => ({
  id: step.id,
  dependsOn: [...step.dependsOn],
  taskId: entry.taskId,
  attemptId: entry.attemptId,
  runId: entry.runId,
  runAttempt: entry.runAttempt,
  path: entry.path,
  sha256: step.id === "manifest" ? null : entry.sha256,
  bytes: step.id === "manifest" ? null : entry.bytes,
});

/**
 * Host-generated manifest. It records the project, plan version, frozen inputs, Task/Attempt, step dependencies and
 * artifact paths/SHA256. The manifest never records a hash of itself.
 */
export function buildManifest({
  projectId, planVersion, action, goal, revision = null, inputSha256, previous = null, steps,
}) {
  assertProjectId(projectId);
  assertPlanVersion(planVersion);
  const byId = new Map(steps.map((step) => [step.stepId ?? step.id, step]));
  const ordered = STEPS.map((step) => {
    const entry = byId.get(step.id);
    if (!entry) throw new Error(`manifest 缺少步骤：${step.id}`);
    return manifestStepEntry(step, {
      ...entry,
      path: entry.path ?? projectStepRelativePath(projectId, planVersion, step.id),
    });
  });
  return {
    schema: MANIFEST_SCHEMA,
    projectType: PROJECT_TYPE,
    projectId,
    planVersion,
    action,
    goal,
    revision: revision ?? null,
    inputSha256,
    previous: previous
      ? { planVersion: previous.planVersion, manifestPath: previous.manifestPath, manifestSha256: previous.manifestSha256 }
      : null,
    steps: ordered,
  };
}

export const canonicalManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`;

export function parseManifest(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("项目 manifest 不是合法 JSON");
  }
}
