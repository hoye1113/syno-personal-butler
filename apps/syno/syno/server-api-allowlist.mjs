const ALLOWED_SYNO_API_PATHS = new Set([
  "/api/syno/health",
  "/api/syno/readiness",
  "/api/syno/bridge/mcp",
  "/api/syno/harness",
  "/api/syno/channels",
  "/api/syno/weixin/login/start",
  "/api/syno/weixin/login/poll",
  "/api/syno/weixin/connect",
]);

function isAllowedSynoApiPath(pathname) {
  return ALLOWED_SYNO_API_PATHS.has(String(pathname));
}

export { isAllowedSynoApiPath };
