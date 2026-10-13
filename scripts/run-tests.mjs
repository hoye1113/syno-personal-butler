import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = readdirSync(path.join(root, "tests")).filter((name) => name.endsWith(".test.mjs")).sort().map((name) => path.join(root, "tests", name));
const child = spawn(process.execPath, [
  "--import", new URL("../tests/support/test-environment.mjs", import.meta.url).href,
  "--test", "--test-timeout=180000", "--test-concurrency=1",
  ...process.argv.slice(2), ...files,
], { cwd: root, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
