import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

function defaultAuthFile() {
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "opencode", "auth.json");
}

// Host-only: read the Zen / OpenCode account key. Never log the value; never
// inject it into the Harness child environment (see harnessChildEnvironment).
async function defaultOpencodeZenKeyLoader({ authFile } = {}) {
  const fromEnv = String(process.env.SYNO_OPENCODE_API_KEY || process.env.OPENCODE_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const file = authFile || defaultAuthFile();
  try {
    const entry = JSON.parse(await fs.readFile(file, "utf8"))?.opencode;
    return typeof entry?.key === "string" ? entry.key : "";
  } catch {
    return "";
  }
}

export { defaultAuthFile, defaultOpencodeZenKeyLoader };
