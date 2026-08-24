import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { writeRecord } from "../apps/syno/syno/markdown-record.mjs";
import { ProjectService } from "../apps/syno/syno/project-service.mjs";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";
import { buildOperationRequest } from "../apps/syno/syno/operation-registry.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

function fixedClock() {
  return new Date("2026-08-24T10:00:00.000Z");
}

function makeProjectService(opsRoot, ids = ["11111111-1111-1111-1111-111111111111"]) {
  let index = 0;
  return new ProjectService({
    opsRoot,
    clock: fixedClock,
    idFactory: () => ids[Math.min(index++, ids.length - 1)],
  });
}

test("Project contract accepts the fixed record and rejects unknown or invalid fields", async () => {
  const project = {
    projectRef: "project-20260824-a1b2c3d4",
    ownerKey: "owner-a",
    title: "知识库 MVP",
    status: "active",
    objective: "验证项目上下文能改善召回",
    doneCondition: "真实 DSH 对照实验完成",
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
  };
  await validateContractRecord("project", project);
  await assert.rejects(validateContractRecord("project", { ...project, status: "done" }), /枚举/);
  await assert.rejects(validateContractRecord("project", { ...project, extra: true }), /未知字段/);
});

test("ProjectService generates stable refs, rejects duplicates, and isolates Owners", async (t) => {
  const root = await fs.mkdtemp(path.join(process.env.TEMP || process.cwd(), "syno-project-"));
  const opsRoot = path.join(root, "ops");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = makeProjectService(opsRoot);
  const created = await service.createProject({ title: "Project A", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a" });
  assert.equal(created.project.projectRef, "project-20260824-11111111");
  assert.deepEqual(created.changedPaths, ["ops/projects/project-20260824-11111111.md"]);
  await assert.rejects(
    service.createProject({ title: "Duplicate", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a" }),
    (error) => error.code === "PROJECT_DUPLICATE",
  );
  assert.deepEqual(await service.listProjects({ ownerKey: "owner-b" }), []);
  await assert.rejects(service.getProject(created.project.projectRef, { ownerKey: "owner-b" }), (error) => error.code === "PROJECT_OWNER_MISMATCH");
  await assert.rejects(
    service.updateProjectStatus(created.project.projectRef, "paused", { ownerKey: "owner-b" }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
});

test("only active Projects bind new work while every lifecycle state remains referenceable", async (t) => {
  const root = await fs.mkdtemp(path.join(process.env.TEMP || process.cwd(), "syno-project-state-"));
  const opsRoot = path.join(root, "ops");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = makeProjectService(opsRoot, [
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333",
  ]);
  const paused = await service.createProject({ title: "Paused", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a" });
  await service.updateProjectStatus(paused.project.projectRef, "paused", { ownerKey: "owner-a" });
  await assert.rejects(
    service.validateProjectReference({ ownerKey: "owner-a", projectRef: paused.project.projectRef, forBinding: true }),
    (error) => error.code === "PROJECT_NOT_BINDABLE",
  );
  assert.equal((await service.validateProjectReference({ ownerKey: "owner-a", projectRef: paused.project.projectRef })).status, "paused");
  await service.updateProjectStatus(paused.project.projectRef, "completed", { ownerKey: "owner-a" });
  assert.equal((await service.validateProjectReference({ ownerKey: "owner-a", projectRef: paused.project.projectRef })).status, "completed");
  await assert.rejects(
    service.updateProjectStatus(paused.project.projectRef, "active", { ownerKey: "owner-a" }),
    (error) => error.code === "PROJECT_STATUS_TRANSITION_INVALID",
  );
  const abandoned = await service.createProject({ title: "Abandoned", objective: "B", doneCondition: "done" }, { ownerKey: "owner-a" });
  await service.updateProjectStatus(abandoned.project.projectRef, "abandoned", { ownerKey: "owner-a" });
  assert.equal((await service.validateProjectReference({ ownerKey: "owner-a", projectRef: abandoned.project.projectRef })).status, "abandoned");
});

test("new Goals persist ownerKey and validate Project ownership while legacy Goals remain readable", async (t) => {
  const root = await fs.mkdtemp(path.join(process.env.TEMP || process.cwd(), "syno-goal-project-"));
  const opsRoot = path.join(root, "ops");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projects = makeProjectService(opsRoot);
  const project = await projects.createProject({ title: "Owner Project", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a" });
  const goals = new GoalService({ opsRoot, projectService: projects, clock: fixedClock });
  const created = await goals.create({ title: "Goal A", projectRef: project.project.projectRef }, { ownerKey: "owner-a" });
  assert.equal(created.goal.ownerKey, "owner-a");
  assert.equal(created.goal.projectRef, project.project.projectRef);
  await assert.rejects(
    goals.create({ title: "Wrong owner", projectRef: project.project.projectRef }, { ownerKey: "owner-b" }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
  await writeRecord(path.join(opsRoot, "goals", "goal-legacy.md"), {
    id: "goal-legacy", title: "Legacy", status: "active", priority: 50, focusAreas: [],
    created: "2026-08-24T10:00:00.000Z", updated: "2026-08-24T10:00:00.000Z",
  }, { schema: "goal", title: "Legacy" });
  const listed = await goals.list();
  assert.equal(listed.some((goal) => goal.id === "goal-legacy"), true);
});

test("DSH Project tools are core-exposed and keep identity server-owned", () => {
  const runtime = createSynoRuntime({});
  const definitions = runtime.tools.list();
  for (const name of ["projects.list", "projects.create", "projects.update_status"]) {
    assert.ok(definitions.some((tool) => tool.name === name), `${name} 应注册到 ToolRegistry`);
    assert.ok(runtime.toolBridge.exposed.has(name.replaceAll(".", "_")), `${name} 应暴露到 Tool Bridge`);
  }
  const create = definitions.find((tool) => tool.name === "projects.create");
  assert.deepEqual(Object.keys(create.inputSchema.properties), ["title", "objective", "doneCondition"]);
  assert.equal(Object.hasOwn(create.inputSchema.properties, "ownerKey"), false);
  assert.equal(Object.hasOwn(create.inputSchema.properties, "projectRef"), false);
  assert.equal(buildOperationRequest("projects.create", { title: "A", objective: "B", doneCondition: "C" }).intent, "create_project");
  assert.equal(buildOperationRequest("projects.update_status", { projectRef: "project-20260824-a1b2c3d4", status: "paused" }).intent, "update_project_status");
});
