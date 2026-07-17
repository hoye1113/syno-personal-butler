import { randomUUID } from "node:crypto";
import path from "node:path";

import { writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";

class OutputService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) { this.opsRoot = opsRoot; this.clock = clock; }

  teachBackPrompt({ title, claims = [] } = {}) {
    return {
      title: `用自己的话讲清：${title}`,
      questions: [
        "不用术语，向完全不懂的人解释核心判断。",
        "给出一个具体例子，并说明它为什么成立。",
        "说出适用边界、一个反例或最容易误解的地方。",
        "把它应用到你当前的 AI/Agent 项目，下一步会做什么？",
      ],
      claimRefs: claims,
      evidenceRule: "只有主人亲自口述、打字、答题或实践的原始产物计入掌握度。",
    };
  }

  async createOpportunity(input, { opsRoot = this.opsRoot } = {}) {
    const now = this.clock().toISOString();
    const opportunity = {
      id: `output-${randomUUID().slice(0, 8)}`, title: input.title,
      format: input.format || "deep-article", goalRefs: input.goalRefs || [], knowledgeRefs: input.knowledgeRefs || [],
      reason: input.reason, priority: Math.max(0, Math.min(100, Number(input.priority || 50))), status: "suggested", created: now,
    };
    const file = path.join(opsRoot, "content", "opportunities", `${opportunity.id}.md`);
    await writeRecord(file, opportunity, { schema: "output-opportunity", title: opportunity.title, summaryKeys: ["id", "title", "format", "reason", "priority", "status", "created"] });
    return { opportunity, changedPaths: [path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/")] };
  }
}

export { OutputService };
