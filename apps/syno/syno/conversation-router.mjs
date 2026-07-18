import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

function routeKey(ownerKey, threadKey = "default") {
  const owner = String(ownerKey || "").trim();
  const thread = String(threadKey || "default").trim();
  if (!owner || owner.length > 256 || !thread || thread.length > 256) throw new Error("Conversation 路由标识无效");
  return `${owner}\u0000${thread}`;
}

class ConversationRouter {
  constructor({ stateFile = path.join(PATHS.stateRoot, "conversation-routing.json"), clock = () => new Date() } = {}) {
    this.stateFile = stateFile;
    this.clock = clock;
    this.tail = Promise.resolve();
  }

  resolve({ ownerKey, threadKey = "default", conversationId } = {}) {
    return this.#serialized(async () => {
      const key = routeKey(ownerKey, threadKey);
      const state = await this.#load();
      const existing = state.routes[key]?.conversationId;
      if (existing && (!conversationId || conversationId === existing)) return existing;
      const resolved = conversationId || existing || `conversation-${randomUUID()}`;
      if (!/^conversation-[a-zA-Z0-9-]+$/.test(resolved)) throw new Error("Conversation ID 无效");
      state.routes[key] = { conversationId: resolved, updatedAt: this.clock().toISOString() };
      await this.#save(state);
      return resolved;
    });
  }

  #serialized(operation) {
    const result = this.tail.then(operation, operation);
    this.tail = result.catch(() => {});
    return result;
  }

  async #load() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.stateFile, "utf8"));
      return { version: 1, routes: parsed?.routes && typeof parsed.routes === "object" ? parsed.routes : {} };
    } catch (error) {
      if (error.code === "ENOENT") return { version: 1, routes: {} };
      throw error;
    }
  }

  async #save(state) {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    const temporary = `${this.stateFile}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, this.stateFile);
  }
}

export { ConversationRouter, routeKey };
