import { promises as fs } from "node:fs";

import { defaultOpencodeZenKeyLoader } from "./opencode-key-loader.mjs";

const ZEN_CHAT_COMPLETIONS = "https://opencode.ai/zen/v1/chat/completions";
const VISION_MODEL = "mimo-v2.5-free";
const DEFAULT_TIMEOUT_MS = 150_000;
const RETRY_DELAYS_MS = Object.freeze([2_000, 8_000]);

function visionError(code, message, { retryable = false, status = null } = {}) {
  return Object.assign(new Error(message), { code, retryable, status });
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || visionError("VISION_CANCELED", "识图已取消"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason || visionError("VISION_CANCELED", "识图已取消"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function classifyHttpFailure(status, bodyText) {
  const snippet = String(bodyText || "").slice(0, 240);
  if (status === 401 || status === 403 || /invalid[_ ]?api[_ ]?key|unauthorized/i.test(snippet)) {
    return visionError("VISION_AUTH", "识图鉴权失败", { status });
  }
  if (status === 404 || /model[_ ]?(not found|unavailable|gone)|does not exist/i.test(snippet)) {
    return visionError("VISION_MODEL_UNAVAILABLE", "识图模型不可用", { status });
  }
  if (isRetryableStatus(status)) {
    return visionError("VISION_UNAVAILABLE", `识图服务暂时失败（HTTP ${status}）`, { retryable: true, status });
  }
  return visionError("VISION_UNAVAILABLE", `识图失败（HTTP ${status}）`, { retryable: false, status });
}

function isRetryableError(error) {
  if (error?.retryable === true) return true;
  if (error?.name === "AbortError" || error?.code === "VISION_TIMEOUT") return true;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|fetch failed|network|timeout/i.test(String(error?.code || error?.message || ""));
}

function parseVisionJson(text) {
  const raw = String(text || "");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return {
      ocr: "",
      layout: "",
      summary: raw.slice(0, 4_000),
      answer: raw.slice(0, 4_000),
      uncertain: ["unstructured"],
    };
  }
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    const uncertain = Array.isArray(parsed.uncertain) ? parsed.uncertain.map((item) => String(item)) : [];
    return {
      ocr: String(parsed.ocr || ""),
      layout: String(parsed.layout || ""),
      summary: String(parsed.summary || ""),
      answer: String(parsed.answer || parsed.summary || ""),
      uncertain,
    };
  } catch {
    return {
      ocr: "",
      layout: "",
      summary: raw.slice(0, 4_000),
      answer: raw.slice(0, 4_000),
      uncertain: ["parse_failed"],
    };
  }
}

function wrapUntrusted(result) {
  return {
    ...result,
    untrusted: true,
    envelope: [
      "<untrusted-vision>",
      JSON.stringify({
        ocr: result.ocr,
        layout: result.layout,
        summary: result.summary,
        answer: result.answer,
        uncertain: result.uncertain,
      }),
      "</untrusted-vision>",
    ].join("\n"),
  };
}

function visionPrompt(question) {
  return [
    "You extract only what is visible in the image. Reply with one JSON object and no other prose:",
    '{"ocr":"","layout":"","summary":"","answer":"","uncertain":[]}',
    "ocr = visible characters. layout = spatial arrangement. summary = what the picture shows.",
    "answer = response to the question. If unsure, leave fields empty and name the doubt in uncertain.",
    "Never invent pixels, colors, or text that are not visible.",
    `Question: ${question}`,
  ].join("\n");
}

class OpencodeVisionClient {
  constructor({
    store,
    keyLoader = defaultOpencodeZenKeyLoader,
    fetchImpl = fetch,
    endpoint = ZEN_CHAT_COMPLETIONS,
    model = VISION_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelaysMs = RETRY_DELAYS_MS,
  } = {}) {
    if (!store) throw new Error("OpencodeVisionClient 缺少 IsolatedImageStore");
    this.store = store;
    this.keyLoader = keyLoader;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.retryDelaysMs = [...retryDelaysMs];
    this.queue = Promise.resolve();
  }

  read(input) {
    const run = this.queue.then(() => this.#readNow(input), () => this.#readNow(input));
    this.queue = run.then(() => {}, () => {});
    return run;
  }

  async #readNow({ artifactId, question, signal } = {}) {
    const id = String(artifactId || "").trim();
    const asked = String(question || "").trim() || "请提取图中可见文字、颜色和布局，并概述画面。";
    if (!id) throw visionError("VISION_INVALID_IMAGE", "缺少 artifactId");
    const record = this.store.get(id);
    const bytes = await fs.readFile(record.path);
    if (record.size != null && record.size !== bytes.length) {
      throw visionError("VISION_INVALID_IMAGE", "附件隔离后的大小发生变化");
    }
    const key = String(await this.keyLoader() || "").trim();
    if (!key) throw visionError("VISION_AUTH", "未配置 OpenCode Zen 识图凭据");
    const payload = {
      model: this.model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: visionPrompt(asked) },
          { type: "image_url", image_url: { url: `data:${record.mime};base64,${bytes.toString("base64")}` } },
        ],
      }],
    };
    const attempts = this.retryDelaysMs.length + 1;
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (signal?.aborted) throw signal.reason || visionError("VISION_CANCELED", "识图已取消");
      try {
        const text = await this.#complete(payload, key, signal);
        return wrapUntrusted(parseVisionJson(text));
      } catch (error) {
        lastError = error;
        const retry = attempt < attempts - 1 && isRetryableError(error);
        if (!retry) throw error;
        await sleep(this.retryDelaysMs[attempt], signal);
      }
    }
    throw lastError;
  }

  async #complete(payload, key, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onOuterAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onOuterAbort, { once: true });
    }
    let response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted && !signal?.aborted) {
        throw visionError("VISION_TIMEOUT", `识图超时（${this.timeoutMs}ms）`, { retryable: true });
      }
      throw visionError("VISION_UNAVAILABLE", error.message || "识图网络失败", { retryable: true });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    }
    const bodyText = await response.text();
    if (!response.ok) throw classifyHttpFailure(response.status, bodyText);
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      throw visionError("VISION_UNAVAILABLE", "识图返回了无效 JSON", { retryable: true });
    }
    const text = parsed?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw visionError("VISION_UNAVAILABLE", "识图返回空响应", { retryable: true });
    }
    return text;
  }
}

export {
  OpencodeVisionClient,
  RETRY_DELAYS_MS,
  VISION_MODEL,
  ZEN_CHAT_COMPLETIONS,
  parseVisionJson,
  wrapUntrusted,
};
