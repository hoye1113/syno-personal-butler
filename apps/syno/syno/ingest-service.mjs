import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { IntakeService } from "./intake.mjs";
import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { PATHS } from "./paths.mjs";
import { validateContractRecord } from "./schema-registry.mjs";
import { hasSourceNoise } from "./source-fetcher.mjs";
import { buildSourceDescriptor } from "./source-descriptor.mjs";
import { classifyTags } from "./canonical-tags.mjs";

function slug(value) {
  return String(value || "capture").toLocaleLowerCase("zh-CN").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "capture";
}

// 收录笔记文件名（不含 .md）= <base>-<8位hash>。提交校验（validator.mjs）按文件名计长、
// 上限 maxFilenameLength（无 contract 覆盖、默认 50）；为 hash 后缀预留 9 字符，
// base 截到 41 以内并去尾连字符，否则长标题收录必在提交时撞长度校验（2026-08-06 实证）。
function noteFilenameBase(title, artifactId) {
  const hashSuffix = String(artifactId).slice(-8);
  const base = slug(title).slice(0, 50 - hashSuffix.length - 1).replace(/-+$/u, "") || "capture";
  return `${base}-${hashSuffix}`;
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

function objectDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const RELATION_LABELS = Object.freeze({
  supports: "支持",
  extends: "补充",
  contradicts: "反驳",
  limits: "限制",
  depends_on: "依赖",
  applies_to: "应用于",
  example_of: "示例",
});
const BILIBILI_PROFILE_FIELDS = Object.freeze([
  "sourceTier", "sourceForm", "contentForm", "dialogueFidelity",
  "questionSource", "voiceBasis", "factualStatus", "factualReviewed",
  "verificationScope", "verificationBasis",
]);

function completeBilibiliProfile(proposal, { requireCanonical = true } = {}) {
  if (proposal.sourceType !== "bilibili-opus") return null;
  const profile = proposal.sourceProfile || {};
  const missing = BILIBILI_PROFILE_FIELDS.filter((field) =>
    profile[field] === undefined || profile[field] === "" || (Array.isArray(profile[field]) && !profile[field].length));
  if (missing.length) {
    throw Object.assign(new Error(`B站 v2 来源画像不完整：${missing.join(", ")}`), {
      code: "INGEST_BILIBILI_PROFILE_INCOMPLETE",
      missing,
    });
  }
  if (profile.verificationScope !== "column_only"
    || profile.factualStatus === "verified"
    || profile.verificationBasis.length !== 1
    || profile.verificationBasis[0] !== "column") {
    throw Object.assign(new Error("B站专栏适配器只读取 column，禁止声明外部原页核验或 verified"), {
      code: "INGEST_BILIBILI_VERIFICATION_OVERCLAIM",
    });
  }
  if (requireCanonical && (!proposal.canonicalBody || !proposal.sourceReport)) {
    throw Object.assign(new Error("B站 v2 缺少 canonical body 或完成报告"), {
      code: "INGEST_BILIBILI_CANONICAL_INCOMPLETE",
    });
  }
  return {
    ...profile,
    ingestWorkflow: "bilibili_opus_ingest_v2",
    primarySource: "column",
  };
}

function buildBilibiliReport({ proposal, profile, canonicalBody, sourceText }) {
  const body = String(canonicalBody || "").trim();
  const questionCount = (body.match(/^##\s+\d{2}\b/gmu) || []).length;
  const checks = {
    duplicate: proposal.duplicateAssessment?.updateStatus !== "unknown",
    sourceCompleteness: Boolean(profile.opusId || profile.columnId),
    provenance: profile.verificationScope === "column_only"
      && profile.factualStatus !== "verified"
      && profile.verificationBasis.length === 1
      && profile.verificationBasis[0] === "column",
    retentionCoverage: body.length > 0 && body.length <= Math.max(String(sourceText || "").length * 2, 2_000),
    dialoguePlan: proposal.materialTier === "S" && profile.sourceForm === "lecture"
      ? profile.contentForm === "dialogue" && profile.dialogueFidelity === "reconstructed"
        && profile.questionSource === "editorial" && questionCount >= 3 && questionCount <= 6
      : profile.contentForm === "lecture"
        ? profile.dialogueFidelity === "none" && profile.questionSource === "none"
      : questionCount >= 3 && questionCount <= 6,
    voiceIntegrity: profile.contentForm === "lecture"
      || /\*\*(?:编者问|现场提问|观众提问|专栏整理|[^*\n]{1,40})[：:]\*\*/u.test(body),
    numericContext: !/\d/u.test(String(sourceText || "")) || /(?:数字|数据|比例|时间|版本|约|大约|截至)/u.test(body),
    constraintsPreserved: /##\s+限制与边界/u.test(body),
    relationQuality: /##\s+知识连接/u.test(body),
    discussionReadiness: /^##\s+/mu.test(body),
    frontmatter: true,
    wikilinks: true,
    semanticReview: false,
  };
  const unresolved = [...new Set(proposal.unresolved || [])];
  return {
    workflow: "bilibili_opus_ingest_v2",
    sourceId: { opus: profile.opusId || "", column: profile.columnId || "", bv: profile.bv || "" },
    route: {
      sourceTier: profile.sourceTier, materialTier: proposal.materialTier,
      sourceForm: profile.sourceForm, contentForm: profile.contentForm,
      dialogueFidelity: profile.dialogueFidelity, questionSource: profile.questionSource,
      voiceBasis: profile.voiceBasis,
    },
    targetPath: proposal.suggestedPath,
    sourcesRead: ["column"],
    sourcesSkipped: ["images", "transcript", "recastory", "original_page"],
    retention: {
      totalUnits: String(sourceText || "").length,
      retained: body.length,
      removed: Math.max(0, String(sourceText || "").length - body.length),
      unresolved: unresolved.length,
    },
    relatedNotes: (proposal.relations || []).map((item) => item.target),
    conceptCandidates: proposal.canonicalTags || [],
    mocUpdates: proposal.mocChanges || [],
    checks,
    unresolved,
    status: Object.values(checks).every(Boolean) && unresolved.length === 0 ? "complete" : "incomplete",
  };
}

function renderBilibiliFrontmatter(profile, materialTier) {
  if (!profile) return "";
  const scalar = (key, value) => value ? `${key}: ${JSON.stringify(value)}\n` : "";
  return [
    "ingest_workflow: bilibili_opus_ingest_v2\n",
    "source_type: bilibili_opus\n",
    scalar("opus_id", profile.opusId),
    scalar("column_id", profile.columnId),
    scalar("bv", profile.bv),
    scalar("video_url", profile.videoUrl),
    scalar("uploader", profile.uploader),
    "primary_source: column\n",
    `source_tier: ${profile.sourceTier}\n`,
    `material_tier: ${materialTier}\n`,
    `source_form: ${profile.sourceForm}\n`,
    `content_form: ${profile.contentForm}\n`,
    `dialogue_fidelity: ${profile.dialogueFidelity}\n`,
    `question_source: ${profile.questionSource}\n`,
    `voice_basis: ${profile.voiceBasis}\n`,
    `factual_status: ${profile.factualStatus}\n`,
    `factual_reviewed: ${profile.factualReviewed}\n`,
    `verification_scope: ${profile.verificationScope}\n`,
    `verification_basis: ${JSON.stringify(profile.verificationBasis)}\n`,
  ].join("");
}

function noteLink(target) {
  return String(target || "").replace(/^vault\//, "").replace(/\.md$/u, "");
}

function renderRelations(relations = []) {
  if (!relations.length) return "当前标记为 orphan，等待后续渐进关联。";
  return relations.map((item) =>
    `- ${RELATION_LABELS[item.type] || item.type}：[[${noteLink(item.target)}]] — ${String(item.reason).trim()}`,
  ).join("\n");
}

function proposalAllowsWriteJob(proposal = {}) {
  return proposal.quality?.status !== "rejected";
}

function isAllowedIngestPath(value) {
  return /^vault\/(?:00-Inbox|01-Areas|02-Resources|03-Archive)\/(?!.*(?:^|\/)\.\.(?:\/|$))[\p{L}\p{N} _./&()-]+\.md$/u
    .test(String(value || ""));
}

// append/link 写入的是已存在的 vault 笔记（existingNoteRef，来自 knowledge.search）。
// 约束比 isAllowedIngestPath 宽：只要落在 vault 内、且无 `..` 越界即可，
// 不强制四个规范子目录——主人既有笔记可能就在 vault 其它子路径下（O5）。
function isAllowedExistingVaultPath(value) {
  return /^vault\/(?!.*(?:^|\/)\.\.(?:\/|$))[\p{L}\p{N} _./&()-]+\.md$/u
    .test(String(value || ""));
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

// 原子写 vault 笔记正文：uuid tmp + rename，避免进程在写一半崩溃留下截断/损坏的 .md（R3）。
// 不强制 0o600——vault 笔记是主人可读的知识文件，沿用默认权限，与历史 fs.writeFile 行为一致。
async function atomicText(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await fs.writeFile(temporary, content, "utf8");
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {}); // rename 失败时清理残留 tmp
    throw error;
  }
}

class IngestService {
  // 按目标笔记路径串行化 append/link 的读-改-写，避免并发收录决策互相覆盖丢失（R3）。
  #targetLocks = new Map();

  constructor({ intake = new IntakeService(), knowledge, opsRoot = PATHS.opsRoot, stateRoot = path.join(PATHS.stateRoot, "ingest"), clock = () => new Date(), projectService = null } = {}) {
    if (!knowledge) throw new Error("IngestService 缺少 KnowledgeStore");
    this.intake = intake; this.knowledge = knowledge; this.opsRoot = opsRoot; this.stateRoot = stateRoot; this.clock = clock; this.projectService = projectService;
  }

  async #validateProject(state) {
    if (!state?.projectRef) return null;
    if (!this.projectService) throw Object.assign(new Error("Project 上下文校验服务未配置"), { code: "PROJECT_CONTEXT_UNAVAILABLE" });
    return this.projectService.validateProjectReference({ ownerKey: state.ownerId, projectRef: state.projectRef });
  }

  async #validateProposalProjects(state) {
    const expected = state?.projectRef ? [String(state.projectRef)] : [];
    const actual = [...new Set(Array.isArray(state?.proposal?.suggestedProjectRefs)
      ? state.proposal.suggestedProjectRefs.map(String)
      : [])];
    if (actual.length && (actual.length !== expected.length || actual.some((ref, index) => ref !== expected[index]))) {
      throw Object.assign(new Error("收录方案中的 Project 关系与请求上下文不一致"), { code: "PROJECT_CONTEXT_PROPOSAL_MISMATCH" });
    }
    for (const projectRef of actual) {
      if (!this.projectService) throw Object.assign(new Error("Project 上下文校验服务未配置"), { code: "PROJECT_CONTEXT_UNAVAILABLE" });
      await this.projectService.validateProjectReference({ ownerKey: state.ownerId, projectRef });
    }
    return actual.length ? actual : expected;
  }

  // 串行化对同一目标文件的写；空闲后清条目防止 Map 无界增长。
  #serializeTarget(target, task) {
    const previous = this.#targetLocks.get(target) ?? Promise.resolve();
    const result = previous.then(() => task());
    const next = result.then(() => undefined, () => undefined);
    this.#targetLocks.set(target, next);
    next.then(() => { if (this.#targetLocks.get(target) === next) this.#targetLocks.delete(target); });
    return result;
  }

  async receive(payload, { ownerId = "local-user", channel = "web", messageId = "", projectRef = "" } = {}) {
    await this.#validateProject({ ownerId, projectRef });
    const now = this.clock().toISOString();
    const id = `artifact-${now.slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8)}`;
    const serialized = JSON.stringify(payload);
    const sourceDescriptor = buildSourceDescriptor({ payload, channel, messageId, now });
    const record = {
      id, kind: String(payload.kind || "text"), path: `local-state://ingest/${id}`, created: now, isolated: true,
      size: Buffer.byteLength(serialized), status: "received", ownerId,
      ...(payload.kind === "url" ? { sourceUrl: String(payload.value || "") } : {}),
      sourceDescriptor,
      dedupeKey: createHash("sha256").update(serialized).digest("hex"),
    };
    const localFile = path.join(this.stateRoot, `${id}.json`);
    await atomicJson(localFile, { payload, ownerId, channel, messageId, status: "received", created: now, artifact: record, ...(projectRef ? { projectRef } : {}) });
    return { artifact: record, proposalPending: true };
  }

  async applyBrowserSnapshot(id, snapshot = {}) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    if (state.payload?.kind !== "url") throw Object.assign(new Error("只有 URL 收录可以使用浏览器正文"), { code: "INGEST_BROWSER_SOURCE_INVALID" });
    const text = String(snapshot.content || snapshot.text || "").trim();
    if (!text) throw Object.assign(new Error("浏览器没有返回可读取正文"), { code: "INGEST_BROWSER_CONTENT_EMPTY" });
    if (hasSourceNoise(text)) throw Object.assign(new Error("浏览器正文疑似 CSS 噪声，低质量"), { code: "INGEST_BROWSER_CONTENT_NOISE", retryable: false });
    if (Buffer.byteLength(text, "utf8") > 2 * 1024 * 1024) throw Object.assign(new Error("浏览器正文超过 2 MB 限制"), { code: "INGEST_BROWSER_CONTENT_TOO_LARGE" });
    const browserSnapshot = {
      url: String(snapshot.finalUrl || snapshot.url || state.payload.value || ""),
      contentType: String(snapshot.contentType || "text/html"),
      text: text.slice(0, 100_000),
      truncated: text.length > 100_000,
      method: "kimi_webbridge",
      contentDigest: String(snapshot.contentDigest || ""),
    };
    await atomicJson(stateFile, { ...state, browserSnapshot, browserCapture: {
      status: "completed",
      finalUrl: browserSnapshot.url,
      contentDigest: browserSnapshot.contentDigest,
    } });
    return browserSnapshot;
  }

  async propose(id) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    await this.#validateProject(state);
    if (state.status === "proposed" && state.candidate && state.proposal) {
      return { candidate: state.candidate, proposal: state.proposal };
    }
    try {
      const prepared = await this.intake.prepare(state.browserSnapshot
        ? { ...state.payload, browserSnapshot: state.browserSnapshot }
        : state.payload);
    const title = titleFromPrepared(prepared, state.payload);
    const titleMatches = await this.knowledge.search(title, { limit: 5, projectRef: state.projectRef || "" });
    const now = this.clock().toISOString();
    const candidate = {
      id: `candidate-${randomUUID().slice(0, 8)}`, artifactId: id, title, summary: String(prepared.content || prepared.text || "").slice(0, 280),
      status: "proposed", confidence: titleMatches.length ? 0.65 : 0.8, dedupeMatches: titleMatches.map((item) => item.path), created: now,
    };
    const sourceDescriptor = buildSourceDescriptor({ payload: state.payload, prepared, channel: state.channel, messageId: state.messageId, now: state.created });
    const sourceDigest = createHash("sha256").update(String(prepared.content || prepared.text || "")).digest("hex");
    const sourceMatches = typeof this.knowledge.findBySource === "function"
      ? await this.knowledge.findBySource({
        canonicalUrl: sourceDescriptor.canonicalUrl,
        contentSha256: sourceDescriptor.contentSha256,
      })
      : [];
    const matches = [...new Map([...sourceMatches, ...titleMatches].map((item) => [item.path, item])).values()];
    candidate.confidence = matches.length ? 0.65 : 0.8;
    candidate.dedupeMatches = matches.map((item) => item.path);
    const priorDigest = sourceMatches.find((item) => item.sourceDigest)?.sourceDigest || "";
    const updateStatus = !sourceMatches.length ? "new" : !priorDigest ? "unknown" : priorDigest === sourceDigest ? "same" : "changed";
    const proposalBase = {
      id: `ingest-${randomUUID().slice(0, 8)}`, candidateId: candidate.id, status: "proposed",
      suggestedPath: `vault/00-Inbox/${noteFilenameBase(title, id)}.md`, suggestedTags: [],
      suggestedLinks: matches.slice(0, 3).map((item) => item.path), risk: matches.length ? "merge" : "additive", created: now,
      sourceDescriptor,
      sourceType: String(prepared.sourceType || state.payload.kind || "text"),
      ...(prepared.sourceProfile ? { sourceProfile: prepared.sourceProfile } : {}),
      quality: { status: "pending", reasons: [] },
      materialTier: "unrated",
      canonicalTags: [],
      duplicateAssessment: { matches: matches.map((item) => item.path), sameSource: sourceMatches.length > 0, updateStatus },
      relations: [],
      mocChanges: [],
      claimCandidates: [],
      evidenceCandidates: [],
      unresolved: [
        ...(matches.length ? ["需要主人决定与相似知识的关系"] : []),
        ...(sourceDescriptor.verificationStatus === "verified" ? [] : ["来源或内容尚未完成事实核验"]),
      ],
      validators: ["source-traceability", "duplicate", "frontmatter", "vault-contract"],
      sourceDigest,
      ...(state.projectRef ? { suggestedProjectRefs: [state.projectRef] } : {}),
      ...(matches[0] ? { existingNoteRef: matches[0].path } : {}),
    };
    const proposal = { ...proposalBase, proposalDigest: objectDigest(proposalBase) };
    await validateContractRecord("ingest-proposal", proposal);
    await atomicJson(stateFile, { ...state, status: "proposed", prepared, candidate, proposal });
    return { candidate, proposal };
    } catch (error) {
      await atomicJson(stateFile, { ...state, status: "failed", error: { code: error.code || "INGEST_PROPOSAL_FAILED", message: error.message, retryable: error.retryable === true } });
      throw error;
    }
  }

  async revise(id, revisionRequest) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    await this.#validateProject(state);
    await this.#validateProposalProjects(state);
    if (!state.proposal) throw Object.assign(new Error("收录方案尚未生成"), { code: "INGEST_PROPOSAL_MISSING" });
    const revision = String(revisionRequest || "").trim();
    if (!revision) throw Object.assign(new Error("修改要求不能为空"), { code: "INGEST_REVISION_REQUIRED" });
    const now = this.clock().toISOString();
    const proposalBase = {
      ...state.proposal,
      id: `ingest-${randomUUID().slice(0, 8)}`,
      status: "proposed",
      previousProposalId: state.proposal.id,
      revisionRequest: revision,
      created: now,
    };
    delete proposalBase.proposalDigest;
    const proposal = { ...proposalBase, proposalDigest: objectDigest(proposalBase) };
    await validateContractRecord("ingest-proposal", proposal);
    await atomicJson(stateFile, { ...state, status: "proposed", proposal, revisedAt: now });
    return { candidate: state.candidate, proposal };
  }

  async enrichProposal(id, analysis = {}, { rulesDigest = "" } = {}) {
    const stateFile = path.join(this.stateRoot, `${id}.json`);
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    if (!state.proposal) throw Object.assign(new Error("收录方案尚未生成"), { code: "INGEST_PROPOSAL_MISSING" });
    await this.#validateProject(state);
    await this.#validateProposalProjects(state);
    const allowedRelations = new Set(["supports", "extends", "contradicts", "limits", "depends_on", "applies_to", "example_of"]);
    const relationInputs = Array.isArray(analysis.relations) ? analysis.relations : state.proposal.relations;
    const allowedRelationTargets = new Set(state.candidate?.dedupeMatches || []);
    const relations = [];
    for (const item of relationInputs) {
      if (!allowedRelations.has(item?.type) || !item.target || !item.reason) continue;
      const target = String(item.target);
      if (!target.startsWith("vault/") || !allowedRelationTargets.has(target)) continue;
      try {
        await this.knowledge.read(target);
        relations.push({ type: item.type, target, reason: String(item.reason) });
      } catch {
        // A relation is accepted only when Syno can resolve the target note.
      }
    }
    const suggestedPath = typeof analysis.suggestedPath === "string"
      && isAllowedIngestPath(analysis.suggestedPath)
      ? analysis.suggestedPath
      : state.proposal.suggestedPath;
    const tags = classifyTags(Array.isArray(analysis.canonicalTags) ? analysis.canonicalTags : state.proposal.canonicalTags);
    const mocChanges = Array.isArray(analysis.mocChanges) ? analysis.mocChanges : state.proposal.mocChanges;
    const unresolved = [
      ...(Array.isArray(analysis.unresolved) ? analysis.unresolved.map(String) : state.proposal.unresolved),
      ...tags.candidates.map((tag) => `新标签候选（需双审批）：${tag}`),
    ];
    const proposalBase = {
      ...state.proposal,
      suggestedPath,
      quality: analysis.quality && ["accepted", "limited", "rejected"].includes(analysis.quality.status)
        ? { status: analysis.quality.status, reasons: (analysis.quality.reasons || []).map(String) }
        : state.proposal.quality,
      materialTier: ["S", "A", "B"].includes(analysis.materialTier) ? analysis.materialTier : state.proposal.materialTier,
      canonicalTags: tags.approved,
      suggestedTags: tags.approved,
      relations,
      mocChanges,
      claimCandidates: Array.isArray(analysis.claimCandidates) ? analysis.claimCandidates : state.proposal.claimCandidates,
      evidenceCandidates: Array.isArray(analysis.evidenceCandidates) ? analysis.evidenceCandidates : state.proposal.evidenceCandidates,
      ...(state.proposal.sourceType === "bilibili-opus" ? {
        sourceProfile: {
          ...(state.proposal.sourceProfile || {}),
          ...(analysis.sourceProfile || {}),
          ingestWorkflow: "bilibili_opus_ingest_v2",
          primarySource: "column",
        },
        ...(typeof analysis.canonicalBody === "string" && analysis.canonicalBody.trim()
          ? { canonicalBody: analysis.canonicalBody.trim() }
          : {}),
      } : {}),
      unresolved: [...new Set(unresolved)],
      validators: Array.isArray(analysis.validators) ? [...new Set(analysis.validators.map(String))] : state.proposal.validators,
      risk: mocChanges.length ? "high" : state.proposal.risk,
      ...(rulesDigest ? { rulesDigest } : {}),
    };
    if (proposalBase.sourceType === "bilibili-opus" && proposalBase.canonicalBody) {
      const profile = completeBilibiliProfile(proposalBase, { requireCanonical: false });
      proposalBase.sourceReport = buildBilibiliReport({
        proposal: proposalBase,
        profile,
        canonicalBody: proposalBase.canonicalBody,
        sourceText: state.prepared?.content || state.prepared?.text || "",
      });
    }
    delete proposalBase.proposalDigest;
    const proposal = { ...proposalBase, proposalDigest: objectDigest(proposalBase) };
    await validateContractRecord("ingest-proposal", proposal);
    await atomicJson(stateFile, { ...state, proposal, status: "proposed", analyzedAt: this.clock().toISOString() });
    return { candidate: state.candidate, proposal };
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
    const relationCandidates = candidate.title && typeof this.knowledge.search === "function"
      ? (await this.knowledge.search(candidate.title, { limit: 5, projectRef: state.projectRef || "" }))
        .filter((item) => item.path && item.excerpt && item.sensitive !== true)
        .map((item) => ({ path: item.path, title: item.title, excerpt: String(item.excerpt).slice(0, 800) }))
      : [];
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
      relationCandidates,
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

  async apply(id, { workspace = PATHS.repoRoot, decision, expectedOwnerKey, expectedProjectRef } = {}) {
    const state = JSON.parse(await fs.readFile(path.join(this.stateRoot, `${id}.json`), "utf8"));
    if (!state.proposal) throw Object.assign(new Error("收录方案尚未生成"), { code: "INGEST_PROPOSAL_MISSING" });
    if (expectedOwnerKey !== undefined && String(state.ownerId || "") !== String(expectedOwnerKey || "")) {
      throw Object.assign(new Error("收录 Workflow 与执行 Job 的 Owner 不一致"), { code: "PROJECT_WORKFLOW_OWNER_MISMATCH" });
    }
    if (expectedProjectRef !== undefined && String(state.projectRef || "") !== String(expectedProjectRef || "")) {
      throw Object.assign(new Error("收录 Workflow 与执行 Job 的 Project 不一致"), { code: "PROJECT_WORKFLOW_PROJECT_MISMATCH" });
    }
    await this.#validateProject(state);
    const projectRefs = await this.#validateProposalProjects(state);
    const action = String(decision?.action || "");
    if (!action) throw Object.assign(new Error("必须提供显式收录决策"), { code: "INGEST_DECISION_REQUIRED" });
    const allowed = state.proposal.risk === "additive"
      ? new Set(["create", "reject"])
      : new Set(["append-source", "link-only", "keep-separate", "reject"]);
    if (!allowed.has(action)) throw Object.assign(new Error(`收录决策 ${action} 不适用于 ${state.proposal.risk} 方案`), { code: "INGEST_DECISION_INVALID" });
    const relative = action === "append-source" || action === "link-only" ? state.proposal.existingNoteRef : state.proposal.suggestedPath;
    // O5：所有写入型决策都要先校验目标路径——新建必须在四个规范知识目录内（isAllowedIngestPath），
    //     append/link 写的是既有 vault 笔记，只要落在 vault 内、无 `..` 越界即可（isAllowedExistingVaultPath）。
    if (action === "create" || action === "keep-separate") {
      if (!isAllowedIngestPath(relative)) throw Object.assign(new Error(`收录目标不在允许的知识目录：${relative}`), { code: "INGEST_TARGET_PATH_DENIED" });
    } else if (action === "append-source" || action === "link-only") {
      if (!isAllowedExistingVaultPath(relative)) throw Object.assign(new Error(`收录目标不在 vault 内：${relative}`), { code: "INGEST_TARGET_PATH_DENIED" });
    }
    const target = relative ? path.join(workspace, relative) : null;
    const descriptor = state.proposal.sourceDescriptor || state.artifact?.sourceDescriptor || buildSourceDescriptor({ payload: state.payload, prepared: state.prepared, channel: state.channel, messageId: state.messageId, now: state.created });
    const sourceUrl = descriptor.canonicalUrl ? `source_url: ${JSON.stringify(descriptor.canonicalUrl)}\n` : "";
    const sourceDigest = state.proposal.sourceDigest ? `source_content_sha256: ${state.proposal.sourceDigest}\n` : "";
    const sourceFileDigest = descriptor.contentSha256 ? `source_file_sha256: ${descriptor.contentSha256}\n` : "";
    const canonicalTags = state.proposal.canonicalTags?.length ? state.proposal.canonicalTags : ["notes"];
    const relations = state.proposal.relations || [];
    const bilibiliProfile = completeBilibiliProfile(state.proposal);
    const sourceRef = descriptor.canonicalUrl || descriptor.originalFilename || descriptor.kind || "unknown";
    const description = String(state.candidate.summary || state.candidate.title).replace(/\s+/gu, " ").trim().slice(0, 180);
    const factualStatus = bilibiliProfile?.factualStatus || (descriptor.verificationStatus === "verified" ? "partial" : "unverified");
    const specialized = renderBilibiliFrontmatter(bilibiliProfile, state.proposal.materialTier);
    const genericSource = bilibiliProfile ? "" : `factual_status: ${factualStatus}\n`;
    const projectFrontmatter = (action === "create" || action === "keep-separate") && projectRefs.length
      ? `project_refs: ${JSON.stringify(projectRefs)}\n`
      : "";
    const noteBody = bilibiliProfile ? state.proposal.canonicalBody : (state.prepared.content || state.prepared.text);
    const content = `---\ntitle: ${JSON.stringify(state.candidate.title)}\ntags: ${JSON.stringify(canonicalTags)}\n${projectFrontmatter}created: ${String(state.created).slice(0, 10)}\nsource: ${JSON.stringify(sourceRef)}\ndescription: ${JSON.stringify(description)}\nknowledge_state: captured\nlink_status: ${relations.length ? "connected" : "orphan"}\n${genericSource}${specialized}source_kind: ${descriptor.kind}\nsource_reliability: ${descriptor.reliability}\nsource_verification: ${descriptor.verificationStatus}\n${sourceUrl}${sourceDigest}${sourceFileDigest}---\n\n# ${state.candidate.title}\n\n${noteBody}\n\n## 关系状态\n\n${renderRelations(relations)}\n`;
    const changedPaths = [];
    if (action === "create" || action === "keep-separate") {
      // 「存在性检查 + 写」也按目标串行化，避免并发同路径新建的 TOCTOU（两者都见 ENOENT 后互相覆盖）（R3 补齐）。
      await this.#serializeTarget(target, async () => {
        try { await fs.access(target); throw Object.assign(new Error("目标笔记已存在，需要重新查重"), { code: "INGEST_TARGET_EXISTS" }); } catch (error) { if (error.code !== "ENOENT") throw error; }
        await atomicText(target, content);
      });
      changedPaths.push(relative);
    } else if (action === "append-source" || action === "link-only") {
      // 读-改-写需按目标串行化，避免并发收录决策互相覆盖（R3）。
      await this.#serializeTarget(target, async () => {
        const existing = await fs.readFile(target, "utf8");
        const addition = action === "append-source"
          ? `\n\n## 收录补充 · ${state.candidate.title}\n\n${state.prepared.content || state.prepared.text}\n`
          : `\n\n## 候选关联\n\n- 收录候选：${state.candidate.title}（Artifact ${id}）\n`;
        await atomicText(target, `${existing.trimEnd()}${addition}`);
      });
      changedPaths.push(relative);
    }

    const lifecycle = await this.#writeLifecycle(state, { workspace, action, applied: action !== "reject" });
    changedPaths.push(...lifecycle.changedPaths);
    const completionStatus = state.proposal.quality?.status === "accepted"
      && !(state.proposal.unresolved || []).length
      && (!bilibiliProfile || state.proposal.sourceReport?.status === "complete")
      ? "complete"
      : "incomplete";
    return {
      artifactId: id,
      applied: action !== "reject",
      action,
      path: relative || "",
      source: descriptor,
      duplicateOrRelations: {
        ...state.proposal.duplicateAssessment,
        relations: state.proposal.relations || [],
      },
      candidates: {
        claims: state.proposal.claimCandidates || [],
        evidence: state.proposal.evidenceCandidates || [],
      },
      unverifiedIssues: [
        ...(descriptor.verificationStatus === "verified" ? [] : ["来源或内容尚未通过事实核验"]),
        ...(state.proposal.unresolved || []),
      ],
      knowledgeState: "captured",
      completionStatus,
      lifecycle,
      changedPaths: [...new Set(changedPaths)],
    };
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
    const sourceDescriptor = state.proposal.sourceDescriptor
      || state.artifact?.sourceDescriptor
      || buildSourceDescriptor({
        payload: state.payload,
        prepared: state.prepared,
        channel: state.channel,
        messageId: state.messageId,
        now: state.created,
      });
    const artifact = { ...existingArtifact, sourceDescriptor: existingArtifact.sourceDescriptor || sourceDescriptor, status: applied ? "accepted" : "rejected" };
    const candidate = { ...state.candidate, status: applied ? "accepted" : "rejected" };
    const proposal = { ...state.proposal, sourceDescriptor: state.proposal.sourceDescriptor || sourceDescriptor, status: applied ? "applied" : "rejected" };
    await writeRecord(artifactFile, artifact, { schema: "artifact", title: `Artifact ${artifact.id}`, summaryKeys: ["id", "kind", "created", "isolated", "status", "sourceUrl"] });
    await writeRecord(candidateFile, candidate, { schema: "inbox-candidate", title: candidate.title, summaryKeys: ["id", "artifactId", "title", "status", "confidence", "created"] });
    await writeRecord(proposalFile, proposal, { schema: "ingest-proposal", title: `Ingest proposal: ${candidate.title}`, summaryKeys: ["id", "candidateId", "status", "suggestedPath", "risk", "created"] });
    return {
      artifact, candidate, proposal, action,
      changedPaths: [artifactFile, candidateFile, proposalFile].map((file) => path.relative(workspace, file).replace(/\\/g, "/")),
    };
  }
}

export { IngestService, isAllowedIngestPath, isAllowedExistingVaultPath, proposalAllowsWriteJob, noteFilenameBase, slug, titleFromPrepared };
