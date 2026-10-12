// Syno 搜索 provider 插件：把组合搜索链（豆包 → Tavily → Exa，按语言路由）
// 注册到 DSH 的 `ctx.web` 接缝。key 由 Host 通过进程环境变量注入
// （DOUBAO_SEARCH_API_KEY / TAVILY_API_KEY / EXA_API_KEY）；未配置的 provider
// 会被自动跳过。可选链覆盖：SYNO_WEB_SEARCH_CHAIN=exa,tavily。
//
// `@deepseek-ai/dsh-web` 只在 bundle 树内可解析（profile junction 的 linked-root
// 运行时拦截）；JSON-RPC 回退面以相对路径加载本插件时没有该拦截。这里做可选解析：
// 拦到官方 WebError 就沿用，拦不到退回携带 `code` 的本地等价类，错误码语义不变。
import { createSynoSearchProvider } from "./adapters.mjs";

const WebErrorClass = await (async () => {
  try {
    const module = await import("@deepseek-ai/dsh-web");
    return module.WebError;
  } catch {
    return class SynoWebError extends Error {
      constructor(message, code, options) {
        super(message, options);
        this.name = "WebError";
        this.code = code;
      }
    };
  }
})();

export const name = "syno-web-search";
export const inject = ["web"];

export function apply(ctx) {
  const provider = createSynoSearchProvider({
    env: process.env,
    chain: process.env.SYNO_WEB_SEARCH_CHAIN,
    errors: {
      providerError: (message, cause) => new WebErrorClass(message, "WEB_PROVIDER_ERROR", cause ? { cause } : undefined),
      aborted: (cause) => new WebErrorClass("搜索已取消", "WEB_ABORTED", cause ? { cause } : undefined),
    },
  });
  ctx.web.registerSearchProvider(provider);
}
