import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ENDPOINT = "https://search.parallel.ai/mcp";
const MAX_RESPONSE_BYTES = 1_048_576;
const COOLDOWN_MS = 60_000;

// The SDK owns MCP framing; only this fixed, anonymous search endpoint is reachable.
export function createParallelAdapter({ fetchImpl, timeoutMs = 15_000, errors, normalize }) {
  let cooldownUntil = 0;
  return {
    id: "parallel",
    available: () => true,
    async search(request, signal) {
      if (signal?.aborted) throw errors.aborted(signal.reason);
      if (Date.now() < cooldownUntil) throw errors.providerError("Parallel 限流冷却中");
      const deadline = AbortSignal.timeout(timeoutMs);
      const operationSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
      const client = new Client({ name: "syno-search", version: "1.0.0" });
      const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
        reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
        fetch: async (url, init) => {
          if (String(url) !== ENDPOINT) throw new Error("Unexpected Parallel endpoint");
          const response = await fetchImpl(url, {
            ...init, redirect: "error",
            signal: AbortSignal.any([operationSignal, ...(init?.signal ? [init.signal] : [])]),
          });
          if (response.status === 429) {
            const header = response.headers.get("retry-after");
            const seconds = Number(header);
            const retryMs = header === null ? 0 : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
            cooldownUntil = Date.now() + Math.min(300_000, Math.max(COOLDOWN_MS, Number.isFinite(retryMs) ? retryMs : 0));
          }
          if (!response.body) return response;
          let bytes = 0;
          const bounded = response.body.pipeThrough(new TransformStream({
            transform(chunk, controller) {
              bytes += chunk.byteLength;
              if (bytes > MAX_RESPONSE_BYTES) throw new Error("Parallel response too large");
              controller.enqueue(chunk);
            },
          }));
          return new Response(bounded, { status: response.status, statusText: response.statusText, headers: response.headers });
        },
      });
      const options = { signal: operationSignal, timeout: timeoutMs };
      try {
        await client.connect(transport, options);
        const query = String(request?.query ?? "");
        const result = await client.callTool({ name: "web_search", arguments: {
          objective: query, search_queries: [query],
        } }, undefined, options);
        if (result.isError) {
          const text = result.content.filter(item => item.type === "text").map(item => item.text).join(" ");
          if (/\b429\b|rate[ _-]?limit|quota exceeded/i.test(text)) {
            cooldownUntil = Date.now() + COOLDOWN_MS;
            throw new Error("HTTP 429 / MCP rate limit");
          }
          throw new Error("MCP tool error");
        }
        const payload = result.structuredContent ?? JSON.parse(result.content.filter(item => item.type === "text").map(item => item.text).join("\n"));
        if (!payload || !Array.isArray(payload.results)) throw new Error("Invalid search response");
        return normalize(payload, request?.maxResults);
      } catch (error) {
        if (signal?.aborted) throw errors.aborted(signal.reason ?? error);
        // Do not copy third-party error bodies, queries or instructions into model-visible errors.
        const detail = operationSignal.aborted ? "请求超时" : Date.now() < cooldownUntil ? "HTTP 429，稍后重试" : "请求或响应无效";
        throw errors.providerError(`Parallel ${detail}`);
      } finally {
        await client.close();
      }
    },
  };
}
