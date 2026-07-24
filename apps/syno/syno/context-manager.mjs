import { createHash } from "node:crypto";

import { estimateTokens } from "./provider-client.mjs";

const CHARS_PER_TOKEN = 3.2;
const SUMMARY_TAG = "[前情摘要]";
const HANDOFF_HEADER = "（已延续前情，开启新对话）";

const DEFAULT_THRESHOLDS = Object.freeze({ light: 0.60, moderate: 0.75, heavy: 0.85, overflow: 0.95 });

function toChars(tokens) {
  return Math.floor(Number(tokens) * CHARS_PER_TOKEN);
}

function splitHeadSystem(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [null, []];
  const [head, ...rest] = messages;
  return head && head.role === "system" ? [head, rest] : [null, messages];
}

function toolDigest(content) {
  return createHash("sha256").update(String(content ?? "")).digest("hex").slice(0, 8);
}

// 与 ProviderClient 同源的 token 估算（含 tools 定义），保证阈值判断一致。
class TokenTracker {
  constructor() {
    this.usageByConversation = new Map();
  }

  trackUsage(usage, conversationId) {
    if (!usage || !conversationId) return;
    const promptTokens = Number(usage.prompt_tokens);
    if (Number.isFinite(promptTokens) && promptTokens >= 0) {
      this.usageByConversation.set(conversationId, promptTokens);
    }
  }

  lastRealTokens(conversationId) {
    return this.usageByConversation.get(conversationId) ?? null;
  }

  estimate(messages, tools) {
    return estimateTokens(messages, tools);
  }
}

// 录入时对大工具结果做 truncate-middle（头尾各保留 ~40%，砍中间）。
class ToolTruncator {
  constructor({ tokenLimit = 15000 } = {}) {
    this.tokenLimit = tokenLimit;
    this.charLimit = toChars(tokenLimit);
  }

  truncate(result, toolName) {
    const text = typeof result === "string" ? result : JSON.stringify(result ?? {});
    if (text.length <= this.charLimit) return result;
    const keep = Math.floor(this.charLimit * 0.4);
    return {
      ok: true,
      truncated: true,
      tool: toolName || "unknown",
      omittedChars: text.length - keep * 2,
      head: text.slice(0, keep),
      tail: text.slice(text.length - keep),
    };
  }
}

// 按内容 hash 去重工具结果（相同 hash 只保留最新，旧的标记为重复）。
class Deduplicator {
  hash(content) {
    return createHash("sha256").update(String(content ?? "")).digest("hex").slice(0, 16);
  }

  deduplicate(messages) {
    const seen = new Map();
    let removed = 0;
    const result = messages.map((message) => {
      if (!message || message.role !== "tool") return message;
      const h = this.hash(message.content);
      if (seen.has(h)) {
        removed += 1;
        return {
          ...message,
          content: JSON.stringify({ note: "duplicate of earlier result", duplicateOf: seen.get(h) }),
        };
      }
      seen.set(h, message.tool_call_id || h);
      return message;
    });
    return { messages: result, removed };
  }
}

// FIDELITY 护栏（M2a，§4.1）：检测 LLM 摘要是否引入源对话里不存在的强实体（≥4 位数字 / 年份）。
// 命中即低置信——调用方据此不物化、保留原始 tail（宁可不压不可压错）。规则摘要（字面摘录）豁免。
// 纯规则、零额外 LLM 成本、可测；ID 样 token 扩展留待 COST（5.2）数据后再定。
class SummaryGuard {
  #ENTITY_RUN = /\d[\d,.]*\d/g;

  assess(sourceText, summaryText) {
    const summaryEntities = this.#extract(summaryText);
    if (!summaryEntities.size) return { reject: false }; // 摘要未引强实体，无法判定幻觉，放行
    const sourceEntities = this.#extract(sourceText);
    for (const entity of summaryEntities) {
      if (!sourceEntities.has(entity)) return { reject: true, reason: `hallucinated-entity:${entity}` };
    }
    return { reject: false };
  }

