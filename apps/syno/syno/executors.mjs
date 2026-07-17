import { spawn, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

const DEFAULT_MODELS = Object.freeze([
  "opencode/mimo-v2.5-free",
  "opencode/hy3-free",
  "opencode/deepseek-v4-flash-free",
]);
const FALLBACK_CODES = new Set(["timeout", "unavailable", "invalid_json", "schema_failure"]);

function locateCommand(name, envName) {
  if (process.env[envName]) return process.env[envName];
  try {
    return execFileSync("where.exe", [name], { encoding: "utf8", windowsHide: true })
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(Boolean) || name;
  } catch {
    return name;
  }
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/[\r\n&|<>^]/.test(text)) throw new Error("执行器参数包含不安全的 shell 字符");
  return `"${text.replaceAll('"', '""')}"`;
}

function spawnPortable(command, args, options = {}) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const commandLine = [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ");
    return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], { ...options, windowsHide: true });
  }
  return spawn(command, args, { ...options, windowsHide: true });
}

async function runProcess(command, args, { cwd, timeoutMs, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnPortable(command, args, { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill();
      const error = new Error(`执行超时（${timeoutMs}ms）`);
      error.failureCode = "timeout";
      reject(error);
    }, timeoutMs);
    const abort = () => child.kill();
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      error.failureCode = error.code === "ENOENT" ? "unavailable" : "process_error";
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (settled) return;
      settled = true;
      const output = Buffer.concat(stdout).toString("utf8");
      const errorText = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        const error = new Error(errorText.trim() || `执行器退出码 ${code}`);
        error.failureCode = /model|provider|unavailable|not found/i.test(error.message) ? "unavailable" : "process_error";
        error.stdout = output;
        reject(error);
        return;
      }
      resolve({ stdout: output, stderr: errorText, exitCode: code });
    });
  });
}

function extractOpenCodeText(raw) {
  const lines = String(raw).split(/\r?\n/).filter(Boolean);
  const values = [];
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const text = event.text || event.content?.text || event.part?.text || event.message?.content;
      if (typeof text === "string") values.push(text);
    } catch {
      // Preserve non-JSON output as a last resort for forward compatibility.
    }
  }
  return values.at(-1) || String(raw).trim();
}

async function writeTaskFile(job, workspace) {
  const root = path.join(PATHS.runtimeRoot, "executor-tasks");
  await fs.mkdir(root, { recursive: true });
  const file = path.join(root, `${job.id}.md`);
  const instructions = [
    `# Syno Job ${job.id}`,
    "",
    `Profile: ${job.profile}`,
    `Allowed roots: ${(job.decision.allowedRoots || []).join(", ") || "read-only"}`,
    `Workspace: ${workspace}`,
    "",
    "遵守仓库 AGENTS.md。不得改变 Policy、扩大路径范围、提交或 Push。",
    "只完成下面请求，并在最终响应中给出结构化结果和实际 changed_paths。",
    "",
    "## Request",
    "",
    String(job.request.text || job.request.message || JSON.stringify(job.request)),
    "",
  ].join("\n");
  await fs.writeFile(file, instructions, "utf8");
  return file;
}

class FakeExecutor {
  constructor({ responder = async (job) => ({ text: `fake:${job.id}`, changedPaths: [] }) } = {}) {
    this.responder = responder;
    this.runs = new Map();
  }
  async submit(job) {
    const runId = `fake-${job.id}`;
    const result = await this.responder(job);
    this.runs.set(runId, { status: "completed", result });
    return { runId, executor: "fake", ...result };
  }
  inspect(runId) { return this.runs.get(runId) || null; }
  cancel(runId) { return this.runs.delete(runId); }
}

class OpenCodeExecutor {
  constructor({ models = DEFAULT_MODELS, timeoutMs = 300_000, command } = {}) {
    this.models = [...models];
    this.timeoutMs = timeoutMs;
    this.command = command || locateCommand("opencode", "OPENCODE_CMD");
    this.controllers = new Map();
  }

