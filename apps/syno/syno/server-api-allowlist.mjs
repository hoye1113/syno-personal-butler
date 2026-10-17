const ALLOWED_SYNO_API_PATHS = new Set([
  "/api/syno/health",
  "/api/syno/readiness",
  "/api/syno/bridge/mcp",
  "/api/syno/harness",
  "/api/syno/channels",
  "/api/syno/channels/home",
  "/api/syno/feishu/register/start",
  "/api/syno/feishu/register/status",
  "/api/syno/feishu/connect",
  "/api/syno/feishu/disconnect",
  "/api/syno/settings",
]);

function isAllowedSynoApiPath(pathname) {
  return ALLOWED_SYNO_API_PATHS.has(String(pathname));
}

export { isAllowedSynoApiPath };
