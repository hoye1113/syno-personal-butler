/**
 * Syno-owned launch adapter for the DSH JSON-RPC sidecar.
 *
 * The published demo bin hard-codes its own module URL as the closed-runtime
 * base. Syno instead reuses the existing DSH runner and points it at the
 * built bundle base, where the complete official plugin closure lives. This
 * file is only a launch seam; it does not vendor or modify deepseek-harness.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const dshRoot = path.resolve(String(process.env.SYNO_DSH_ROOT || "").trim());
if (!String(process.env.SYNO_DSH_ROOT || "").trim()) {
  throw new Error("HARNESS_SETUP_REQUIRED: SYNO_DSH_ROOT is required for the DSH JSON-RPC adapter");
}

const runnerPath = path.join(dshRoot, "packages", "examples", "jsonrpc-demo", "src", "runner.ts");
const configuredBase = String(process.env.SYNO_DSH_JSONRPC_BASE || "").trim();
const baseEntry = configuredBase
  ? path.resolve(configuredBase)
  : path.join(dshRoot, "packages", "bundle", "base", "lib", "index.js");
if (!existsSync(runnerPath) || !existsSync(baseEntry)) {
  throw new Error("HARNESS_RUNTIME_CLOSURE_UNAVAILABLE: DSH runner or bundle base is missing");
}

const { runJsonrpcAgent } = await import(pathToFileURL(runnerPath).href);
if (typeof runJsonrpcAgent !== "function") {
  throw new Error("HARNESS_RUNTIME_CLOSURE_UNAVAILABLE: DSH runner does not export runJsonrpcAgent");
}

await runJsonrpcAgent(pathToFileURL(baseEntry).href);
