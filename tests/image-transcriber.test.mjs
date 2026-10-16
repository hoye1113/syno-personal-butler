import assert from "node:assert/strict";
import test from "node:test";

import { ImageTranscriber, parseVisionJson, transcriberPrompt } from "../apps/syno/syno/image-transcriber.mjs";

test("ImageTranscriber sends the image through the model chain on the tool-less capture profile", async () => {
  const runs = [];
  const transcriber = new ImageTranscriber({
    store: { get: (id) => (id === "img-1" ? { artifactId: "img-1", path: import.meta.filename, mime: "image/png", size: 12 } : null) },
    runtime: {
      async run(request, context) { runs.push({ request, context }); return { text: '{"ocr":"SYNO42","layout":"row","summary":"绿底白字","answer":"SYNO42","uncertain":[]}' }; },
    },
  });
  const result = await transcriber.read({ artifactId: "img-1", question: "收录：图里写了什么" });
  assert.equal(result.ocr, "SYNO42");
  assert.equal(result.summary, "绿底白字");
  assert.equal(runs.length, 1);
  const [{ request, context }] = runs;
  assert.equal(request.images.length, 1);
  assert.equal(request.images[0].mediaType, "image/png");
  assert.ok(request.images[0].data.length > 0, "必须带上图片字节（base64）");
  assert.match(request.text, /收录：图里写了什么/, "问题必须进提示词");
  assert.equal(context.ephemeralSession, true, "转写走 capture sidecar，不污染聊天会话");
  assert.equal(context.channel, "capture");
});

test("ImageTranscriber fails honestly for a missing or unreadable artifact", async () => {
  const transcriber = new ImageTranscriber({
    store: { get: () => null },
    runtime: { async run() { throw new Error("must not run"); } },
  });
  await assert.rejects(transcriber.read({ artifactId: "gone" }), (error) => error.code === "VISION_ARTIFACT_MISSING");
  const unreadable = new ImageTranscriber({
    store: { get: () => ({ path: "/definitely/not/here.png", mime: "image/png" }) },
    runtime: { async run() { throw new Error("must not run"); } },
  });
  await assert.rejects(unreadable.read({ artifactId: "x" }), (error) => error.code === "VISION_ARTIFACT_UNREADABLE");
});

test("parseVisionJson tolerates fenced or unstructured answers without inventing fields", () => {
  assert.deepEqual(parseVisionJson('```json\n{"ocr":"A","summary":"s","uncertain":["low"]}\n```'), {
    ocr: "A", layout: "", summary: "s", answer: "s", uncertain: ["low"],
  });
  const fallback = parseVisionJson("模型没按格式回答");
  assert.equal(fallback.ocr, "");
  assert.deepEqual(fallback.uncertain, ["unstructured"]);
  assert.match(fallback.summary, /模型没按格式回答/);
  assert.match(transcriberPrompt("看图"), /Never invent pixels/);
});
