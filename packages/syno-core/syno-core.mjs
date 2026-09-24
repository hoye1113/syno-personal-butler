import { buildOperationRequest } from "./operation-registry.mjs";

class SynoCore {
  constructor({ host, knowledge, notifications, channels, reports, today } = {}) {
    this.host = host;
    this.knowledge = knowledge;
    this.notifications = notifications;
    this.channels = channels;
    this.reports = reports;
    this.today = today;
  }
  async execute(command, context = {}) { return this.host.receive(command, context); }
  async snapshot(query = {}) {
    const [jobs, notices, knowledge, today] = await Promise.all([
      this.host.list({ limit: query.jobLimit || 50 }),
      this.notifications.list({ limit: query.notificationLimit || 30 }),
      this.knowledge.search(query.search || "", { limit: query.knowledgeLimit || 12 }),
      this.today?.snapshot() || null,
    ]);
    return { generatedAt: new Date().toISOString(), today, jobs, notifications: notices, knowledge, channels: this.channels.status() };
  }
  search(query, options) { return this.knowledge.search(query, options); }
  read(path) { return this.knowledge.read(path); }
  rebuildIndex() { return this.knowledge.rebuild(); }
  inspect(id, context) { return this.host.inspect(id, context); }
  approve(id, approval) { return this.host.approve(id, approval); }
  reject(id, reason, context) { return this.host.reject(id, reason, context); }
  requestModification(id, modification, context) { return this.host.requestModification(id, modification, context); }
  cancel(id, context) { return this.host.cancel(id, context); }
  report(kind, context = {}) {
    return this.host.receive(buildOperationRequest("reports.create", { kind }, { text: `生成 ${kind} 报告` }), context);
  }
}

export { SynoCore };
