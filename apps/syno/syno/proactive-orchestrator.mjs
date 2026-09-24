import { constants as fsConstants, promises as fs } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { PATHS } from "../../../packages/syno-core/paths.mjs";
import { ProcessFileLock } from "../../../packages/syno-core/process-lock.mjs";
import { SignalEngine, localDateKey } from "./signal-engine.mjs";
import { aggregateDeliveryFailures } from "./channel-delivery-outbox.mjs";
import { PROACTIVE_RESPONSE_KIND, buildProactiveBundle, normalizeState, signalIdentity } from "./proactive-reliability.mjs";
import { detectStrictCredential } from "../../../packages/syno-core/sensitive-content.mjs";

const DEFAULT_QUIET_HOURS = Object.freeze({ start: "22:30", end: "07:30" });

function minutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function isQuietTime(now, quietHours = DEFAULT_QUIET_HOURS) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutes(quietHours.start);
  const end = minutes(quietHours.end);
  return start > end ? current >= start || current < end : current >= start && current < end;
}

function localMessage(signal, snapshot, weeklySummary, { bundleId } = {}) {
  const names = { morning: "晨间计划", evening: "晚间复盘", weekly: "每周深度复盘", event: "高价值事件" };
  const title = `Syno · ${names[signal.kind] || "主动提醒"}`;
  const body = bodyFor(signal.kind, snapshot, weeklySummary);
  return {
    title,
    body,
    text: `${title}\n${body}`,
    level: signal.kind === "event" ? "warning" : "info",
    source: "proactive",
    data: { idempotencyKey: bundleId || `proactive:${signal.key}`, signal: signal.kind },
  };
}

function bundleMessage(bundle, snapshot, weeklySummary) {
  const eventItems = bundle.items.map((item, index) => {
    if (item.subjectKey.startsWith("morning:") && (snapshot?.primary?.title || snapshot?.priorities?.[0]?.title)) return `${index + 1}. 首要：${snapshot.primary?.title || snapshot.priorities[0].title}`;
    if (item.subjectKey.startsWith("evening:") && snapshot?.progress) return `${index + 1}. 今日已完成 ${snapshot.progress.completed ?? 0} 项，待确认 ${snapshot.progress.waiting ?? 0} 项`;
    return `${index + 1}. ${item.title}：${item.action}`;
  });
  if (bundle.remainingCount > 0) eventItems.push(`另有 ${bundle.remainingCount} 项待处理。`);
  if (bundle.signalKinds.some((item) => item.kind === "weekly") && weeklySummary) {
    eventItems.push(`本周知识库有 ${weeklySummary.totalOrphans || 0} 篇孤岛笔记待整理。`);
    for (const topic of (weeklySummary.topics || []).slice(0, 3)) eventItems.push(`· ${topic.topic}（${topic.count} 篇孤岛）`);
  }
  if (!eventItems.length) eventItems.push(prioritiesBody(snapshot));
  const title = bundle.signalKinds.some((item) => item.kind === "event") ? "Syno · 行动摘要" : "Syno · 主动提醒";
  const body = eventItems.join("\n");
  const signal = bundle.signalKinds.some((item) => item.kind === "event") ? "bundle" : bundle.signalKinds.some((item) => item.kind === "weekly") ? "weekly" : bundle.signalKinds[0]?.kind || "bundle";
  return { title, body, text: `${title}\n${body}`, level: "warning", source: "proactive", data: { idempotencyKey: bundle.bundleId, signal } };
}

function bundlePrompt(bundle) {
  const items = bundle.items.map((item, index) => `${index + 1}. ${item.title}：${item.action}`).join("\n");
  const remainder = bundle.remainingCount ? `\n另有 ${bundle.remainingCount} 项未展开。` : "";
  return `这是 Syno 的确定性行动摘要。请基于 today.read 工具，将以下事项整理成不超过 180 字的主人行动建议；保留事项身份和动作，不创建写任务，不扩大权限。\n${items || "请给出今日优先行动。"}${remainder}`;
}

// D12：灵感生成提示词——要求模型把采样笔记串联出一个具体新观点，不编造笔记外事实
function inspirationPrompt(notes) {
  const lines = notes.map((note, index) => {
    const tags = (note.tags || []).slice(0, 4).join("/");
    return `${index + 1}. 《${note.title}》${tags ? `（${tags}）` : ""}：${note.excerpt || "（无摘要）"}`;
  }).join("\n");
  return `你是主人的知识库管家，正在做「今日灵感」：从知识库采样了几篇笔记，请把它们串联起来，产出一个具体的新观点或意外连接。\n要求：不超过 240 字；必须给出一个具体的串联或观点，不要泛泛的读后感；不得编造笔记里没有的事实；用中文；直接输出灵感正文，不要前后缀。\n今日采样笔记：\n${lines}`;
}

function inspirationCardMessage(record, notes, bundleId) {
  const list = notes.map((note, index) => `${index + 1}. ${note.title}`).join("\n");
  const body = `${record.text}\n\n涉及笔记：\n${list}\n\n回复「有用」或「没用」帮我调准`;
  return {
    title: "Syno · 今日灵感",
    body,
    text: `Syno · 今日灵感\n${body}`,
    level: "info",
    source: "proactive",
    data: { idempotencyKey: bundleId, signal: "inspiration", inspirationId: record.id },
  };
}

// 按信号种类分化文案：晨间突出计划预算、晚间突出进度与到期复习、周复盘突出孤岛主题
function bodyFor(kind, snapshot, weeklySummary) {
  if (kind === "weekly" && weeklySummary) {
    const topicLines = weeklySummary.topics.slice(0, 3).map((topic) => `· ${topic.topic}（${topic.count} 篇孤岛）`).join("\n");
    return `本周知识库有 ${weeklySummary.totalOrphans} 篇孤岛笔记待整理：\n${topicLines || "暂无孤岛"}\n建议挑一个主题补链或合并。`;
  }
  if (kind === "morning") return morningBody(snapshot);
  if (kind === "evening") return eveningBody(snapshot);
  return prioritiesBody(snapshot);
}

// 晨间：突出今日学习计划预算（消化/收录/维护）与首要行动；缺计划时回退到优先行动
function morningBody(snapshot) {
  const allocation = snapshot?.plan?.allocation;
  const primary = snapshot?.primary;
  const lines = [];
  if (allocation) {
    lines.push(`今日计划：消化 ${allocation.digest ?? 0} / 收录 ${allocation.ingest ?? 0} / 维护 ${allocation.maintenance ?? 0}`);
  }
  if (primary?.title) lines.push(`首要：${primary.title}`);
  return lines.length ? lines.join("\n") : prioritiesBody(snapshot);
}

// 晚间：突出今日完成进度；缺进度时回退到优先行动（D6 后不再有到期复习）
function eveningBody(snapshot) {
  const progress = snapshot?.progress;
  const lines = [];
  if (progress) {
    const failed = progress.failed ? `（${progress.failed} 项失败）` : "";
    lines.push(`今日已完成 ${progress.completed ?? 0} 项，待确认 ${progress.waiting ?? 0} 项${failed}`);
  }
  return lines.length ? lines.join("\n") : prioritiesBody(snapshot);
}

