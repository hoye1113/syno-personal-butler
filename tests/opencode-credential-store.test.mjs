import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { OpenCodeCredentialStore } from "../apps/syno/syno/opencode-credential-store.mjs";
import { doctor } from "../scripts/opencode-runtime.mjs";

async function temporaryRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-opencode-credential-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test("OpenCode credentials keep the token out of metadata and status", async (t) => {
  const root = await temporaryRoot(t);
  const store = new OpenCodeCredentialStore({
    root,
    protect: async (value) => `protected:${Buffer.from(value).toString("base64")}`,
    unprotect: async (value) => Buffer.from(value.replace(/^protected:/, ""), "base64").toString("utf8"),
    clock: () => new Date("2026-07-28T10:00:00Z"),
  });

  const status = await store.save("zen-private-token");
  assert.deepEqual(status, {
    configured: true,
    provider: "opencode",
    updatedAt: "2026-07-28T10:00:00.000Z",
  });
  assert.equal(await store.loadToken(), "zen-private-token");
  assert.doesNotMatch(await fs.readFile(path.join(root, "opencode.json"), "utf8"), /zen-private-token/);
  assert.doesNotMatch(JSON.stringify(status), /zen-private-token/);
});

test("OpenCode doctor reports credential presence without loading or printing the token", async (t) => {
  const root = await temporaryRoot(t);
  const executable = path.join(root, "node_modules", "opencode-ai", "bin", "opencode.exe");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, "real");
  const result = await doctor({
    candidates: [executable],
    versionOf: async () => "1.18.2",
    credentials: {
      async status() { return { configured: true, provider: "opencode" }; },
      async loadToken() { throw new Error("doctor must not decrypt the token"); },
    },
    browserCapture: { async health() { return { available: true, daemonVersion: "1.11.3", extensionVersion: "1.11.3" }; } },
    repoRoot: path.resolve("."),
  });

  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /token|secret/i);
});
