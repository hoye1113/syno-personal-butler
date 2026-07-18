import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
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

  async list({ opsRoot = this.opsRoot, status, limit = 50 } = {}) {
    const root = path.join(opsRoot, "content", "opportunities");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const records = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const value = parseRecord(await fs.readFile(path.join(root, entry.name), "utf8"));
      if (!status || value.status === status) records.push(value);
    }
    return records.sort((a, b) => b.priority - a.priority || b.created.localeCompare(a.created)).slice(0, limit);
  }

  async progress(id, input = {}, { opsRoot = this.opsRoot } = {}) {
    if (!/^output-[a-z0-9-]+$/.test(String(id))) throw new Error("OutputOpportunity ID 无效");
    const file = path.join(opsRoot, "content", "opportunities", `${id}.md`);
    const current = parseRecord(await fs.readFile(file, "utf8"));
    const action = String(input.action || "");
    const now = this.clock().toISOString();
    const transitions = {
      accept: { from: ["suggested"], status: "accepted" },
      draft: { from: ["accepted", "drafting"], status: "drafting" },
      practice: { from: ["drafting", "practiced"], status: "practiced" },
      publish: { from: ["drafting", "practiced"], status: "published" },
      dismiss: { from: ["suggested", "accepted", "drafting", "practiced"], status: "dismissed" },
    };
    const transition = transitions[action];
    if (!transition || !transition.from.includes(current.status)) throw new Error(`创作状态不允许 ${current.status} -> ${action}`);
    const outline = current.outline || ["核心主张", "第一方或原始证据", "反方观点与适用边界", "给小白的例子和下一步实践"];
    let userArtifactRef = current.userArtifactRef;
    const changedPaths = [];
    if (["draft", "practice"].includes(action)) {
      const userOutput = String(input.userOutput || "").trim();
      if (userOutput.length < 20) throw new Error("推进创作必须提交至少 20 个字符的主人原始输出");
      const artifactId = `artifact-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
      const artifactFile = path.join(opsRoot, "artifacts", "output", `${artifactId}.md`);
      userArtifactRef = path.relative(path.dirname(opsRoot), artifactFile).replace(/\\/g, "/");
      const artifact = { id: artifactId, kind: "text", path: userArtifactRef, created: now, isolated: false, status: "accepted", size: Buffer.byteLength(userOutput), ownerId: "local-user", content: userOutput, purpose: "creative-output" };
      await writeRecord(artifactFile, artifact, { schema: "artifact", title: `User output artifact ${artifactId}`, summaryKeys: ["id", "kind", "path", "created", "status", "size", "purpose"] });
      changedPaths.push(path.relative(path.dirname(opsRoot), artifactFile).replace(/\\/g, "/"));
    }
    const opportunity = {
      ...current, status: transition.status, outline, ...(userArtifactRef ? { userArtifactRef } : {}),
      ...(input.feedback ? { feedback: String(input.feedback).trim() } : {}), updated: now,
    };
    await writeRecord(file, opportunity, { schema: "output-opportunity", title: opportunity.title, summaryKeys: ["id", "title", "format", "reason", "priority", "status", "created", "updated"] });
    changedPaths.push(path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/"));
    return { opportunity, changedPaths };
  }
}

export { OutputService };
