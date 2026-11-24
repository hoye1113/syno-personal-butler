import { promises as fs } from "node:fs";
import path from "node:path";

const MANIFEST = /^daily-doc-(\d{4}-\d{2}-\d{2})\.json$/u;

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** A displayed item is permanently excluded from later daily additions, read or not. */
export async function historicalItemIds({ home, date }) {
  const ids = new Set();
  let names = [];
  try {
    names = await fs.readdir(home);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const name of names) {
    const match = MANIFEST.exec(name);
    if (!match || match[1] === date) continue;
    const manifest = await readJson(path.join(home, name));
    for (const item of manifest?.items ?? []) ids.add(Number(item.itemId));
  }
  return ids;
}

export async function freshDailyEntries({ home, date, entries }) {
  const shown = await historicalItemIds({ home, date });
  return entries.filter((entry) => !shown.has(Number(entry.item.item_id)));
}
