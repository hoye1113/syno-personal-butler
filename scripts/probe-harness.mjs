import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { DeepSeekHarnessJsonRpcClient } from "../apps/syno/syno/deepseek-harness-jsonrpc-client.mjs";
import { resolveHarnessLaunch } from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";

const FAKE_AGENT = path.join(PATHS.repoRoot, "tests", "support", "fake-dsh-jsonrpc-agent.mjs");

async function probeFake() {
  const child = spawn(process.execPath, [FAKE_AGENT], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const client = new DeepSeekHarnessJsonRpcClient({
    stdin: child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
    pid: child.pid,
    kill: () => child.kill(),
    initializeTimeoutMs: 5_000,
    requestTimeoutMs: 5_000,
  });
  try {
    await client.initialize({
      cwd: PATHS.repoRoot,
      provider: "deepseek-official",
      model: "deepseek-v4-flash",
    });
    const turn = await client.runTurn("probe-zh", [{ type: "text", text: "你好，管家" }]);
    return {
      ok: turn.finalResponse === "echo:你好，管家",
      mode: "fake",
      utf8: turn.finalResponse === "echo:你好，管家",
      protocol: ["initialize", "session/prompt", "idle"],
    };
  } finally {
    await client.close();
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function probeReal() {
  const launch = await resolveHarnessLaunch({ fakeAgent: "" });
  if (launch.bootable !== true) {
    return {
      ok: false,
      mode: "real",
      code: "HARNESS_SETUP_REQUIRED",
      kind: launch.kind,
      dshRoot: launch.dshRoot,
      message: "deepseek-harness 尚未安装依赖；真实 sidecar 无法启动",
    };
  }
  return {
    ok: false,
    mode: "real",
    code: "HARNESS_REAL_PROBE_SKIPPED",
    kind: launch.kind,
    dshRoot: launch.dshRoot,
    message: "真实 sidecar 需要完整 Syno Host / Tool Bridge；请设置 SYNO_COGNITIVE_RUNTIME=deepseek-harness 后启动 Host",
  };
}

async function main(argv = process.argv.slice(2)) {
  const real = argv.includes("--real");
  const result = real ? await probeReal() : await probeFake();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.ok !== true) process.exitCode = 1;
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.code || "HARNESS_PROBE_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { main, probeFake, probeReal };
