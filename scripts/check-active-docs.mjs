import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const activeFiles = [
  "README.md",
  "NEXT_SESSION.md",
  "docs/ARCHITECTURE.md",
  "docs/POLICY.md",
  "docs/KNOWN-LIMITATIONS.md",
  "docs/TODO-EXECUTION-PLAN.md",
  "docs/INDEX.md",
  "config/deepseek-harness/syno-agent.md",
];
const forbidden = [
  "产品只启用原生 `ToolLoopAgent`",
  "Windows 登录启动 Worker",
  "独立 Worker 是生产入口",
  "普通写入需要审批",
  "双审批",
  "二次审批",
  "当前 Phase 4 HEAD：3362336",
  "Node 714 tests / 714 pass",
];
// project-aware 执行计划 2026-09-01 SUPERSEDED（产品方向决策，见 docs/product-slimming-and-inspiration-plan.md D4），
// 已移出 activeFiles 归为历史文档；INDEX 仍须提及它以保留追溯入口。
const required = new Map([
  ["docs/INDEX.md", ["Normative", "Historical", "Generated", "project-aware-knowledge-execution-plan.md"]],
]);

const violations = [];
const missing = [];
for (const relative of activeFiles) {
  const text = await fs.readFile(path.join(root, relative), "utf8");
  for (const phrase of forbidden) {
    if (text.includes(phrase)) violations.push(`${relative}: ${phrase}`);
  }
  for (const phrase of required.get(relative) || []) {
    if (!text.includes(phrase)) missing.push(`${relative}: ${phrase}`);
  }
}

if (violations.length || missing.length) {
  if (violations.length) console.error(`Active documentation contains superseded product semantics:\n${violations.join("\n")}`);
  if (missing.length) console.error(`Active documentation is missing required current anchors:\n${missing.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Active documentation check passed (${activeFiles.length} files).`);
}
