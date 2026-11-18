# V0 验证报告

- 日期：2026-11-17
- 范围：前置基线 + 合成数据最小完整闭环
- 结论：**V0 通过**。未进入 V1，未调用真实模型，未连接真实飞书或 vault，未启动生产服务。

## 一、固定基线

| 项目 | 结果 |
|---|---|
| 实验目录 | `/Users/hoye/Documents/workspace/butler-superagent` |
| 上游克隆 | `/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop` |
| 固定 SHA | `1b89219558a493d701cb20e2c3b1876576709889` |
| Node | `v24.21.0` |
| npm | `11.19.0` |
| 上游源码差异 | 无；`git status --short` 与 `git diff --stat` 均为空 |
| 原调研克隆 | `/Users/hoye/Documents/workspace/plan/source-review/agent-autoloop`，无改动 |

锁定开发依赖最初无法完整离线安装。经用户明确允许后，仅在隔离克隆执行：

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" ci --ignore-scripts --no-audit --no-fund
```

安装 5 个锁定开发包，未执行安装脚本。

## 二、上游验证

### 2.1 类型检查

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" run typecheck
```

结果：退出码 0，`tsc -p .` 通过。

### 2.2 完整测试

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" test
```

结果：

```text
tests 814
pass 793
fail 0
skipped 21
```

21 个跳过项均为 Windows 专属用例；当前环境是 macOS。测试包含协议、并发、结果重放、模拟和 3 个真实进程 crash-smoke 场景。

### 2.3 20,000 步随机模拟

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" run test:sim
```

结果：退出码 0。

```json
{
  "seed": 24301,
  "steps": 20000,
  "faults": {
    "lost": 2303,
    "duplicate": 1646,
    "restart": 1679,
    "offline": 1702,
    "channel": 1690,
    "clock": 1678
  },
  "completed": 1644
}
```

## 三、V0 端到端验证

执行：

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
```

结果：**5 通过、0 失败、0 跳过**。

| 用例 | 验证证据 |
|---|---|
| 成功链路、来源事件重放、同 token 结果重放 | `owner.chat → context.research.message → task.research → task.result → notice → 假飞书` 全部走通；重复来源事件不新增事项；同 token 同内容返回 duplicate；不同内容被拒绝；通知只投递一次 |
| 失败回执与原生重试 | 失败回执中的伪造 `task.result` 不生效；退避期间不能提前领取；原生重试沿用同一 run 并增加 attempt，随后成功闭环 |
| 取消与迟到结果 | 取消回执不能发结果；取消后迟到成功结果被拒绝；run 保持 `cancelled` |
| 伪造关联 | 确定性 Worker 包装拒绝错误 `context_id` 和 `task_id`，没有结果事件进入 Hub |
| Worker/Hub 中断与恢复 | Worker started 后保存本地 receipt，关闭并重开 runtime 后可重新领取同一 run 并提交；Hub 接收结果后、卡片投递前再次重开，卡片只投递一次 |

## 四、实现中发现并修正的问题

1. autoloop 规则要求 `cwd` 为绝对目录，已将 V0 四条规则固定到隔离实验目录。
2. 事件投影的外部事件 ID 字段是 `key`，数字 `id` 是 Hub 内部序号；测试断言已按真实结构修正。
3. `tell:"never"` 会使 Result Lane 的 notice 变成 quiet，通道不投递。Result Lane 已改为 `tell:"needed"`，Worker 等其他规则仍为 `never`。

## 五、明确未验证的范围

- V0 使用进程内真实 Hub API 和假 Agent，不经过 HTTP、真实 Worker 进程或真实飞书。
- V0 的自定义恢复测试通过关闭并重开 runtime 模拟重启，不是对自定义 Harness 的 SIGKILL；上游真实进程 crash-smoke 已单独通过。
- 尚未验证多对象 A/B/X、批量消息、stale 快照、条件版本、持久 Context Registry 和检查点信任分区；这些属于 V2。
- 尚未验证真实 Claude Code、预算硬熔断、系统账号/容器、DSH/OpenCode、vault 写入、生产迁移或单监听切换。

因此本报告只支持“合成数据最小完整闭环成立”，不支持生产就绪结论。
