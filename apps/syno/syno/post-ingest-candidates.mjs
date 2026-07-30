import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

class PostIngestCandidateStore {
  constructor({ root = path.join(PATHS.runtimeRoot, "post-ingest-candidates"), clock = () => new Date() } = {}) {
    this.root = root;
    this.clock = clock;
    // 串行化所有读-改-写，防止并发的状态推进互相覆盖（仿 PendingDecisionStore 的 tail 链）。
    this.tail = Promise.resolve();
  }

  async record({ workflow, commit, proposal = {} } = {}) {
    if (!/^workflow-[a-zA-Z0-9-]+$/.test(String(workflow?.id || ""))) throw new Error("Workflow ID 无效");
    const now = this.clock();
    const createdAt = now.toISOString();
    const knowledgeRef = String(commit?.path || "");
    const tags = Array.isArray(proposal.canonicalTags) ? proposal.canonicalTags.map(String) : [];
    const learningCandidate = {
      id: `learning-candidate-${workflow.id}`,
      workflowId: workflow.id,
      artifactId: workflow.artifactId,
      knowledgeRef,
      knowledgeState: "captured",
      masteryDelta: 0,
      status: "candidate",
      createdAt,
    };
    const reviewOpportunity = {
      id: `review-opportunity-${workflow.id}`,
      workflowId: workflow.id,
      knowledgeRef,
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1_000).toISOString(),
      reason: "新收录知识等待主人用自己的话解释",
      status: "candidate",
      createdAt,
    };
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
      learningCandidate,
      reviewOpportunity,
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

  // 读-改-原子写回单个 workflow 记录。mutator 就地修改 record 并返回 { changed, result }；
  // changed 为 true 才写回。找不到记录返回 null（不抛）。
  async #mutateRecord(workflowId, mutator) {
    const current = this.tail.catch(() => {}).then(async () => {
      const file = path.join(this.root, `${workflowId}.json`);
      let record;
      try {
        record = JSON.parse(await fs.readFile(file, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      const outcome = (await mutator(record)) || {};
      if (outcome.changed) {
        await fs.mkdir(this.root, { recursive: true });
        const temporary = `${file}.${process.pid}.tmp`;
        await fs.writeFile(temporary, JSON.stringify(record, null, 2), { encoding: "utf8", mode: 0o600 });
        await fs.rename(temporary, file);
      }
      return outcome.result === undefined ? null : outcome.result;
    });
    this.tail = current;
    return current;
  }

  // candidate → presented（仅在提醒真实送达后调用）。幂等：仅 candidate 可转移，
  // 保留首个 presentedAt；done/dismissed 静默 no-op。
  async markReviewPresented(workflowId, { presentedAt = this.clock().toISOString() } = {}) {
    return this.#mutateRecord(workflowId, (record) => {
      const review = record.reviewOpportunity;
      if (!review) return { changed: false, result: null };
      if (review.status !== "candidate") return { changed: false, result: review };
      review.status = "presented";
      review.presentedAt = presentedAt;
      return { changed: true, result: review };
    });
  }

  // 首教完成后按 knowledgeRef 关闭候选：reviewOpportunity → done（记 evidenceRef/jobId），
  // learningCandidate candidate → "learning"。扫全部记录，返回命中数。
  async completeReviewByKnowledgeRef(knowledgeRef, { evidenceId, jobId, completedAt = this.clock().toISOString() } = {}) {
    const target = String(knowledgeRef || "");
    if (!target) return 0;
    const current = this.tail.catch(() => {}).then(async () => {
      let entries;
      try {
        entries = await fs.readdir(this.root, { withFileTypes: true });
      } catch (error) {
        if (error.code === "ENOENT") return 0;
        throw error;
      }
      let hits = 0;
      for (const entry of entries) {
        if (!entry.isFile() || !/^workflow-[a-zA-Z0-9-]+\.json$/.test(entry.name)) continue;
        const file = path.join(this.root, entry.name);
        const record = JSON.parse(await fs.readFile(file, "utf8"));
        let changed = false;
        const review = record.reviewOpportunity;
        if (review && String(review.knowledgeRef) === target && ["candidate", "presented"].includes(review.status)) {
          review.status = "done";
          review.completedAt = completedAt;
          if (evidenceId) review.evidenceRef = String(evidenceId);
          if (jobId) review.jobId = String(jobId);
          changed = true;
          hits += 1;
        }
        const learning = record.learningCandidate;
        if (learning && String(learning.knowledgeRef) === target && learning.status === "candidate") {
          learning.status = "learning";
          changed = true;
        }
        if (changed) {
          const temporary = `${file}.${process.pid}.tmp`;
          await fs.writeFile(temporary, JSON.stringify(record, null, 2), { encoding: "utf8", mode: 0o600 });
          await fs.rename(temporary, file);
        }
      }
      return hits;
    });
    this.tail = current;
    return current;
  }

  // candidate/presented → dismissed（主人说"跳过复习"）。记录保留供审计，不删除。
  async dismissReview(workflowId, { dismissedAt = this.clock().toISOString() } = {}) {
    return this.#mutateRecord(workflowId, (record) => {
      const review = record.reviewOpportunity;
      if (!review) return { changed: false, result: null };
      if (!["candidate", "presented"].includes(review.status)) return { changed: false, result: review };
      review.status = "dismissed";
      review.dismissedAt = dismissedAt;
      return { changed: true, result: review };
    });
  }

  // 到点待推送的复习候选：status==="candidate" 且 dueAt<=now，dueAt 升序（最旧优先）。
  async dueReviews({ now = this.clock(), limit = 10 } = {}) {
    const records = await this.list();
    return records
      .map((record) => record.reviewOpportunity)
      .filter((review) => review && review.status === "candidate" && review.dueAt && new Date(review.dueAt) <= now)
      .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
      .slice(0, limit);
  }

  // teach-back 门用的活跃复习：status==="presented" 且 presentedAt 在 ttl 内，presentedAt 倒序。
  async findActiveReviews({ now = this.clock(), ttlMs = 72 * 60 * 60 * 1_000, limit = 3 } = {}) {
    const nowMs = now.getTime();
    const records = await this.list();
    return records
      .map((record) => record.reviewOpportunity)
      .filter((review) => review && review.status === "presented" && review.presentedAt
        && (nowMs - new Date(review.presentedAt).getTime()) <= ttlMs)
      .sort((a, b) => String(b.presentedAt).localeCompare(String(a.presentedAt)))
      .slice(0, limit);
  }
}

export { PostIngestCandidateStore };
