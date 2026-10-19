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
  "/api/syno/knowledge/sync/probe",
  "/api/syno/knowledge/sync/recover",
  "/api/syno/knowledge/sync/check",
]);

function isAllowedSynoApiPath(pathname) {
  return ALLOWED_SYNO_API_PATHS.has(String(pathname));
}

export { isAllowedSynoApiPath };

// Local command-line calls may omit Origin; browser writes must be same-origin JSON.
function assertPublishingRequest(req) {
  const headers = req.headers || {};
  const expected = `http://${headers.host}`;
  if (headers["sec-fetch-site"] === "cross-site" || (headers.origin && headers.origin !== expected)) {
    throw Object.assign(new Error("发布控制仅接受同源请求"), { statusCode: 403, code: "PUBLISH_ORIGIN_DENIED" });
  }
  if (req.method === "POST" && !/^application\/json(?:;|$)/iu.test(headers["content-type"] || "")) {
    throw Object.assign(new Error("发布控制要求 JSON 请求"), { statusCode: 415, code: "PUBLISH_JSON_REQUIRED" });
  }
}
export { assertPublishingRequest };
