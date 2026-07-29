import assert from "node:assert/strict";
import test from "node:test";

import { OpenCodeHttpClient } from "../apps/syno/syno/opencode-cognitive-runtime.mjs";
import { FakeOpenCodeServer } from "./support/fake-opencode-server.mjs";

test("Fake OpenCode Server exercises authenticated health, Session, message, abort and delete seams", async (t) => {
  const server = await new FakeOpenCodeServer().start();
  t.after(() => server.stop());
  const client = new OpenCodeHttpClient({
    origin: server.origin,
    credentials: async () => ({ username: "opencode", password: "test-password" }),
  });
  assert.equal((await client.health()).healthy, true);
  const session = await client.createSession("Syno fake integration");
  assert.match(session.id, /^fake-session-/);
  assert.equal((await client.getSession(session.id)).title, "Syno fake integration");
  assert.equal((await client.sendMessage(session.id, { parts: [{ type: "text", text: "hello" }] })).parts[0].text, "fake reply");
  assert.equal(await client.sendAsyncMessage(session.id, { parts: [{ type: "text", text: "background" }] }), null);
  assert.equal(await client.abortSession(session.id), true);
  assert.equal(server.sessions.get(session.id).aborted, true);
  assert.equal(await client.deleteSession(session.id), true);
  assert.equal(server.sessions.has(session.id), false);

  const unauthorized = new OpenCodeHttpClient({
    origin: server.origin,
    credentials: async () => ({ username: "opencode", password: "wrong" }),
  });
  await assert.rejects(unauthorized.health(), (error) => error.status === 401);
});
