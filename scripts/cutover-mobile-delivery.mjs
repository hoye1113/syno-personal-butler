import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AcceptedRequestStore } from "../apps/syno/syno/accepted-request-store.mjs";
import { MobileDeliveryMode } from "../apps/syno/syno/mobile-delivery-mode.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const acceptanceFile = path.join(root, "ops", "acceptance", "pr-10-r6-seal", "owner-acceptance.json");
const terminalStatuses = new Set(["delivered", "canceled", "failed_terminal"]);

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

async function readAcceptance(file = acceptanceFile) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function assertOwnerAcceptance(record) {
  const checks = Array.isArray(record?.checks) ? record.checks : [];
  if (record?.status !== "owner_passed"
    || record?.performedBy !== "owner"
    || record?.result !== "passed"
    || checks.length === 0
    || checks.some((check) => check?.performedBy !== "owner" || check?.result !== "passed" || !String(check?.evidenceRef || "").trim())) {
    throw Object.assign(new Error("R6 Owner 验收尚未全部通过"), { code: "OWNER_ACCEPTANCE_PENDING" });
  }
}

async function runCutover({
  confirm = hasFlag("--confirm"),
  ingressFrozen = hasFlag("--ingress-frozen"),
  acceptance = null,
  store = new AcceptedRequestStore(),
  mode = new MobileDeliveryMode(),
} = {}) {
  const ownerAcceptance = acceptance || await readAcceptance();
  assertOwnerAcceptance(ownerAcceptance);
  if (!ingressFrozen) throw Object.assign(new Error("切换 v2 前必须显式声明 ingress 已冻结"), { code: "INGRESS_NOT_FROZEN" });
  await mode.load();
  const records = await store.list({ ownerKey: "local-user", limit: 1000 });
  const legacyNonTerminal = records.filter((record) => !terminalStatuses.has(record.status)).length;
  const report = { modeBefore: mode.current(), legacyNonTerminal, confirmed: confirm };
  if (legacyNonTerminal !== 0) {
    throw Object.assign(new Error(`仍有 ${legacyNonTerminal} 条 legacy AcceptedRequest 未进入终态`), {
      code: "LEGACY_NON_TERMINAL_REQUESTS",
      report,
    });
  }
  if (!confirm) return { ...report, modeAfter: report.modeBefore, status: "preview_only" };
  const snapshot = await mode.commit("v2", {
    ownerAcceptance: true,
    ingressFrozen: true,
    legacyNonTerminal,
    evidenceRef: "ops/acceptance/pr-10-r6-seal/owner-acceptance.json",
  });
  return { ...report, modeAfter: snapshot.mode, status: "persisted" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runCutover()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.code || "MOBILE_DELIVERY_CUTOVER_FAILED"}: ${error.message}\n`);
      process.exitCode = 1;
    });
}

export { assertOwnerAcceptance, readAcceptance, runCutover };
