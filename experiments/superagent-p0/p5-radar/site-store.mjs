import { promises as fs } from "node:fs";
import path from "node:path";

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_FILE = /^radar-day-(\d{4}-\d{2}-\d{2})\.json$/u;
const DOC_FILE = /^daily-doc-(\d{4}-\d{2}-\d{2})\.json$/u;
const FOLLOW_MUTATIONS = new Map();

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

function itemState(item, readState, followState) {
  return {
    ...item,
    readAt: readState.items[String(item.itemId)]?.readAt ?? null,
    unreadAt: readState.items[String(item.itemId)]?.unreadAt ?? null,
    follow: followState.items[String(item.itemId)] ?? { status: item.candidateState === "followed" ? "followed" : item.candidateState === "ignored" ? "ignored" : "none" },
  };
}

export function createRadarSiteStore({ home, stateHome = home, now = () => new Date(), publicOrigin = "" }) {
  if (!home) throw new Error("雷达站缺少 home");
  const readFile = path.join(stateHome, "radar-read-state.json");
  const followFile = path.join(stateHome, "radar-follow-state.json");

  async function days() {
    let names = [];
    try {
      names = await fs.readdir(home);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const files = new Map();
    for (const name of names.sort()) {
      const match = DAY_FILE.exec(name) ?? DOC_FILE.exec(name);
      if (!match) continue;
      const date = match[1];
      if (DAY_FILE.test(name) || !files.has(date)) files.set(date, name);
    }
    const result = [];
    for (const [date, name] of files) {
      const value = await readJson(path.join(home, name));
      if (value?.date === date && Array.isArray(value.items)) result.push(value);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  async function states() {
    const [readState, followState] = await Promise.all([
      readJson(readFile, { schema: 1, items: {} }),
      readJson(followFile, { schema: 1, items: {} }),
    ]);
    return { readState, followState };
  }

  return {
    async publish(ast) {
      if (!DATE.test(ast?.date ?? "") || !Array.isArray(ast?.details)) throw new Error("日报快照缺少合法日期或详情");
      const snapshot = {
        schema: 1,
        date: ast.date,
        title: ast.title,
        generatedAt: now().toISOString(),
        totalItems: ast.totalItems ?? ast.details.length,
        items: ast.details,
      };
      await atomicJson(path.join(home, `radar-day-${ast.date}.json`), snapshot);
      return snapshot;
    },

    url(date) {
      if (!publicOrigin) return "";
      return `${publicOrigin.replace(/\/$/u, "")}/?date=${date}`;
    },

    async summary() {
      const all = await days();
      const { readState } = await states();
      return {
        generatedAt: now().toISOString(),
        days: all.map((day) => ({
          date: day.date,
          itemCount: day.items.length,
          unreadCount: day.items.filter((item) => {
            const state = readState.items[String(item.itemId)];
            return !state?.readAt && (Boolean(day.schema) || Boolean(state?.unreadAt));
          }).length,
          snapshot: Boolean(day.schema),
        })),
      };
    },

    async items({ date = "", view = "today", q = "" } = {}) {
      if (date && !DATE.test(date)) throw new Error("日期格式无效");
      if (!["today", "all", "unread", "read", "followed", "ignored"].includes(view)) throw new Error("视图无效");
      const all = await days();
      const selected = date ? all.filter((day) => day.date === date) : view === "today" ? all.slice(0, 1) : all;
      const { readState, followState } = await states();
      const seen = new Set();
      const items = [];
      for (const day of selected) {
        for (const raw of day.items) {
          const itemId = Number(raw.itemId);
          if (!Number.isSafeInteger(itemId) || itemId <= 0) continue;
          if (!date && seen.has(itemId)) continue;
          seen.add(itemId);
          const item = itemState({ ...raw, date: day.date, legacy: !day.schema }, readState, followState);
          items.push(item);
        }
      }
      const needle = String(q).trim().normalize("NFKC").toLocaleLowerCase("zh-CN");
      return items.filter((item) => {
        if (view === "unread" && (item.readAt || (item.legacy && !item.unreadAt))) return false;
        if (view === "read" && !item.readAt) return false;
        if (view === "followed" && item.follow.status === "none") return false;
        if (view === "ignored" && item.follow.status !== "ignored") return false;
        if (!needle) return true;
        return [item.title, item.titleZh, item.source, item.sourceName, item.date]
          .some((value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("zh-CN").includes(needle));
      });
    },

    async setRead(itemIds, read) {
      if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.length > 200) throw new Error("已阅条目数量无效");
      const ids = [...new Set(itemIds.map(Number))];
      if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error("条目 ID 无效");
      const known = new Map((await this.items({ view: "all" })).map((item) => [item.itemId, item]));
      if (ids.some((id) => !known.has(id))) throw new Error("不能修改不存在的雷达条目");
      const { readState } = await states();
      const at = now().toISOString();
      for (const id of ids) {
        if (read) readState.items[String(id)] = { readAt: readState.items[String(id)]?.readAt ?? at };
        else if (known.get(id).legacy) readState.items[String(id)] = { readAt: null, unreadAt: at };
        else delete readState.items[String(id)];
      }
      await atomicJson(readFile, readState);
      return { itemIds: ids, read, at };
    },

    async setFollow(itemId, value) {
      const id = Number(itemId);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error("条目 ID 无效");
      const write = async () => {
        const { followState } = await states();
        followState.items[String(id)] = {
          ...value,
          ignoredAt: value.ignoredAt ?? followState.items[String(id)]?.ignoredAt,
          updatedAt: now().toISOString(),
        };
        await atomicJson(followFile, followState);
        return followState.items[String(id)];
      };
      const previous = FOLLOW_MUTATIONS.get(followFile) || Promise.resolve();
      const operation = previous.then(write, write);
      FOLLOW_MUTATIONS.set(followFile, operation.catch(() => {}));
      return operation;
    },

    async follow(itemId) {
      const { followState } = await states();
      return followState.items[String(Number(itemId))] ?? null;
    },
  };
}
