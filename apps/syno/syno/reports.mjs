import path from "node:path";

import { PATHS, relativeToRepo } from "./paths.mjs";
import { writeRecord } from "./markdown-record.mjs";

class ReportService {
  constructor({ host, knowledge, notifications, channels, gitGuard, opsRoot = PATHS.opsRoot, pathResolver = relativeToRepo, clock = () => new Date() } = {}) {
    this.host = host;
    this.knowledge = knowledge;
    this.notifications = notifications;
    this.channels = channels;
    this.gitGuard = gitGuard;
    this.opsRoot = opsRoot;
    this.pathResolver = pathResolver;
    this.clock = clock;
  }

  async create(kind, { commit = true } = {}) {
    const now = this.clock();
    const jobs = await this.host.list({ limit: 200 });
    const open = jobs.filter((job) => !["completed", "failed", "rejected", "canceled"].includes(job.status));
    const failed = jobs.filter((job) => job.status === "failed");
    const knowledge = await this.knowledge.rebuild();
    const labels = { morning: "晨报", evening: "晚间收件箱与轻复盘", weekly: "周报" };
    const title = `赛诺${labels[kind] || kind}`;
    const record = {
      id: `report-${kind}-${now.toISOString().slice(0, 10)}`,
      kind,
      title,
      created: now.toISOString(),
      summary: `知识笔记 ${knowledge.notes} 篇；进行中任务 ${open.length} 个；近期失败 ${failed.length} 个。`,
      openJobs: open.slice(0, 20).map((job) => ({ id: job.id, intent: job.intent, status: job.status })),
      failedJobs: failed.slice(0, 10).map((job) => ({ id: job.id, error: job.error })),
    };
    const file = path.join(this.opsRoot, "reviews", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), `${record.id}.md`);
    await writeRecord(file, record, { title, summaryKeys: ["id", "kind", "created", "summary"] });
    const deliveries = await this.channels.send({ title, body: record.summary, source: "scheduler", data: { reportId: record.id } });
    const commitPaths = [this.pathResolver(file), ...Object.values(deliveries).map((item) => item?.recordPath).filter(Boolean)];
    if (commit && this.gitGuard) record.localCommit = await this.gitGuard.commitPaths(commitPaths, `syno: create ${kind} report`);
    record.changedPaths = commitPaths;
    return record;
  }
}

export { ReportService };
