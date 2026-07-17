import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const EXPECTED_COMMIT = "0f102fa4dc04b7dfdab048169aaaa640d09d7523";
const sourceIndex = process.argv.indexOf("--source");
const pythonIndex = process.argv.indexOf("--python");
const depsIndex = process.argv.indexOf("--deps");
const sourceRoot = path.resolve(sourceIndex >= 0 ? process.argv[sourceIndex + 1] || "" : process.env.HERMES_SOURCE_ROOT || "");
const python = pythonIndex >= 0 ? process.argv[pythonIndex + 1] : process.env.SYNO_HERMES_PYTHON || "python";
const probeDependencies = depsIndex >= 0 ? path.resolve(process.argv[depsIndex + 1] || "") : process.env.HERMES_PROBE_DEPS;
if (!sourceRoot) throw new Error("需要 --source <Hermes 源码根目录>");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error([stderr, stdout].filter(Boolean).join("\n") || `退出码 ${code}`), { code })));
  });
}

await fs.access(path.join(sourceRoot, "run_agent.py"));
const revision = (await run("git", ["-C", sourceRoot, "rev-parse", "HEAD"])).stdout.trim();
if (revision !== EXPECTED_COMMIT) throw new Error(`Hermes commit 不匹配：${revision}`);
const probe = path.resolve(import.meta.dirname, "spikes", "hermes-capability-probe.py");
const isolationRoot = path.join(process.env.TEMP || process.env.TMP || ".runtime", "syno-hermes-probe-home");
const result = await run(python, [probe], {
  cwd: process.env.TEMP || process.cwd(),
  env: {
    PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, TEMP: process.env.TEMP, TMP: process.env.TMP,
    PYTHONDONTWRITEBYTECODE: "1", HERMES_YOLO_MODE: "0", HERMES_SOURCE_ROOT: sourceRoot, HERMES_HOME: isolationRoot,
    ...(probeDependencies ? { PYTHONPATH: probeDependencies } : {}),
  },
});
const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const report = JSON.parse(lines.at(-1));
if (!report.ok) throw new Error("Hermes 能力探针未通过");
console.log(JSON.stringify({ ...report, commit: revision, sourceRoot, isolationRoot }, null, 2));