// 兜底：列出今日优先行动；无行动时显示消化预算（snapshot.allocation 来自 PriorityEngine）
function prioritiesBody(snapshot) {
  const priorities = (snapshot?.priorities || []).slice(0, 3).map((item, index) => `${index + 1}. ${item.title}`).join("\n");
  if (priorities) return priorities;
  const allocation = snapshot?.allocation || {};
  return `今天没有硬性到期事项。建议完成一次真实输出。\n消化 ${allocation.digest ?? 0} / 收录 ${allocation.ingest ?? 0} / 维护 ${allocation.maintenance ?? 0}`;
}

class ProactiveOrchestrator {
  constructor({ host, today, channels, conversations, cognitiveRuntime, settingsRegistry, signalSources, maintenance, channelDeliveryOutbox, notifications, ownerChannelTargets, wakeDelivery, recordEvent, inspirationStore = null, inspirationSampler = null, channelContinuations = null, signalEngine = new SignalEngine(), stateFile = path.join(PATHS.stateRoot, "proactive.json"), stateLock, clock = () => new Date(), quietHours = DEFAULT_QUIET_HOURS, tickObservationMinMs = 5_000, compositionLeaseMs = 300_000 } = {}) {
    if (!host || !today || !channels) throw new Error("ProactiveOrchestrator 缺少 host、today 或 channels");
    this.host = host; this.today = today; this.channels = channels; this.conversations = conversations; this.cognitiveRuntime = cognitiveRuntime;
    this.settingsRegistry = settingsRegistry; this.signalSources = signalSources; this.maintenance = maintenance; this.channelDeliveryOutbox = channelDeliveryOutbox; this.notifications = notifications; this.ownerChannelTargets = ownerChannelTargets; this.wakeDelivery = wakeDelivery; this.recordEvent = recordEvent; this.inspirationStore = inspirationStore; this.inspirationSampler = inspirationSampler; this.channelContinuations = channelContinuations; this.signalEngine = signalEngine; this.stateFile = stateFile; this.stateLock = stateLock || new ProcessFileLock({ file: `${stateFile}.lock`, timeoutMs: 30_000 }); this.clock = clock; this.quietHours = quietHours; this.tickObservationMinMs = tickObservationMinMs; this.compositionLeaseMs = compositionLeaseMs; this.timer = null; this.startGeneration = 0;
  }

