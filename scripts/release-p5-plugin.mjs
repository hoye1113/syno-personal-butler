#!/usr/bin/env node
import path from "node:path";

import {
  approveP5Plugin,
  canaryP5Plugin,
  discardP5Canary,
  rollbackP5Plugin,
} from "../packages/syno-core/plugin-canary.mjs";
import { releaseP5Plugin } from "../packages/syno-core/plugin-release.mjs";
import { DEFAULT_P5_PLUGIN_REGISTRY } from "../packages/syno-core/plugin-version.mjs";

function parse(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const key = value.slice(2);
    if (["canary", "approve", "rollback", "discard", "no-activate", "auto"].includes(key)) args[key] = true;
    else {
      args[key] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

const args = parse(process.argv.slice(2));
const registryFile = args.registry || DEFAULT_P5_PLUGIN_REGISTRY;
const canaryFile = args["canary-file"] || path.join(path.dirname(registryFile), "canary.json");
const repoRoot = path.resolve(import.meta.dirname, "..");
const worktreeRoot = path.join(repoRoot, ".worktrees");

if (args.rollback) {
  console.log(JSON.stringify(await rollbackP5Plugin({
    registryFile,
    expectedVersion: args.version || null,
    expectedSha256: args.sha256 || null,
  }), null, 2));
} else if (args.discard) {
  console.log(JSON.stringify(await discardP5Canary({ canaryFile, repoRoot, worktreeRoot }), null, 2));
} else if (args.approve) {
  console.log(JSON.stringify(await approveP5Plugin({
    canaryFile,
    registryFile,
    repoRoot,
    worktreeRoot,
    activate: args["no-activate"] !== true,
    expectedVersion: args.version || null,
    expectedCommit: args.commit || null,
  }), null, 2));
} else if (args.canary) {
  const sourceDir = args.source || args._[0];
  if (!sourceDir) {
    console.error("用法：node scripts/release-p5-plugin.mjs --canary --source <plugin-version-dir> [--p5-home DIR] [--max-items 50]");
    process.exit(2);
  }
  console.log(JSON.stringify(await canaryP5Plugin({
    sourceDir: path.resolve(sourceDir),
    version: args.version || null,
    repoRoot,
    worktreeRoot,
    canaryFile,
    registryFile,
    p5Home: args["p5-home"] || process.env.P5_RADAR_HOME || "",
    maxItems: Number(args["max-items"]) || 50,
  }), null, 2));
} else {
  const sourceDir = args.source || args._[0];
  if (!sourceDir) {
    console.error("用法：--source <dir> [--auto|--no-activate]；--canary；--approve --version <version> --commit <sha>；--rollback --version <version> --sha256 <hash>");
    process.exit(2);
  }
  console.log(JSON.stringify(await releaseP5Plugin({
    sourceDir: path.resolve(sourceDir),
    version: args.version || null,
    repoRoot,
    worktreeRoot,
    registryFile,
    activate: args["no-activate"] !== true,
  }), null, 2));
}
