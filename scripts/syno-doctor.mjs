import path from "node:path";
import { fileURLToPath } from "node:url";

import { PATHS } from "../apps/syno/syno/paths.mjs";
import { removeConfirmedStaleProcessLock } from "../apps/syno/syno/process-lock.mjs";

async function doctor() {
  const lockFile = path.join(PATHS.stateRoot, "locks", "syno-host.lock");
  const result = await removeConfirmedStaleProcessLock(lockFile);
  return {
    ok: ["absent", "stale_removed"].includes(result.status),
    hostLock: {
      status: result.status,
      removed: result.removed === true,
      ...(result.owner ? { owner: result.owner } : {}),
    },
  };
}

async function main() {
  const result = await doctor();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

export { doctor, main };