  #extract(text) {
    const set = new Set();
    const matches = String(text || "").match(this.#ENTITY_RUN) || [];
    for (const raw of matches) {
      // 归一化：去千分位逗号 / 小数点，"1,000"/"1000.0"→"1000"，防形式差异误判；仅保留 ≥4 位
      const normalized = raw.replace(/[,.]/g, "");
      if (normalized.length >= 4) set.add(normalized);
    }
    return set;
  }
}

// 跨对话前情提要：超大对话用规则提取（不调 LLM），受 token 上限保护。
class HandoffGen {
  constructor({ tokenCap = 50000 } = {}) {
    this.tokenCap = tokenCap;
    this.charCap = toChars(tokenCap);
  }

  async generateHandoff(messages, { conversationId } = {}) {
    const users = (messages || []).filter((m) => m.role === "user").map((m) => String(m.content || ""));
    const assistants = (messages || []).filter((m) => m.role === "assistant").slice(-3).map((m) => String(m.content || ""));

    let handoff = this.#assemble(users, assistants);
    if (handoff.length > this.charCap) {
      // 超上限：只保留最近少量 user + 末尾 1 条 assistant
      handoff = this.#assemble(users.slice(-3), assistants.slice(-1));
    }
    if (handoff.length > this.charCap) {
      handoff = `${handoff.slice(0, this.charCap)}\n…[前情已截断]…`;
    }
    return handoff;
  }

  #assemble(users, assistants) {
    return [
      HANDOFF_HEADER,
      "## 用户近期意图",
      ...users,
      "## 最近进展",
      ...assistants,
    ].filter((s) => typeof s === "string" && s.trim()).join("\n");
  }
}

// 写回存储：突变 conversation 内存对象（不 save，由 #run 既有 save 持久化）。
class Archiver {
  applyCompaction(conversation, compressed, now = new Date().toISOString()) {
    if (!compressed || compressed.action === "none" || compressed.action === "rotate") return;
    if (!conversation) return;

    if (Array.isArray(compressed.archivable) && compressed.archivable.length) {
      for (const message of compressed.archivable) {
        conversation.archive.push({ ...message, archivedAt: now, archiveReason: compressed.action });
      }
    }

    // compressed.messages 含头部 system prompt（不持久化）——去掉后替换活跃消息
    const [, ...rest] = compressed.messages;
    conversation.messages = rest;

    if (compressed.summary) {
      conversation.summaries.push({
        at: now,
        summary: compressed.summary,
        version: (conversation.summaries?.length || 0) + 1,
      });
    }

    conversation.compactionLog.push({
      at: now,
      action: compressed.action,
      beforeTokens: compressed.stats?.beforeTokens,
      afterTokens: compressed.stats?.afterTokens,
      ratio: compressed.stats?.ratio,
    });
  }
}

