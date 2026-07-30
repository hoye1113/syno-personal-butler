import { constants as fsConstants, promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";
import { SignalEngine, localDateKey } from "./signal-engine.mjs";
import { PROACTIVE_RESPONSE_KIND, buildProactiveBundle, normalizeState, signalIdentity } from "./proactive-reliability.mjs";

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

// 晚间：突出今日完成进度与到期复习；缺进度时回退到优先行动
function eveningBody(snapshot) {
  const progress = snapshot?.progress;
  const due = (snapshot?.dueReviews || []).slice(0, 2);
  const lines = [];
  if (progress) {
    const failed = progress.failed ? `（${progress.failed} 项失败）` : "";
    lines.push(`今日已完成 ${progress.completed ?? 0} 项，待确认 ${progress.waiting ?? 0} 项${failed}`);
  }
  if (due.length) lines.push(`到期复习：${due.map((item) => item.title).join("、")}`);
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
  constructor({ host, today, channels, conversations, cognitiveRuntime, settingsRegistry, signalSources, maintenance, channelDeliveryOutbox, notifications, ownerChannelTargets, wakeDelivery, recordEvent, signalEngine = new SignalEngine(), stateFile = path.join(PATHS.stateRoot, "proactive.json"), stateLock, clock = () => new Date(), quietHours = DEFAULT_QUIET_HOURS } = {}) {
    if (!host || !today || !channels) throw new Error("ProactiveOrchestrator 缺少 host、today 或 channels");
    this.host = host; this.today = today; this.channels = channels; this.conversations = conversations; this.cognitiveRuntime = cognitiveRuntime;
    this.settingsRegistry = settingsRegistry; this.signalSources = signalSources; this.maintenance = maintenance; this.channelDeliveryOutbox = channelDeliveryOutbox; this.notifications = notifications; this.ownerChannelTargets = ownerChannelTargets; this.wakeDelivery = wakeDelivery; this.recordEvent = recordEvent; this.signalEngine = signalEngine; this.stateFile = stateFile; this.stateLock = stateLock || new ProcessFileLock({ file: `${stateFile}.lock`, timeoutMs: 30_000 }); this.clock = clock; this.quietHours = quietHours; this.timer = null;
  }

  async load() {
    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const state = normalizeState(JSON.parse(raw));
      if (state.migration?.status === "pending") {
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
    if (state.migration?.status === "complete") {
      const marker = `${this.stateFile}.migration-v2.json`;
      try {
        await fs.access(marker);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
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
    }
  }

  #markInactive(state, events, now) {
    const activeKeys = new Set(events.map((event) => String(event.id || event.key || "")));
    for (const subject of Object.values(state.subjects)) {
      if (subject.active && subject.subjectKey && !activeKeys.has(subject.subjectKey) && !subject.subjectKey.startsWith("morning:") && !subject.subjectKey.startsWith("evening:") && !subject.subjectKey.startsWith("weekly:")) {
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
      notices = await this.notifications.list({ limit: 1000 });
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
      const scheduledTitles = { morning: "晨间计划", evening: "晚间复盘", weekly: "每周复盘" };
      return {
        ...signal,
        title: signal.title || scheduledTitles[signal.kind],
        identity,
        action: signal.action || (signal.kind === "event" ? "请确认下一步处理" : "查看今日安排"),
      };
    }).filter((signal) => {
      const subject = state.subjects[signal.identity.subjectKey];
      return !(subject.lastDeliveredVersion === signal.identity.businessVersion && Number(subject.lastDeliveredEpisode || subject.episode || 1) === signal.identity.episode)
        && !Object.values(state.pendingBundles || {}).some((pending) => (pending.signalVersions || []).some((identity) => identity.subjectKey === signal.identity.subjectKey && identity.businessVersion === signal.identity.businessVersion && identity.episode === signal.identity.episode));
    });
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

  async #deliverBundle(state, bundle, message, now) {
    const targetChannel = this.channels.homeChannel || "web";
    const deliveryKey = `${bundle.bundleId}:${targetChannel}:v1`;
    state.pendingBundles[bundle.bundleId] = {
      bundleId: bundle.bundleId,
      eventId: null,
      targetChannel,
      signalVersions: bundle.signalVersions,
      signalKinds: bundle.signalKinds,
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
      });
      state.pendingBundles[bundle.bundleId].eventId = event.event.eventId;
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
      return { status: "pending", eventId: event.event.eventId, targetChannel };
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

  async #reconcileOutbox(state, now) {
    if (!this.channelDeliveryOutbox?.list || !this.channelDeliveryOutbox?.get) return;
    const records = (await this.channelDeliveryOutbox.list({ limit: 1000 }))
      .filter((item) => item.sourceType === "proactive_bundle" && item.status !== "superseded");
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
          createdAt: record.createdAt,
        };
      }
      if (record.status === "delivered") this.#applyBundleDelivered(state, record.sourceId, record.eventId, now);
    }
  }

  async markBundleDelivered(bundleId, eventId) {
    return this.stateLock.run(async () => {
      const state = await this.load();
      const pending = state.pendingBundles?.[bundleId];
      const updated = this.#applyBundleDelivered(state, bundleId, eventId);
      if (!updated) return false;
      await this.save(state);
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
      return true;
    });
  }

  async getDiagnostics() {
    const state = await this.load();
    const outbox = await this.channelDeliveryOutbox?.list?.({ limit: 1000 }) || [];
    return {
      eligibleSignals: Number(state.lastEligibleSignals) || 0,
      pendingBundles: Object.keys(state.pendingBundles || {}).length,
      deliveryUnknown: outbox.filter((item) => item.sourceType === "proactive_bundle" && item.status === "delivery_unknown").length,
      homeChannel: this.channels.homeChannel || "web",
      homeTargetAvailable: Boolean(await this.ownerChannelTargets?.get?.("local-user", this.channels.homeChannel || "web").catch?.(() => null) || this.channels.homeChannel === "web"),
      lastDeliveredAt: Object.values(state.subjects || {}).filter((item) => item.lastDeliveredEventId).map((item) => item.updatedAt).filter(Boolean).sort().at(-1) || null,
    };
  }

  async #tickLocked({ now = this.clock(), highValueEvents } = {}) {
    const state = await this.load();
    await this.#reconcileOutbox(state, now);
    const date = localDateKey(now);
    if (state.date !== date) Object.assign(state, { date, notificationsToday: 0 });
    const quietHours = await this.settingsRegistry?.get("notifications.quietHours") || this.quietHours;
    if (isQuietTime(now, quietHours)) return { delivered: [], shouldWake: false };
    const events = highValueEvents || await this.signalSources?.collect({ now }) || [];
    await this.#loadLegacyAudit(state);
    const cadence = await this.settingsRegistry?.get("notifications.cadence") || "balanced";
    const cadenceBudget = { minimal: 1, balanced: 2, active: 3 }[cadence] || 2;
    this.#markInactive(state, events, now);
    this.#pruneResolvedSubjects(state, now);
    const signals = this.signalEngine.collect({ now, lastRuns: state.lastRuns, highValueEvents: events, notificationsToday: state.notificationsToday, maxDailyNotifications: cadenceBudget, returnAllEligible: true });
    const prepared = this.#prepareSignals(state, signals, now);
    state.lastEligibleSignals = prepared.length;
    const delivered = [];
    if (prepared.length) {
      const slot = prepared.find((signal) => ["morning", "evening", "weekly"].includes(signal.kind))?.kind || "event";
      const bundle = buildProactiveBundle(prepared, { now, slot });
      await this.recordEvent?.("proactive.bundle.created", {
        bundleId: bundle.bundleId,
        signalCount: bundle.signalVersions.length,
        channel: this.channels.homeChannel || "web",
        outboxEventId: null,
        status: "created",
      });
      const snapshot = await this.today.snapshot();
      const weeklySummary = prepared.some((signal) => signal.kind === "weekly") && this.maintenance ? await this.maintenance.weeklySummary() : undefined;
      const fallback = bundleMessage(bundle, snapshot, weeklySummary);
      const result = await this.#runAgent(bundlePrompt(bundle), bundle.bundleId);
      const completedText = result.job?.status === "completed" ? result.job.result?.text : "";
      const body = completedText ? `${fallback.body}\n\n建议：${completedText}` : fallback.body;
      const message = completedText ? { ...fallback, body, text: `${fallback.title}\n${body}` } : fallback;
      if (completedText && this.cognitiveRuntime?.appendSystemEvent) await this.cognitiveRuntime.appendSystemEvent({ ownerKey: "local-user", threadKey: "main", text: message.text }).catch(() => {});
      const delivery = await this.#deliverBundle(state, bundle, message, now);
      if (delivery.status === "delivered") this.#applyBundleDelivered(state, bundle.bundleId, delivery.eventId, now);
      state.notificationsToday += 1;
      state.pending[bundle.bundleId] = { signalKey: bundle.bundleId, status: delivery.status };
      delivered.push({ signal: "bundle", bundleId: bundle.bundleId, providerStatus: result.job?.status, localFallback: !completedText, deliveryStatus: delivery.status, targetChannel: delivery.targetChannel });
    }
    if (state.migration?.status === "pending") {
      state.migration = { ...state.migration, status: "complete", completedAt: now.toISOString() };
    }
    if (this.conversations && state.lastPruned !== date) {
      await this.conversations.prune();
      await this.cognitiveRuntime?.cleanupExpired?.();
      state.lastPruned = date;
    }
    state.pending = Object.fromEntries(Object.entries(state.pending).slice(-200));
    await this.save(state);
    return {
      delivered,
      shouldWake: delivered.some((item) => item.deliveryStatus === "pending"),
    };
  }

  async tick(options = {}) {
    const result = await this.stateLock.run(() => this.#tickLocked(options));
    if (result.shouldWake) await this.wakeDelivery?.();
    return result.delivered;
  }

  async start() {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => this.tick().catch(() => {}), 60_000);
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

export { DEFAULT_QUIET_HOURS, ProactiveOrchestrator, isQuietTime, localMessage };
