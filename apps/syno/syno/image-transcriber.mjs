// 图片转写（收录用）：把隔离区里的图片交给管家自带的模型链，产出结构化文本供 Intake 使用。
//
// 2026-10-16 替换原 OpencodeVisionClient（Zen HTTP `mimo-v2.5-free`）：
// 那条路依赖第三方免费模型，订阅与模型名会变；模型链（kimi-for-coding / k3-256k）本身声明
// 支持 image 输入，且是产品既定的唯一 Provider。
//
// 会话隔离：capture profile + ephemeralSession——sidecar 没有任何工具，也不会污染主人聊天会话。

import { promises as fs } from "node:fs";

function transcriberError(code, message) {
  return Object.assign(new Error(message), { code });
}

function transcriberPrompt(question) {
  return [
    "You extract only what is visible in the image. Reply with one JSON object and no other prose:",
    '{"ocr":"","layout":"","summary":"","answer":"","uncertain":[]}',
    "ocr = visible characters. layout = spatial arrangement. summary = what the picture shows.",
    "answer = response to the question. If unsure, leave fields empty and name the doubt in uncertain.",
    "Never invent pixels, colors, or text that are not visible.",
    `Question: ${question}`,
  ].join("\n");
}

// 模型可能带 ```json 围栏或前后废话；解析失败时如实降级成 unstructured，绝不伪造字段。
function parseVisionJson(text) {
  const raw = String(text || "");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { ocr: "", layout: "", summary: raw.slice(0, 4_000), answer: raw.slice(0, 4_000), uncertain: ["unstructured"] };
  }
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return {
      ocr: String(parsed.ocr || ""),
      layout: String(parsed.layout || ""),
      summary: String(parsed.summary || ""),
      answer: String(parsed.answer || parsed.summary || ""),
      uncertain: Array.isArray(parsed.uncertain) ? parsed.uncertain.map((item) => String(item)) : [],
    };
  } catch {
    return { ocr: "", layout: "", summary: raw.slice(0, 4_000), answer: raw.slice(0, 4_000), uncertain: ["unstructured"] };
  }
}

class ImageTranscriber {
  constructor({ store, runtime, ownerKey = "local-user", threadKey = "image-ingest" } = {}) {
    if (!store) throw new Error("ImageTranscriber 缺少 IsolatedImageStore");
    if (!runtime) throw new Error("ImageTranscriber 缺少 CognitiveRuntime");
    this.store = store;
    this.runtime = runtime;
    this.ownerKey = ownerKey;
    this.threadKey = threadKey;
  }

  // 与旧 Zen 客户端同契约：入参 artifactId + question，出参 { ocr, layout, summary, answer, uncertain }。
  async read({ artifactId, question } = {}) {
    const record = this.store.get(artifactId);
    if (!record) throw transcriberError("VISION_ARTIFACT_MISSING", "找不到这张图片的隔离记录（可能已过期）");
    const bytes = await fs.readFile(record.path).catch((error) => {
      throw transcriberError("VISION_ARTIFACT_UNREADABLE", `图片读取失败：${error.message}`);
    });
    const result = await this.runtime.run(
      {
        text: transcriberPrompt(question || "请提取图中可见文字并概述画面。"),
        images: [{ mediaType: record.mime, data: bytes.toString("base64") }],
      },
      { ownerKey: this.ownerKey, threadKey: this.threadKey, channel: "capture", ephemeralSession: true },
    );
    return parseVisionJson(result?.text || "");
  }
}

export { ImageTranscriber, parseVisionJson, transcriberPrompt };
