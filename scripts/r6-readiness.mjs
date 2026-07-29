import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const acceptanceFile = path.join(root, "ops", "acceptance", "pr-10-r6-seal", "owner-acceptance.json");

async function readAcceptance(file = acceptanceFile) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function gitClean(repoRoot = root) {
  const result = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoRoot, windowsHide: true });
  return String(result.stdout || "").trim() === "";
}

async function assessR6Readiness({ acceptance = null, repoRoot = root, clean = null } = {}) {
  const record = acceptance || await readAcceptance();
  const checks = Array.isArray(record.checks) ? record.checks : [];
  const ownerPassed = record.status === "owner_passed"
    && record.performedBy === "owner"
    && record.result === "passed"
    && checks.length > 0
    && checks.every((check) => check.performedBy === "owner" && check.result === "passed" && String(check.evidenceRef || "").length > 0);
  const workspaceClean = clean === null ? await gitClean(repoRoot) : clean === true;
  const blockers = [];
  if (!ownerPassed) blockers.push("OWNER_ACCEPTANCE_PENDING");
  if (!workspaceClean) blockers.push("WORKTREE_NOT_CLEAN");
  return {
    ready: blockers.length === 0,
    ownerPassed,
    workspaceClean,
    legacyCleanup: blockers.length === 0 ? "authorized_by_gates" : "blocked",
    blockers,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"))) {
  assessR6Readiness().then((report) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ready) process.exitCode = 1;
  }).catch((error) => {
    process.stderr.write(`${error.code || "R6_READINESS_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { assessR6Readiness, readAcceptance };
