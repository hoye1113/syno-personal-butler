class SynoCore {
  constructor({ host, knowledge, notifications, channels, reports } = {}) {
    this.host = host;
    this.knowledge = knowledge;
    this.notifications = notifications;
    this.channels = channels;
    this.reports = reports;
  }
  async execute(command, context = {}) { return this.host.receive(command, context); }
  async snapshot(query = {}) {
    const [jobs, notices, knowledge] = await Promise.all([
      this.host.list({ limit: query.jobLimit || 50 }),
      this.notifications.list({ limit: query.notificationLimit || 30 }),
      this.knowledge.search(query.search || "", { limit: query.knowledgeLimit || 12 }),
    ]);
    return { generatedAt: new Date().toISOString(), jobs, notifications: notices, knowledge, channels: this.channels.status() };
  }
  search(query, options) { return this.knowledge.search(query, options); }
  read(path) { return this.knowledge.read(path); }
  rebuildIndex() { return this.knowledge.rebuild(); }
  approve(id, approval) { return this.host.approve(id, approval); }
  reject(id, reason) { return this.host.reject(id, reason); }
  cancel(id) { return this.host.cancel(id); }
  report(kind) { return this.reports.create(kind); }
}

export { SynoCore };
