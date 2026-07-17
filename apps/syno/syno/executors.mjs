import { spawn, execFile, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import { PATHS, resolveInside } from "./paths.mjs";

const DEFAULT_MODELS = Object.freeze([
  "opencode/mimo-v2.5-free",
  "opencode/hy3-free",
  "opencode/deepseek-v4-flash-free",
]);
const FALLBACK_CODES = new Set(["timeout", "unavailable", "invalid_json", "schema_failure"]);
const PROFILE_READ_ROOTS = Object.freeze({
  "syno-read": ["vault", "ops", "contracts", "config", "docs", "AGENTS.md", "README.md"],
  "syno-ops": ["vault", "ops", "contracts", "config", "docs", "AGENTS.md", "README.md"],
  "syno-curate": ["vault", "ops", "contracts", "config", "docs", "AGENTS.md", "README.md"],
  "syno-code": ["apps", "contracts", "config", "docs", "scripts", "tests", "AGENTS.md", "README.md", "package.json"],
});

function locateCommand(name, envName) {
  if (process.env[envName]) return process.env[envName];
  try {
    const matches = execFileSync("where.exe", [name], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const located = matches.find((item) => /\.(?:cmd|exe|bat|com)$/i.test(item)) || matches[0];
    if (located) return located;
  } catch {}
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Local") : "");
    const candidates = base ? [
      path.join(base, "mise", "shims", `${name}.cmd`),
      path.join(base, "mise", "shims", name),
    ] : [];
    const candidate = candidates.find((item) => existsSync(item));
    if (candidate) return candidate;
  }
  return name;
}

function quoteCmdArg(value) {
  const text = String(value);
  if (/[\r\n&|<>^]/.test(text)) throw new Error("执行器参数包含不安全的 shell 字符");
  return `"${text.replaceAll('"', '""')}"`;
}

function spawnPortable(command, args, options = {}) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const commandLine = `"${[quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ")}"`;
    return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], {
      ...options,
      windowsHide: true,
      // cmd.exe must receive the conventional outer quote pair unchanged. Without
      // this flag Node quotes the /c payload again and paths containing spaces fail.
      windowsVerbatimArguments: true,
    });
  }
  return spawn(command, args, { ...options, windowsHide: true });
}

