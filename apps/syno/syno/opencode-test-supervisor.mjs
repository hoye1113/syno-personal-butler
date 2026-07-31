import { randomBytes, randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";

import { PATHS } from "./paths.mjs";

class OpenCodeTestSupervisor {
  constructor({ hostname = "127.0.0.1", port = 4318 } = {}) {
    this.hostname = hostname;
    this.port = port;
    this.username = "opencode";
    this.password = "";
    this.server = null;
    this.sessions = new Map();
  }

  async start() {
    if (this.server) return this.status();
    this.password = randomBytes(32).toString("base64url");
    this.server = http.createServer((request, response) => this.#handle(request, response));
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, this.hostname, resolve);
    });
    return this.status();
  }

  async stop() {
    if (this.server) await new Promise((resolve) => this.server.close(resolve));
    this.server = null;
    this.password = "";
    return this.status();
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  connection() {
    if (!this.server) throw new Error("Fake OpenCode 尚未启动");
    return { username: this.username, password: this.password, origin: `http://${this.hostname}:${this.port}` };
  }

  async health() {
    return { ...(await this.status()), healthy: Boolean(this.server), version: "1.18.2", testMode: true };
  }

  async status() {
    return { state: this.server ? "running" : "stopped", running: Boolean(this.server), version: "1.18.2", testMode: true };
  }

  async #handle(request, response) {
    const expected = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    if (request.headers.authorization !== expected) return this.#json(response, { error: "unauthorized" }, 401);
    const body = await new Promise((resolve) => {
      let value = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => { value += chunk; });
      request.on("end", () => resolve(value ? JSON.parse(value) : {}));
    });
    const url = new URL(request.url, `http://${this.hostname}:${this.port}`);
    if (request.method === "GET" && url.pathname === "/global/health") return this.#json(response, { healthy: true, version: "1.18.2" });
    if (request.method === "GET" && url.pathname === "/config") return this.#json(response, {
      default_agent: "syno", enabled_providers: ["deepseek", "opencode"], share: "disabled", snapshot: false,
      permission: { "*": "deny" },
    });
    if (request.method === "GET" && url.pathname === "/agent") return this.#json(response, [{ name: "syno" }]);
    if (request.method === "GET" && url.pathname === "/experimental/tool/ids") return this.#json(response, ["skill", "bash", "read"]);
    if (request.method === "GET" && url.pathname === "/experimental/tool") return this.#json(response, [{ id: "skill" }]);
    if (request.method === "GET" && url.pathname === "/path") return this.#json(response, { directory: path.join(PATHS.runtimeRoot, "tests", "opencode-workspace") });
    if (request.method === "GET" && url.pathname === "/mcp") return this.#json(response, { syno: { status: "connected" } });
    if (request.method === "POST" && url.pathname === "/session") {
      const session = { id: `fake-session-${randomUUID()}`, title: body.title, messages: [] };
      this.sessions.set(session.id, session);
      return this.#json(response, session);
    }
    const match = /^\/session\/([^/]+)(?:\/(message|prompt_async|abort))?$/.exec(url.pathname);
    const session = match ? this.sessions.get(decodeURIComponent(match[1])) : null;
    if (!session) return this.#json(response, { error: "not found" }, 404);
    if (request.method === "POST" && ["message", "prompt_async"].includes(match[2])) {
      session.messages.push(body);
      if (match[2] === "prompt_async") {
        response.writeHead(204).end();
        return;
      }
      return this.#json(response, body.noReply ? { parts: [] } : { parts: [{ type: "text", text: "Fake OpenCode reply" }] });
    }
    if (request.method === "POST" && match[2] === "abort") return this.#json(response, true);
    if (request.method === "DELETE" && !match[2]) {
      this.sessions.delete(session.id);
      return this.#json(response, true);
    }
    return this.#json(response, { error: "not found" }, 404);
  }

  #json(response, value, status = 200) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(value));
  }
}

export { OpenCodeTestSupervisor };
