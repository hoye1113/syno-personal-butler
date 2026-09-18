---
title: "02 · MCP Client 实现 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent", "mcp"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent", "mcp"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/09-mcp/02-mcp-client"
description: "通过  tdio JSON-RPC 连接 MCP  erver，发现和调用外部工具——核心只需要一个类。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-48 02 · MCP Client 实现.md"
source_sha256: "4551a41f414dc7c2d28f0882d399e6c287b9002dda014fe96759087aee55491d"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 9 章 · MCP 与工具扩展协议

# 02 · MCP Client 实现

通过 stdio JSON-RPC 连接 MCP server，发现和调用外部工具——核心只需要一个类。

## [McpClient 的职责](#mcpclient-的职责)

McpClient 负责：

1.  启动 MCP server 子进程
2.  通过 stdin/stdout 交换 JSON-RPC 消息
3.  发送 `initialize`、`tools/list`、`tools/call` 请求
4.  处理响应，匹配请求和响应

在 `src/mcp/client.ts` 中实现：

```
export class McpClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (response: JsonRpcResponse) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = "";
```

核心数据结构：

-   **process**：子进程引用，用于发送消息和管理生命周期
-   **requestId**：自增的请求 ID，每个 JSON-RPC 请求唯一
-   **pendingRequests**：等待响应的请求 Map。key 是请求 ID，value 是 Promise 的 resolve/reject
-   **buffer**：接收缓冲区。因为数据可能分多次到达，需要拼接后按换行符分割

## [启动和握手](#启动和握手)

```
async connect(): Promise<void> {
  this.process = spawn(this.config.command, this.config.args ?? [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...this.config.env },
  });
  this.process.stdout?.on("data", (data: Buffer) => {
    this.handleData(data.toString());
  });
  // 发送 initialize 请求完成 MCP 握手
  await this.sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mca" },
  });
}
```

`spawn` 启动子进程，用 `pipe` 模式让 stdin/stdout 可读写。子进程的 stdout 输出就是 MCP server 的响应。

握手时发送 `initialize`，告诉 server 我们支持的协议版本和能力。server 返回确认后，连接就建立了。

## [发现工具](#发现工具)

```
async listTools(): Promise<McpToolDefinition[]> {
  const response = await this.sendRequest("tools/list", {});
  const result = response.result as { tools: McpToolDefinition[] };
  return result?.tools ?? [];
}
```

`tools/list` 返回 server 暴露的所有工具。每个工具是一个 `McpToolDefinition`，包含名称、描述和参数 JSON Schema——和内部 `Tool` 接口的字段高度对应。

## [JSON-RPC 通信](#json-rpc-通信)

MCP 使用 newline-delimited JSON——每行一个 JSON 对象。发送请求时在末尾加 `\n`，接收时按 `\n` 分割：

```
private sendRequest(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
  const id = ++this.requestId;
  const request = { jsonrpc: "2.0", id, method, params };
  this.pendingRequests.set(id, { resolve, reject });
  this.process.stdin.write(JSON.stringify(request) + "\n");
  // 超时保护：10 秒
}
```

接收时：

```
private handleData(data: string): void {
  this.buffer += data;
  const lines = this.buffer.split("\n");
  this.buffer = lines.pop() ?? "";  // 保留不完整的最后一行
  for (const line of lines) {
    const response = JSON.parse(line);
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
    }
  }
}
```

关键点：**数据可能分多次到达。** 比如 server 返回的响应被拆成两次 `data` 事件。所以用 buffer 拼接，只在遇到完整行（以 `\n` 结尾）时才解析。

## [错误处理](#错误处理)

McpClient 处理三类错误：

-   **子进程崩溃。** `process.on("error", ...)` 捕获，reject 所有等待中的请求。
-   **请求超时。** 每个请求有 10 秒超时，超时后 reject。
-   **server 返回错误。** `response.error` 存在时，调用方可以检查 `isError` 标记。

这些错误都不会让 agent 崩溃——最坏的情况是 MCP 工具不可用，agent 回退到内置工具。

## [配置方式](#配置方式)

MCP server 的配置通过环境变量传入：

```
MCP_SERVERS='[{"name":"docs","command":"npx","args":["@my-org/docs-mcp-server"]}]'
```

JSON 数组格式，每个元素是一个 server 配置。之所以用环境变量而不是配置文件，是因为教学项目要保持简单。真实产品（如 Claude Code）会使用专门的配置文件。

下一节讲解 MCP 工具怎么桥接到内部 Tool 接口。

## 相关笔记

- [[3-4 MCP 的工程真相]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
