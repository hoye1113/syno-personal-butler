---
title: "02 · 三种权限级别：allow / ask / deny — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/04-permissions/02-three-levels"
description: "每种工具调用都有自己的权限级别。allow 自动放行，ask 需要确认，deny 直接拒绝。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-22 02 · 三种权限级别 - allow _ ask _ deny.md"
source_sha256: "722ceb54cc4efead9444b1af8956aa2891323221ec559863724bd4ba6e0c10d3"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 4 章 · Permissions 与安全权限

# 02 · 三种权限级别：allow / ask / deny

每种工具调用都有自己的权限级别。allow 自动放行，ask 需要确认，deny 直接拒绝。

## [三级权限模型](#三级权限模型)

权限系统的核心是一个简单的三级模型：

```
/** 权限级别 */
type PermissionLevel = "allow" | "ask" | "deny";
```

每个级别对应一种行为：

级别

行为

适用场景

`allow`

直接执行，不询问

只读操作（搜索、读文件）

`ask`

调用确认回调，由用户决定

写入操作（修改文件、执行命令）

`deny`

直接拒绝，不执行

危险操作（rm -rf、git push --force）

三种级别覆盖了所有情况。不需要更复杂的模型——四级、五级只会增加理解成本，而实际收益不大。

## [默认规则](#默认规则)

权限规则通过 `PermissionRule` 接口定义：每条规则指定一个工具和它的权限级别。

```
/** 权限规则：指定某个工具的权限级别 */
interface PermissionRule {
  /** 工具名称，支持 "*" 通配 */
  tool: string;
  /** 权限级别 */
  level: PermissionLevel;
}
```

项目内置了一组默认规则：

```
/**
 * 默认权限规则
 *
 * 只读工具直接放行，写入/执行工具需要确认。
 * 这不是最安全的配置，但在教学和日常使用中找到了合理的平衡点。
 * 用户可以通过构造函数覆盖这些默认规则。
 */
const DEFAULT_RULES: PermissionRule[] = [
  { tool: "search", level: "allow" },
  { tool: "glob", level: "allow" },
  { tool: "read_file", level: "allow" },
  { tool: "git_status", level: "allow" },
  { tool: "git_diff", level: "allow" },
  { tool: "create_todos", level: "allow" },
  { tool: "update_todo", level: "allow" },
  { tool: "write_file", level: "ask" },
  { tool: "patch_file", level: "ask" },
  { tool: "run_command", level: "ask" },
];
```

规则按工具功能分成两组：

**自动放行（allow）**：`search`、`glob`、`read_file`、`git_status`、`git_diff`、`create_todos`、`update_todo`。这些工具都是只读的——它们只获取信息，不修改任何东西。即使模型疯狂调用这些工具，也不会造成破坏。

**需要确认（ask）**：`write_file`、`patch_file`、`run_command`。这些工具会改变文件系统或执行命令。模型决定调用它们时，需要暂停一下，让用户确认。

注意：默认规则里没有 `deny` 级别的规则。deny 不是通过规则表实现的，而是通过"危险命令检测"——后面会讲到。

## [权限解析：三级优先级](#权限解析三级优先级)

当 agent 调用一个工具时，`PermissionGuard` 需要决定用哪个级别。这个决策过程叫**权限解析**，在 `resolveLevel` 方法中实现：

```
/**
 * 解析工具调用的权限级别
 *
 * 优先级：
 * 1. 危险命令检测（直接 deny）
 * 2. 匹配用户自定义规则
 * 3. 无规则匹配时默认 ask（安全优先）
 */
private resolveLevel(
  toolName: string,
  args: Record<string, unknown>,
): PermissionCheckResult {
  /** 第一步：危险命令检测，优先级最高 */
  if (toolName === "run_command") {
    const command = String(args.command ?? "");
    if (isDangerousCommand(command)) {
      return {
        level: "deny",
        reason: `危险命令被拦截: ${command.slice(0, 80)}`,
      };
    }
  }
  /** 第二步：匹配规则 */
  const rule = this.rules.find((r) => r.tool === toolName || r.tool === "*");
  if (rule) {
    const reasons: Record<PermissionLevel, string> = {
      allow: "只读操作，自动放行",
      ask: `${toolName} 需要用户确认`,
      deny: `${toolName} 被权限规则拒绝`,
    };
    return { level: rule.level, reason: reasons[rule.level] };
  }
  /** 第三步：无规则匹配，默认 ask */
  return {
    level: "ask",
    reason: `${toolName} 无匹配规则，需要确认`,
  };
}
```

