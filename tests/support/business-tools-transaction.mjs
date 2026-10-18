// Isolated integration worker. Protocol stdout is explicitly UTF-8 JSON.
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AgentHost } from "../../packages/syno-core/agent-host.mjs";
import { JobStore } from "../../packages/syno-core/job-store.mjs";
import { GitGuard } from "../../packages/syno-core/git-guard.mjs";
import { OperationExecutor } from "../../packages/syno-core/operation-executor.mjs";
import { executeDomainOperation } from "../../packages/syno-core/domain-operations.mjs";
import { createBusinessTools, BUSINESS_TOOL_NAMES } from "../../packages/syno-core/business-tools.mjs";
import { PendingDecisionStore } from "../../packages/syno-core/pending-decision.mjs";
import { ToolRegistry } from "../../apps/syno/syno/tool-registry.mjs";
import { SynoToolBridge } from "../../apps/syno/syno/syno-tool-bridge.mjs";
import { PATHS } from "../../packages/syno-core/paths.mjs";

const exec = promisify(execFile);
const root = PATHS.repoRoot;
const git = (args) => exec("git", args, { cwd: root, encoding: "utf8" });
const source = path.resolve(import.meta.dirname, "../..");
await fs.cp(path.join(source, "contracts"), path.join(root, "contracts"), { recursive: true });
await fs.mkdir(path.join(root, "config"));
await fs.copyFile(path.join(source, "config/vault-contract.json"), path.join(root, "config/vault-contract.json"));
await fs.writeFile(path.join(root, ".gitignore"), ".runtime/\n.local/\n.worktrees/\n.syno-state/\n", "utf8");
await git(["init", "-b", "main"]);
await git(["config", "user.name", "Syno test"]);
await git(["config", "user.email", "syno-test@example.invalid"]);
await git(["add", "--", ".gitignore", "contracts", "config"]);
await git(["commit", "-m", "test fixture"]);
const executor = new OperationExecutor({
  fallback: { async submit() { throw new Error("No model in transaction test"); } },
  execute: (operation, payload, { workspace, job }) => executeDomainOperation(operation, payload, { workspace, job }),
});
const host = new AgentHost({ store: new JobStore(), executor, gitGuard: new GitGuard({ productBranch: "main" }) });
const core = { host, execute: (request, context) => host.receive(request, context) };
const tools = new ToolRegistry(createBusinessTools(() => ({ core, pendingDecisions: new PendingDecisionStore(), ingestWorkflows: { async listPending() { return []; } } })));
const bridge = new SynoToolBridge({ tools, token: "fixture" });
const sessionId = "syno-main-" + "c".repeat(32);
let release;
function bind(messageId) {
  release?.();
  release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId, channel: "feishu", privateConversation: true, harnessSessionId: sessionId, allowedTools: BUSINESS_TOOL_NAMES.map((name) => name.replaceAll(".", "_")) });
}
async function call(name, args = {}) {
  const value = await bridge.handle({ authorization: "Bearer fixture", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: name.replaceAll(".", "_"), arguments: args, sessionId } } });
  if (value.error || value.result?.isError) throw new Error(JSON.stringify(value));
  return value.result.structuredContent;
}
bind("first-message");
const action = await call("actions.create", { title: "周五阅读文章" });
const memory = await call("memory.propose", { statement: "以后回答优先用中文实例" });
bind("later-message");
const completed = await call("actions.update", { id: action.record.id, version: action.version, status: "completed" });
const [choice] = (await call("decisions.list")).decisions;
const approved = await call("decisions.resolve", { id: choice.id, version: choice.version, action: "approve" });
release();
process.stdout.write(JSON.stringify({ completed: completed.record.status, memory: approved.record.status, note: await fs.readFile(path.join(root, approved.record.notePath), "utf8"), dirty: (await git(["status", "--porcelain"])).stdout, proposed: memory.record.status }), "utf8");
