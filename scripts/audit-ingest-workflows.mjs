import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../apps/syno/syno/paths.mjs";

// 只读审计 ingest-workflow 终态记录：按「错误码 × retryable × fetchMethod」聚类，
// 暴露哪些失败形态在批量重复发生（历史上的 free 档 429 用同一个 OPENCODE_ATTEMPTS_EXHAUSTED
// 把 10 条 workflow 送进 failed_terminal，同一形态无从发现）。绝不写任何文件。
const ingestRoot = path.join(PATHS.stateRoot, "ingest-workflows");
const [, , ...args] = process.argv;
const showAll = args.includes("--all");

console.log(`审计目录：${ingestRoot}`);
const files = await fs.readdir(ingestRoot).catch((error) => {
  if (error.code === "ENOENT") {
    console.error("未找到 ingest-workflows 目录，尚未产生任何收录工作流。");
    process.exit(0);
  }
  throw error;
});

const workflows = [];
for (const name of files.sort()) {
  if (!name.endsWith(".json")) continue;
  try {
    const record = JSON.parse(await fs.readFile(path.join(ingestRoot, name), "utf8"));
    if (record && record.id) workflows.push(record);
  } catch {
    console.log(`  ⚠ 记录不可读 ${name}`);
  }
}

const finite = workflows.filter((item) => ["failed_terminal", "rejected", "superseded", "reported"].includes(item.stage));
const retryable = workflows.filter((item) => item.stage === "failed_retryable");
const live = workflows.filter((item) => !finite.includes(item) && !retryable.includes(item));

console.log(`总数 ${workflows.length}：终态 ${finite.length}，可重试 ${retryable.length}，进行中 ${live.length}\n`);

const buckets = new Map();
for (const w of workflows) {
  const key = `${w.lastError?.code || "no-lastError"} × ${w.lastError?.retryable === true ? "retryable" : "non-retryable"} × ${w.fetchMethod || "?"}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(w);
}
console.log("按 错误码 × retryable × fetchMethod 分组：");
for (const [key, items] of [...buckets.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${items.length.toString().padStart(3)}  ${key}`);
  if (showAll || items.length > 1) console.log(`    样例：${items.slice(0, 3).map((w) => path.basename(w.id)).join("、")}`.trim());
}
if (workflows.length) {
  console.log(`\n终态且无 lastError 属高可疑（可能死过却没有归因）：`);
  const noError = finite.filter((w) => !w.lastError);
  for (const w of noError) {
    console.log(`  ${w.id}  stage=${w.stage}`);
    if (showAll) console.log(`    ${JSON.stringify({ candidateId: w.candidateId, proposalId: w.proposalId, jobId: w.jobId })}`);
  }
  if (!noError.length) console.log("  （无）");
}