三个优先级，从高到低：

**优先级 1：危险命令检测。** 如果工具是 `run_command`，先检查命令内容。匹配到危险模式就直接 deny，不看规则。这一步是最硬的安全底线——不管规则怎么配置，危险命令就是不能执行。

**优先级 2：匹配规则。** 在规则表中查找匹配的工具名。支持精确匹配（`tool: "write_file"`）和通配符（`tool: "*"`）。找到匹配就用规则指定的级别。

**优先级 3：默认 ask。** 如果规则表中没有匹配的规则，默认 ask。这是一个安全优先的设计：未知工具不应该自动放行，应该先问用户。

## [PermissionGuard 类](#permissionguard-类)

权限守卫的完整结构：

```
/**
 * 权限守卫
 *
 * 每次 runAgent 调用创建一个新实例。
 * 负责三件事：
 * 1. 根据规则判断工具调用的权限级别
 * 2. 对 "ask" 级别调用确认回调
 * 3. 记录所有权限决策到审计日志
 */
export class PermissionGuard {
  private rules: PermissionRule[];
  private auditLog: AuditEntry[] = [];
  private confirmCallback: ConfirmationCallback;
  constructor(options: {
    rules?: PermissionRule[];
    confirm: ConfirmationCallback;
  }) {
    this.rules = options.rules ?? DEFAULT_RULES;
    this.confirmCallback = options.confirm;
  }
}
```

三个内部状态：

**`rules`**：权限规则列表。构造时可以传入自定义规则，不传则使用 `DEFAULT_RULES`。这意味着用户可以完全控制权限策略——比如把 `run_command` 设为 `deny`，或者把所有工具设为 `allow`（回到无权限检查的状态）。

**`auditLog`**：审计日志。每次权限检查的结果都会记录下来，包括工具名、参数、权限级别、是否批准、原因。这在调试和回顾 agent 行为时非常有用。

**`confirmCallback`**：确认回调。当权限级别为 ask 时，调用这个函数让用户做决定。这个回调由外部提供——PermissionGuard 本身不关心确认的 UI 是终端、Web 界面还是测试 mock。

## [确认回调：ConfirmationCallback](#确认回调confirmationcallback)

确认回调是一个异步函数，签名如下：

```
/**
 * 用户确认回调
 *
 * 当权限级别为 "ask" 时，agent 调用此回调请求用户确认。
 * 返回 true 表示允许执行，false 表示拒绝。
 */
type ConfirmationCallback = (
  tool: string,
  args: Record<string, unknown>,
  reason: string,
) => Promise<boolean>;
```

三个参数让回调拥有完整的上下文：要执行什么工具、参数是什么、为什么需要确认。回调返回 `true` 或 `false`，决定工具是否被执行。

在 `main.ts` 中，这个回调通过 `readline` 实现终端交互：

```
const permissionGuard = new PermissionGuard({
  confirm: async (tool, args, reason) => {
    /** 根据工具类型显示不同的提示信息 */
    if (tool === "run_command") {
      console.log(`\n  需要执行命令: ${args.command}`);
    } else if (tool === "write_file" || tool === "patch_file") {
      console.log(`\n  需要修改文件: ${args.path}`);
    } else {
      console.log(`\n  需要执行: ${tool}`);
    }
    console.log(`  原因: ${reason}`);
    const answer = await rl.question("  允许? (y/n) ");
    const approved = answer.toLowerCase().startsWith("y");
    if (!approved) {
      console.log("  已拒绝\n");
    }
    return approved;
  },
});
```

这个实现做了几件事：

**区分提示。** 不同类型的操作显示不同的信息——执行命令显示命令内容，修改文件显示文件路径。这让用户一眼就能判断操作是否合理。

**显示原因。** `reason` 参数来自 `resolveLevel` 的返回值，解释为什么需要确认（比如"write\_file 需要用户确认"）。

**简单的是/否选择。** 用户输入 `y` 允许，其他任何输入拒绝。这是一个有意为之的简单设计——权限确认不应该让用户思考太多选项。

**返回布尔值。** 回调的返回值直接决定工具是否执行。PermissionGuard 拿到这个值后，会记录到审计日志并返回给 agent 循环。

## [check 方法：权限检查的入口](#check-方法权限检查的入口)

`check` 是 PermissionGuard 的核心方法，agent 循环通过它来做权限检查：

