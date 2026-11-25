import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRadarSiteStore } from "./site-store.mjs";
import { openRadarContent } from "./site-content.mjs";

const STATIC = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "site");

function headers(type) {
  return {
    "Content-Type": type,
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, { ...headers(type), ...extra });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

function sameSecret(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

async function body(req, limit = 32_768) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("请求过大"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function assertOrigin(req, { allowOpaqueSameOrigin = false } = {}) {
  const origin = req.headers.origin;
  if (!origin) throw Object.assign(new Error("写请求缺少 Origin"), { status: 403 });
  if (origin === "null" && allowOpaqueSameOrigin
    && req.headers["sec-fetch-site"] === "same-origin") return;
  let parsed;
  try { parsed = new URL(origin); } catch {
    console.log(JSON.stringify({
      event: "radar-origin-invalid",
      origin: String(origin).slice(0, 200),
      fetchSite: String(req.headers["sec-fetch-site"] || ""),
      fetchMode: String(req.headers["sec-fetch-mode"] || ""),
      fetchDest: String(req.headers["sec-fetch-dest"] || ""),
    }));
    throw Object.assign(new Error("Origin 无效"), { status: 403 });
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.host.toLowerCase() !== String(req.headers.host).toLowerCase()) {
    throw Object.assign(new Error("拒绝跨站写请求"), { status: 403 });
  }
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function loginPage(message = "") {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>进入信息雷达</title><link rel="stylesheet" href="/styles.css"></head><body class="login-body"><main class="login-sheet"><p class="eyebrow">P5 · DAILY RADAR</p><h1>回到今天的阅读。</h1><p>这是你的私人雷达站，请输入访问密码。</p><form method="post" action="/login"><label for="password">访问密码</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button class="primary-button" type="submit">进入雷达站</button><p class="form-error" role="alert">${message}</p></form></main></body></html>`;
}

export async function createRadarSiteServer({ home, stateHome = home, databasePath = "", authFile = "", publicOrigin = "", allowInsecure = false }) {
  if (!allowInsecure && !authFile) throw new Error("公网雷达站必须配置 authFile；仅本地开发可显式 allowInsecure");
  const store = createRadarSiteStore({ home, stateHome, publicOrigin });
  const content = openRadarContent({ databasePath });
  const auth = authFile ? JSON.parse(await fs.readFile(authFile, "utf8")) : null;
  const sessionKey = auth ? createHash("sha256").update(JSON.stringify(auth)).digest() : null;
  const cookieName = "p5_radar_session";
  const secureCookie = publicOrigin.startsWith("https:");

  function authorized(req) {
    if (!auth) return true;
    const value = cookieValue(req, cookieName);
    const [expires, signature] = value.split(".");
    if (!/^\d+$/u.test(expires || "") || Number(expires) < Date.now() || !signature) return false;
    const expected = createHmac("sha256", sessionKey).update(expires).digest("hex");
    return sameSecret(signature, expected);
  }

  async function items(url) {
    const view = url.searchParams.get("view") || "today";
    const result = await store.items({
      date: url.searchParams.get("date") || "",
      view: view === "today" ? "today" : "all",
    });
    const hydrated = await content.hydrate(result);
    const needle = String(url.searchParams.get("q") || "").trim().normalize("NFKC").toLocaleLowerCase("zh-CN");
    return hydrated.filter((item) => {
      if (view === "unread" && (item.readAt || (item.legacy && !item.unreadAt))) return false;
      if (view === "read" && !item.readAt) return false;
      if (view === "followed" && (!item.follow || ["none", "ignored"].includes(item.follow.status))) return false;
      if (view === "ignored" && item.follow?.status !== "ignored" && !item.follow?.ignoredAt && item.candidateState !== "ignored") return false;
      if (!needle) return true;
      return [item.title, item.titleZh, item.source, item.sourceName, item.date]
        .some((value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase("zh-CN").includes(needle));
    });
  }

  let mutation = Promise.resolve();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://local");
      if (url.pathname === "/login" && req.method === "GET") {
        if (authorized(req)) return send(res, 302, "", "text/plain; charset=utf-8", { Location: "/" });
        return send(res, 200, loginPage(), "text/html; charset=utf-8");
      }
      if (url.pathname === "/login" && req.method === "POST") {
        assertOrigin(req, { allowOpaqueSameOrigin: true });
        const fields = new URLSearchParams(await body(req));
        const password = fields.get("password") || "";
        if (!auth || !sameSecret(password, auth.password ?? "")) {
          return send(res, 403, loginPage("密码不正确，请重试。"), "text/html; charset=utf-8");
        }
        const expires = String(Date.now() + 7 * 86_400_000);
        const signature = createHmac("sha256", sessionKey).update(expires).digest("hex");
        return send(res, 303, "", "text/plain; charset=utf-8", {
          Location: "/",
          "Set-Cookie": `${cookieName}=${expires}.${signature}; Path=/; HttpOnly; SameSite=Lax${secureCookie ? "; Secure" : ""}`,
        });
      }
      if (url.pathname === "/styles.css" && req.method === "GET") {
        return send(res, 200, await fs.readFile(path.join(ROOT, "styles.css")), "text/css; charset=utf-8");
      }
      if (!authorized(req)) {
        if (url.pathname.startsWith("/api/")) return send(res, 401, { error: "需要登录" });
        return send(res, 302, "", "text/plain; charset=utf-8", { Location: "/login" });
      }
      if (url.pathname === "/api/summary" && req.method === "GET") return send(res, 200, await store.summary());
      if (url.pathname === "/api/items" && req.method === "GET") return send(res, 200, { items: await items(url) });
      if (url.pathname === "/api/growth" && req.method === "GET") {
        return send(res, 200, { growth: await store.growth({ board: url.searchParams.get("board") || "", date: url.searchParams.get("date") || "" }) });
      }
      if (url.pathname === "/api/read" && req.method === "POST") {
        assertOrigin(req);
        const input = JSON.parse(await body(req));
        if (typeof input.read !== "boolean") return send(res, 400, { error: "read 必须是布尔值" });
        const operation = mutation.then(() => store.setRead(input.itemIds, input.read), () => store.setRead(input.itemIds, input.read));
        mutation = operation.catch(() => {});
        const result = await operation;
        return send(res, 200, result);
      }
      const asset = STATIC.get(url.pathname);
      if (asset && req.method === "GET") {
        return send(res, 200, await fs.readFile(path.join(ROOT, asset[0])), asset[1]);
      }
      return send(res, 404, { error: "页面不存在" });
    } catch (error) {
      const status = Number(error.status) || (error instanceof SyntaxError ? 400 : 500);
      return send(res, status, { error: status === 500 ? "雷达站暂时无法读取数据" : String(error.message || error) });
    }
  });
  server.on("close", () => content.close());
  return server;
}

export async function startRadarSiteServerFromEnv() {
  const server = await createRadarSiteServer({
    home: process.env.P5_RADAR_HOME,
    stateHome: process.env.P5_RADAR_STATE_HOME || process.env.P5_RADAR_HOME,
    databasePath: process.env.P5_RADAR_DB || "",
    authFile: process.env.P5_RADAR_AUTH_FILE || "",
    publicOrigin: process.env.P5_RADAR_SITE_ORIGIN || "",
    allowInsecure: process.env.P5_RADAR_ALLOW_INSECURE === "1",
  });
  const port = Number(process.env.P5_RADAR_SITE_PORT || 61210);
  await new Promise((resolve, reject) => server.listen(port, "127.0.0.1", resolve).once("error", reject));
  console.log(`P5 radar site listening on http://127.0.0.1:${port}`);
  return server;
}
