import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

// 收录后候选记录（2026-09-01 精简）：只保留输出机会与证据候选。
// 学习候选 / 复习机会随学习子系统一并移除（D6）；历史记录文件原样保留，读取方需容忍旧字段。
class PostIngestCandidateStore {
  constructor({ root = path.join(PATHS.runtimeRoot, "post-ingest-candidates"), clock = () => new Date() } = {}) {
    this.root = root;
    this.clock = clock;
  }

  async record({ workflow, commit, proposal = {} } = {}) {
    if (!/^workflow-[a-zA-Z0-9-]+$/.test(String(workflow?.id || ""))) throw new Error("Workflow ID 无效");
    const now = this.clock();
    const createdAt = now.toISOString();
    const knowledgeRef = String(commit?.path || "");
    const tags = Array.isArray(proposal.canonicalTags) ? proposal.canonicalTags.map(String) : [];
    const outputRelevant = /(?:AI|Agent|Coding|Harness|智能体)/iu.test(`${knowledgeRef} ${tags.join(" ")}`);
    const outputOpportunity = outputRelevant ? {
      id: `output-opportunity-candidate-${workflow.id}`,
      workflowId: workflow.id,
      knowledgeRef,
      format: "deep-article",
      reason: "将新知识转化为小白可理解的证据型输出",
      status: "candidate",
      createdAt,
    } : null;
    const explicitEvidence = (proposal.evidenceCandidates || []).map((item, index) => ({
      ...item,
      id: item.id || `evidence-candidate-${workflow.id}-explicit-${index + 1}`,
      workflowId: workflow.id,
      verificationStatus: "candidate",
      createdAt,
    }));
    const derivedEvidence = (proposal.claimCandidates || [])
      .filter((item) => ["volatile", "fact"].includes(item?.stability))
      .map((item, index) => ({
        id: `evidence-candidate-${workflow.id}-${index + 1}`,
        workflowId: workflow.id,
        statement: String(item.statement || ""),
        stability: item.stability,
        verificationStatus: "candidate",
        createdAt,
      }));
    const evidenceCandidates = [...new Map([...explicitEvidence, ...derivedEvidence]
      .map((item) => [`${item.statement || ""}\0${item.sourceRef || ""}`, item])).values()];
    const record = {
      workflowId: workflow.id,
      outputOpportunity,
      evidenceCandidates,
      unresolved: Array.isArray(proposal.unresolved) ? proposal.unresolved.map(String) : [],
      createdAt,
    };
    await fs.mkdir(this.root, { recursive: true });
    const file = path.join(this.root, `${workflow.id}.json`);
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(record, null, 2), { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, file);
    return record;
  }

  async list() {
    let entries;
    try {
      entries = await fs.readdir(this.root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const records = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/^workflow-[a-zA-Z0-9-]+\.json$/.test(entry.name)) continue;
      records.push(JSON.parse(await fs.readFile(path.join(this.root, entry.name), "utf8")));
    }
    return records.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }
}

export { PostIngestCandidateStore };