class ContextManager {
  #judged = new Map();
  #active = [];
  // 压缩遥测（OBS 3.1）：进程内聚合，重启重置。统计各层动作分布、rotate、提取、anti-thrash、token 均值。
  #stats = {
    byAction: { none: 0, layer1: 0, layer2: 0, layer3: 0, rotate: 0 },
    compressions: 0,
    compactions: 0,
    rotates: 0,
    extractionCalls: 0,
    extractionsProposed: 0,
    antiThrashCooldowns: 0,
    summaryGuardRejections: 0,
    summaryGuardErrors: 0,
    totalBeforeTokens: 0,
    totalAfterTokens: 0,
    lastUpdated: null,
  };

  constructor({
    provider,
    credentials,
    tools,
    conversationStore,
    onExtractValuable = null,
    options = {},
    clock = () => new Date(),
  } = {}) {
    if (!tools) throw new Error("ContextManager 缺少 ToolRegistry（estimateTokens 需与 ProviderClient 同参含 tools）");
    this.provider = provider || null;
    this.credentials = credentials || null;
    this.tools = tools;
    this.conversationStore = conversationStore || null;

    this.fallbackContextLength = Number(options.contextLength) || 1_000_000;
    this.tailMessages = options.tailMessages ?? 10;
    // Layer3 摘要保留的「近窗」条数：刻意小于 tailMessages，使 Layer3 能裁掉中段并注入摘要
    // （否则 cut=length-tailMessages 恒 ≤0，摘要只写 conversation.summaries、永不进活跃上下文）。
    this.keepAfterSummary = options.keepAfterSummary ?? Math.max(2, Math.floor(this.tailMessages / 2));
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) };
    this.clock = clock;

    this.tokenTracker = new TokenTracker();
    this.toolTruncator = new ToolTruncator({ tokenLimit: options.singleToolLimit ?? 15000 });
    this.deduplicator = new Deduplicator();
    this.summaryGuard = new SummaryGuard();
    this.archiver = new Archiver({ conversationStore });
    this.handoffGen = new HandoffGen({ tokenCap: options.handoffTokenCap ?? 50000 });

    this.antiThrash = {
      threshold: options.antiThrashThreshold ?? 2,
      cooldownMs: options.cooldownMs ?? 60_000,
      failures: 0,
      until: 0,
      lastAfterTokens: null,
    };

    // Phase 4：把即将离开活跃上下文的有价值内容（经 LLM 判定）回调提出。
    // 回调由 runtime 接到 ingest.receive+propose（走可审批 Job），ContextManager 自身不写 vault。
    this.onExtractValuable = typeof onExtractValuable === "function" ? onExtractValuable : null;
    this.extractMaxPerConversation = Number(options.extractMaxPerConversation) || 5;
  }

  // ---- 对外委托 ----
  trackUsage(usage, conversationId) {
    this.tokenTracker.trackUsage(usage, conversationId);
  }

  estimateForMessages(messages) {
    return this.tokenTracker.estimate(messages, this.tools.list());
  }

  truncateToolResult(result, toolName) {
    return this.toolTruncator.truncate(result, toolName);
  }

  applyCompaction(conversation, compressed) {
    this.archiver.applyCompaction(conversation, compressed);
  }

  // 压缩遥测快照（OBS 3.1）。返回聚合视图（含 layer1/2/3 的 token 均值），不含任何凭证。
  stats() {
    return {
      ...this.#stats,
      byAction: { ...this.#stats.byAction },
      avgBeforeTokens: this.#stats.compactions ? Math.round(this.#stats.totalBeforeTokens / this.#stats.compactions) : 0,
      avgAfterTokens: this.#stats.compactions ? Math.round(this.#stats.totalAfterTokens / this.#stats.compactions) : 0,
    };
  }

  extractValuable(messages) {
    const items = [];
    for (const message of messages || []) {
      if (message.role !== "user") continue;
      // 双保险：即便历史/异常路径把前情提要当 user 注入，也绝不作为真实用户陈述提取（防自污染）。
      if (message._syno?.kind === "handoff") continue;
      // 同理：Layer3 物化的 [前情摘要] 是 LLM 产出（factualStatus:unverified），非真实用户陈述。
      if (message._syno?.kind === "summary") continue;
      const text = String(message.content || "");
      if (text.length <= 10) continue;
      if (/(决定|结论|记住|待办|todo|确认|方案是)/i.test(text)) {
        items.push({ type: "decision", content: text.slice(0, 500), source: "user" });
      }
    }
    return items;
  }

  // ---- 主压缩入口 ----
  async compress(messages, { conversationId, runConfig } = {}) {
    const contextLength = Number(runConfig?.contextLength) || this.fallbackContextLength;
    const beforeTokens = this.estimateForMessages(messages);
    const ratio = contextLength > 0 ? beforeTokens / contextLength : 1;

    if (ratio < this.thresholds.light) {
      const none = { messages, action: "none", stats: { beforeTokens, ratio } };
      this.#recordCompression(none);
      return none;
    }

    const [system, rest] = splitHeadSystem(messages);

    // Layer4: rotate（始终可达，不受 anti-thrash 约束）
    if (ratio >= this.thresholds.overflow) {
      const handoff = await this.handoffGen.generateHandoff(rest, { conversationId });
      this.#fireExtraction("rotate", rest, [], conversationId);
      const rotated = { messages, action: "rotate", stats: { beforeTokens, ratio }, handoff };
      this.#recordCompression(rotated);
      return rotated;
    }

    // anti-thrash：连续无效压缩进入冷却，期间跳过 L1-L3（rotate 不受影响）
    const now = this.clock().getTime();
    const coolingDown = now < this.antiThrash.until;
    if (coolingDown) {
      return { messages, action: "none", stats: { beforeTokens, ratio, coolingDown: true } };
    }

    let working = rest;
    const archivable = [];
    let summary = null;

    // Layer1: 去重 + 旧工具结果清理
    const dedup = this.deduplicator.deduplicate(working);
    working = dedup.messages;
    working = this.#cleanOldToolResults(working, archivable);

    // Layer2: 历史裁剪（保留 tail，裁到 tool_use/tool_result 配对边界）
    if (this.#ratioOf(system, working, contextLength) >= this.thresholds.moderate) {
      working = this.#pruneHistory(working, archivable);
    }

    // Layer3: LLM 摘要。保留比 tail 更小的近窗（keepAfterSummary），把被裁掉的中段摘要后
    // 物化为 system message 前置于近窗——这是「记忆压缩」进入下一轮活跃上下文的唯一通道。
    // （M2a 修复：旧实现 summarize(working) + materialize 守卫 messages.length<=tailMessages，而 Layer2
    //  已把 working 裁到 ≤tailMessages → cut 恒 0 → 摘要只写 conversation.summaries、永不注入、永不复用。
    //  现改为：先切出中段 → 摘要该中段 → 注入 [summary,...近窗]，让摘要真正随消息流转。）
    if (this.#ratioOf(system, working, contextLength) >= this.thresholds.heavy) {
      const split = this.#splitForSummary(working);
      if (split.archived.length) {
        const summarized = await this.#summarize(split.archived, { conversationId });
        if (summarized.text) {
          if (summarized.origin === "llm" && this.#summaryRejected(split.archived, summarized.text)) {
            // FIDELITY 护栏：LLM 摘要引入了源里不存在的强实体 → 不物化、保留近窗、降级 layer2
            summary = null;
          } else {
            summary = summarized.text;
            const summaryMessage = {
              role: "system",
              content: `${SUMMARY_TAG}\n\n${summary}`,
              _syno: { kind: "summary", factualStatus: "unverified", generatedAt: this.clock().toISOString() },
            };
            working = [summaryMessage, ...split.keep];
            archivable.push(...split.archived);
          }
        }
      }
    }

    const finalMessages = system ? [system, ...working] : working;
    const afterTokens = this.estimateForMessages(finalMessages);

    let action = "none";
    if (summary) action = "layer3";
    else if (archivable.length) action = this.#ratioOf(system, working, contextLength) < this.thresholds.moderate ? "layer1" : "layer2";

    // Layer1 仅清理工具结果（无 user 决策流失），不提取；Layer2/Layer3 有内容离开活跃上下文才提取。
    if (action === "layer2" || action === "layer3") {
      this.#fireExtraction(action, [], archivable, conversationId);
    }

    this.#trackThrash(afterTokens);

    const final = {
      messages: finalMessages,
      action,
      stats: { beforeTokens, afterTokens, ratio },
      archivable: action !== "none" ? archivable : [],
      summary,
    };
    this.#recordCompression(final);
    return final;
  }

  #ratioOf(system, rest, contextLength) {
    const msgs = system ? [system, ...rest] : rest;
    const estimate = this.estimateForMessages(msgs);
    return contextLength > 0 ? estimate / contextLength : 1;
  }

  #cleanOldToolResults(messages, archivable) {
    const tailStart = Math.max(0, messages.length - this.tailMessages);
    return messages.map((message, index) => {
      if (message && message.role === "tool" && index < tailStart) {
        archivable.push(message);
        return {
          ...message,
          content: JSON.stringify({
            note: "earlier tool result cleared",
            digest: toolDigest(message.content),
            length: String(message.content || "").length,
          }),
        };
      }
      return message;
    });
  }

  #pruneHistory(messages, archivable) {
    if (messages.length <= this.tailMessages) return messages;
    let cut = messages.length - this.tailMessages;
    // 前移 cut，把开头无对应 tool_use 的孤儿 tool result 一并归入 archive
    while (cut < messages.length && messages[cut] && messages[cut].role === "tool") cut += 1;
    const archived = messages.slice(0, cut);
    archivable.push(...archived);
    return messages.slice(cut);
  }

  // 切出 Layer3 要摘要的中段：保留最新 keepAfterSummary 条，其余按 tool 配对边界作为待摘要+归档段。
  // 返回 { keep, archived }；archived 为空表示太短、无可摘要内容（Layer3 不注入，避免只增不减）。
  #splitForSummary(messages) {
    const keep = Math.min(this.keepAfterSummary, messages.length);
    if (messages.length <= keep) return { keep: messages, archived: [] };
    let cut = messages.length - keep;
    while (cut < messages.length && messages[cut] && messages[cut].role === "tool") cut += 1;
    return { keep: messages.slice(cut), archived: messages.slice(0, cut) };
  }

  async #summarize(messages, { conversationId }) {
    const prompt = this.#buildSummaryPrompt(messages);
    if (this.provider && typeof this.provider.complete === "function") {
      try {
        const completion = await this.provider.complete(
          [
            { role: "system", content: "你是对话摘要助手。把以下对话压缩为 5 段结构化摘要：核心结论、关键决策、进行中的任务、遇到的错误、重要标识符。" },
            { role: "user", content: prompt },
          ],
          [],
          { temperature: 0.2 },
        );
        const text = String(completion?.message?.content || "").trim();
        if (text) return { text, origin: "llm" };
      } catch {
        // 降级到规则提取
      }
    }
    return { text: this.#ruleBasedSummary(messages), origin: "rule" };
  }

  // FIDELITY 护栏：LLM 摘要若引入源(user+assistant)里不存在的强实体 → 拒绝（不物化）。
  // guard 自身抛错 → 保守拒绝（记 summaryGuardErrors），保证不把不可信摘要物化进上下文。
  #summaryRejected(working, summaryText) {
    const sourceText = (working || [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => String(m.content || ""))
      .join("\n");
    try {
      const result = this.summaryGuard.assess(sourceText, summaryText);
      if (result?.reject) { this.#stats.summaryGuardRejections += 1; return true; }
      return false;
    } catch {
      this.#stats.summaryGuardErrors += 1;
      return true;
    }
  }

  #buildSummaryPrompt(messages) {
    const lines = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-30)
      .map((m) => `[${m.role}] ${String(m.content || "").slice(0, 600)}`);
    return lines.join("\n");
  }

  #ruleBasedSummary(messages) {
    const users = messages.filter((m) => m.role === "user").map((m) => String(m.content || "")).slice(-5);
    const assistants = messages.filter((m) => m.role === "assistant").slice(-3).map((m) => String(m.content || ""));
    return [
      "## 用户意图",
      ...users,
      "## 最近进展",
      ...assistants,
    ].filter((s) => s && s.trim()).join("\n");
  }

  // 记录一次压缩结果到遥测（OBS 3.1）。layer1/2/3 才计入 token 均值分母（真正的压缩）。
  #recordCompression(result) {
    const action = result?.action;
    this.#stats.compressions += 1;
    if (action && this.#stats.byAction[action] !== undefined) this.#stats.byAction[action] += 1;
    if (action === "rotate") this.#stats.rotates += 1;
    if (action === "layer1" || action === "layer2" || action === "layer3") {
      const before = result?.stats?.beforeTokens;
      const after = result?.stats?.afterTokens;
      if (Number.isFinite(before)) { this.#stats.totalBeforeTokens += before; this.#stats.compactions += 1; }
      if (Number.isFinite(after)) this.#stats.totalAfterTokens += after;
    }
    this.#stats.lastUpdated = this.clock().toISOString();
  }

  #trackThrash(afterTokens) {
    if (this.antiThrash.lastAfterTokens !== null && afterTokens >= this.antiThrash.lastAfterTokens) {
      this.antiThrash.failures += 1;
      if (this.antiThrash.failures >= this.antiThrash.threshold) {
        this.antiThrash.until = this.clock().getTime() + this.antiThrash.cooldownMs;
        this.#stats.antiThrashCooldowns += 1;
      }
    } else {
      this.antiThrash.failures = 0;
    }
    this.antiThrash.lastAfterTokens = afterTokens;
  }

  #itemHash(item) {
    return createHash("sha256").update(String(item?.content ?? "")).digest("hex").slice(0, 16);
  }

  // fire-and-forget：把即将离开活跃上下文的"有价值"内容（regex 预筛 → per-conversation 去重/节流 → LLM 判定）回调提出。
  // 同步标记 hash（在首个 await 前），保证连续 compress 不会重复判定同一条；整条管道失败被吞，绝不阻塞或污染压缩结果。
  #fireExtraction(action, rest, archivable, conversationId) {
    if (!this.onExtractValuable) return;
    const promise = this.#runExtraction(action, rest, archivable, conversationId).catch(() => {});
    this.#active.push(promise);
    promise.finally(() => { this.#active = this.#active.filter((entry) => entry !== promise); });
  }

  async #runExtraction(action, rest, archivable, conversationId) {
    if (!this.onExtractValuable) return;
    const candidates = action === "rotate" ? rest : archivable;
    if (!Array.isArray(candidates) || !candidates.length) return;
    const items = this.extractValuable(candidates);
    if (!items.length) return;
    const seen = this.#judged.get(conversationId) || new Set();
    const budget = Math.max(0, this.extractMaxPerConversation - seen.size);
    if (budget <= 0) return;
    const fresh = items.filter((item) => !seen.has(this.#itemHash(item))).slice(0, budget);
    for (const item of fresh) seen.add(this.#itemHash(item));
    this.#judged.set(conversationId, seen);
    if (!fresh.length) return;
    const approved = await this.#judgeValuable(fresh);
    if (!approved.length) return;
    await this.onExtractValuable(approved, { conversationId });
    this.#stats.extractionCalls += 1;
    this.#stats.extractionsProposed += approved.length;
  }

  // LLM 判定：仅保留"值得作为长期知识"的条目。Provider 不可用或解析失败 → 返回空（不提议），保证不产生噪声。
  async #judgeValuable(items) {
    if (!this.provider || typeof this.provider.complete !== "function" || !items.length) return [];
    try {
      const numbered = items.map((item, index) => `${index + 1}. ${String(item.content || "").slice(0, 400)}`).join("\n");
      const completion = await this.provider.complete(
        [
          { role: "system", content: "你是知识管家。判断每条用户陈述是否值得作为长期知识收录（明确决定、结论、待办、可验证事实）。仅返回 JSON {\"keep\":[序号]}，序号从 1 开始。" },
          { role: "user", content: numbered },
        ],
        [],
        { temperature: 0 },
      );
      const match = String(completion?.message?.content || "").match(/\{[\s\S]*\}/);
      if (!match) return [];
      const keep = new Set((JSON.parse(match[0]).keep || []).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= items.length));
      return items.filter((_, index) => keep.has(index + 1));
    } catch {
      return [];
    }
  }

  // 供测试确定性排空 fire-and-forget 提取管道；生产路径不调用（提取失败已被吞掉）。
  async drainExtractions() {
    while (this.#active.length) await Promise.allSettled(this.#active.splice(0));
  }
}

export { ContextManager, TokenTracker, ToolTruncator, Deduplicator, SummaryGuard, HandoffGen, Archiver };
