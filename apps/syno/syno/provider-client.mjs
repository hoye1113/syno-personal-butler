class ProviderError extends Error {
  constructor(code, message, { retryable = false, status = 0 } = {}) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

function estimateTokens(messages, tools = []) {
  const characters = JSON.stringify({ messages, tools }).length;
  return Math.ceil(characters / 3.2) + 256;
}

function matchesFixedModel(configuredModel, responseModel) {
  return responseModel === configuredModel
    || (configuredModel.startsWith("AIPC-") && responseModel === configuredModel.slice("AIPC-".length));
}

class ProviderClient {
  constructor({ credentials, fetchImpl = globalThis.fetch, timeoutMs = 60_000 } = {}) {
    if (!credentials || !fetchImpl) throw new Error("ProviderClient 缺少凭据或 fetch Adapter");
    this.credentials = credentials;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async bindRun() {
    const config = Object.freeze({ ...await this.credentials.load() });
    return Object.freeze({
      modelId: config.modelId,
      contextLength: config.contextLength,
      complete: (messages, tools = [], options = {}) => this.completeWithConfig(config, messages, tools, options),
    });
  }

  async complete(messages, tools = [], options = {}) {
    const run = await this.bindRun();
    return run.complete(messages, tools, options);
  }

  async completeWithConfig(config, messages, tools = [], { signal, temperature = 0.2 } = {}) {
    const estimatedTokens = estimateTokens(messages, tools);
    if (estimatedTokens > Math.floor(config.contextLength * 0.97)) {
      throw new ProviderError("PROVIDER_CONTEXT_LIMIT", `请求上下文约 ${estimatedTokens} tokens，超过配置长度 ${config.contextLength} 的安全预算`, { retryable: false });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), this.timeoutMs);
    const abort = () => controller.abort(signal?.reason || new Error("canceled"));
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await this.fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.token}` },
        body: JSON.stringify({
          model: config.modelId,
          messages,
          temperature,
          stream: false,
          ...(tools.length ? { tools: tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })), tool_choice: "auto" } : {}),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderError("PROVIDER_HTTP_ERROR", `Provider 请求失败（HTTP ${response.status}）`, { retryable, status: response.status });
      }
      const body = await response.json().catch(() => { throw new ProviderError("PROVIDER_INVALID_JSON", "Provider 返回了无效 JSON", { retryable: true }); });
      const message = body?.choices?.[0]?.message;
      if (!message || (!message.content && !message.tool_calls?.length)) throw new ProviderError("PROVIDER_INVALID_RESPONSE", "Provider 响应缺少 message", { retryable: true });
      const responseModel = String(body.model || config.modelId);
      if (!matchesFixedModel(config.modelId, responseModel)) {
        throw new ProviderError("PROVIDER_MODEL_DRIFT", `Provider 返回模型 ${responseModel}，与本次 Run 固定模型 ${config.modelId} 不一致`, { retryable: false });
      }
      return { message, usage: body.usage || null, model: config.modelId };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (controller.signal.aborted) {
        const canceled = signal?.aborted;
        throw new ProviderError(canceled ? "PROVIDER_CANCELED" : "PROVIDER_TIMEOUT", canceled ? "Provider 请求已取消" : "Provider 请求超时", { retryable: !canceled });
      }
      throw new ProviderError("PROVIDER_UNAVAILABLE", "Provider 当前不可用", { retryable: true });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
}

export { ProviderClient, ProviderError, estimateTokens, matchesFixedModel };
