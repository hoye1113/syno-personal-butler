import { isActionableOutput } from "./output-lifecycle.mjs";

class SignalSourceRegistry {
  constructor({ claims, ingest, outputs, maintenance } = {}) {
    this.claims = claims;
    this.ingest = ingest;
    this.outputs = outputs;
    this.maintenance = maintenance;
  }

  async collect({ now = new Date() } = {}) {
    const [claims, intake, outputs, maintenance] = await Promise.all([
      this.claims?.dueClaims?.({ now }) || [],
      this.ingest?.pending?.() || [],
      this.outputs?.list?.() || [],
      this.maintenance?.inspect?.() || [],
    ]);
    return [
      ...claims.map((item) => ({ id: `claim-review:${item.id}`, kind: "claim-review", title: `复核时效主张：${item.statement}`, action: "核对证据与时效", priority: 95, ref: item })),
      ...intake.map((item) => ({ id: `ingest-pending:${item.id}`, kind: "ingest-pending", title: `处理收录候选：${item.title || item.id}`, action: "选择收录方式或暂缓", priority: 75, ref: item })),
      ...outputs
        .filter(isActionableOutput)
        .map((item) => ({ id: `output-opportunity:${item.id}`, kind: "output-opportunity", title: `推进创作：${item.title}`, action: "确认是否推进输出", priority: item.priority || 70, ref: item })),
      ...maintenance.map((item) => ({ id: `knowledge-maintenance:${item.id}`, kind: "knowledge-maintenance", title: `维护知识：${item.title || item.id}`, action: "选择一个维护动作", priority: 50, ref: item })),
    ];
  }
}

export { SignalSourceRegistry };