  async submit(job, { workspace = PATHS.repoRoot } = {}) {
    const taskFile = await writeTaskFile(job, workspace);
    const failures = [];
    for (const model of this.models) {
      const controller = new AbortController();
      const runId = `opencode-${job.id}-${model.split("/").at(-1)}`;
      this.controllers.set(runId, controller);
      try {
        const result = await runProcess(this.command, [
          "run", "--format", "json", "--model", model, "--dir", workspace,
          `读取并执行任务文件：${taskFile}`,
        ], { cwd: workspace, timeoutMs: this.timeoutMs, signal: controller.signal });
        const text = extractOpenCodeText(result.stdout);
        if (job.request.expectsJson) {
          try { JSON.parse(text); } catch {
            const error = new Error("OpenCode 返回了无效 JSON");
            error.failureCode = "invalid_json";
            throw error;
          }
        }
        return { runId, executor: "opencode", model, text, stderr: result.stderr, failures };
      } catch (error) {
        const code = error.failureCode || "process_error";
        failures.push({ model, code, message: error.message });
        if (!FALLBACK_CODES.has(code)) throw Object.assign(error, { failures });
      } finally {
        this.controllers.delete(runId);
      }
    }
    const error = new Error("全部 OpenCode 模型均失败");
    error.failureCode = "all_models_failed";
    error.failures = failures;
    throw error;
  }

  inspect(runId) { return this.controllers.has(runId) ? { status: "running" } : null; }
  cancel(runId) { return this.controllers.get(runId)?.abort() ?? false; }
}

class ClaudeExecutor {
  constructor({ timeoutMs = 600_000, command } = {}) {
    this.timeoutMs = timeoutMs;
    this.command = command || locateCommand("claude", "CLAUDE_CMD");
    this.controllers = new Map();
  }
  async submit(job, { workspace = PATHS.repoRoot } = {}) {
    const taskFile = await writeTaskFile(job, workspace);
    const runId = `claude-${job.id}`;
    const controller = new AbortController();
    this.controllers.set(runId, controller);
    try {
      const result = await runProcess(this.command, [
        "-p", `读取并执行任务文件：${taskFile}`,
        "--output-format", "json",
        "--allowedTools", "Read,Glob,Grep,Edit,Write,Bash",
      ], { cwd: workspace, timeoutMs: this.timeoutMs, signal: controller.signal });
      let text = result.stdout.trim();
      try {
        const parsed = JSON.parse(text);
        text = parsed.result || parsed.text || text;
      } catch {
        // Claude output formats may evolve; raw successful output remains useful.
      }
      return { runId, executor: "claude", text, stderr: result.stderr };
    } finally {
      this.controllers.delete(runId);
    }
  }
  inspect(runId) { return this.controllers.has(runId) ? { status: "running" } : null; }
  cancel(runId) { return this.controllers.get(runId)?.abort() ?? false; }
}

class ExecutorRouter {
  constructor({ opencode, claude, fake, mode = process.env.SYNO_EXECUTOR || "auto" } = {}) {
    this.adapters = {
      opencode: opencode || new OpenCodeExecutor(),
      claude: claude || new ClaudeExecutor(),
      fake: fake || new FakeExecutor(),
    };
    this.mode = mode;
  }
  async submit(job, options) {
    if (this.mode === "fake") return this.adapters.fake.submit(job, options);
    if (job.decision.executor === "claude") return this.adapters.claude.submit(job, options);
    try {
      return await this.adapters.opencode.submit(job, options);
    } catch (error) {
      if (error.failureCode !== "all_models_failed") throw error;
      const result = await this.adapters.claude.submit(job, options);
      return { ...result, escalatedFrom: "opencode", opencodeFailures: error.failures };
    }
  }
  inspect(runId) {
    return Object.values(this.adapters).map((adapter) => adapter.inspect(runId)).find(Boolean) || null;
  }
  cancel(runId) {
    return Object.values(this.adapters).some((adapter) => adapter.cancel(runId));
  }
}

export {
  DEFAULT_MODELS,
  ClaudeExecutor,
  ExecutorRouter,
  FakeExecutor,
  OpenCodeExecutor,
  extractOpenCodeText,
  locateCommand,
  runProcess,
};
