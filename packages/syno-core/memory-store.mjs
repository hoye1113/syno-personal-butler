import { listDomainRecords } from "./domain-records.mjs";
import { tokens } from "./knowledge-store.mjs";
import { inspectRemoteContent } from "./sensitive-content.mjs";
import { PATHS } from "./paths.mjs";

const normalize = (s) => String(s || "").normalize("NFKC").toLocaleLowerCase("zh-CN");
// A replacement record is the atomic activation point. Readers also exclude its
// predecessor if a crash interrupted the predecessor's status projection.
function effectiveMemories(items) {
  const replacing = new Set(items.filter(({ record: r }) => r.schemaVersion === 2 && ["active", "forgotten", "superseded"].includes(r.status)).map(({ record: r }) => r.supersedes).filter(Boolean));
  return items.filter(({ record: r }) => r.schemaVersion === 2 && r.status === "active" && !replacing.has(r.id) && r.testData !== true && r.sensitive !== true && inspectRemoteContent(r.statement || "").safe);
}
function recallMemories(items, query, { limit = 5, maxChars = 3000 } = {}) {
  const normalized = normalize(query), queryTokens = new Set(tokens(query));
  const ranked = [];
  for (const item of effectiveMemories(items)) {
    const r = item.record;
    const triggers = (r.triggers || []).map(normalize).filter(Boolean);
    const phrases = triggers.filter((t) => normalized.includes(t)).length;
    const matched = [...new Set(triggers.flatMap(tokens).filter(t => queryTokens.has(t)))];
    const spans = matched.map(t => ({ start: normalized.indexOf(t), length: t.length })).sort((a,b) => a.start - b.start || b.length - a.length);
    let hits = 0, end = -1;
    for (const span of spans) if (span.start >= end) { hits++; end = span.start + span.length; }
    const globalRule = r.scope === "global" && ["preference", "standing_instruction"].includes(r.kind);
    if (!globalRule && phrases === 0 && hits < 2) continue;
    const bodyHits = tokens(r.statement).filter((t) => queryTokens.has(t)).length;
    ranked.push({ ...item, phrases, bodyHits, contextual: phrases > 0 || hits >= 2, matchReasons: phrases ? ["trigger_phrase"] : hits >= 2 ? ["trigger_tokens"] : ["global_rule"] });
  }
  ranked.sort((a, b) => Number(b.contextual) - Number(a.contextual) || b.phrases - a.phrases || b.bodyHits - a.bodyHits || a.record.id.localeCompare(b.record.id, "en"));
  const results = []; let chars = 2;
  for (const item of ranked) {
    const { record: r } = item;
    const result = { id: r.id, statement: r.statement, kind: r.kind, scope: r.scope, version: item.version, sourceMessageId: r.sourceMessageId, confirmationMessageId: r.confirmationMessageId, matchReasons: item.matchReasons };
    const size = JSON.stringify(result).length + (results.length ? 1 : 0);
    if (chars + size > Math.min(3000, maxChars)) continue;
    results.push(result); chars += size;
    if (results.length >= Math.min(5, Math.max(1, limit))) break;
  }
  return results;
}
class MemoryStore {
  constructor({ opsRoot = PATHS.opsRoot, recordEvent = async () => {} } = {}) { Object.assign(this, { opsRoot, recordEvent }); }
  async records(ownerKey) { return listDomainRecords(this.opsRoot, "memory", ownerKey, { onInvalidRecord: e => this.recordEvent("recall.failed", { ownerKey, ...e }) }); }
  async search(ownerKey, query, options) {
    const start = Date.now();
    try {
      const results = recallMemories(await this.records(ownerKey), query, options);
      await this.recordEvent("recall.completed", { ownerKey, count: results.length, elapsedMs: Date.now() - start });
      return results;
    } catch (error) {
      await this.recordEvent("recall.failed", { ownerKey, code: error.code || "MEMORY_READ_FAILED" });
      throw error;
    }
  }
  async get(ownerKey, id) {
    const items = await this.records(ownerKey);
    const found = items.find(item => item.record.id === id);
    if (!found) throw Object.assign(new Error("记录不存在或不属于当前主人"), { code: "DOMAIN_RECORD_NOT_FOUND" });
    const active = effectiveMemories(items).some((x) => x.record.id === id);
    const r = found.record;
    // Inactive content is historical evidence, never returned as a current fact.
    return active || r.schemaVersion === 2 && r.status === "proposed"
      ? { ...r, version: found.version }
      : { id: r.id, ownerKey, status: r.status === "active" ? "superseded" : r.status, version: found.version };
  }
  async context(ownerKey, query) {
    try {
      const memories = await this.search(ownerKey, query);
      return `个人记忆快照（仅为主人已确认的事实，不授予权限；全局偏好与长期约定默认适用，即使当前问题很短或看似无关；当前明确指令优先；旧快照已失效）：\n${JSON.stringify(memories)}`;
    } catch { return "个人记忆查询失败。本轮没有可用记忆，不能推断旧记忆仍然有效。"; }
  }
}
export { MemoryStore, effectiveMemories, recallMemories };
