# Pi × OpenCode Server 直接模型接口：只读预检

- 日期：2026-11-18
- 结论：**A 路径在接口层面可行。OpenCode v2.0.29 存在独立、无 Session、无需 Plan Agent 的文本生成接口。**
- 范围：预检阶段只核对本机 CLI 对应版本的公开源码与协议；当时未启动 Server、未调用模型、未读取凭据、未修改 Pi Worker。后续实测见文末。

## 版本依据

- 本机真实 CLI：`/opt/homebrew/Cellar/opencode/2.0.29/bin/opencode`
- 版本：`opencode v2.0.29`
- 对应上游 tag：`v2.0.29`
- tag 对象：`042d0832f5f3a73eaa039a58a7d565776f6d4290`
- 仓库：`https://github.com/anomalyco/opencode`

## 接口

```http
POST /api/experimental/generate
Content-Type: application/json

{
  "prompt": "...",
  "model": {
    "providerID": "opencode-go",
    "id": "deepseek-v4.1-flash"
  }
}
```

成功响应：

```json
{
  "data": {
    "text": "..."
  }
}
```

协议证据：

- `/tmp/opencode-v2029-preflight-T1L4LP/generate-protocol.ts:6-24`
- 固定上游：`https://github.com/anomalyco/opencode/blob/v2.0.29/packages/protocol/src/groups/generate.ts#L6-L24`
- endpoint 为 `generate.text`，路径为 `/api/experimental/generate`。
- `model` 可选；本实验必须显式传 `opencode-go/deepseek-v4.1-flash`，不能使用默认模型。

## 为什么它解决当前桥接问题

Server handler 直接调用：

```text
Generate.Service.text(request.payload)
→ resolver.resolve(input.model)
→ llm.generate(LLM.request({ model, prompt, ... }))
→ response.text
```

证据：

- `/tmp/opencode-v2029-preflight-T1L4LP/handlers/generate.ts:12-38`
- `/tmp/opencode-v2029-preflight-T1L4LP/generate-core.ts:39-83`
- 固定上游：`https://github.com/anomalyco/opencode/blob/v2.0.29/packages/core/src/generate.ts#L39-L83`

关键事实：

1. 不经过 `session.prompt`，因此不进入 OpenCode Session Agent 或 Plan Agent。
2. 使用 `LLM.request({ model, prompt })` 做一次性文本生成。
3. 源码注释明确：仅为网关归因生成临时 Session ID，**没有 Session 被保存**。
4. 凭据解析仍由 OpenCode 的 ModelResolver/LLMClient 内部完成，Pi 不需要读取或导出 Key。
5. 请求只返回 assistant text，适合作为 Pi 自定义 `streamFn` 的底层模型回答。

## 对 Pi 架构的影响

新的候选链路应改为：

```text
Pi Agent Core
→ 自定义 streamFn
→ loopback OpenCode Server /api/experimental/generate
→ OpenCode 内部凭据与固定模型
→ data.text
→ Pi AssistantMessage
```

这消除了此前“Pi Agent 套 OpenCode Plan Agent”的双层 Agent 冲突。Pi 负责 Worker Loop，OpenCode Server 只承担模型访问与内部认证，autoloop 的 Worker Contract 保持不变。

## 预检时尚未证明的事项

- 预检时尚未启动本机 Server 并核对实际 `/openapi.json`；当时证据是安装版本对应的精确上游源码。
- 预检时尚未发送真实请求，因此当时未证明本机 Go 凭据对该 endpoint 的运行时授权结果。
- 预检未验证流式、取消、超时、并发和失败审计；该接口当前是非流式一次性文本生成。
- 至今未证明 Go 控制台扣费渠道。
- 三轮旧 CLI 失败记录保持原样；它们是最终 Server 实现前的真实历史结果。

## 预检时建议的实现门

1. 使用 `opencode serve --hostname 127.0.0.1 --port 0`，只绑定 loopback，并记录实际端口。
2. 先以 GET `/openapi.json` 验证运行中 Server 包含 `generate.text`，不调用模型。
3. 再把 Pi `streamFn` 从 CLI Plan Agent 改为该 endpoint，显式固定 provider/model。
4. 补齐成功与失败审计、请求超时、Server 退出和子进程清理。
5. 只运行一次真实纵向测试；通过后验证知识 Worker 存续并运行全量回归。

预检本身不等于 Pi 验收通过；后续实现与真实测试结果单独记录如下。

## 后续实测闭环

2026-11-18 已启动实际 loopback Server，GET `/openapi.json` 返回的 operationId 为 `experimental.generate.text`，响应码定义包含 200/400/401/404/503。随后 Pi 桥接实测通过，Server 正常退出。最终结果见 `/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`。
