import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { readRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";

const PROJECT_STATUSES = Object.freeze(["active", "paused", "completed", "abandoned"]);
const STATUS_TRANSITIONS = Object.freeze({
  active: new Set(PROJECT_STATUSES),
  paused: new Set(["active", "paused", "completed", "abandoned"]),
  completed: new Set(["completed"]),
  abandoned: new Set(["abandoned"]),
});
const PROJECT_REF_PATTERN = /^project-\d{8}-[a-f0-9]{8}$/;

function projectError(code, message) {
  const statusCode = {
    PROJECT_REF_INVALID: 400,
    PROJECT_OWNER_REQUIRED: 400,
    PROJECT_FIELD_REQUIRED: 400,
    PROJECT_STATUS_INVALID: 400,
    PROJECT_OWNER_MISMATCH: 403,
    PROJECT_NOT_FOUND: 404,
    PROJECT_DUPLICATE: 409,
    PROJECT_NOT_BINDABLE: 409,
    PROJECT_STATUS_TRANSITION_INVALID: 409,
  }[code] || 400;
  return Object.assign(new Error(message), { code, statusCode });
}

function normalizeProjectRef(value) {
  const projectRef = String(value || "").trim();
  if (!PROJECT_REF_PATTERN.test(projectRef)) throw projectError("PROJECT_REF_INVALID", "Project 引用格式无效");
  return projectRef;
}

function normalizeOwnerKey(value) {
  const ownerKey = String(value || "").trim();
  if (!ownerKey) throw projectError("PROJECT_OWNER_REQUIRED", "Project 操作缺少 Owner");
  return ownerKey;
}

function normalizeRequiredText(value, field) {
  const text = String(value || "").trim();
  if (!text) throw projectError("PROJECT_FIELD_REQUIRED", `Project ${field} 不能为空`);
  return text;
}

function projectPath(opsRoot, projectRef) {
  return path.join(opsRoot, "projects", `${normalizeProjectRef(projectRef)}.md`);
}

function changedPath(opsRoot, file) {
  return path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/");
}

class ProjectService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date(), idFactory = randomUUID } = {}) {
    this.opsRoot = opsRoot;
    this.clock = clock;
    this.idFactory = idFactory;
  }

  async #withProjectLock(file, operation) {
    const lockName = createHash("sha256").update(path.resolve(file), "utf8").digest("hex");
    const lock = new ProcessFileLock({
      file: path.join(PATHS.runtimeRoot, "locks", "projects", `${lockName}.lock`),
    });
    return lock.run(operation);
  }

  async createProject(input = {}, { ownerKey, opsRoot = this.opsRoot, projectRef: requestedRef } = {}) {
    const owner = normalizeOwnerKey(ownerKey);
    const title = normalizeRequiredText(input.title, "title");
    const objective = normalizeRequiredText(input.objective, "objective");
    const doneCondition = normalizeRequiredText(input.doneCondition, "doneCondition");
    const now = this.clock().toISOString();
    const generatedRef = requestedRef
      ? normalizeProjectRef(requestedRef)
      : `project-${now.slice(0, 10).replaceAll("-", "")}-${String(this.idFactory()).replaceAll("-", "").slice(0, 8).toLowerCase()}`;
    const projectRef = normalizeProjectRef(generatedRef);
    const file = projectPath(opsRoot, projectRef);
    const project = {
      projectRef,
      ownerKey: owner,
      title,
      status: "active",
      objective,
      doneCondition,
      createdAt: now,
      updatedAt: now,
    };
    return this.#withProjectLock(file, async () => {
      try {
        await fs.access(file);
        throw projectError("PROJECT_DUPLICATE", `Project 已存在：${projectRef}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await writeRecord(file, project, {
        schema: "project",
        title: project.title,
        summaryKeys: ["projectRef", "ownerKey", "title", "status", "objective", "doneCondition", "createdAt", "updatedAt"],
      });
      return { project, changedPaths: [changedPath(opsRoot, file)] };
    });
  }

  async getProject(projectRef, { ownerKey, opsRoot = this.opsRoot } = {}) {
    const owner = normalizeOwnerKey(ownerKey);
    const ref = normalizeProjectRef(projectRef);
    const file = projectPath(opsRoot, ref);
    let project;
    try {
      project = await readRecord(file);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    if (project.ownerKey !== owner) {
      throw projectError("PROJECT_OWNER_MISMATCH", "不能访问其他 Owner 的 Project");
    }
    return project;
  }

  async listProjects({ ownerKey, projectRef = "", status = "", limit = 100, opsRoot = this.opsRoot } = {}) {
    const owner = normalizeOwnerKey(ownerKey);
    if (status && !PROJECT_STATUSES.includes(status)) throw projectError("PROJECT_STATUS_INVALID", "Project 状态无效");
    if (projectRef) {
      const exact = await this.getProject(projectRef, { ownerKey: owner, opsRoot });
      if (!exact || (status && exact.status !== status)) return [];
      return [exact];
    }
    let entries = [];
    try {
      entries = await fs.readdir(path.join(opsRoot, "projects"), { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const projects = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const project = await readRecord(path.join(opsRoot, "projects", entry.name));
      if (project.ownerKey !== owner) continue;
      if (projectRef && project.projectRef !== projectRef) continue;
      if (status && project.status !== status) continue;
      projects.push(project);
    }
    return projects
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      .slice(0, Math.max(1, Math.min(100, Number(limit) || 100)));
  }

  async updateProjectStatus(projectRef, status, { ownerKey, opsRoot = this.opsRoot } = {}) {
    const owner = normalizeOwnerKey(ownerKey);
    const nextStatus = String(status || "").trim();
    if (!PROJECT_STATUSES.includes(nextStatus)) throw projectError("PROJECT_STATUS_INVALID", "Project 状态无效");
    const file = projectPath(opsRoot, projectRef);
    return this.#withProjectLock(file, async () => {
      const current = await this.getProject(projectRef, { ownerKey: owner, opsRoot });
      if (!current) throw projectError("PROJECT_NOT_FOUND", `Project 不存在：${projectRef}`);
      if (!STATUS_TRANSITIONS[current.status]?.has(nextStatus)) {
        throw projectError("PROJECT_STATUS_TRANSITION_INVALID", `Project 不允许从 ${current.status} 变更为 ${nextStatus}`);
      }
      if (current.status === nextStatus) return { project: current, changedPaths: [] };
      const project = { ...current, status: nextStatus, updatedAt: this.clock().toISOString() };
      await writeRecord(file, project, {
        schema: "project",
        title: project.title,
        summaryKeys: ["projectRef", "ownerKey", "title", "status", "objective", "doneCondition", "createdAt", "updatedAt"],
      });
      return { project, changedPaths: [changedPath(opsRoot, file)] };
    });
  }

  async validateProjectReference({ ownerKey, projectRef, forBinding = false, opsRoot = this.opsRoot } = {}) {
    const project = await this.getProject(projectRef, { ownerKey, opsRoot });
    if (!project) throw projectError("PROJECT_NOT_FOUND", `Project 不存在：${projectRef}`);
    if (forBinding && project.status !== "active") {
      throw projectError("PROJECT_NOT_BINDABLE", `Project 当前状态不可绑定新 Job：${project.status}`);
    }
    return project;
  }
}

export {
  PROJECT_REF_PATTERN,
  PROJECT_STATUSES,
  ProjectService,
  STATUS_TRANSITIONS,
  normalizeProjectRef,
};
