import { randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { readRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS, relativeToRepo } from "./paths.mjs";

const TERMINAL = new Set(["completed", "failed", "rejected", "canceled"]);
const TRANSITIONS = Object.freeze({
  pending: new Set(["awaiting_approval", "running", "canceled"]),
  awaiting_approval: new Set(["running", "rejected", "canceled", "completed"]),
  running: new Set(["validating", "failed", "canceled"]),
  validating: new Set(["completed", "failed", "awaiting_approval"]),
  completed: new Set(),
  failed: new Set(),
  rejected: new Set(),
  canceled: new Set(),
});

function timestampParts(iso) {
  const date = new Date(iso);
  return [String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, "0")];
}

class JobStore {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) {
    this.opsRoot = opsRoot;
    this.clock = clock;
  }

  async create({ request, decision, channel = "web", senderId = "local-user" }) {
    const now = this.clock().toISOString();
    const id = `job-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const job = {
      id,
      intent: decision.intent,
      status: decision.allowed === false ? "rejected" : decision.approval === "none" ? "pending" : "awaiting_approval",
      profile: decision.profile,
      approval: decision.approval,
      approvalsReceived: 0,
      approvalCode: randomBytes(3).toString("hex").toUpperCase(),
      phase: "execution",
      risk: decision.risk,
      channel,
      senderId,
      created: now,
      updated: now,
      request,
      decision,
      result: null,
      error: decision.allowed === false ? { code: "POLICY_DENIED", message: decision.reason } : null,
      changedPaths: [],
    };
    await this.save(job);
    await this.event(job, "job.created", { status: job.status });
    return job;
  }

  filePath(job) {
    const [year, month] = timestampParts(job.created);
    return path.join(this.opsRoot, "jobs", year, month, `${job.id}.md`);
  }

  async save(job) {
    job.updated = this.clock().toISOString();
    await writeRecord(this.filePath(job), job, {
      title: `Job ${job.id}`,
      summaryKeys: ["id", "intent", "status", "profile", "approval", "approvalsReceived", "phase", "risk", "channel", "created", "updated"],
    });
    job.recordPath = relativeToRepo(this.filePath(job));
    return job;
  }

  async get(id) {
    const files = await this.#jobFiles();
    const target = files.find((file) => path.basename(file) === `${id}.md`);
    if (!target) return null;
    const job = await readRecord(target);
    job.recordPath = relativeToRepo(target);
    return job;
  }

  async list({ limit = 100 } = {}) {
    const files = await this.#jobFiles();
    const jobs = [];
    for (const file of files.slice(-limit * 2)) {
      try {
        const job = await readRecord(file);
        job.recordPath = relativeToRepo(file);
        jobs.push(job);
      } catch {
        // Invalid records are surfaced by repository verification, not hidden in list failures.
      }
    }
    return jobs.sort((a, b) => b.created.localeCompare(a.created)).slice(0, limit);
  }

  async transition(job, next, patch = {}) {
    if (!TRANSITIONS[job.status]?.has(next)) {
      throw new Error(`非法 Job 状态迁移：${job.status} -> ${next}`);
    }
    const previous = job.status;
    Object.assign(job, patch, { status: next });
    await this.save(job);
    await this.event(job, "job.transitioned", { from: previous, to: next, phase: job.phase });
    return job;
  }

  async approve(job, { channel = "web", senderId = "local-user", code = "" } = {}) {
    if (job.status !== "awaiting_approval") throw new Error("Job 当前不等待审批");
    if (channel === "weixin" && (job.risk !== "low" || job.approval !== "single" || job.phase !== "execution")) {
      const error = new Error("微信只能批准低风险单审批任务");
      error.code = "APPROVAL_CHANNEL_FORBIDDEN";
      throw error;
    }
    if (channel === "weixin" && String(code).toUpperCase() !== job.approvalCode) {
      const error = new Error("审批码无效");
      error.code = "INVALID_APPROVAL_CODE";
      throw error;
    }
    job.approvalsReceived += 1;
    job.approvalActors = [...(job.approvalActors || []), `${channel}:${senderId}`];
    // A double-approval job uses one approval to execute in the isolated worktree,
    // then resets this counter and requires the second approval for the merge diff.
    const required = 1;
    await this.save(job);
    await this.event(job, "job.approved", { channel, senderId, count: job.approvalsReceived, required });
    return { job, ready: job.approvalsReceived >= required };
  }

  async reject(job, reason = "用户拒绝") {
    return this.transition(job, "rejected", { error: { code: "REJECTED", message: reason } });
  }

  async event(job, type, data = {}) {
    const at = this.clock().toISOString();
    const [year, month] = timestampParts(at);
    const event = {
      id: `event-${at.replace(/\D/g, "").slice(0, 17)}-${randomUUID().slice(0, 6)}`,
      type,
      at,
      subjectId: job.id,
      data,
    };
    const file = path.join(this.opsRoot, "events", year, month, `${event.id}.md`);
    await writeRecord(file, event, {
      title: `${type} · ${job.id}`,
      summaryKeys: ["id", "type", "at", "subjectId"],
    });
    return event;
  }

  async #jobFiles() {
    const root = path.join(this.opsRoot, "jobs");
    const output = [];
    async function walk(directory) {
      let entries = [];
      try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      for (const entry of entries) {
        const candidate = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(candidate);
        else if (entry.isFile() && entry.name.endsWith(".md")) output.push(candidate);
      }
    }
    await walk(root);
    return output.sort();
  }
}

export { JobStore, TERMINAL, TRANSITIONS };
