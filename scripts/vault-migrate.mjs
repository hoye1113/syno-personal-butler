#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VaultMigrationService } from "../apps/syno/syno/vault-migration-service.mjs";

const DEFAULT_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const values = argv.filter((item) => item !== "--");
  const command = values.shift() || "";
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith("--") || index + 1 >= values.length) throw new Error(`参数无效：${key}`);
    options[key.slice(2)] = values[index + 1];
    index += 1;
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(options.repo || DEFAULT_REPO);
  const service = new VaultMigrationService({ repoRoot, runtimeRoot: path.join(repoRoot, ".runtime", "migrations") });
  if (command === "inventory") {
    if (!options.source) throw new Error("inventory 必须提供 --source");
    const manifest = await service.inventory({ sourceRoot: options.source });
    process.stdout.write(`${JSON.stringify({ id: manifest.id, digest: manifest.digest, summary: manifest.summary, source: { gitHead: manifest.source.gitHead, gitDirty: manifest.source.gitDirty, dirtyEntries: manifest.source.dirtyEntries } }, null, 2)}\n`);
    return;
  }
  if (command === "preview") {
    if (!options.id) throw new Error("preview 必须提供 --id");
    process.stdout.write(`${JSON.stringify(await service.preview(options.id), null, 2)}\n`);
    return;
  }
  if (command === "submit") {
    if (!options.id || !new Set(["content", "integration"]).has(options.phase)) throw new Error("submit 必须提供 --id 和 --phase content|integration");
    const baseUrl = "http://127.0.0.1:4317";
    const response = await fetch(`${baseUrl}/api/syno/migrations/${encodeURIComponent(options.id)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ phase: options.phase }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Syno 返回 HTTP ${response.status}`);
    process.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
    return;
  }
  throw new Error("用法：vault:migrate -- inventory --source <path> | preview --id <id> | submit --id <id> --phase content|integration");
}

main().catch((error) => {
  process.stderr.write(`${error.code ? `${error.code}: ` : ""}${error.message}\n`);
  process.exitCode = 1;
});