```
/**
 * 检查工具调用是否被允许
 *
 * 返回 { approved, reason }：
 * - approved=true: 可以执行
 * - approved=false: 被拒绝，reason 说明原因
 */
async check(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ approved: boolean; reason: string }> {
  const result = this.resolveLevel(toolName, args);
  if (result.level === "allow") {
    this.recordAudit(toolName, args, "allow", true, result.reason);
    return { approved: true, reason: result.reason };
  }
  if (result.level === "deny") {
    this.recordAudit(toolName, args, "deny", false, result.reason);
    return { approved: false, reason: result.reason };
  }
  /** "ask" 级别：调用确认回调，由用户决定 */
  const approved = await this.confirmCallback(
    toolName,
    args,
    result.reason,
  );
  this.recordAudit(toolName, args, "ask", approved, result.reason);
  return { approved, reason: result.reason };
}
```

三种级别的处理路径完全不同：

**allow 路径**：解析出 allow → 记录审计 → 直接返回 `{ approved: true }`。不走确认回调，零延迟。

**deny 路径**：解析出 deny → 记录审计 → 直接返回 `{ approved: false }`。也不走确认回调，直接拦截。

**ask 路径**：解析出 ask → 调用 `confirmCallback` → 拿到用户决定 → 记录审计 → 返回用户的选择。这是唯一涉及人机交互的路径。

每条路径都会记录审计日志。不管最终是放行、拒绝还是用户确认，所有决策都有据可查。

## [Agent 循环如何使用权限检查](#agent-循环如何使用权限���查)

回到 agent 循环看完整的调用流程：

```
if (options?.permissionGuard) {
  const { approved, reason } = await options.permissionGuard.check(
    toolCall.name,
    toolCall.arguments,
  );
  if (!approved) {
    allMessages.push({
      role: "tool_result",
      toolCallId: toolCall.id,
      result: `操作被拒绝: ${reason}`,
    });
    continue;
  }
}
const result = await tool.execute(toolCall.arguments, state);
```

这段代码的关键洞察是：**拒绝不是丢弃，而是替代。**

如果工具调用被拒绝，agent 不会假装这件事没发生。它会把 "操作被拒绝: xxx" 作为工具结果追加到对话历史中。模型在下一轮推理时会看到这条消息，知道自己的操作被拒绝了，并且知道原因。

这意味着模型可以**根据拒绝信息调整策略**。比如：

-   模型尝试执行 `rm -rf node_modules` → 被拒绝 "危险命令被拦截"
-   模型看到拒绝消息，换一种方式：`rm -rf node_modules/缓存` → 还是被拒绝
-   模型再次调整：用 `rimraf` 逐个清理 → 可能通过

这种"拒绝 → 调整"的模式是权限系统的一个核心优势。模型不是在黑暗中碰壁——它能看到自己为什么被拒绝，并做出合理的反应。

## [审计日志](#审计日志)

每次权限检查的结果都会记录到审计日志中：

```
/** 审计日志条目 */
interface AuditEntry {
  tool: string;
  args: Record<string, unknown>;
  level: PermissionLevel;
  approved: boolean;
  reason: string;
}
```

审计日志可以通过 `getAuditLog()` 获取：

```
getAuditLog(): readonly AuditEntry[] {
  return [...this.auditLog];
}
```

返回的是日志的浅拷贝（`[...this.auditLog]`），防止外部直接修改内部状态。

审计日志的用途：

**调试。** agent 行为不符合预期时，查看审计日志可以知道哪些操作被允许了、哪些被拒绝了、原因是什么。

**安全回顾。** 任务完成后检查审计日志，确认 agent 没有执行不应该执行的操作。

**规则调优。** 如果发现某个工具频繁触发 ask 而用户每次都允许，可以考虑把它改成 allow，减少交互次数。

## [终端中的实际效果](#终端中的实际效果)

用户在终端中看到的效果：

```
> 帮我在 src/utils.ts 里添加一个 hello 函数
  search(query: "utils")
  → 自动放行（只读操作）
  read_file(path: "src/utils.ts")
  → 自动放行（只读操作）
  需要修改文件: src/utils.ts
  原因: patch_file 需要用户确认
  允许? (y/n) y
  patch_file(path: "src/utils.ts", ...)
  → 已修改
  需要执行命令: npm test
  原因: run_command 需要用户确认
  允许? (y/n) y
  run_command(command: "npm test")
  → 3 tests passed
已完成。
```

只读操作（search、read\_file）静默执行，用户完全感知不到权限检查。写入操作（patch\_file）和命令执行（run\_command）会暂停并询问用户。这种体验让 agent 既能高效运行，又不会在用户不知情的情况下做出破坏性操作。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
