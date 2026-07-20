function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "font-src 'self'",
      "img-src 'self' data: https://*.weixin.qq.com https://*.weixin.com",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function assertJsonMutation(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "GET")) return;
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.["content-type"] || ""))) {
    const error = new Error("此操作只接受 JSON 请求");
    error.statusCode = 415;
    throw error;
  }
}

function assertSameOriginMutation(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "GET")) return;
  const host = String(req.headers?.host || "").toLowerCase();
  const origin = String(req.headers?.origin || "");
  if (!origin) {
    const error = new Error("此操作要求浏览器提供 Origin"); error.statusCode = 403; throw error;
  }
  let parsed;
  try { parsed = new URL(origin); } catch {
    const error = new Error("请求 Origin 无效"); error.statusCode = 403; throw error;
  }
  if (parsed.protocol !== "http:" || parsed.host.toLowerCase() !== host) {
    const error = new Error("此操作只接受同源请求"); error.statusCode = 403; throw error;
  }
}

export { assertJsonMutation, assertSameOriginMutation, securityHeaders };
