import { randomUUID } from "node:crypto";
import http from "node:http";

class FakeOpenCodeServer {
  constructor({ username = "opencode", password = "test-password" } = {}) {
    this.username = username;
    this.password = password;
    this.sessions = new Map();
    this.server = null;
    this.origin = "";
  }

  async start() {
    this.server = http.createServer(async (request, response) => {
      const expected = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
      if (request.headers.authorization !== expected) {
        response.writeHead(401).end();
        return;
      }
      const body = await new Promise((resolve) => {
        let value = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => { value += chunk; });
        request.on("end", () => resolve(value ? JSON.parse(value) : {}));
      });
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/global/health") return this.#json(response, { healthy: true, version: "1.18.2" });
      if (request.method === "POST" && url.pathname === "/session") {
        const session = { id: `fake-session-${randomUUID()}`, title: body.title, messages: [], aborted: false };
        this.sessions.set(session.id, session);
        return this.#json(response, session);
      }
      const match = /^\/session\/([^/]+)(?:\/(message|prompt_async|abort))?$/.exec(url.pathname);
      const session = match ? this.sessions.get(decodeURIComponent(match[1])) : null;
      if (!session) return this.#json(response, { error: "not found" }, 404);
      if (request.method === "GET" && !match[2]) return this.#json(response, session);
      if (request.method === "POST" && match[2] === "message") {
        session.messages.push(body);
        return this.#json(response, body.noReply ? { parts: [] } : { parts: [{ type: "text", text: "fake reply" }] });
      }
      if (request.method === "POST" && match[2] === "prompt_async") {
        session.messages.push(body);
        response.writeHead(204).end();
        return;
      }
      if (request.method === "POST" && match[2] === "abort") {
        session.aborted = true;
        return this.#json(response, true);
      }
      if (request.method === "DELETE" && !match[2]) {
        this.sessions.delete(session.id);
        return this.#json(response, true);
      }
      return this.#json(response, { error: "not found" }, 404);
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", resolve);
    });
    const address = this.server.address();
    this.origin = `http://127.0.0.1:${address.port}`;
    return this;
  }

  async stop() {
    if (!this.server) return;
    await new Promise((resolve, reject) => this.server.close((error) => error ? reject(error) : resolve()));
    this.server = null;
  }

  #json(response, value, status = 200) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(value));
  }
}

export { FakeOpenCodeServer };
