import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// 真实 DSH smoke：scratch profile + 真实模型。三类场景：
//   默认（知识三轮）/ SYNO_CHAT_TOOLS=plugin（canonical 名）/ SYNO_WEIXIN_SPIKE=1（fake 通道往返）。
// 生产行为不受影响：使用独立 DSH_HOME / workspace / runtime / localData。

const SYNO_ROOT = path.resolve(import.meta.dirname, "..");
const DSH_ROOT = String(process.env.SYNO_DSH_ROOT || "").trim();
if (!DSH_ROOT) {
  console.error("spike:capabilities 需要 SYNO_DSH_ROOT 指向已构建（pnpm run build）的 deepseek-harness clone");
  process.exit(2);
}

const SCRATCH = path.resolve(process.env.SPIKE_SCRATCH || path.join(os.tmpdir(), "syno-dsh-spike"));
const homeRoot = path.join(SCRATCH, "home");
const workspaceRoot = path.join(SCRATCH, "workspace");
const sessionRoot = path.join(SCRATCH, "sessions");
for (const dir of [homeRoot, workspaceRoot, sessionRoot]) mkdirSync(dir, { recursive: true });

const profile = await import(pathToFileURL(path.join(SYNO_ROOT, "apps", "syno", "syno", "syno-dsh-profile.mjs")).href);
await profile.ensureSynoDshProfiles({ homeRoot, repoRoot: SYNO_ROOT });

const keyLoader = await import(pathToFileURL(path.join(SYNO_ROOT, "apps", "syno", "syno", "deepseek-key-loader.mjs")).href);
const apiKey = process.env.DEEPSEEK_API_KEY || (await keyLoader.defaultDeepseekKeyLoader({}));
if (!apiKey) {
  console.error("spike:capabilities 未找到 DeepSeek key（DEEPSEEK_API_KEY 或 opencode auth.json）");
  process.exit(2);
}

const port = Number(process.env.SPIKE_PORT || 3211);
const patchFile = path.join(SYNO_ROOT, "packages", "syno-dsh-plugin", "spike.patch.yml");
const args = [
  "--import", "tsx/esm",
  "apps/cli/src/bin.ts",
  "--profile", "syno",
  "--patch", patchFile,
  "--host", "127.0.0.1",
  "--port", String(port),
  "--no-open",
];

const env = {
  ...process.env,
  DSH_HOME: homeRoot,
  DSH_CWD: workspaceRoot,
  DSH_SESSION_ROOT: sessionRoot,
  DSH_SYSTEM_PROMPT: "You are Syno.",
  SYNO_SKILL_ROOT: path.join(SYNO_ROOT, "config", "skills"),
  SYNO_CAPABILITIES_SPIKE: "1",
  SYNO_CAPABILITIES_TOOLS: "1",
  SYNO_RUNTIME_ROOT: path.join(SCRATCH, "runtime"),
  SYNO_LOCAL_DATA: path.join(SCRATCH, "localdata"),
  ...(process.env.SYNO_CHAT_TOOLS ? { SYNO_CHAT_TOOLS: process.env.SYNO_CHAT_TOOLS } : {}),
  ...(process.env.SYNO_WEIXIN_SPIKE ? { SYNO_WEIXIN_SPIKE: process.env.SYNO_WEIXIN_SPIKE } : {}),
  DEEPSEEK_API_KEY: apiKey,
};
delete env.SYNO_KNOWLEDGE_ROOT;

console.log(`spike:capabilities 启动 dsh（port=${port}, home=${homeRoot}, mode=${process.env.SYNO_WEIXIN_SPIKE === "1" ? "weixin" : process.env.SYNO_CHAT_TOOLS === "plugin" ? "plugin" : "default"}）`);
const child = spawn(process.execPath, args, { cwd: DSH_ROOT, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let out = "";
child.stdout.on("data", (data) => { out += String(data); process.stdout.write(data); });
child.stderr.on("data", (data) => { out += String(data); process.stderr.write(data); });

const timer = setTimeout(() => {
  console.error("spike:capabilities 全局超时，终止子进程");
  child.kill();
}, 240_000);
child.on("exit", (code, signal) => {
  clearTimeout(timer);
  const ok = out.includes("SPIKE_A_OK") || out.includes("WEIXIN_SPIKE_OK");
  const failLine = out.split(/\r?\n/).find((line) => line.includes("SPIKE_A_FAIL") || line.includes("WEIXIN_SPIKE_FAIL"));
  console.log(`spike:capabilities exit code=${code} signal=${signal} ok=${ok}`);
  if (failLine) console.log(failLine);
  process.exit(ok && code === 0 ? 0 : 1);
});