async function runProcess(command, args, { cwd, timeoutMs, signal, env = process.env, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnPortable(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    let settled = false;
    let terminationError = null;
    let terminating = false;
    const terminate = (error) => {
      if (settled || terminating) return;
      terminating = true;
      terminationError = error;
      terminateProcessTree(child).catch(() => child.kill());
    };
    const timer = setTimeout(() => {
      const error = new Error(`执行超时（${timeoutMs}ms）`);
      error.failureCode = "timeout";
      terminate(error);
    }, timeoutMs);
    const abort = () => {
      const error = new Error("执行已取消");
      error.failureCode = "canceled";
      terminate(error);
    };
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (terminationError) {
        reject(terminationError);
        return;
      }
      error.failureCode = error.code === "ENOENT" ? "unavailable" : "process_error";
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (settled) return;
      settled = true;
      if (terminationError) {
        reject(terminationError);
        return;
      }
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

async function terminateProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform !== "win32") {
    child.kill("SIGTERM");
    return;
  }
  await new Promise((resolve) => {
    execFile("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
}

function executorEnvironment(extra = {}) {
  const allowed = [
    "PATH", "Path", "PATHEXT", "SystemRoot", "WINDIR", "ComSpec", "TEMP", "TMP",
    "USERPROFILE", "LOCALAPPDATA", "APPDATA", "HOMEDRIVE", "HOMEPATH", "HOME",
    "LANG", "LC_ALL", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "SSL_CERT_FILE",
  ];
  const env = {};
  for (const key of allowed) if (process.env[key] !== undefined) env[key] = process.env[key];
  return { ...env, ...extra };
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

function buildTaskPrompt(job, workspace) {
  return [
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
}

async function writeTaskFile(job, workspace) {
  const root = path.join(PATHS.runtimeRoot, "executor-tasks");
  await fs.mkdir(root, { recursive: true });
  const file = path.join(root, `${job.id}.md`);
  const instructions = buildTaskPrompt(job, workspace);
  await fs.writeFile(file, instructions, "utf8");
  return { file, instructions };
}

function permissionPaths(items, { defaultRule = "deny" } = {}) {
  const rules = { "*": defaultRule };
  for (const item of items || []) {
    rules[item] = "allow";
    if (!path.extname(item)) rules[`${item}/**`] = "allow";
  }
  return rules;
}

function profileReadItems(job) {
  const items = [...(PROFILE_READ_ROOTS[job.profile] || [])];
  if (job.request?.attachment) {
    try {
      items.push(resolveInside(path.join(PATHS.runtimeRoot, "uploads"), job.request.attachment));
    } catch {
      // Arbitrary request paths never become executor capabilities.
    }
  }
  return items;
}

function openCodeProfileConfig(job, { runtimeReadPaths = [] } = {}) {
  const readRoots = [...profileReadItems(job), ...runtimeReadPaths];
  const writeRoots = job.decision.allowedRoots || [];
  const externalReadPaths = readRoots.filter((item) => path.isAbsolute(item));
  return {
    $schema: "https://opencode.ai/config.json",
    permission: {
      "*": "deny",
      read: permissionPaths(readRoots),
      glob: permissionPaths(readRoots),
      grep: permissionPaths(readRoots),
      list: permissionPaths(readRoots),
      edit: permissionPaths(writeRoots),
      bash: "deny",
      external_directory: externalReadPaths.length ? permissionPaths(externalReadPaths) : "deny",
      task: "deny",
      skill: "deny",
      webfetch: "deny",
      websearch: "deny",
      question: "deny",
    },
  };
}

function claudeProfileTools(job) {
  const readRoots = profileReadItems(job);
  const writeRoots = job.decision.allowedRoots || [];
  const allowed = [
    ...readRoots.map((root) => `Read(${root}${path.extname(root) ? "" : "/**"})`),
    ...writeRoots.map((root) => `Edit(${root}/**)`),
    ...writeRoots.map((root) => `Write(${root}/**)`),
  ];
  const disallowed = [
    "Bash(git commit:*)", "Bash(git push:*)", "Bash(git reset:*)", "Bash(git clean:*)",
    "Read(../**)", "Read(~/**)", "Read(//**)", "Edit(../**)", "Edit(~/**)", "Edit(//**)",
    "WebFetch", "WebSearch", "Task",
  ];
  disallowed.unshift("Bash");
  if (!writeRoots.length) disallowed.unshift("Edit", "Write");
  const available = ["Read", "Glob", "Grep"];
  if (writeRoots.length) available.push("Edit", "Write");
  const externalDirs = [...new Set(readRoots.filter((item) => path.isAbsolute(item)).map((item) => path.extname(item) ? path.dirname(item) : item))];
  return { allowed, disallowed, available, externalDirs };
}

function buildClaudeArgs(job) {
  const tools = claudeProfileTools(job);
  return [
    "-p",
    "--safe-mode",
    "--no-chrome",
    "--disable-slash-commands",
    "--no-session-persistence",
    "--permission-mode", "dontAsk",
    "--strict-mcp-config",
    "--mcp-config", JSON.stringify({ mcpServers: {} }),
    "--tools", tools.available.join(","),
    "--output-format", "json",
    "--allowedTools", tools.allowed.join(","),
    "--disallowedTools", tools.disallowed.join(","),
    ...tools.externalDirs.flatMap((directory) => ["--add-dir", directory]),
  ];
}

class FakeExecutor {
  constructor({ responder = async (job) => ({ text: `fake:${job.id}`, changedPaths: [] }) } = {}) {
    this.responder = responder;
    this.runs = new Map();
  }
  async submit(job, options = {}) {
    const runId = `fake-${job.id}`;
    this.runs.set(runId, { status: "running" });
    await options.onStart?.(runId);
    const result = await this.responder(job);
    const response = { runId, executor: "fake", ...result };
    if (options.validate) response.validation = await options.validate(response);
    this.runs.set(runId, { status: "completed", result: response });
    return response;
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

  async submit(job, { workspace = PATHS.repoRoot, onStart, validate, onRetry } = {}) {
    const task = await writeTaskFile(job, workspace);
    const env = executorEnvironment({
      OPENCODE_CONFIG_CONTENT: JSON.stringify(openCodeProfileConfig(job, { runtimeReadPaths: [task.file] })),
    });
    const failures = [];
    for (const model of this.models) {
      const controller = new AbortController();
      const runId = `opencode-${job.id}-${model.split("/").at(-1)}`;
      this.controllers.set(runId, controller);
      try {
        await onStart?.(runId);
        const result = await runProcess(this.command, [
          // OpenCode declares --file as an array option, so the positional message
          // must precede it or yargs consumes the message as another file path.
          "run", "Follow the attached Syno job instructions. Return only the requested result.",
          "--pure",
          "--format", "json", "--model", model, "--dir", workspace,
          "--file", task.file,
        ], { cwd: workspace, timeoutMs: this.timeoutMs, signal: controller.signal, env });
        const text = extractOpenCodeText(result.stdout);
        if (job.request.expectsJson) {
          try { JSON.parse(text); } catch {
            const error = new Error("OpenCode 返回了无效 JSON");
            error.failureCode = "invalid_json";
            throw error;
          }
        }
        const response = { runId, executor: "opencode", model, text, stderr: result.stderr, failures };
        if (validate) response.validation = await validate(response);
        return response;
      } catch (error) {
        const code = error.failureCode || (error.code === "CONTRACT_VALIDATION_FAILED" ? "schema_failure" : "process_error");
        error.failureCode = code;
        failures.push({ model, code, message: error.message });
        if (!FALLBACK_CODES.has(code)) throw Object.assign(error, { failures });
        await onRetry?.({ model, code, error });
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
  async submit(job, { workspace = PATHS.repoRoot, onStart, validate } = {}) {
    const task = await writeTaskFile(job, workspace);
    const runId = `claude-${job.id}`;
    const controller = new AbortController();
    this.controllers.set(runId, controller);
    try {
      await onStart?.(runId);
      const result = await runProcess(this.command, buildClaudeArgs(job), {
        cwd: workspace, timeoutMs: this.timeoutMs, signal: controller.signal, input: task.instructions, env: executorEnvironment(),
      });
      let text = result.stdout.trim();
      try {
        const parsed = JSON.parse(text);
        text = parsed.result || parsed.text || text;
      } catch {
        // Claude output formats may evolve; raw successful output remains useful.
      }
      const response = { runId, executor: "claude", text, stderr: result.stderr };
      if (validate) response.validation = await validate(response);
      return response;
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
  executorEnvironment,
  locateCommand,
  buildTaskPrompt,
  buildClaudeArgs,
  claudeProfileTools,
  openCodeProfileConfig,
  runProcess,
  terminateProcessTree,
};
