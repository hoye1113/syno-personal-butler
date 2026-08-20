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
  "config/deepseek-harness/syno-agent.md",
];
const forbidden = [
  "产品只启用原生 `ToolLoopAgent`",
  "Windows 登录启动 Worker",
  "独立 Worker 是生产入口",
  "普通写入需要审批",
  "双审批",
  "二次审批",
];

const violations = [];
for (const relative of activeFiles) {
  const text = await fs.readFile(path.join(root, relative), "utf8");
  for (const phrase of forbidden) {
    if (text.includes(phrase)) violations.push(`${relative}: ${phrase}`);
  }
}

if (violations.length) {
  console.error(`Active documentation contains superseded product semantics:\n${violations.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Active documentation check passed (${activeFiles.length} files).`);
}
