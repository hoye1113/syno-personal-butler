import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { requestOnce } from "../apps/syno/syno/source-fetcher.mjs";

test("requestOnce supports Node all-address lookup callbacks", async (t) => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("source body");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const result = await requestOnce(
    new URL(`http://example.com:${port}/article`),
    { address: "127.0.0.1", family: 4 },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.toString("utf8"), "source body");
});
