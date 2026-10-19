import { inspectRemoteContent } from "./sensitive-content.mjs";
import { decisionVersion } from "./pending-decision.mjs";
import { validateContractRecord } from "./schema-registry.mjs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ProcessFileLock } from "./process-lock.mjs";
import { RecoveryJournal } from "./recovery-journal.mjs";
const digest = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
// Publish the directory completion flag only after native images are verified.
const TARGETS = ["wiki", "images", "catalog"];
function classifyResponseError(error, now) {
  const status = Number(error.response?.status || error.status);
  if (![400, 401, 403, 404, 429].includes(status)) return error;
  error.outcomeKnown = true;
  error.code = status === 429 ? "SYNC_RATE_LIMITED" : [401, 403].includes(status) ? "SYNC_PERMISSION_DENIED" : "SYNC_CONFIGURATION_INVALID";
  const headers = error.response?.headers || error.headers;
  const value = headers?.get?.("retry-after") ?? headers?.["retry-after"];
  if (status === 429 && value != null) error.retryAfterMs = /^\d+(?:\.\d+)?$/u.test(String(value)) ? Number(value) * 1000 : Math.max(0, Date.parse(value) - now);
  if (!Number.isFinite(error.retryAfterMs)) delete error.retryAfterMs;
  return error;
}
function syncState(record) { return TARGETS.every(t => record.targets[t]?.status === "succeeded" && record.targets[t]?.appliedVersion === record.sourceVersion) ? "synced" : "pending"; }
class KnowledgePublisher {
  constructor({ config = { mode: "disabled" }, root, stateRoot, adapter, persist, source, decisions, recordEvent = async () => {}, clock = () => new Date() } = {}) {
    if (!["disabled", "sandbox", "production"].includes(config.mode)) throw new Error("未知发布模式");
    if (config.mode !== "disabled" && (!config.targetKey || !config.wikiSpaceId || !config.wikiParentId || !config.appToken || !config.tableId || !config.fields || config.mode === "sandbox" && !config.sandboxConfirmed)) throw new Error("发布目标未确认或配置不完整");
    Object.assign(this, { config: Object.freeze({ ...config }), root, stateRoot, adapter, persist, source, decisions, recordEvent, clock });
  }
  key(ownerKey, id) { return digest([ownerKey, id, this.config.targetKey || "disabled"]); }
  async list(ownerKey) {
    const directory = path.join(this.root, "ops/knowledge/publish-map");
    const names = await fs.readdir(directory).catch(e => { if (e.code === "ENOENT") return []; throw e; });
    const maps = [];
    for (const name of names.filter(n => /^[a-f0-9]{64}\.json$/u.test(n))) { const r = JSON.parse(await fs.readFile(path.join(directory, name), "utf8")); if ((ownerKey === undefined || r.ownerKey === ownerKey) && r.targetKey === this.config.targetKey) maps.push(r); }
    return maps;
  }
  async check(ownerKey) {
    const required = ["targetKey", "wikiSpaceId", "wikiParentId", "appToken", "tableId", "fields"];
    const missing = required.filter(key => !this.config[key]);
    if (this.config.mode === "sandbox" && !this.config.sandboxConfirmed) missing.push("sandboxConfirmed");
    const records = await this.list(ownerKey);
    const counts = {};
    for (const record of records) for (const state of Object.values(record.targets)) counts[state.status] = (counts[state.status] || 0) + 1;
    return { mode: this.config.mode, enabled: this.config.mode !== "disabled", missingConfiguration: missing,
      targetKey: this.config.targetKey || null, registeredNotes: records.length, targetStates: counts,
      diagnostic: await this.adapter.inspect(this.config),
      nextStep: missing.length ? "主人确认隔离 Wiki 父节点、测试表格和字段映射后配置 sandbox；只读可见不代表写入权限" : "隔离模式运行受控写权限探针，并由主人验证产物可访问；本工具不修改开关" };
  }
  async status(ownerKey, id) {
    if (this.config.mode === "disabled") return { mode: "disabled", status: "disabled", reason: "开发期未启用云端发布" };
    const r = (await this.list(ownerKey)).find(x => x.id === id);
    return r ? { ...r, status: syncState(r), mode: this.config.mode } : { mode: this.config.mode, status: "not_registered" };
  }
  async save(record) {
    if (!this.persist) throw new Error("发布状态必须经受控 Host 操作提交");
    record.updatedAt = this.clock().toISOString();
    await validateContractRecord("publish-map", record);
    await this.persist(record, `ops/knowledge/publish-map/${this.key(record.ownerKey, record.id)}.json`);
  }
  lock(ownerKey, id) { return new ProcessFileLock({ file: path.join(this.stateRoot, "leases", `${this.key(ownerKey, id)}.lock`), timeoutMs: 30_000 }); }
  async queue(ownerKey, note) {
    if (this.config.mode === "disabled") return this.status(ownerKey, note.id);
    if (note.personalMemory || note.excluded || !note.complete || !note.resources?.complete) throw Object.assign(new Error("内容或资源不完整，无发布资格"), { code: "SOURCE_RESOURCE_INCOMPLETE" });
    return this.lock(ownerKey, note.id).run(async () => {
      const previous = (await this.list(ownerKey)).find(x => x.id === note.id);
      if (previous?.sourceVersion === note.version && previous?.resourceVersion === note.resources.version) return previous;
      if (previous && TARGETS.some(t => ["unknown", "running"].includes(previous.targets[t]?.status))) throw Object.assign(new Error("上一版本含未核对的远端效果，不能替换发布映射"), { code: "SYNC_OUTCOME_UNKNOWN" });
      const record = { schemaVersion: 1, id: note.id, ownerKey, sourceVersion: note.version, resourceVersion: note.resources.version, targetKey: this.config.targetKey, mode: this.config.mode, targets: Object.fromEntries(TARGETS.map(t => [t, { ...previous?.targets?.[t], expectedVersion: note.version, status: previous?.targets?.[t]?.status === "unknown" ? "unknown" : "pending", attempts: 0 }])) };
      await this.save(record); await this.recordEvent("knowledge.sync.queued", { ownerKey, id: note.id, version: note.version }); return record;
    });
  }
  async conflictPreview(ownerKey, id, context) {
    if (!this.decisions) throw new Error("同步决策存储不可用");
    return this.lock(ownerKey, id).run(async () => {
      const record = (await this.list(ownerKey)).find(r => r.id === id), note = await this.source(ownerKey, id);
      if (!record || record.sourceVersion !== note.version) throw Object.assign(new Error("发布版本已变化，请重新查看同步状态"), { code: "OBJECT_VERSION_CHANGED" });
      const conflicts = [];
      for (const target of TARGETS) {
        const state = record.targets[target];
        if (state.errorCode !== "SYNC_REMOTE_CONFLICT") continue;
        // Image conflicts describe the same managed Wiki document.
        const remote = await this.adapter.read(target === "images" ? "wiki" : target, { state: target === "images" ? record.targets.wiki : state, record, config: this.config });
        conflicts.push({ target, expectedFingerprint: target === "images" ? record.targets.wiki.fingerprint : state.fingerprint, remoteFingerprint: remote.fingerprint, remoteId: target === "images" ? record.targets.wiki.remoteId : state.remoteId, remotePreview: inspectRemoteContent(JSON.stringify(remote.fields || remote.blocks || null)).safe ? remote.fields || remote.blocks || null : { redacted: true, reason: "云端内容含敏感信息，请主人直接检查原页面" } });
      }
      if (!conflicts.length) throw new Error("没有可确认的云端内容冲突");
      const plan = { operation: "knowledge.publish.authorize", targets: [{ id, version: note.version, title: note.title, path: note.path }], mapVersion: digest(record), conflicts: conflicts.map(({ remotePreview, ...metadata }) => metadata) };
      const summary = `以本地版本覆盖 ${note.title} 的受管云端内容（${conflicts.map(c => c.target).join("、")}）；未受管目录字段保留。也可拒绝后先按云端内容修改本地笔记。`;
      const d = await this.decisions.add({ kind: "knowledge", ownerKey, threadKey: context.threadKey, creationMessageId: context.messageId, jobId: `publish-preview:${id}:${digest(JSON.stringify(plan))}`, plan, businessVersion: digest(JSON.stringify(plan)), summary, options: ["approve", "reject"] });
      return { id: d.id, version: decisionVersion(d), status: "awaiting_confirmation", code: "OWNER_CONFIRMATION_REQUIRED", summary, local: { version: note.version, body: note.body }, conflicts };
    });
  }
  async validateRetryPlan(ownerKey, plan) {
    const [ref] = plan.targets, record = (await this.list(ownerKey)).find(r => r.id === ref.id), note = await this.source(ownerKey, ref.id);
    if (!record || digest(record) !== plan.mapVersion || note.version !== ref.version || note.resources.version !== record.resourceVersion) throw Object.assign(new Error("本地内容或同步方案已变化"), { code: "OBJECT_VERSION_CHANGED" });
    for (const conflict of plan.conflicts) {
      const target = conflict.target === "images" ? "wiki" : conflict.target;
      const state = record.targets[target];
      if (state.remoteId !== conflict.remoteId || (await this.adapter.read(target, { state, record, config: this.config })).fingerprint !== conflict.remoteFingerprint) throw Object.assign(new Error("云端内容在确认后再次变化"), { code: "OBJECT_VERSION_CHANGED" });
    }
    return structuredClone(record);
  }
  async authorizeRetry({ decision, job, workspace }) {
    if (!decision || decision.plan.operation !== "knowledge.publish.authorize" || digest(JSON.stringify(decision.plan)) !== decision.businessVersion || decision.ownerKey !== job.ownerKey || decision.threadKey !== job.threadKey || decision.authorization?.messageId !== job.request.sourceMessageId || decision.authorization.messageId === decision.creationMessageId || decision.authorization.businessVersion !== decision.businessVersion || Date.parse(decision.expiresAt) <= this.clock().getTime() || decision.executingJob && decision.executingJob !== job.id) throw Object.assign(new Error("云端覆盖缺少绑定本轮的主人授权"), { code: "OWNER_CONFIRMATION_REQUIRED" });
    return this.lock(job.ownerKey, decision.plan.targets[0].id).run(async () => {
      const record = await this.validateRetryPlan(job.ownerKey, decision.plan);
      for (const conflict of decision.plan.conflicts) {
        const target = conflict.target;
        record.targets[target] = { ...record.targets[target], status: "pending", attempts: 0, errorCode: null, nextRetryAt: null, ...(target === "images" ? {} : { fingerprint: conflict.remoteFingerprint }) };
        if (target === "images") { record.targets.wiki.status = "pending"; record.targets.wiki.fingerprint = conflict.remoteFingerprint; record.targets.wiki.attempts = 0; }
      }
      // A body replacement rebuilds image placeholders and directory state as one version.
      if (record.targets.wiki.status === "pending") for (const target of ["images", "catalog"]) Object.assign(record.targets[target], { status: "pending", attempts: 0 });
      await this.decisions.update(decision.id, { executingJob: job.id });
      record.updatedAt = this.clock().toISOString();
      await validateContractRecord("publish-map", record);
      const relative = `ops/knowledge/publish-map/${this.key(job.ownerKey, record.id)}.json`, file = path.join(workspace, relative);
      await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(record, null, 2) + "\n");
      return { id: record.id, changedPaths: [relative] };
    });
  }
  async retry(ownerKey, id) {
    if (this.config.mode === "disabled") throw new Error("云端发布已关闭");
    if (!(await this.list(ownerKey)).some(x => x.id === id)) throw new Error("没有已登记的发布请求");
    await this.lock(ownerKey, id).run(async () => {
      const record = (await this.list(ownerKey)).find(r => r.id === id); let changed = false;
      for (const state of Object.values(record.targets)) if (state.status === "blocked" && state.errorCode !== "SYNC_REMOTE_CONFLICT" || state.status === "retryable_failed" && state.attempts >= 8) { Object.assign(state, { status: "pending", attempts: 0 }); changed = true; }
      if (changed) await this.save(record);
    });
    return this.run(ownerKey, id);
  }
  async run(ownerKey, id) {
    if (this.config.mode === "disabled") return this.status(ownerKey, id);
    return this.lock(ownerKey, id).run(async () => {
      const record = (await this.list(ownerKey)).find(x => x.id === id);
      if (!record) throw new Error("发布请求不存在");
      const journal = new RecoveryJournal({ file: path.join(this.stateRoot, "journal", `${this.key(ownerKey, id)}.jsonl`), clock: this.clock });
      const note = await this.source(ownerKey, id);
      if (note.version !== record.sourceVersion || note.resources.version !== record.resourceVersion) return { ...record, status: "stale" };
      const assertCurrent = async () => { const current = await this.source(ownerKey, id); if (current.version !== record.sourceVersion || current.resources.version !== record.resourceVersion) throw Object.assign(new Error("源版本已经变化"), { code: "OBJECT_VERSION_CHANGED" }); };
      for (const target of TARGETS) {
        const state = record.targets[target];
        if (state.status === "succeeded" && state.appliedVersion === note.version || state.status === "blocked" || state.attempts >= 8 || state.nextRetryAt && Date.parse(state.nextRetryAt) > this.clock().getTime()) continue;
        if (target !== "wiki" && record.targets.wiki.status !== "succeeded") break;
        if (target === "catalog" && record.targets.images.status !== "succeeded") continue;
        const events = (await journal.read()).filter(x => x.metadata.target === target && x.metadata.version === note.version);
        // Running at process death, or an unmatched intent, means outcome unknown.
        if (state.status === "running" || events.at(-1)?.event === "effect.intent") state.status = "unknown";
        try {
          await assertCurrent();
          if (state.status === "unknown") {
            const reconciled = await this.adapter.reconcile(target, { note, state, events, record, config: this.config });
            if (!reconciled) { state.errorCode = "SYNC_OUTCOME_UNKNOWN"; await this.save(record); await this.recordEvent("knowledge.sync.unknown", { ownerKey, id, target, version: note.version }); continue; }
            Object.assign(state, reconciled, { status: "succeeded", appliedVersion: note.version }); if (reconciled.wikiFingerprint) record.targets.wiki.fingerprint = reconciled.wikiFingerprint; await this.save(record); continue;
          }
          if (target !== "images" && state.remoteId && state.fingerprint) {
            const remote = await this.adapter.read(target, { state, record, config: this.config });
            if (remote.fingerprint !== state.fingerprint) throw Object.assign(new Error("受管云端内容被人工修改"), { code: "SYNC_REMOTE_CONFLICT" });
          }
          Object.assign(state, { status: "running", attempts: (state.attempts || 0) + 1 }); await this.save(record);
          await this.recordEvent("knowledge.sync.started", { ownerKey, id, target, version: note.version });
          const effect = async (operation, execute) => {
            await assertCurrent();
            const effectId = digest([id, note.version, target, operation, state.attempts]);
            await journal.append("effect.intent", { ownerKey, id, version: note.version, target, operation, effectId });
            let result;
            try { result = await execute(); } catch (error) { classifyResponseError(error, this.clock().getTime()); error.effectUnknown = error.outcomeKnown !== true; if (!error.effectUnknown) await journal.append("effect.failed_known", { ownerKey, id, version: note.version, target, operation, effectId, code: error.code || "SYNC_FAILED" }); throw error; }
            await journal.append("effect.observed", { ownerKey, id, version: note.version, target, operation, effectId, remoteId: result?.remoteId || null });
            if (operation === "wiki.create") { state.remoteId = result.remoteId; state.docId = result.docId; await this.save(record); }
            if (operation === "catalog.create") { state.remoteId = result.remoteId; await this.save(record); }
            await assertCurrent(); return result;
          };
          effect.observed = events.filter(e => e.event === "effect.observed");
          const result = await this.adapter.apply(target, { note, state, record, config: this.config, effect });
          await assertCurrent();
          if (result.wikiFingerprint) record.targets.wiki.fingerprint = result.wikiFingerprint;
          Object.assign(state, result, { status: "succeeded", appliedVersion: note.version, errorCode: null, nextRetryAt: null });
          await this.save(record); await this.recordEvent("knowledge.sync.target_succeeded", { ownerKey, id, target, version: note.version });
        } catch (error) {
          classifyResponseError(error, this.clock().getTime());
          if (!error.effectUnknown && error.code !== "SYNC_REMOTE_CONFLICT" && state.status === "running" && state.remoteId && target !== "images") {
            try { state.fingerprint = (await this.adapter.read(target, { state, record, config: this.config })).fingerprint; } catch { /* Preserve the last verified fingerprint. */ }
          }
          const blocked = ["SYNC_PERMISSION_DENIED", "SYNC_CONFIGURATION_INVALID", "SOURCE_RESOURCE_INCOMPLETE", "SYNC_REMOTE_CONFLICT", "OBJECT_VERSION_CHANGED"].includes(error.code);
          state.status = error.effectUnknown ? "unknown" : blocked ? "blocked" : "retryable_failed";
          state.errorCode = error.effectUnknown ? "SYNC_OUTCOME_UNKNOWN" : error.code || "SYNC_TRANSPORT_FAILED";
          state.nextRetryAt = state.status === "retryable_failed" ? new Date(this.clock().getTime() + Math.max(60_000, error.retryAfterMs || 0)).toISOString() : null;
          await this.save(record); await this.recordEvent(error.code === "SYNC_REMOTE_CONFLICT" ? "knowledge.sync.conflict" : state.status === "unknown" ? "knowledge.sync.unknown" : "knowledge.sync.target_failed", { ownerKey, id, target, version: note.version, code: state.errorCode });
        }
      }
      const status = syncState(record);
      if (status === "synced") await this.recordEvent("knowledge.sync.completed", { ownerKey, id, version: note.version });
      return { ...record, status };
    });
  }
  async recover(ownerKey) {
    const results = [];
    for (const r of await this.list(ownerKey)) {
      if (syncState(r) === "synced") continue;
      try { results.push(await this.run(r.ownerKey, r.id)); }
      catch (error) {
        results.push({ id: r.id, status: "blocked", errorCode: error.code || "SYNC_SOURCE_UNAVAILABLE" });
        await this.recordEvent("knowledge.sync.target_failed", { ownerKey, id: r.id, version: r.sourceVersion, code: error.code || "SYNC_SOURCE_UNAVAILABLE" });
      }
    }
    return results;
  }
}
export { KnowledgePublisher, syncState };
