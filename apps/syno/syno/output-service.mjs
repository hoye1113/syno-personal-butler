import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "../../../packages/syno-core/markdown-record.mjs";
import { PATHS } from "../../../packages/syno-core/paths.mjs";
import { isActionableOutput, outputTransition, presentOutputOpportunity } from "./output-lifecycle.mjs";
import { validateContractRecord } from "../../../packages/syno-core/schema-registry.mjs";
import { buildSourceDescriptor } from "../../../packages/syno-core/source-descriptor.mjs";

class OutputService {
  constructor({ opsRoot = PATHS.opsRoot, clock = () => new Date() } = {}) { this.opsRoot = opsRoot; this.clock = clock; }

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
    return records.sort((a, b) => Number(isActionableOutput(b)) - Number(isActionableOutput(a))
      || b.priority - a.priority || String(b.created || "").localeCompare(String(a.created || ""))).slice(0, limit).map(presentOutputOpportunity);
  }

  async progress(id, input = {}, { opsRoot = this.opsRoot } = {}) {
    if (!/^output-[a-z0-9-]+$/.test(String(id))) throw new Error("OutputOpportunity ID 无效");
    const file = path.join(opsRoot, "content", "opportunities", `${id}.md`);
    const current = parseRecord(await fs.readFile(file, "utf8"));
    const action = String(input.action || "");
    const now = this.clock().toISOString();
    const transition = outputTransition(action, current.status);
    if (!transition) throw new Error(`创作状态不允许 ${current.status} -> ${action}`);
    const feedback = String(input.feedback || "").trim();
    if (action === "publish" && feedback.length < 5) throw new Error("记录发布必须提交至少 5 个字符的发布反馈");
    const outline = current.outline || ["核心主张", "第一方或原始证据", "反方观点与适用边界", "给小白的例子和下一步实践"];
    let userArtifactRef = current.userArtifactRef;
    const changedPaths = [];
    if (["draft", "practice"].includes(action)) {
      const userOutput = String(input.userOutput || "").trim();
      if (userOutput.length < 20) throw new Error("推进创作必须提交至少 20 个字符的主人原始输出");
      const artifactId = `artifact-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
      const artifactFile = path.join(opsRoot, "artifacts", "output", `${artifactId}.md`);
      userArtifactRef = path.relative(path.dirname(opsRoot), artifactFile).replace(/\\/g, "/");
      const artifact = {
        id: artifactId, kind: "text", path: userArtifactRef, created: now, isolated: false,
        status: "accepted", size: Buffer.byteLength(userOutput), ownerId: "local-user",
        content: userOutput, purpose: "creative-output",
        sourceDescriptor: buildSourceDescriptor({
          payload: { kind: "text", value: userOutput, sourceKind: "personal" },
          channel: "create",
          now,
        }),
      };
      await validateContractRecord("artifact", artifact);
      await writeRecord(artifactFile, artifact, { schema: "artifact", title: `User output artifact ${artifactId}`, summaryKeys: ["id", "kind", "path", "created", "status", "size", "purpose"] });
      changedPaths.push(path.relative(path.dirname(opsRoot), artifactFile).replace(/\\/g, "/"));
    }
    const opportunity = {
      ...current, status: transition.status, outline, ...(userArtifactRef ? { userArtifactRef } : {}),
      ...(feedback ? { feedback } : {}), updated: now,
    };
    await writeRecord(file, opportunity, { schema: "output-opportunity", title: opportunity.title, summaryKeys: ["id", "title", "format", "reason", "priority", "status", "created", "updated"] });
    changedPaths.push(path.relative(path.dirname(opsRoot), file).replace(/\\/g, "/"));
    return { opportunity, changedPaths };
  }
}

export { OutputService };
