import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { isActionableOutput } from "./output-lifecycle.mjs";

const DEFAULT_CAPACITY = 5;
// 滚动 20 个推荐槽：12 消化 / 5 收录 / 3 维护
const DIGEST_SLOTS = 12;
const INGEST_SLOTS = 5;
const MAINTENANCE_SLOTS = 3;
const TOTAL_SLOTS = DIGEST_SLOTS + INGEST_SLOTS + MAINTENANCE_SLOTS;

function actionDate(kind, title, reason, priority, ref, extra = {}) {
  return {
    id: `daily-action-${randomUUID().slice(0, 8)}`,
    kind,
    title,
    reason,
    priority,
    area: extra.area || "learn",
    intent: extra.intent || "start-review",
    ref: ref || "",
    status: "pending",
    ...(extra.dueAt ? { dueAt: extra.dueAt } : {}),
  };
}

class PlannerService {
  constructor({
    knowledge,
    goals,
    learning,
    claims,
    ingest,
    maintenance,
    profile,
    outputs,
    opsRoot = PATHS.opsRoot,
    clock = () => new Date(),
    capacity = DEFAULT_CAPACITY,
  } = {}) {
    this.knowledge = knowledge;
    this.goals = goals;
    this.learning = learning;
    this.claims = claims;
    this.ingest = ingest;
    this.maintenance = maintenance;
    this.profile = profile;
    this.outputs = outputs;
    this.opsRoot = opsRoot;
    this.clock = clock;
    this.capacity = capacity;
  }

