import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { IntakeService } from "./intake.mjs";
import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";

function slug(value) {
  return String(value || "capture").toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "capture";
}

function titleFromPrepared(prepared, payload) {
  if (payload.title) return String(payload.title).trim();
  if (prepared.sourceUrl) {
    const url = new URL(prepared.sourceUrl);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || url.hostname).slice(0, 80);
  }
  const raw = String(payload.value || "").replace(/^---[\s\S]*?---\s*/m, "");
  return raw.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, "").trim()).find(Boolean)?.slice(0, 80) || "待整理收录";
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

class IngestService {
  constructor({ intake = new IntakeService(), knowledge, opsRoot = PATHS.opsRoot, stateRoot = path.join(PATHS.stateRoot, "ingest"), clock = () => new Date() } = {}) {
    if (!knowledge) throw new Error("IngestService 缺少 KnowledgeStore");
    this.intake = intake; this.knowledge = knowledge; this.opsRoot = opsRoot; this.stateRoot = stateRoot; this.clock = clock;
  }

  async receive(payload, { ownerId = "local-user", channel = "web" } = {}) {
    const now = this.clock().toISOString();
    const id = `artifact-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const serialized = JSON.stringify(payload);
    const record = {
      id, kind: String(payload.kind || "text"), path: `local-state://ingest/${id}`, created: now, isolated: true,
      size: Buffer.byteLength(serialized), status: "received", ownerId,
      ...(payload.kind === "url" ? { sourceUrl: String(payload.value || "") } : {}),
      dedupeKey: createHash("sha256").update(serialized).digest("hex"),
    };
    const localFile = path.join(this.stateRoot, `${id}.json`);
    await atomicJson(localFile, { payload, ownerId, channel, status: "received", created: now, artifact: record });
    return { artifact: record, proposalPending: true };
  }

  async propose(id) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    try {
      const prepared = await this.intake.prepare(state.payload);
    const title = titleFromPrepared(prepared, state.payload);
    const matches = await this.knowledge.search(title, { limit: 5 });
    const now = this.clock().toISOString();
    const candidate = {
      id: `candidate-${randomUUID().slice(0, 8)}`, artifactId: id, title, summary: String(prepared.content || prepared.text || "").slice(0, 280),
      status: "proposed", confidence: matches.length ? 0.65 : 0.8, dedupeMatches: matches.map((item) => item.path), created: now,
    };
    const proposal = {
      id: `ingest-${randomUUID().slice(0, 8)}`, candidateId: candidate.id, status: "proposed",
      suggestedPath: `vault/00-Inbox/${slug(title)}-${id.slice(-8)}.md`, suggestedTags: [],
      suggestedLinks: matches.slice(0, 3).map((item) => item.path), risk: matches.length ? "merge" : "additive", created: now,
      ...(matches[0] ? { existingNoteRef: matches[0].path } : {}),
    };
    await atomicJson(stateFile, { ...state, status: "proposed", prepared, candidate, proposal });
    return { candidate, proposal };
    } catch (error) {
      await atomicJson(stateFile, { ...state, status: "failed", error: { code: error.code || "INGEST_PROPOSAL_FAILED", message: error.message, retryable: error.retryable === true } });
      throw error;
    }
  }

  async status(id) {
    try {
      const state = JSON.parse(await fs.readFile(path.join(this.stateRoot, `${id}.json`), "utf8"));
      return { id, status: state.status, candidate: state.candidate, proposal: state.proposal, error: state.error };
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }

  // 只读读取一个 Artifact 的完整可读字段（标题/正文/来源/拟入路径/查重命中）。
  // 与 apply() 共用同一份本地状态，但不做任何写入；供审批顾问读取后给出建议。
  async readArtifact(id) {
    let state;
    try {
      state = JSON.parse(await fs.readFile(path.join(this.stateRoot, `${id}.json`), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") throw Object.assign(new Error(`收录 Artifact 不存在：${id}`), { code: "ARTIFACT_MISSING" });
      throw error;
    }
    const prepared = state.prepared || {};
    const candidate = state.candidate || {};
    const proposal = state.proposal || {};
    const payload = state.payload || {};
    return {
      id,
      title: candidate.title,
      body: String(prepared.content || prepared.text || ""),
      source: prepared.sourceUrl || (payload.kind === "url" ? String(payload.value || "") : ""),
      digest: candidate.summary,
      proposedPath: proposal.suggestedPath,
      existingRef: proposal.existingNoteRef,
      risk: proposal.risk,
      dedupeMatches: Array.isArray(candidate.dedupeMatches) ? candidate.dedupeMatches : [],
      status: state.status,
    };
  }

  async pending({ limit = 50 } = {}) {
    let entries = [];
    try { entries = await fs.readdir(this.stateRoot, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    const pending = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const state = JSON.parse(await fs.readFile(path.join(this.stateRoot, entry.name), "utf8"));
      if (["received", "proposed", "failed"].includes(state.status)) pending.push({
        id: state.candidate?.artifactId || entry.name.replace(/\.json$/, ""), title: state.candidate?.title,
        status: state.status, proposal: state.proposal, created: state.candidate?.created || state.created || state.artifact?.created,
      });
    }
    return pending.sort((a, b) => String(b.created || "").localeCompare(String(a.created || ""))).slice(0, limit);
  }

  async apply(id, { workspace = PATHS.repoRoot, decision } = {}) {
    const state = JSON.parse(await fs.readFile(path.join(this.stateRoot, `${id}.json`), "utf8"));
    if (!state.proposal) throw Object.assign(new Error("收录方案尚未生成"), { code: "INGEST_PROPOSAL_MISSING" });
    const action = String(decision?.action || "");
    if (!action) throw Object.assign(new Error("必须提供显式收录决策"), { code: "INGEST_DECISION_REQUIRED" });
    const allowed = state.proposal.risk === "additive"
      ? new Set(["create", "reject"])
      : new Set(["append-source", "link-only", "keep-separate", "reject"]);
    if (!allowed.has(action)) throw Object.assign(new Error(`收录决策 ${action} 不适用于 ${state.proposal.risk} 方案`), { code: "INGEST_DECISION_INVALID" });
    const relative = action === "append-source" || action === "link-only" ? state.proposal.existingNoteRef : state.proposal.suggestedPath;
    const target = relative ? path.join(workspace, relative) : null;
    const source = state.prepared.sourceUrl ? `source_url: ${JSON.stringify(state.prepared.sourceUrl)}\n` : "";
    const content = `---\ntitle: ${JSON.stringify(state.candidate.title)}\nstatus: captured\nfactual_status: unverified\n${source}---\n\n# ${state.candidate.title}\n\n${state.prepared.content || state.prepared.text}\n\n## 关系状态\n\n${state.proposal.suggestedLinks.length ? state.proposal.suggestedLinks.map((item) => `- 候选关联：[[${item.replace(/^vault\//, "").replace(/\.md$/, "")}]]`).join("\n") : "当前标记为 orphan，等待后续渐进关联。"}\n`;
    const changedPaths = [];
    if (action === "create" || action === "keep-separate") {
      try { await fs.access(target); throw Object.assign(new Error("目标笔记已存在，需要重新查重"), { code: "INGEST_TARGET_EXISTS" }); } catch (error) { if (error.code !== "ENOENT") throw error; }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
      changedPaths.push(relative);
    } else if (action === "append-source" || action === "link-only") {
      const existing = await fs.readFile(target, "utf8");
      const addition = action === "append-source"
        ? `\n\n## 收录补充 · ${state.candidate.title}\n\n${state.prepared.content || state.prepared.text}\n`
        : `\n\n## 候选关联\n\n- 收录候选：${state.candidate.title}（Artifact ${id}）\n`;
      await fs.writeFile(target, `${existing.trimEnd()}${addition}`, "utf8");
      changedPaths.push(relative);
    }

    const lifecycle = await this.#writeLifecycle(state, { workspace, action, applied: action !== "reject" });
    changedPaths.push(...lifecycle.changedPaths);
    return { artifactId: id, applied: action !== "reject", action, path: relative || "", lifecycle, changedPaths: [...new Set(changedPaths)] };
  }

  async applyBatch(ids, options = {}) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 50) throw new Error("批量收录必须包含 1–50 个 Artifact ID");
    const results = [];
    for (const id of [...new Set(ids)]) results.push(await this.apply(id, options));
    return { applied: results.length, results, changedPaths: [...new Set(results.flatMap((item) => item.changedPaths))] };
  }

  async markApplied(id, result = {}) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    await atomicJson(stateFile, { ...state, status: result.applied === false ? "rejected" : "applied", decision: result.action, appliedAt: this.clock().toISOString() });
  }

  async #writeLifecycle(state, { workspace, action, applied }) {
    const artifactFile = path.join(workspace, "ops", "artifacts", state.created.slice(0, 4), state.created.slice(5, 7), `${state.candidate.artifactId}.md`);
    const candidateFile = path.join(workspace, "ops", "artifacts", "candidates", `${state.candidate.id}.md`);
    const proposalFile = path.join(workspace, "ops", "artifacts", "proposals", `${state.proposal.id}.md`);
    let existingArtifact = state.artifact || {
      id: state.candidate.artifactId,
      kind: String(state.payload?.kind || "text"),
      path: `local-state://ingest/${state.candidate.artifactId}`,
      created: state.created,
      isolated: true,
      size: Buffer.byteLength(JSON.stringify(state.payload || {})),
      ownerId: state.ownerId || "local-user",
    };
    try { existingArtifact = parseRecord(await fs.readFile(artifactFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const artifact = { ...existingArtifact, status: applied ? "accepted" : "rejected" };
    const candidate = { ...state.candidate, status: applied ? "accepted" : "rejected" };
    const proposal = { ...state.proposal, status: applied ? "applied" : "rejected" };
    await writeRecord(artifactFile, artifact, { schema: "artifact", title: `Artifact ${artifact.id}`, summaryKeys: ["id", "kind", "created", "isolated", "status", "sourceUrl"] });
    await writeRecord(candidateFile, candidate, { schema: "inbox-candidate", title: candidate.title, summaryKeys: ["id", "artifactId", "title", "status", "confidence", "created"] });
    await writeRecord(proposalFile, proposal, { schema: "ingest-proposal", title: `Ingest proposal: ${candidate.title}`, summaryKeys: ["id", "candidateId", "status", "suggestedPath", "risk", "created"] });
    return {
      artifact, candidate, proposal, action,
      changedPaths: [artifactFile, candidateFile, proposalFile].map((file) => path.relative(workspace, file).replace(/\\/g, "/")),
    };
  }
}

export { IngestService, slug, titleFromPrepared };
