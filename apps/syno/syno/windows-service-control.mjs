import { buildOperationRequest } from "./operation-registry.mjs";
import { evaluate } from "./policy.mjs";

const OPERATIONS = Object.freeze({
  install: "windows.service.install",
  uninstall: "windows.service.uninstall",
});

class WindowsServiceControl {
  constructor({ manager, jobs, policy = { evaluate }, settingsRegistry = null } = {}) {
    if (!manager || !jobs) throw new Error("WindowsServiceControl 缺少 manager 或 JobStore");
    this.manager = manager;
    this.jobs = jobs;
    this.policy = policy;
    this.settingsRegistry = settingsRegistry;
  }

  status() { return this.manager.status(); }

  async mutate(action, context = {}) {
    const operation = OPERATIONS[action];
    if (!operation || typeof this.manager[action] !== "function") throw new Error(`未知 Windows 生命周期操作：${action}`);
    const merged = { ...context };
    if (merged.allowSystemControl === undefined && this.settingsRegistry) {
      merged.allowSystemControl = await this.settingsRegistry.get("policy.allowSystemControl") === true;
    }
    const request = buildOperationRequest(operation, {}, { text: `主人确认执行：${operation}` });
    const decision = this.policy.evaluate(request, merged);
    const job = await this.jobs.create({
      request,
      decision,
      channel: merged.channel || "web",
      senderId: merged.senderId || "local-user",
      conversationId: merged.conversationId || "",
    });
    // 系统控制开关默认关（D4）：未显式开启时 jobs.create 已把 denied 决策落为 rejected 审计 Job。
    if (!decision.allowed) throw new Error(decision.reason);
    const actor = `${job.channel || merged.channel || "web"}:${job.senderId || merged.senderId || "local-user"}`;
    // trust-but-clarify：显式允许的生命周期操作不经审批闸门，直接驱动 canonical 审计 Job 生命周期。
    await this.jobs.transition(job, "running", { approvalActors: [actor], approvalsReceived: 1 });
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
