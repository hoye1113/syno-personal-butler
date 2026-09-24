import { test } from "node:test";
import assert from "node:assert/strict";

import { createWeixinChannelHandler } from "../packages/syno-dsh-plugin/plugins/channel-weixin/channel-handler.mjs";

test("weixin channel handler factory requires runtime and core", () => {
  const runtime = { async run() { return { text: "x" }; } };
  assert.throws(() => createWeixinChannelHandler({}), /需要 runtime/);
  assert.throws(() => createWeixinChannelHandler({ runtime }), /需要 core/);
  const handler = createWeixinChannelHandler({ runtime, core: {} });
  assert.equal(typeof handler.handle, "function");
});
