import { buildOperationRequest } from "./operation-registry.mjs";
import { evaluate } from "./policy.mjs";

const OPERATIONS = Object.freeze({
  install: "windows.service.install",
  uninstall: "windows.service.uninstall",
});

class WindowsServiceControl {
  constructor({ manager, jobs, policy = { evaluate } } = {}) {
    if (!manager || !jobs) throw new Error("WindowsServiceControl 缺少 manager 或 JobStore");
    this.manager = manager;
    this.jobs = jobs;
    this.policy = policy;
  }

  status() { return this.manager.status(); }

  async mutate(action, context = {}) {
    const operation = OPERATIONS[action];
    if (!operation || typeof this.manager[action] !== "function") throw new Error(`未知 Windows 生命周期操作：${action}`);
    const request = buildOperationRequest(operation, {}, { text: `主人确认执行：${operation}` });
    const decision = this.policy.evaluate(request, context);
    const job = await this.jobs.create({
      request,
      decision,
      channel: context.channel || "web",
      senderId: context.senderId || "local-user",
      conversationId: context.conversationId || "",
    });
    const approved = await this.jobs.approve(job, { channel: context.channel || "web", senderId: context.senderId || "local-user" });
    if (!approved.ready) throw new Error("Windows 生命周期操作未获得确认");
    await this.jobs.transition(job, "running");
    try {
      const result = await this.manager[action]();
      await this.jobs.transition(job, "validating", { result });
      await this.jobs.transition(job, "completed", { result });
      return { ...result, jobId: job.id };
    } catch (error) {
      await this.jobs.transition(job, "failed", { error: { code: error.code || "WINDOWS_SERVICE_FAILED", message: error.message } });
      throw error;
    }
  }
}

export { OPERATIONS, WindowsServiceControl };
