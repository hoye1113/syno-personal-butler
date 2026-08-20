import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { IsolatedImageStore } from "../apps/syno/syno/isolated-image-store.mjs";
import { createGlyphPng } from "../apps/syno/syno/image-png.mjs";
import { OpencodeVisionClient, parseVisionJson } from "../apps/syno/syno/opencode-vision-client.mjs";
import { visionResultToIntakePayload } from "../apps/syno/syno/vision-intake.mjs";
import { artifactToIntakePayload } from "../apps/syno/syno/weixin-message-handler.mjs";

async function isolatedPng(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-vision-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const png = createGlyphPng("SYNO42");
  const file = path.join(root, "shot.png");
  await writeFile(file, png);
  const store = new IsolatedImageStore({ quarantineRoots: [root] });
  const record = store.register({
    path: file,
    mime: "image/png",
    isolated: true,
    autoRead: false,
    size: png.length,
  });
  return { root, file, png, store, record };
}

test("parseVisionJson extracts JSON even when fenced", () => {
  const parsed = parseVisionJson("```json\n{\"ocr\":\"SYNO42\",\"answer\":\"green\",\"uncertain\":[]}\n```");
  assert.equal(parsed.ocr, "SYNO42");
  assert.equal(parsed.answer, "green");
});

test("artifactToIntakePayload still rejects images on the ingest converter", async (t) => {
  const { root, file, png } = await isolatedPng(t);
  await assert.rejects(
    () => artifactToIntakePayload({
      path: path.relative(root, file),
      mime: "image/png",
      isolated: true,
      autoRead: false,
      size: png.length,
    }, { quarantineRoot: root }),
    /暂不支持 image\/png/,
  );
});

test("vision JSON becomes existing kind text intake with untrusted envelope", () => {
  const payload = visionResultToIntakePayload({
    ocr: "SYNO42",
    layout: "letters on green",
    summary: "probe glyph",
    answer: "green SYNO42",
    uncertain: [],
  });
  assert.equal(payload.kind, "text");
  assert.match(payload.value, /<untrusted-vision>/);
  assert.match(payload.value, /SYNO42/);
});

test("OpencodeVisionClient posts UTF-8 JSON to Zen and does not guess on auth failure", async (t) => {
  const { store, record } = await isolatedPng(t);
  const calls = [];
  const client = new OpencodeVisionClient({
    store,
    keyLoader: async () => "test-key",
    retryDelaysMs: [1],
    fetchImpl: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
      return { ok: false, status: 401, async text() { return "{\"error\":\"invalid_api_key\"}"; } };
    },
  });
  await assert.rejects(
    () => client.read({ artifactId: record.artifactId, question: "图上写了什么中文问题" }),
    (error) => error.code === "VISION_AUTH" && error.retryable !== true,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.messages[0].content[0].text, /中文问题/);
  assert.equal(calls[0].body.model, "mimo-v2.5-free");
  assert.match(calls[0].body.messages[0].content[1].image_url.url, /^data:image\/png;base64,/);
});

test("OpencodeVisionClient retries timeout and 5xx then succeeds", async (t) => {
  const { store, record } = await isolatedPng(t);
  let attempts = 0;
  const client = new OpencodeVisionClient({
    store,
    keyLoader: async () => "test-key",
    retryDelaysMs: [1, 1],
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) {
        return { ok: false, status: 503, async text() { return "busy"; } };
      }
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            choices: [{ message: { content: "{\"ocr\":\"SYNO42\",\"layout\":\"row\",\"summary\":\"green glyph\",\"answer\":\"green\",\"uncertain\":[]}" } }],
          });
        },
      };
    },
  });
  const result = await client.read({ artifactId: record.artifactId, question: "颜色?" });
  assert.equal(attempts, 3);
  assert.equal(result.ocr, "SYNO42");
  assert.match(result.envelope, /<untrusted-vision>/);
});

test("IsolatedImageStore evicts oldest entries when over capacity", async (t) => {
  const { root, file, png, store } = await isolatedPng(t);
  store.maxEntries = 2;
  const first = store.register({
    path: file,
    mime: "image/png",
    isolated: true,
    autoRead: false,
    size: png.length,
    artifactId: "img-a",
  });
  store.register({
    path: file,
    mime: "image/png",
    isolated: true,
    autoRead: false,
    size: png.length,
    artifactId: "img-b",
  });
  store.register({
    path: file,
    mime: "image/png",
    isolated: true,
    autoRead: false,
    size: png.length,
    artifactId: "img-c",
  });
  assert.equal(store.get("img-b").artifactId, "img-b");
  assert.equal(store.get("img-c").artifactId, "img-c");
  assert.throws(() => store.get(first.artifactId), /会话已过期/);
});
