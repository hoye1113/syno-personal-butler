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
      model: "deepseek-v4-flash-vision-exp",
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
    ok: true,
    mode: "real",
    stage: "discovery",
    complete: false,
    kind: launch.kind,
    dshRoot: launch.dshRoot,
    message: "真实 Harness 构建产物已发现；完整 sidecar / Tool Bridge 由 Syno Host 启动验收，不在此探针内执行模型调用",
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
