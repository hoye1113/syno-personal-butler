const BOOTSTRAP_ROUTES = new Set([
  "/api/syno/health",
  "/api/syno/readiness",
  "/api/syno/bridge/mcp",
]);

function requiresSynoReady(pathname) {
  return !BOOTSTRAP_ROUTES.has(String(pathname || ""));
}

function readinessHttpStatus(state) {
  return state === "ready" ? 200 : 503;
}

function runtimeNotReady(state) {
  return {
    ok: false,
    code: "RUNTIME_NOT_READY",
    state: String(state || "starting"),
  };
}

function canServeBusiness(state) {
  return state === "ready" || state === "degraded";
}

export { BOOTSTRAP_ROUTES, canServeBusiness, readinessHttpStatus, requiresSynoReady, runtimeNotReady };
