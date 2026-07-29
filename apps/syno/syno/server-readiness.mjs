const BOOTSTRAP_ROUTES = new Set([
  "/api/syno/opencode/mcp",
]);

function requiresSynoReady(pathname) {
  return !BOOTSTRAP_ROUTES.has(String(pathname || ""));
}

export { requiresSynoReady };
