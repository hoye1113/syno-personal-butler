import { promises as fs } from "node:fs";
import path from "node:path";

import { createRadarSiteStore } from "./site-store.mjs";

/** Publish one ordered snapshot before the Feishu link can be sent. */
export async function publishRadarSiteDigest({ home, publicOrigin, ast }) {
  if (!Array.isArray(ast?.items) || !Array.isArray(ast?.details) || ast.items.length !== ast.details.length
    || ast.items.some((item, index) => Number(item.itemId) !== Number(ast.details[index].itemId) || Number(item.index) !== Number(ast.details[index].index))) {
    throw new Error("日报 AST 的编号与网站详情不一致，拒绝发布");
  }
  const store = createRadarSiteStore({ home, publicOrigin });
  await store.publish(ast);
  const items = (ast.items || []).map((item) => ({
    index: item.index,
    itemId: item.itemId,
    title: item.title,
    titleZh: item.titleZh,
    publishedAt: item.publishedAt,
    kind: item.kind,
  }));
  const link = store.url(ast.date);
  const manifest = {
    date: ast.date,
    link,
    nodeToken: null,
    docId: null,
    itemCount: items.length,
    unfiltered: true,
    groups: true,
    siteSnapshot: true,
    items,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(home, `daily-doc-${ast.date}.json`), JSON.stringify(manifest, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.writeFile(path.join(home, `digest-${ast.date}.json`), JSON.stringify({ date: ast.date, items }, null, 2), { encoding: "utf8", mode: 0o600 });
  const headline = items.length === 0
    ? "今日 P5 信息雷达：没有新增条目，历史未读仍可继续阅读。"
    : `今日 P5 信息雷达：${ast.date}，新增 ${items.length} 条。`;
  return {
    link,
    manifest,
    message: `${headline}\n${link}\n展示过的条目不再进入明日新增；需要收录请复制网站中的「跟进 日期 编号」命令。`,
  };
}
