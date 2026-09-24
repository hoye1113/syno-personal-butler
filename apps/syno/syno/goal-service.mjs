import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "../../../packages/syno-core/paths.mjs";

class GoalService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
    this.opsRoot = opsRoot;
    this.clock = clock;
  }

  async create(input, { opsRoot = this.opsRoot, ownerKey } = {}) {
    const now = this.clock().toISOString();
    const goal = {
      id: `goal-${randomUUID().slice(0, 8)}`, title: String(input.title || "").trim(), status: "active",
      priority: Math.max(0, Math.min(100, Number(input.priority ?? 70))), focusAreas: input.focusAreas || [],
      ...(ownerKey ? { ownerKey: String(ownerKey) } : {}), ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      created: now, updated: now,
    };
    const file = path.join(opsRoot, "goals", `${goal.id}.md`);
    await writeRecord(file, goal, { schema: "goal", title: goal.title, summaryKeys: ["id", "ownerKey", "title", "status", "priority", "dueAt", "created", "updated"] });
    return { goal, changedPaths: [path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")] };
  }

  async list({ opsRoot = this.opsRoot, status, ownerKey } = {}) {
    const root = path.join(opsRoot, "goals");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const goals = [];
    for (const entry of entries) if (entry.isFile() && entry.name.endsWith(".md")) goals.push(parseRecord(await fs.readFile(path.join(root, entry.name), "utf8")));
    return goals
      .filter((goal) => !status || goal.status === status)
      // Legacy Goals have no ownerKey; keep them readable during the MVP migration.
      .filter((goal) => ownerKey === undefined || !goal.ownerKey || goal.ownerKey === ownerKey)
      .sort((a, b) => b.priority - a.priority || a.created.localeCompare(b.created));
  }
}

export { GoalService };
