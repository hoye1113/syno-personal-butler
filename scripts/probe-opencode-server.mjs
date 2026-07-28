import path from "node:path";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

import { OpenCodeHttpClient } from "../apps/syno/syno/opencode-cognitive-runtime.mjs";
import { OpenCodeSupervisor } from "../apps/syno/syno/opencode-supervisor.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";
import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

async function startBridge() {
  const token = randomBytes(24).toString("base64url");
  const tools = new ToolRegistry([{
    name: "knowledge.search", description: "Probe-only Syno search", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "array", items: { type: "object" } },
    execute: async ({ query }) => [{ query }],
  }]);
  const bridge = new SynoToolBridge({ tools, token });
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const result = await bridge.handle({ authorization: req.headers.authorization, body: raw ? JSON.parse(raw) : {} });
      if (result === null) { res.writeHead(204); res.end(); return; }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(error.code === "SYNO_BRIDGE_UNAUTHORIZED" ? 401 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  return { token, origin: `http://127.0.0.1:${port}/mcp`, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function main() {
  const bridge = await startBridge();
  const supervisor = new OpenCodeSupervisor({ bridgeOrigin: bridge.origin, bridgeToken: bridge.token });
  try {
    const started = await supervisor.start();
    const client = new OpenCodeHttpClient({ credentials: async () => supervisor.connection(), timeoutMs: 10_000 });
    const health = await client.health();
    const session = await client.createSession();
    const security = await client.securityStatus({ repoRoot: PATHS.repoRoot });
    await client.abortSession(session.id);
    await client.deleteSession(session.id);
    const securityOk = security.isolatedWorkspace
      && security.defaultAgent === "syno"
      && security.enabledProviders.length === 1
      && security.enabledProviders[0] === "opencode"
      && security.shareDisabled
      && security.snapshotsDisabled
      && security.globalPermissionDenied
      && security.forbiddenCallableToolIds.length === 0
      && security.mcpNames.length === 1
      && security.mcpNames[0] === "syno"
      && security.mcpStatuses.syno === "connected";
    return {
      ok: health.healthy === true && securityOk,
      version: started.version,
      loopback: true,
      authenticated: true,
      sessionLifecycle: ["create", "abort", "delete"],
      security,
    };
  } finally {
    await supervisor.stop().catch(() => {});
    await bridge.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"))) {
  main().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch((error) => {
    process.stderr.write(`${error.code || "OPENCODE_PROBE_FAILED"}: ${error.message}\n`);
    process.exitCode = 1;
  });
}

export { main };