  /**
   * 生成今日学习计划。幂等：相同 owner、localDate、vaultFingerprint、Goal 和设置下结果一致。
   * 不创建 LearningState、LearningEvidence、Goal 或知识笔记。
   */
  async planDay({ opsRoot = this.opsRoot, now = this.clock() } = {}) {
    const localDate = now.toISOString().slice(0, 10);
    const notes = await this.knowledge.list();
    const vaultFingerprint = this.knowledge.fingerprint || "";

    // 检查是否已有今日计划且 vault 未变
    const existing = await this.#loadExistingPlan(localDate, { opsRoot });
    if (existing && existing.vaultFingerprint === vaultFingerprint) {
      return existing;
    }

    // 收集所有数据源
    const activeGoals = await this.goals.list({ opsRoot, status: "active" });
    const dueReviews = await this.learning.due({ opsRoot, now, limit: 20 });
    const pendingIngest = this.ingest ? await this.ingest.pending({ limit: 20 }) : [];
    const maintenanceFindings = this.maintenance ? await this.maintenance.inspect({ limit: 10 }) : [];
    const searchable = notes.filter((n) => n.searchable);
    const learningStates = await this.learning.listStates({ opsRoot });
    const coveredRefs = new Set(learningStates.map((s) => String(s.knowledgeRef || "")));

    // 选择动作
    const items = [];
    const usedRefs = new Set();

    // 1. 到期复习（最高优先级）
    for (const state of dueReviews) {
      if (items.length >= this.capacity) break;
      const ref = String(state.knowledgeRef || "");
      if (!ref || usedRefs.has(ref)) continue;
      usedRefs.add(ref);
      items.push(actionDate(
        "review",
        `复习：${ref}`,
        "到期复习，巩固记忆",
        95,
        ref,
        { area: "learn", intent: "start-review", dueAt: state.nextReviewAt },
      ));
    }

    // 2. 活跃 Goal 相关知识消化
    const goalFocusAreas = new Set(activeGoals.flatMap((g) => g.focusAreas || []));
    const goalRefs = activeGoals.map((g) => g.id);
    if (items.length < this.capacity && goalFocusAreas.size > 0) {
      const goalNotes = searchable.filter((n) => {
        if (usedRefs.has(n.path)) return false;
        const tags = [...(n.tags || []), ...(n.legacyTags || [])];
        return tags.some((t) => goalFocusAreas.has(t));
      });
      for (const note of goalNotes) {
        if (items.length >= this.capacity) break;
        if (usedRefs.has(note.path)) continue;
        usedRefs.add(note.path);
        const hasState = coveredRefs.has(note.path);
        items.push(actionDate(
          "digest",
          note.title || note.path,
          hasState ? "与目标相关的已有知识，可深化理解" : "与目标相关但尚未验证的知识",
          80,
          note.path,
          { area: "learn", intent: "start-review" },
        ));
      }
    }

    // 3. 未覆盖的高价值知识（填充剩余消化容量）
    if (items.length < this.capacity) {
      const uncovered = searchable.filter((n) => !coveredRefs.has(n.path) && !usedRefs.has(n.path));
      for (const note of uncovered) {
        if (items.length >= this.capacity) break;
        usedRefs.add(note.path);
        items.push(actionDate(
          "digest",
          note.title || note.path,
          "尚未学习的个人知识",
          60,
          note.path,
          { area: "learn", intent: "start-review" },
        ));
      }
    }

    // 4. 收录候选
    if (items.length < this.capacity && pendingIngest.length > 0) {
      for (const proposal of pendingIngest) {
        if (items.length >= this.capacity) break;
        items.push(actionDate(
          "ingest",
          proposal.title || proposal.id || "新收录候选",
          "待确认的收录提案",
          50,
          proposal.id || "",
          { area: "capture", intent: "review-ingest" },
        ));
      }
    }

    // 5. 维护建议（每日最多 1 个）
    if (items.length < this.capacity && maintenanceFindings.length > 0) {
      const finding = maintenanceFindings[0];
      items.push(actionDate(
        "maintenance",
        `维护：${finding.path}`,
        finding.reason || "孤岛笔记需要整理",
        30,
        finding.path,
        { area: "knowledge", intent: "review-maintenance" },
      ));
      // 记录推荐，支持 7 天冷却
      if (this.maintenance.recordRecommendation) {
        this.maintenance.recordRecommendation(finding.path);
      }
    }

    // 6. 输出机会（如果还有容量）
    if (items.length < this.capacity && activeGoals.length > 0) {
      // 检查是否已有活跃的 OutputOpportunity
      let activeOutput = null;
      if (this.outputs) {
        try {
          const outputs = await this.outputs.list({ opsRoot });
          activeOutput = outputs.find((o) => isActionableOutput(o)) || null;
        } catch { /* outputs 不可用时跳过 */ }
      }

      if (activeOutput) {
        items.push(actionDate(
          "output",
          `继续创作：${activeOutput.title}`,
          "已有活跃的输出机会，继续推进",
          40,
          activeOutput.id,
          { area: "create", intent: "continue-output" },
        ));
      } else {
        // 基于 Goal 自动生成首要 OutputOpportunity
        const goalTitle = activeGoals[0].title || "个人知识";
        items.push(actionDate(
          "output",
          `深度文章：将 ${goalTitle} 转化为可分享的输出`,
          "将所学转化为可分享的输出，加深理解和记忆",
          40,
          activeGoals[0].id,
          { area: "create", intent: "continue-output" },
        ));
      }
    }

    // 构建计划
    const plan = {
      id: `plan-${localDate}-${randomUUID().slice(0, 8)}`,
      ownerId: "local-user",
      localDate,
      generatedAt: now.toISOString(),
      vaultFingerprint,
      goalRefs,
      capacity: this.capacity,
      allocation: {
        digest: items.filter((i) => i.kind === "digest" || i.kind === "review").length,
        ingest: items.filter((i) => i.kind === "ingest").length,
        maintenance: items.filter((i) => i.kind === "maintenance").length,
      },
      items,
    };

    // 持久化到 .runtime/
    await this.#savePlan(plan, { opsRoot });
    return plan;
  }

  async #loadExistingPlan(localDate, { opsRoot }) {
    const root = path.join(opsRoot, "plans");
    let entries = [];
    try { entries = await fs.readdir(root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (!entry.name.includes(localDate)) continue;
      const plan = parseRecord(await fs.readFile(path.join(root, entry.name), "utf8"));
      if (plan.localDate === localDate) return plan;
    }
    return null;
  }

  async #savePlan(plan, { opsRoot }) {
    const file = path.join(opsRoot, "plans", `${plan.id}.md`);
    await writeRecord(file, plan, {
      schema: "daily-knowledge-plan",
      title: `每日计划 ${plan.localDate}`,
      summaryKeys: ["id", "localDate", "generatedAt", "vaultFingerprint", "capacity"],
    });
  }
}

export { PlannerService };
