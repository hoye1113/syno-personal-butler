import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { POLYMARKET_SOURCE, refreshPolymarketBoard } from "../experiments/superagent-p0/p5-radar/polymarket.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";

async function temporaryHome(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-polymarket-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return home;
}

function market(index, overrides = {}) {
  return {
    id: String(index + 1),
    question: `Will event ${index + 1} happen?`,
    slug: `event-${index + 1}`,
    active: true,
    closed: false,
    archived: false,
    outcomes: "[\"Yes\",\"No\"]",
    outcomePrices: `[\"0.${String(10 + index).padStart(2, "0")}\",\"0.${String(90 - index).padStart(2, "0")}\"]`,
    volume24hr: 1000 + index * 250,
    liquidity: String(50_000 - index * 100),
    oneDayPriceChange: index % 2 === 0 ? 0.01 : -0.02,
    startDateIso: "2026-11-01T00:00:00Z",
    endDateIso: "2027-01-01T00:00:00Z",
    events: [{ id: "900", slug: "shared-event", title: "Shared event" }],
    ...overrides,
  };
}

const fixedNow = () => new Date("2026-11-26T02:00:00Z");

test("Polymarket 公开快照保留概率、热度、归因并同日幂等", async (t) => {
  const home = await temporaryHome(t);
  const calls = [];
  const payload = Array.from({ length: 12 }, (_, index) => market(index));
  payload.push(market(20, { closed: true }), market(21, { outcomePrices: "invalid" }));
  const first = await refreshPolymarketBoard({
    home,
    now: fixedNow,
    fetchImpl: async (url) => {
      calls.push(url);
      assert.equal(url, POLYMARKET_SOURCE);
      return new Response(JSON.stringify(payload));
    },
  });

  assert.equal(first.status, "ok");
  assert.equal(first.cached, false);
  assert.equal(first.itemCount, 10);
  const snapshot = JSON.parse(await fs.readFile(path.join(home, "radar-polymarket-2026-11-26.json"), "utf8"));
  assert.equal(snapshot.items.length, 10);
  assert.equal(snapshot.items[0].id, "12");
  assert.equal(snapshot.items[0].volume24hr, 3750);
  assert.equal(snapshot.items[0].yesPrice, 0.21);
  assert.equal(snapshot.items[0].oneDayPriceChange, -0.02);
  assert.equal(snapshot.items[0].url, "https://polymarket.com/event/shared-event");
  assert.match(snapshot.coverage, /不是事实概率/u);
  const raw = await fs.readFile(path.join(home, snapshot.source.rawPath), "utf8");
  assert.equal(snapshot.source.sha256, createHash("sha256").update(raw).digest("hex"));

  const second = await refreshPolymarketBoard({
    home,
    now: fixedNow,
    fetchImpl: async () => { throw new Error("同日缓存不应重新请求"); },
  });
  assert.equal(second.cached, true);
  assert.equal(calls.length, 1);
});

test("Polymarket 失败保留上一份快照，网站只读接口标 stale 且不污染历史", async (t) => {
  const home = await temporaryHome(t);
  await refreshPolymarketBoard({
    home,
    now: fixedNow,
    fetchImpl: async () => new Response(JSON.stringify([market(0)])),
  });
  const previousFile = path.join(home, "radar-polymarket-2026-11-26.json");
  const previous = await fs.readFile(previousFile, "utf8");
  const failed = await refreshPolymarketBoard({
    home,
    now: () => new Date("2026-11-27T02:00:00Z"),
    fetchImpl: async () => new Response("upstream unavailable", { status: 503 }),
  });
  assert.equal(failed.status, "error");
  assert.equal(await fs.readFile(previousFile, "utf8"), previous);

  const store = createRadarSiteStore({ home });
  const latest = await store.polymarket();
  assert.equal(latest.date, "2026-11-26");
  assert.equal(latest.stale, true);
  assert.match(latest.statusError, /503/u);
  assert.equal((await store.polymarket({ date: "2026-11-26" })).stale, false);
  await assert.rejects(() => store.polymarket({ date: "2026-02-30" }), /日期/u);
});
