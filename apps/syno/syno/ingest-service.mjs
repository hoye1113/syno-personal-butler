import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { IntakeService } from "./intake.mjs";
import { writeRecord } from "./markdown-record.mjs";
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
    const localFile = path.join(this.stateRoot, `${id}.json`);
    await atomicJson(localFile, { payload, ownerId, channel, status: "received", created: now });
    const record = {
      id, kind: String(payload.kind || "text"), path: `local-state://ingest/${id}`, created: now, isolated: true,
      size: Buffer.byteLength(serialized), status: "received", ownerId,
      ...(payload.kind === "url" ? { sourceUrl: String(payload.value || "") } : {}),
      dedupeKey: createHash("sha256").update(serialized).digest("hex"),
    };
    const file = path.join(this.opsRoot, "artifacts", now.slice(0, 4), now.slice(5, 7), `${id}.md`);
    await writeRecord(file, record, { schema: "artifact", title: `Artifact ${id}`, summaryKeys: ["id", "kind", "created", "isolated", "status", "sourceUrl"] });
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
    await writeRecord(path.join(this.opsRoot, "artifacts", "candidates", `${candidate.id}.md`), candidate, { schema: "inbox-candidate", title: candidate.title, summaryKeys: ["id", "artifactId", "title", "status", "confidence", "created"] });
    await writeRecord(path.join(this.opsRoot, "artifacts", "proposals", `${proposal.id}.md`), proposal, { schema: "ingest-proposal", title: `Ingest proposal: ${title}`, summaryKeys: ["id", "candidateId", "status", "suggestedPath", "risk", "created"] });
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

  async apply(id, { workspace = PATHS.repoRoot } = {}) {
    const state = JSON.parse(await fs.readFile(path.join(this.stateRoot, `${id}.json`), "utf8"));
    if (!state.proposal || state.proposal.risk !== "additive") throw Object.assign(new Error("只有纯新增收录可在单次审批后应用"), { code: "INGEST_REQUIRES_REVIEW" });
    const relative = state.proposal.suggestedPath;
    const target = path.join(workspace, relative);
    try { await fs.access(target); throw Object.assign(new Error("目标笔记已存在，需要重新查重"), { code: "INGEST_TARGET_EXISTS" }); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const source = state.prepared.sourceUrl ? `source_url: ${JSON.stringify(state.prepared.sourceUrl)}\n` : "";
    const content = `---\ntitle: ${JSON.stringify(state.candidate.title)}\nstatus: captured\nfactual_status: unverified\n${source}---\n\n# ${state.candidate.title}\n\n${state.prepared.content || state.prepared.text}\n\n## 关系状态\n\n${state.proposal.suggestedLinks.length ? state.proposal.suggestedLinks.map((item) => `- 候选关联：[[${item.replace(/^vault\//, "").replace(/\.md$/, "")}]]`).join("\n") : "当前标记为 orphan，等待后续渐进关联。"}\n`;
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    return { applied: true, path: relative, changedPaths: [relative] };
  }

  async applyBatch(ids, options = {}) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 50) throw new Error("批量收录必须包含 1–50 个 Artifact ID");
    const results = [];
    for (const id of [...new Set(ids)]) results.push(await this.apply(id, options));
    return { applied: results.length, results, changedPaths: [...new Set(results.flatMap((item) => item.changedPaths))] };
  }
}

export { IngestService, slug, titleFromPrepared };
