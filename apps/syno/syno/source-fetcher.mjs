import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_TEXT = 100_000;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address) {
  const value = String(address || "").toLowerCase().split("%")[0];
  const family = net.isIP(value);
  if (family === 4) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19));
  }
  if (family === 6) {
    if (value === "::" || value === "::1") return true;
    if (value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value)) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  return false;
}

async function resolvePublicAddress(url, lookup = dnsLookup) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = net.isIP(hostname);
  const records = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("URL 解析到本机、内网或保留地址");
  }
  return records[0];
}

function requestOnce(url, address, { timeoutMs = 15_000, maxBytes = MAX_SOURCE_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(url, {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.8",
        "accept-encoding": "identity",
        "user-agent": "Syno/1.0 (+localhost personal knowledge intake)",
      },
      lookup(_hostname, _options, callback) {
        callback(null, address.address, address.family);
      },
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          request.destroy(new Error("来源正文超过 2 MB 限制"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({
        statusCode: response.statusCode || 0,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("来源抓取超时")));
    request.on("error", reject);
    request.end();
  });
}

function extractReadableText(raw, contentType = "") {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  if (!/html|xhtml/i.test(contentType) && !/<(?:html|body|article|main)[\s>]/i.test(text)) {
    return text.replace(/\r\n/g, "\n").trim();
  }
  return text
    .replace(/<(?:script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg)>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<\/?(?:p|div|article|main|section|h[1-6]|li|blockquote|br|tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function fetchSourceText(value, options = {}) {
  let url = new URL(value);
  for (let redirects = 0; redirects <= (options.maxRedirects ?? MAX_REDIRECTS); redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("来源 URL 不安全");
    const address = await resolvePublicAddress(url, options.lookup);
    const response = await requestOnce(url, address, options);
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      if (redirects === (options.maxRedirects ?? MAX_REDIRECTS)) throw new Error("来源重定向次数过多");
      url = new URL(response.headers.location, url);
      continue;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`来源返回 HTTP ${response.statusCode}`);
    const contentType = String(response.headers["content-type"] || "").split(";")[0].toLowerCase();
    if (contentType && !/^text\//.test(contentType) && !["application/json", "application/xhtml+xml", "application/xml"].includes(contentType)) {
      throw new Error(`不支持的来源类型：${contentType}`);
    }
    const readable = extractReadableText(response.body.toString("utf8"), contentType);
    if (!readable) throw new Error("来源没有可读取正文");
    return {
      url: url.toString(),
      contentType: contentType || "text/plain",
      text: readable.slice(0, options.maxText ?? MAX_SOURCE_TEXT),
      truncated: readable.length > (options.maxText ?? MAX_SOURCE_TEXT),
    };
  }
  throw new Error("来源抓取失败");
}

export {
  MAX_REDIRECTS,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_TEXT,
  extractReadableText,
  fetchSourceText,
  isPrivateAddress,
  resolvePublicAddress,
};