  async load({ prepareMigration = true } = {}) {
    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const state = normalizeState(JSON.parse(raw));
      if (prepareMigration && state.migration?.status === "pending") {
        await fs.copyFile(this.stateFile, `${this.stateFile}.v1-backup`, fsConstants.COPYFILE_EXCL)
          .catch((error) => { if (error.code !== "EEXIST") throw error; });
        const backup = await fs.readFile(`${this.stateFile}.v1-backup`, "utf8");
        state.migration = {
          ...state.migration,
          backupDigest: createHash("sha256").update(backup).digest("hex"),
        };
      }
      return state;
    }
    catch (error) { if (error.code === "ENOENT") return normalizeState(); throw error; }
  }

  async save(state) {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
    await this.#ensureMigrationMarker(state);
  }

  async #hasValidMigrationMarker(state) {
    if (state.migration?.status !== "complete") return false;
    try {
      const marker = JSON.parse(await fs.readFile(`${this.stateFile}.migration-v2.json`, "utf8"));
      if (marker.version !== 2
        || marker.status !== "complete"
        || marker.fromVersion !== state.migration.fromVersion
        || marker.backupDigest !== state.migration.backupDigest) return false;
      const backup = await fs.readFile(`${this.stateFile}.v1-backup`, "utf8");
      return createHash("sha256").update(backup).digest("hex") === state.migration.backupDigest;
    } catch {
      return false;
    }
  }

  async #ensureMigrationMarker(state) {
    if (state.migration?.status !== "complete") return;
    if (!state.migration.backupDigest) {
      throw Object.assign(new Error("主动通知迁移缺少可验证备份摘要"), { code: "PROACTIVE_MIGRATION_EVIDENCE_INVALID" });
    }
    const backup = await fs.readFile(`${this.stateFile}.v1-backup`, "utf8");
    if (createHash("sha256").update(backup).digest("hex") !== state.migration.backupDigest) {
      throw Object.assign(new Error("主动通知迁移备份摘要不匹配"), { code: "PROACTIVE_MIGRATION_EVIDENCE_INVALID" });
    }
    const marker = `${this.stateFile}.migration-v2.json`;
    try {
      await fs.access(marker);
      if (!await this.#hasValidMigrationMarker(state)) {
        throw Object.assign(new Error("主动通知迁移完成标记无效"), { code: "PROACTIVE_MIGRATION_MARKER_INVALID" });
      }
      return;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const markerTemporary = `${marker}.${process.pid}.tmp`;
    await fs.writeFile(markerTemporary, `${JSON.stringify({
      version: 2,
      fromVersion: state.migration.fromVersion,
      status: "complete",
      completedAt: state.migration.completedAt,
      backupDigest: state.migration.backupDigest,
    }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(markerTemporary, marker);
  }

  #markInactive(state, events, now) {
    const activeKeys = new Set(events.map((event) => String(event.id || event.key || "")));
    for (const subject of Object.values(state.subjects)) {
      if (subject.active && subject.subjectKey && !activeKeys.has(subject.subjectKey) && !subject.subjectKey.startsWith("morning:") && !subject.subjectKey.startsWith("evening:") && !subject.subjectKey.startsWith("weekly:") && !subject.subjectKey.startsWith("inspiration:")) {
        subject.active = false;
        subject.resolvedAt = now.toISOString();
        subject.updatedAt = now.toISOString();
      }
    }
  }

  #pruneResolvedSubjects(state, now) {
    const cutoff = now.getTime() - 30 * 24 * 60 * 60_000;
    for (const [subjectKey, subject] of Object.entries(state.subjects || {})) {
      const resolvedAt = new Date(subject.resolvedAt || subject.updatedAt || 0).getTime();
      if (subject.active === false && Number.isFinite(resolvedAt) && resolvedAt < cutoff) delete state.subjects[subjectKey];
    }
  }

  async #loadLegacyAudit(state) {
    if (state.migration?.status !== "pending") return;
    if (!this.notifications?.list) {
      state.migration = { ...state.migration, auditStatus: "unavailable", notificationIds: {} };
      return;
    }
    let notices;
    try {
      notices = await this.notifications.list({ limit: 1000, includeSettled: true });
    } catch {
      state.migration = { ...state.migration, auditStatus: "unavailable", notificationIds: {} };
      return;
    }
    const notificationIds = {};
    for (const notice of notices) {
      const key = String(notice?.data?.idempotencyKey || "");
      if (!key.startsWith("proactive:")) continue;
      notificationIds[key.slice("proactive:".length)] = String(notice.id || "legacy-web-audit");
    }
    state.migration = {
      ...state.migration,
      auditStatus: "loaded",
      notificationIds,
    };
  }

  // 信号是否已落定（投递达到）：#prepareSignals 过滤与 commit 的 signals_settled 守卫共用同一判定。
  #subjectSettled(subject, identity) {
    return Boolean(subject)
      && subject.lastDeliveredVersion === identity.businessVersion
      && Number(subject.lastDeliveredEpisode || subject.episode || 1) === identity.episode;
  }

  // 信号是否在飞：已有未落定投递（pendingBundles）或持有组合租约（pendingCompositions，L0b）。
  // decide 每拍先扫过期租约，走到这里的租约都视为活的。
  #signalInFlight(state, identity) {
    const covered = (entries) => Object.values(entries || {}).some((entry) =>
      (entry.signalVersions || []).some((item) =>
        item.subjectKey === identity.subjectKey && item.businessVersion === identity.businessVersion && item.episode === identity.episode));
    return covered(state.pendingBundles) || covered(state.pendingCompositions);
  }

  #prepareSignals(state, signals, now) {
    return signals.map((signal) => {
      const identity = signalIdentity(signal, state.subjects);
      const subject = state.subjects[identity.subjectKey] || {};
      state.subjects[identity.subjectKey] = {
        ...subject,
        subjectKey: identity.subjectKey,
        episode: identity.episode,
        lastSeenVersion: identity.businessVersion,
        active: true,
        updatedAt: now.toISOString(),
      };
      const legacyNotificationId = state.migration?.notificationIds?.[signal.key];
      const knownLegacyDelivery = state.lastRuns[signal.key] || legacyNotificationId;
      const migrationAmbiguous = state.migration?.status === "pending" && state.migratedFrom && signal.kind === "event" && !knownLegacyDelivery;
      if (state.migration?.status === "pending" && state.migratedFrom && (knownLegacyDelivery || migrationAmbiguous) && !state.subjects[identity.subjectKey].lastDeliveredVersion) {
        state.subjects[identity.subjectKey].lastDeliveredVersion = identity.businessVersion;
        state.subjects[identity.subjectKey].lastDeliveredEpisode = identity.episode;
        if (legacyNotificationId) state.subjects[identity.subjectKey].lastDeliveredEventId = `legacy-notice:${legacyNotificationId}`;
        state.subjects[identity.subjectKey].migrationSuppressed = true;
        if (migrationAmbiguous) state.subjects[identity.subjectKey].migrationAmbiguous = true;
      }
      const scheduledTitles = { morning: "晨间计划", evening: "晚间复盘", weekly: "每周复盘", inspiration: "今日灵感" };
      return {
        ...signal,
        title: signal.title || scheduledTitles[signal.kind],
        identity,
        action: signal.action || (signal.kind === "event" ? "请确认下一步处理" : signal.kind === "inspiration" ? "并入本次摘要，明日单独出卡" : "查看今日安排"),
      };
    }).filter((signal) => !this.#subjectSettled(state.subjects[signal.identity.subjectKey], signal.identity)
      && !this.#signalInFlight(state, signal.identity));
  }

  async #runAgent(prompt, bundleId) {
    try {
      if (this.cognitiveRuntime) {
        const run = await this.cognitiveRuntime.run({ text: prompt, intent: "chat" }, {
          ownerKey: "local-user", threadKey: "proactive", channel: "scheduler", messageId: bundleId, proactive: true,
        });
        return { job: { id: bundleId, status: "completed", result: { text: run.text } } };
      }
      return await this.host.receive({ text: prompt, intent: "chat" }, { channel: "scheduler", senderId: "syno-worker", messageId: bundleId, trustedAutomation: true });
    } catch (error) {
      return { job: { id: bundleId, status: "local-fallback" }, error: { code: error.code || "AGENT_UNAVAILABLE" } };
    }
  }

  // L0b：decide 每拍清扫过期组合租约（compose 崩溃/host 重启遗留）——删租约 + 事件，信号重新 eligible。
  // 租约期内不抢：活着的 compose 最长 compositionLeaseMs 内要么 commit 要么被视为崩溃。
  async #sweepCompositionLeases(state, now) {
    const nowMs = now.getTime();
    for (const [bundleId, lease] of Object.entries(state.pendingCompositions || {})) {
      if (Date.parse(lease.expiresAt || "") > nowMs) continue;
      delete state.pendingCompositions[bundleId];
      await this.recordEvent?.("proactive.tick.composition_lease_expired", {
        bundleId,
        slot: lease.slot || null,
        leaseAgeMs: Math.max(0, nowMs - Date.parse(lease.createdAt || now.toISOString())),
      }, { level: "warning" });
    }
  }

  // 显式 acquire/release 以计量锁等待（L0a 观测发现空转 tick 秒级耗时，需要拆开看等待与持有）。
  async #withStateLock(timing, operation) {
    const waitStartedAt = Date.now();
    const lease = await this.stateLock.acquire();
    timing.lockWaitMs += Date.now() - waitStartedAt;
    try { return await operation(); }
    finally { await lease.release(); }
  }

  // 灵感记录随 outbox 真实投递落定（覆盖直接投递、drain 回调与重启后 reconcile 三条路径）
  async #markInspirationDelivered(info, eventId) {
    const inspirationId = info?.inspirationId;
    if (!inspirationId || !this.inspirationStore) return;
    const targetChannel = String(info?.targetChannel || "weixin");
    try {
      await this.inspirationStore.markDelivered(inspirationId, eventId, { ownerKey: "local-user", channel: targetChannel, threadKey: "main" });
    } catch (error) {
      await this.recordEvent?.("inspiration.delivered_mark_failed", { inspirationId, eventId, error: { code: error?.code || "INSPIRATION_MARK_FAILED", message: String(error?.message || error).slice(0, 300) } }, { level: "error" });
      return;
    }
    if (targetChannel !== "weixin" || !this.channelContinuations) return;
    try {
      await this.channelContinuations.open({
        ownerKey: "local-user", channel: targetChannel, threadKey: "main", type: "inspiration_feedback",
        correlationId: inspirationId, expiresAt: new Date(this.clock().getTime() + 24 * 60 * 60 * 1_000),
        payload: { inspirationId },
      });
    } catch (error) {
      // markDelivered 已成功——此处失败的只是反馈续办创建，事件名必须与事实相符。
      await this.recordEvent?.("inspiration.feedback_continuation_failed", { inspirationId, eventId, error: { code: error?.code || "CONTINUATION_OPEN_FAILED", message: String(error?.message || error).slice(0, 300) } }, { level: "warning" });
    }
  }

  // L2（2026-09-04，#17）：投递成功后的主会话回写——取 outbox 真实 payload（主人所见即所得，
  // 天然覆盖本地 fallback 与 S1 脱敏降级）。claim 门（锁内）：writebackAt 完成门 + claimedAt 2min 在飞门 + cap 50；
  // 直投（commit）/ drain（markBundleDelivered）/ 对账（reconcile）三路径共用，at-least-once 不双写。
  // signal==="test" 不回写（triggerTest 卡不进主会话，只落台账终态）。
  // 失败吞错不重试：writeback_failed warning + lastErrorCode 抓手——回写是上下文质量，不耦合投递健康信号。
  async #writebackDeliveredBundle(bundleId, eventId) {
    if (!this.cognitiveRuntime?.appendSystemEvent || !this.channelDeliveryOutbox?.get || !bundleId || !eventId) return;
    const claimed = await this.stateLock.run(async () => {
      const state = await this.load();
      const entry = state.deliveredWritebacks[bundleId];
      if (entry?.writebackAt) return false;
      if (entry?.claimedAt && Date.now() - Date.parse(entry.claimedAt) < 120_000) return false;
      state.deliveredWritebacks[bundleId] = { eventId, claimedAt: new Date().toISOString(), ...(entry?.lastErrorCode ? { lastErrorCode: entry.lastErrorCode } : {}) };
      const entries = Object.entries(state.deliveredWritebacks);
      if (entries.length > 50) {
        entries.sort((a, b) => String(a[1].writebackAt || a[1].claimedAt || "").localeCompare(String(b[1].writebackAt || b[1].claimedAt || "")));
        for (const [key] of entries.slice(0, entries.length - 50)) delete state.deliveredWritebacks[key];
      }
      await this.save(state);
      return true;
    });
    if (!claimed) return;
    try {
      const record = await this.channelDeliveryOutbox.get(eventId, { includePayload: true });
      const payload = record?.payload;
      if (payload?.data?.signal !== "test") {
        const text = String(payload?.text || "");
        if (text) await this.cognitiveRuntime.appendSystemEvent({ ownerKey: "local-user", threadKey: "main", text });
      }
      await this.stateLock.run(async () => {
        const state = await this.load();
        const entry = state.deliveredWritebacks[bundleId];
        if (!entry || entry.writebackAt) return;
        delete entry.claimedAt;
        entry.writebackAt = new Date().toISOString();
        await this.save(state);
      });
    } catch (error) {
      const code = error?.code || "WRITEBACK_FAILED";
      await this.recordEvent?.("proactive.bundle.writeback_failed", { bundleId, outboxEventId: eventId, error: { code, message: String(error?.message || error).slice(0, 300) } }, { level: "warning" });
      await this.stateLock.run(async () => {
        const state = await this.load();
        const entry = state.deliveredWritebacks[bundleId];
        if (!entry || entry.writebackAt) return;
        delete entry.claimedAt;
        entry.lastErrorCode = code;
        await this.save(state);
      }).catch(() => {});
    }
  }

  async #deliverBundle(state, bundle, message, now, { deliveryKey: explicitDeliveryKey, shouldContinue = () => true, exclusiveActivePrefix = null } = {}) {
    const targetChannel = this.channels.homeChannel || "web";
    // S1：高精度凭据脱敏门（detectStrictCredential，排除松模式 credential_assignment）。
    // #prepare 的上游脱敏门仅 remote 模式生效，local-only 收录的凭据形标题/正文会原样进 bundleMessage → 入微信；
    // channelDeliveryOutbox 零脱敏。此处 defense-in-depth：命中即降级为回退文案，仍投递（保留 bundle 身份与可恢复）。
    const strictHit = detectStrictCredential(`${message.title || ""}\n${message.body || ""}`);
    if (strictHit) {
      await this.recordEvent?.("proactive.bundle.blocked_sensitive", { bundleId: bundle.bundleId, channel: targetChannel, reason: strictHit });
      const notice = "一项主动提醒因疑似包含凭据已暂缓自动推送，请在 Syno 内查看详情。";
      message = { ...message, body: notice, text: `${message.title || "Syno · 主动提醒"}\n${notice}` };
    }
    const deliveryKey = explicitDeliveryKey || `${bundle.bundleId}:${targetChannel}:v1`;
    state.pendingBundles[bundle.bundleId] = {
      bundleId: bundle.bundleId,
      eventId: null,
      targetChannel,
      signalVersions: bundle.signalVersions,
      signalKinds: bundle.signalKinds,
      inspirationId: message?.data?.inspirationId || null,
      createdAt: now.toISOString(),
    };
    if (this.channelDeliveryOutbox) {
      const event = await this.channelDeliveryOutbox.enqueue({
        sourceType: "proactive_bundle",
        sourceId: bundle.bundleId,
        ownerKey: "local-user",
        targetChannel,
        deliveryTargetRef: null,
        responseKind: PROACTIVE_RESPONSE_KIND,
        businessVersion: 1,
        payload: { ...message, signalVersions: bundle.signalVersions, signalKinds: bundle.signalKinds },
        deliveryKey,
        shouldEnqueue: shouldContinue,
        exclusiveActivePrefix,
      });
      if (event.skipped || !event.event) {
        delete state.pendingBundles[bundle.bundleId];
        return { status: "canceled", eventId: null, targetChannel };
      }
      state.pendingBundles[bundle.bundleId].eventId = event.event.eventId;
      if (event.event.status === "delivered") this.#applyBundleDelivered(state, bundle.bundleId, event.event.eventId, now);
      await this.recordEvent?.("proactive.bundle.enqueued", {
        bundleId: bundle.bundleId,
        signalCount: bundle.signalVersions.length,
        channel: targetChannel,
        outboxEventId: event.event.eventId,
        status: event.event.status,
      });
      if (targetChannel !== "web" && this.notifications?.add) await this.notifications.add({
        ...message,
        source: "proactive-audit",
        data: {
          idempotencyKey: deliveryKey,
          bundleId: bundle.bundleId,
          outboxEventId: event.event.eventId,
          status: "pending",
        },
      }).catch(() => {});
      return { status: event.event.status, eventId: event.event.eventId, targetChannel };
    }
    await this.recordEvent?.("proactive.target_unavailable", {
      bundleId: bundle.bundleId,
      signalCount: bundle.signalVersions.length,
      channel: targetChannel,
      status: "outbox_unavailable",
    });
    return { status: "failed_retryable", targetChannel, reason: "outbox_unavailable" };
  }

  #applyBundleDelivered(state, bundleId, eventId, now = this.clock()) {
    const pending = state.pendingBundles?.[bundleId];
    if (!pending) return false;
    for (const identity of pending.signalVersions || []) {
      const subject = state.subjects[identity.subjectKey] || {};
      state.subjects[identity.subjectKey] = { ...subject, subjectKey: identity.subjectKey, episode: identity.episode, lastDeliveredVersion: identity.businessVersion, lastDeliveredEpisode: identity.episode, lastDeliveredEventId: eventId, active: true, updatedAt: now.toISOString() };
      for (const item of pending.signalKinds || []) if (item.subjectKey === identity.subjectKey) state.lastRuns[item.key || item.kind] = localDateKey(now);
    }
    delete state.pendingBundles[bundleId];
    return true;
  }

  async #syncWebAudit(state, record, payload, now) {
    if (record.targetChannel === "web" || !this.notifications?.add) return;
    const status = ["delivered", "delivery_unknown", "failed_retryable", "failed_terminal"].includes(record.status)
      ? record.status
      : "pending";
    try {
      await this.notifications.add({
        title: payload.title,
        body: payload.body,
        text: payload.text,
        level: payload.level,
        source: "proactive-audit",
        data: {
          ...(payload.data || {}),
          idempotencyKey: record.deliveryKey,
          bundleId: record.sourceId,
          outboxEventId: record.eventId,
          status,
        },
      });
      if (status !== "pending" && this.notifications.updateDeliveryStatus) {
        await this.notifications.updateDeliveryStatus(record.deliveryKey, {
          status,
          outboxEventId: record.eventId,
        });
      }
      delete state.recoveryFailures[`audit:${record.eventId}`];
    } catch {
      state.recoveryFailures[`audit:${record.eventId}`] = {
        code: "PROACTIVE_WEB_AUDIT_UNAVAILABLE",
        status: "open",
        updatedAt: now.toISOString(),
      };
    }
  }

  async #reconcileOutbox(state, now, writebackQueue = null) {
    if (!this.channelDeliveryOutbox?.list || !this.channelDeliveryOutbox?.get) return;
    const records = (await this.channelDeliveryOutbox.list({ limit: 1000 }))
      .filter((item) => item.sourceType === "proactive_bundle" && item.status !== "superseded" && item.status !== "failed_terminal");
    for (const record of records) {
      let payload;
      try {
        payload = (await this.channelDeliveryOutbox.get(record.eventId, { includePayload: true })).payload;
        delete state.recoveryFailures[record.eventId];
      } catch {
        state.recoveryFailures[record.eventId] = {
          code: "PROACTIVE_OUTBOX_PAYLOAD_UNAVAILABLE",
          status: "open",
          updatedAt: now.toISOString(),
        };
        await this.recordEvent?.("proactive.bundle.recovery_failed", {
          bundleId: record.sourceId,
          signalCount: 0,
          channel: record.targetChannel,
          outboxEventId: record.eventId,
          status: "payload_unavailable",
        }, { level: "error" });
        continue;
      }
      if (!Array.isArray(payload?.signalVersions) || !payload.signalVersions.length) continue;
      await this.#syncWebAudit(state, record, payload, now);
      const alreadyApplied = payload.signalVersions.every((identity) =>
        state.subjects?.[identity.subjectKey]?.lastDeliveredEventId === record.eventId);
      if (record.status === "delivered" && alreadyApplied) continue;
      if (!state.pendingBundles[record.sourceId]) {
        state.pendingBundles[record.sourceId] = {
          bundleId: record.sourceId,
          eventId: record.eventId,
          targetChannel: record.targetChannel,
          signalVersions: payload.signalVersions,
          signalKinds: Array.isArray(payload.signalKinds) ? payload.signalKinds : [],
          inspirationId: payload.data?.inspirationId || null,
          createdAt: record.createdAt,
        };
      }
      if (record.status === "delivered") {
        this.#applyBundleDelivered(state, record.sourceId, record.eventId, now);
        await this.#markInspirationDelivered(state.pendingBundles[record.sourceId], record.eventId);
        // L2：对账回补的投递也要回写主会话——锁内只记队，tick 在锁外执行（claim 门防双写）。
        writebackQueue?.push({ bundleId: record.sourceId, eventId: record.eventId });
      }
    }
  }

  // L0b：锁内只 load→apply→save；灵感落账/web 审计镜像/journal 事件移锁外——
  // 投递落定（drain 1s 一拍调这里）不再被 compose 的长生成阻塞。apply 会删 pendingBundles 条目，先捕获再落定。
  async markBundleDelivered(bundleId, eventId) {
    const pending = await this.stateLock.run(async () => {
      const state = await this.load();
      const entry = state.pendingBundles?.[bundleId];
      if (!this.#applyBundleDelivered(state, bundleId, eventId)) return null;
      await this.save(state);
      return entry || null;
    });
    if (!pending) return false;
    await this.#markInspirationDelivered(pending, eventId);
    if (pending?.targetChannel && this.notifications?.updateDeliveryStatus) {
      await this.notifications.updateDeliveryStatus(`${bundleId}:${pending.targetChannel}:v1`, {
        status: "delivered",
        outboxEventId: eventId,
      });
    }
    await this.recordEvent?.("proactive.bundle.delivered", {
      bundleId,
      signalCount: pending?.signalVersions?.length || 0,
      channel: pending?.targetChannel || null,
      outboxEventId: eventId,
      status: "delivered",
    });
    // L2：投递落定后回写主会话（锁外；claim 门幂等）
    await this.#writebackDeliveredBundle(bundleId, eventId);
    return true;
  }

  async getDiagnostics() {
    const state = await this.load();
    const outbox = await this.channelDeliveryOutbox?.list?.({ limit: 1000 }) || [];
    const homeChannel = this.channels.homeChannel || "web";
    return {
      eligibleSignals: Number(state.lastEligibleSignals) || 0,
      pendingBundles: Object.keys(state.pendingBundles || {}).length,
      deliveryUnknown: outbox.filter((item) => item.sourceType === "proactive_bundle" && item.status === "delivery_unknown").length,
      homeChannel,
      homeTargetAvailable: await this.#homeTargetAvailable(homeChannel),
      lastDeliveredAt: Object.values(state.subjects || {}).filter((item) => item.lastDeliveredEventId).map((item) => item.updatedAt).filter(Boolean).sort().at(-1) || null,
    };
  }

  // L0b（2026-09-04，#17）：tick 临界区三段拆分。
  // decide（锁内，百 ms 级）：load → 迁移门 → outbox 对账 → 日期翻滚 → 安静时段 → 信号收集/准备 →
  //   灵感终态预检 → 建包 + 写组合租约 → save。模型生成不在这段。
  // compose（锁外，秒~分钟级）：采样/快照/模型生成——不再抱锁，投递落定（markBundleDelivered）与触发口不再被阻塞。
  // commit（锁内）：租约校验 → 双守卫 → 灵感记账 → enqueue（嵌套序 stateLock→outbox.lock 与现状一致）→ 落定 → save。
  // 组合租约 state.pendingCompositions[bundleId] = { slot, signalVersions, signalKinds, leaseId, createdAt, expiresAt }：
  //   bundleId 由信号身份确定性导出（buildProactiveBundle），天然幂等；leaseId 每轮随机，commit 只认本轮回的 leaseId；
  //   崩溃/中止遗留的租约由下一拍 decide 清扫（#sweepCompositionLeases），信号随后重新 eligible。
  async #decideTick({ now = this.clock(), highValueEvents, shouldContinue = () => true } = {}) {
    if (!shouldContinue()) return { bundle: null };
    const state = await this.load();
    if (state.migration?.status === "pending"
      || (state.migration?.status === "complete" && !await this.#hasValidMigrationMarker(state))) {
      if (state.migration?.status === "pending") await this.save(state);
      return { bundle: null };
    }
    // L2：对账发现「崩溃前已投递」的包时，把回写任务带出锁外执行
    const pendingWritebacks = [];
    await this.#reconcileOutbox(state, now, pendingWritebacks);
    if (!shouldContinue()) return { bundle: null, pendingWritebacks };
    const date = localDateKey(now);
    if (state.date !== date) Object.assign(state, { date, notificationsToday: 0 });
    const quietHours = await this.settingsRegistry?.get("notifications.quietHours") || this.quietHours;
    if (isQuietTime(now, quietHours)) return { bundle: null, pendingWritebacks };
    const events = highValueEvents || await this.signalSources?.collect({ now }) || [];
    if (!shouldContinue()) return { bundle: null, pendingWritebacks };
    await this.#loadLegacyAudit(state);
    const cadence = await this.settingsRegistry?.get("notifications.cadence") || "balanced";
    const cadenceBudget = { minimal: 1, balanced: 2, active: 3 }[cadence] || 2;
    this.#markInactive(state, events, now);
    this.#pruneResolvedSubjects(state, now);
    await this.#sweepCompositionLeases(state, now);
    const signals = this.signalEngine.collect({
      now,
      lastRuns: state.lastRuns,
      highValueEvents: events,
      notificationsToday: state.notificationsToday,
      maxDailyNotifications: cadenceBudget,
      returnAllEligible: true,
      // B1：预算抑制 event 信号必须有痕迹；每日至多记一次（下一拍同因抑制不重复刷 journal）。
      onBudgetSuppressed: (keys) => {
        if (state.lastBudgetSuppressed === date) return;
        state.lastBudgetSuppressed = date;
        this.recordEvent?.("proactive.signal.budget_suppressed", { date, count: keys.length, suppressed: keys.slice(0, 20) }, { level: "warning" }).catch(() => {});
      },
    });
    const prepared = this.#prepareSignals(state, signals, now);
    state.lastEligibleSignals = prepared.length;
    state.pending = Object.fromEntries(Object.entries(state.pending).slice(-200));
    const pruneDue = Boolean(this.conversations) && state.lastPruned !== date;
    if (!prepared.length) {
      await this.save(state);
      return { bundle: null, pruneDue, date, pendingWritebacks };
    }
    const slot = prepared.find((signal) => ["morning", "evening", "weekly", "inspiration"].includes(signal.kind))?.kind || "event";
    const bundle = buildProactiveBundle(prepared, { now, slot });
    await this.recordEvent?.("proactive.bundle.created", {
      bundleId: bundle.bundleId,
      signalCount: bundle.signalVersions.length,
      channel: this.channels.homeChannel || "web",
      outboxEventId: null,
      status: "created",
    });
    // 灵感终态预检（自原 #composeInspiration 搬位，保持在 bundle.created 之后）：当日 attempts 达上限 →
    // 标记当日终态、整包不投（与现行「终态杀整包」语义一致），不写租约。
    if (slot === "inspiration" && this.inspirationSampler && this.inspirationStore) {
      if (state.inspiration?.date !== date) state.inspiration = { date, attempts: 0 };
      if (state.inspiration.attempts >= 8) {
        state.lastRuns[`inspiration:${date}`] = date;
        await this.recordEvent?.("inspiration.generate.failed_terminal", { date, attempts: state.inspiration.attempts }, { level: "error" });
        await this.save(state);
        return { bundle: null, pruneDue, date, pendingWritebacks };
      }
    }
    const leaseId = randomUUID();
    state.pendingCompositions[bundle.bundleId] = {
      slot,
      signalVersions: bundle.signalVersions,
      signalKinds: bundle.signalKinds,
      leaseId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.compositionLeaseMs).toISOString(),
    };
    await this.save(state);
    return {
      bundle,
      leaseId,
      slot,
      date,
      now,
      inspiration: slot === "inspiration" ? { date, attempts: state.inspiration?.attempts || 0 } : null,
      pruneDue,
      pendingWritebacks,
    };
  }

  // compose（锁外）：采样/快照/模型生成全在这里。不持有 state、不落盘；产物交 commit 校验租约后落定。
  // kind：ok / insufficient / generation_failed / aborted（后三者都不投递）。
  // L2：主会话回写不在 compose 做（生成≠投递）——统一由 #writebackDeliveredBundle 在投递成功后按 outbox
  // 真实 payload 回写（主人所见即所得，覆盖 fallback 与 S1 脱敏降级）。
  async #composeTick(decision, { shouldContinue = () => true } = {}) {
    const { bundle, slot, date, now } = decision;
    if (!shouldContinue()) return { kind: "aborted" };
    if (slot === "inspiration" && this.inspirationSampler && this.inspirationStore) {
      // D12：灵感卡片——采样→模型生成→成卡；素材不足/生成失败不投递空卡（终态记账在 commit）。
      let notes = [];
      try {
        notes = (await this.inspirationSampler.sample({ now }))?.notes || [];
      } catch (error) {
        await this.recordEvent?.("inspiration.sample.failed", { date, error: { code: error?.code || "INSPIRATION_SAMPLE_FAILED", message: String(error?.message || error).slice(0, 300) } }, { level: "error" });
      }
      if (notes.length < 2) return { kind: "insufficient", sampled: notes.length };
      if (!shouldContinue()) return { kind: "aborted" };
      const result = await this.#runAgent(inspirationPrompt(notes), bundle.bundleId);
      const text = result.job?.status === "completed" ? String(result.job.result?.text || "").trim() : "";
      if (!text) return { kind: "generation_failed", code: result.error?.code || "INSPIRATION_EMPTY_GENERATION" };
      const record = await this.inspirationStore.create({ date, sampledRefs: notes.map((note) => note.path), text, attempts: (decision.inspiration?.attempts || 0) + 1 });
      const message = inspirationCardMessage(record, notes, bundle.bundleId);
      return { kind: "ok", message, providerStatus: "completed", localFallback: false };
    }
    const snapshot = await this.today.snapshot();
    const weeklySummary = bundle.signalKinds.some((item) => item.kind === "weekly") && this.maintenance ? await this.maintenance.weeklySummary() : undefined;
    const fallback = bundleMessage(bundle, snapshot, weeklySummary);
    if (!shouldContinue()) return { kind: "aborted" };
    const result = await this.#runAgent(bundlePrompt(bundle), bundle.bundleId);
    if (!shouldContinue()) return { kind: "aborted" };
    const completedText = result.job?.status === "completed" ? result.job.result?.text : "";
    const body = completedText ? `${fallback.body}\n\n建议：${completedText}` : fallback.body;
    const message = completedText ? { ...fallback, body, text: `${fallback.title}\n${body}` } : fallback;
    return { kind: "ok", message, providerStatus: result.job?.status, localFallback: !completedText };
  }

  // commit（锁内）：租约校验 → 双守卫 → 灵感记账 → enqueue → 落定 → save。
  // 双守卫：leaseId 失配（租约被清扫/状态被重置）→ 弃生成物；compose↔commit 间隙全部信号被落定
  // （如崩溃遗留 bundle 经对账回补投递）→ 整包放弃防重发。两条放弃路径都必须 save——租约已在锁内删除，
  // 不落盘则租约残留到过期清扫（信号被多锁一个租约期）。
  async #commitTick(decision, composed, { shouldContinue = () => true } = {}) {
    const { bundle, leaseId, slot, date, now } = decision;
    const state = await this.load();
    const lease = state.pendingCompositions?.[bundle.bundleId];
    if (!lease || lease.leaseId !== leaseId) {
      await this.recordEvent?.("proactive.tick.commit_aborted", { bundleId: bundle.bundleId, slot, reason: "lease_lost" }, { level: "warning" });
      return { delivered: [], shouldWake: false };
    }
    delete state.pendingCompositions[bundle.bundleId];
    if (composed.kind === "aborted" || !shouldContinue()) {
      // 干净中止（stop 竞态/关停）：释放租约落定，信号下一拍重新 eligible。
      await this.save(state);
      return { delivered: [], shouldWake: false };
    }
    if (bundle.signalVersions.length && bundle.signalVersions.every((identity) => this.#subjectSettled(state.subjects[identity.subjectKey], identity))) {
      await this.recordEvent?.("proactive.tick.commit_aborted", { bundleId: bundle.bundleId, slot, reason: "signals_settled" }, { level: "warning" });
      await this.save(state);
      return { delivered: [], shouldWake: false };
    }
    if (slot === "inspiration" && this.inspirationSampler && this.inspirationStore) {
      if (state.inspiration?.date !== date) state.inspiration = { date, attempts: 0 };
      if (composed.kind === "insufficient") {
        // 素材不足：当日终态跳过（lastRuns 标记），不耗 attempts，不投递空卡。
        state.lastRuns[`inspiration:${date}`] = date;
        await this.recordEvent?.("inspiration.sample.insufficient", { date, sampled: composed.sampled });
        await this.save(state);
        return { delivered: [], shouldWake: false };
      }
      // attempts 在 commit 计数——生成真实发起（compose 走完模型调用）才计；崩溃于生成中不耗次，租约过期后重试。
      state.inspiration.attempts += 1;
      if (composed.kind === "generation_failed") {
        await this.recordEvent?.("inspiration.generate.failed", { date, attempts: state.inspiration.attempts, code: composed.code }, { level: "error" });
        await this.save(state);
        return { delivered: [], shouldWake: false };
      }
    }
    const delivery = await this.#deliverBundle(state, bundle, composed.message, now, { shouldContinue });
    if (delivery.status === "canceled") {
      await this.save(state);
      return { delivered: [], shouldWake: false };
    }
    if (delivery.status === "delivered") {
      this.#applyBundleDelivered(state, bundle.bundleId, delivery.eventId, now);
      await this.#markInspirationDelivered({ inspirationId: composed.message.data?.inspirationId }, delivery.eventId);
    }
    // B1：只有事件型推送消耗防打扰预算；预约投递（morning/evening/weekly/inspiration）不计数。
    if (slot === "event") state.notificationsToday += 1;
    state.pending[bundle.bundleId] = { signalKey: bundle.bundleId, status: delivery.status };
    state.pending = Object.fromEntries(Object.entries(state.pending).slice(-200));
    await this.save(state);
    return {
      delivered: [{ signal: "bundle", bundleId: bundle.bundleId, providerStatus: composed.providerStatus ?? null, localFallback: composed.localFallback ?? false, deliveryStatus: delivery.status, targetChannel: delivery.targetChannel }],
      shouldWake: delivery.status === "pending",
      // L2：同步直投分支（enqueue 即 delivered 的去重路径）也要回写——由 tick 在锁外触发，claim 门防双写。
      deliveredEventId: delivery.status === "delivered" ? delivery.eventId : null,
    };
  }

  // prune（锁外）：会话修剪/过期清理由 60s tick 顺带触发，不值得抱锁。
  // 语义微调（计划显式声明）：lastPruned 按「当日已尝试」落定——prune 抛错当日不再每拍重试，次日再试；
  // 失败有 proactive.prune.failed 事件可观测。落定用锁内 load→改→save，不与 decide/commit 竞态。
  async #pruneOutsideLock(date) {
    try {
      await this.conversations?.prune();
      await this.cognitiveRuntime?.cleanupExpired?.();
    } catch (error) {
      await this.recordEvent?.("proactive.prune.failed", { date, error: { code: error?.code || "PROACTIVE_PRUNE_FAILED", message: String(error?.message || error).slice(0, 300) } }, { level: "warning" });
    }
    await this.stateLock.run(async () => {
      const state = await this.load({ prepareMigration: false });
      if (state.lastPruned === date) return;
      state.lastPruned = date;
      await this.save(state);
    });
  }

  // L0a+L0b：tick 全程计时观测 + 分段（decide/compose/commit）。快速空转（idle 且耗时 < tickObservationMinMs）
  // 不落事件，避免 60s 一拍刷 journal；慢空转（锁等待/长任务征兆）与有产出的 tick 都有 completed 记录。
  // 失败路径把耗时与阶段挂上 error，由 start() 的 interval catch 一并落 journal。
  async tick(options = {}) {
    const startedAt = Date.now();
    const timing = { lockWaitMs: 0 };
    let phase = "decide";
    try {
      const decideStartedAt = Date.now();
      const decision = await this.#withStateLock(timing, () => this.#decideTick(options));
      const decideMs = Date.now() - decideStartedAt;
      let composeMs = 0;
      let commitMs = 0;
      let committed = { delivered: [], shouldWake: false };
      // L2：对账回补的回写（锁外）——与 decide 的早退路径无关，带出来就执行
      for (const item of decision.pendingWritebacks || []) {
        await this.#writebackDeliveredBundle(item.bundleId, item.eventId);
      }
      if (decision.bundle) {
        phase = "compose";
        const composeStartedAt = Date.now();
        const composed = await this.#composeTick(decision, options);
        composeMs = Date.now() - composeStartedAt;
        phase = "commit";
        const commitStartedAt = Date.now();
        committed = await this.#withStateLock(timing, () => this.#commitTick(decision, composed, options));
        commitMs = Date.now() - commitStartedAt;
        // L2：同步直投分支（enqueue 即 delivered）的回写，锁外触发
        if (committed.deliveredEventId) await this.#writebackDeliveredBundle(decision.bundle.bundleId, committed.deliveredEventId);
      }
      if (decision.pruneDue && decision.date) {
        phase = "prune";
        await this.#pruneOutsideLock(decision.date);
      }
      const outcome = committed.delivered.length
        ? (committed.delivered.some((item) => item.deliveryStatus === "delivered") ? "delivered" : "enqueued")
        : "idle";
      const durationMs = Date.now() - startedAt;
      if (outcome !== "idle" || durationMs >= this.tickObservationMinMs) {
        await this.recordEvent?.("proactive.tick.completed", {
          durationMs, outcome, deliveredCount: committed.delivered.length,
          lockWaitMs: timing.lockWaitMs, decideMs, composeMs, commitMs,
        });
      }
      if (committed.shouldWake) await this.wakeDelivery?.();
      return committed.delivered;
    } catch (error) {
      if (error && typeof error === "object") {
        error.tickDurationMs = Date.now() - startedAt;
        error.tickPhase = phase;
      }
      throw error;
    }
  }

  async #deliveryEnabled() {
    return (await this.settingsRegistry?.get?.("notifications.proactiveDeliveryEnabled")) === true;
  }

  async releaseStatus() {
    const state = await this.load({ prepareMigration: false });
    const migrationComplete = state.migration?.status === "complete"
      ? await this.#hasValidMigrationMarker(state)
      : state.migration?.status !== "pending";
    return {
      enabled: await this.#deliveryEnabled(),
      migrationComplete,
      migrationStatus: state.migration?.status || "current",
    };
  }

  async migrateLedger({ now = this.clock(), highValueEvents } = {}) {
    if (await this.#deliveryEnabled()) {
      throw Object.assign(new Error("迁移前必须暂停主动通知"), { code: "PROACTIVE_DELIVERY_MUST_BE_PAUSED" });
    }
    return this.stateLock.run(async () => {
      const state = await this.load();
      if (state.migration?.status === "complete") {
        const validBefore = await this.#hasValidMigrationMarker(state);
        await this.#ensureMigrationMarker(state);
        return { status: validBefore ? "already_current" : "marker_repaired", version: state.version };
      }
      if (state.migration?.status !== "pending") {
        return { status: "already_current", version: state.version };
      }
      const events = highValueEvents || await this.signalSources?.collect?.({ now }) || [];
      await this.#loadLegacyAudit(state);
      const signals = events.map((event) => ({
        kind: "event",
        key: `event:${event.id}`,
        id: String(event.id),
        event,
        title: event.title,
        action: event.action,
        priority: event.priority,
        ref: event.ref,
      }));
      this.#prepareSignals(state, signals, now);
      state.migration = {
        ...state.migration,
        status: "complete",
        completedAt: now.toISOString(),
      };
      await this.save(state);
      return {
        status: "migrated",
        version: state.version,
        suppressedSignals: Object.values(state.subjects).filter((subject) => subject.migrationSuppressed).length,
      };
    });
  }

  async triggerTest(runId, { now = this.clock() } = {}) {
    const normalizedRunId = String(runId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(normalizedRunId)) {
      throw Object.assign(new Error("主动通知测试 runId 非法"), { code: "PROACTIVE_TEST_RUN_ID_INVALID" });
    }
    const release = await this.releaseStatus();
    if (release.enabled) {
      throw Object.assign(new Error("受控测试期间必须保持真实主动通知暂停"), { code: "PROACTIVE_DELIVERY_MUST_BE_PAUSED" });
    }
    if (!release.migrationComplete) {
      throw Object.assign(new Error("主动通知 Ledger 尚未完成受控迁移"), { code: "PROACTIVE_MIGRATION_REQUIRED" });
    }
    const targetChannel = this.channels.homeChannel || "web";
    const deliveryKey = `proactive-test:${normalizedRunId}:${targetChannel}:v1`;
    const result = await this.stateLock.run(async () => {
      const state = await this.load({ prepareMigration: false });
      const signal = {
        id: `proactive-test:${normalizedRunId}`,
        key: `proactive-test:${normalizedRunId}`,
        kind: "event",
        title: `[Syno TEST ${normalizedRunId}]`,
        action: "请确认只收到这一条受控主动通知",
        priority: 100,
        ref: { status: "test", businessVersion: normalizedRunId },
      };
      signal.identity = signalIdentity(signal, state.subjects);
      state.subjects[signal.identity.subjectKey] = {
        ...(state.subjects[signal.identity.subjectKey] || {}),
        subjectKey: signal.identity.subjectKey,
        episode: signal.identity.episode,
        lastSeenVersion: signal.identity.businessVersion,
        active: true,
        updatedAt: now.toISOString(),
      };
      const bundle = buildProactiveBundle([signal], { now, slot: "test" });
      const message = {
        title: signal.title,
        body: signal.action,
        text: `${signal.title}\n${signal.action}`,
        level: "info",
        source: "proactive",
        data: { idempotencyKey: deliveryKey, signal: "test", testRunId: normalizedRunId },
      };
      let delivery;
      try {
        delivery = await this.#deliverBundle(state, bundle, message, now, {
          deliveryKey,
          exclusiveActivePrefix: "proactive-test:",
        });
      } catch (error) {
        if (error?.code === "DELIVERY_EXCLUSIVE_GROUP_CONFLICT") {
          throw Object.assign(new Error("已有一条受控主动通知等待确定结果"), {
            code: "PROACTIVE_TEST_ALREADY_PENDING",
            conflictingEventId: error.conflictingEventId,
          });
        }
        throw error;
      }
      await this.save(state);
      return {
        runId: normalizedRunId,
        bundleId: bundle.bundleId,
        eventId: delivery.eventId,
        targetChannel: delivery.targetChannel,
        status: delivery.status,
      };
    });
    if (result.eventId && ["pending", "claimed", "failed_retryable"].includes(result.status)) {
      await this.settingsRegistry?.set?.("notifications.proactiveTestEventId", result.eventId, {
        actor: "system",
        proactiveTestAuthorizationVerified: true,
      });
      await this.wakeDelivery?.({ allowProactiveEventId: result.eventId });
    }
    return result;
  }

  async #homeTargetAvailable(channel = this.channels.homeChannel || "web") {
    if (channel === "web") return true;
    try {
      return Boolean(await this.ownerChannelTargets?.get?.("local-user", channel));
    } catch {
      return false;
    }
  }

  // 主动通道投递健康（诊断用，preview 调用频率低可接受 O(n≤200) 扫描）：
  // consecutiveFailures = 从最新事件向前累加连续失败态（failed_retryable/terminal/delivery_unknown）事件的 attempts
  //   ——与 runtime 进程级计数器（health.deliveryConsecutiveFailures）同口径：连续失败投递次数（非失败事件数）；
  // lastDeliveryError = 最近一条 lastErrorCode；targetTokenAgeMs = 持久 target token 自更新以来的毫秒数（指向 token 过期根因，下界 0）。
  async #deliveryHealth(homeChannel, now = this.clock()) {
    let consecutiveFailures = 0;
    let lastDeliveryError = null;
    let lastSeenAt = null;
    try {
      // list 在服务端按 sourceType/targetChannel 过滤后再切片，避免被其它类型事件挤出窗口导致假绿。
      const scoped = await this.channelDeliveryOutbox?.list?.({ limit: 200, order: "desc", sourceType: "proactive_bundle", targetChannel: homeChannel }) || [];
      ({ consecutiveFailures, lastDeliveryError } = aggregateDeliveryFailures(scoped));
      if (scoped.length) lastSeenAt = scoped[0].updatedAt || scoped[0].createdAt || null;
    } catch {
      // best-effort：outbox 不可用时返回空诊断，不阻断 preview
    }
    let targetTokenAgeMs = null;
    try {
      const meta = await this.ownerChannelTargets?.meta?.("local-user", homeChannel);
      if (meta?.updatedAt) targetTokenAgeMs = Math.max(0, now.getTime() - new Date(meta.updatedAt).getTime());
    } catch {
      // best-effort：target 不可读时 token 年龄留空
    }
    return { homeChannel, consecutiveFailures, lastDeliveryError, lastSeenAt, targetTokenAgeMs };
  }

  async preview({ now = this.clock(), highValueEvents } = {}) {
    const state = await this.load({ prepareMigration: false });
    const homeChannel = this.channels.homeChannel || "web";
    const quietHours = await this.settingsRegistry?.get?.("notifications.quietHours") || this.quietHours;
    if (isQuietTime(now, quietHours)) {
      return {
        enabled: await this.#deliveryEnabled(),
        homeChannel,
        homeTargetAvailable: await this.#homeTargetAvailable(homeChannel),
        deliveryHealth: await this.#deliveryHealth(homeChannel, now),
        eligibleSignals: 0,
        bundle: null,
      };
    }
    const events = highValueEvents || await this.signalSources?.collect({ now }) || [];
    await this.#loadLegacyAudit(state);
    const cadence = await this.settingsRegistry?.get?.("notifications.cadence") || "balanced";
    const cadenceBudget = { minimal: 1, balanced: 2, active: 3 }[cadence] || 2;
    this.#markInactive(state, events, now);
    this.#pruneResolvedSubjects(state, now);
    const signals = this.signalEngine.collect({
      now,
      lastRuns: state.lastRuns,
      highValueEvents: events,
      notificationsToday: state.notificationsToday,
      maxDailyNotifications: cadenceBudget,
      returnAllEligible: true,
    });
    const prepared = this.#prepareSignals(state, signals, now);
    const slot = prepared.find((signal) => ["morning", "evening", "weekly", "inspiration"].includes(signal.kind))?.kind || "event";
    const bundle = prepared.length ? buildProactiveBundle(prepared, { now, slot }) : null;
    return {
      enabled: await this.#deliveryEnabled(),
      homeChannel,
      homeTargetAvailable: await this.#homeTargetAvailable(homeChannel),
      deliveryHealth: await this.#deliveryHealth(homeChannel, now),
      eligibleSignals: prepared.length,
      bundle: bundle ? {
        bundleId: bundle.bundleId,
        signalCount: bundle.signalVersions.length,
        remainingCount: bundle.remainingCount,
      } : null,
    };
  }

  async start() {
    if (this.timer) return;
    const generation = ++this.startGeneration;
    const tickIfEnabled = async () => {
      if (!await this.#deliveryEnabled()) return [];
      if (generation !== this.startGeneration) return [];
      return this.tick({ shouldContinue: () => generation === this.startGeneration });
    };
    await tickIfEnabled();
    if (generation !== this.startGeneration) return;
    this.timer = setInterval(() => tickIfEnabled().catch((error) => {
      // tick 失败此前被完全静默（save IO 错 / enqueue 冲突 / snapshot 错都消失）；落 journal 可观测，不阻断下一 tick。
      this.recordEvent?.("proactive.tick.failed", { error: { code: error?.code, message: String(error?.message || error).slice(0, 500) }, durationMs: error?.tickDurationMs, phase: error?.tickPhase }, { level: "error" }).catch(() => {});
    }), 60_000);
  }

  stop() {
    this.startGeneration += 1;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export { DEFAULT_QUIET_HOURS, ProactiveOrchestrator, isQuietTime, localMessage };
