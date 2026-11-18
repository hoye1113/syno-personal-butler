# Pi 统一 Worker Runtime：纵向验证方案

- 日期：2026-11-17
- 状态：**已完成实测。Pi Agent Core 经 loopback OpenCode Server `generate.text` 使用固定 Go 模型完成收录，Server 退出后知识 Worker 存续，全量回归 41/41**
- 预检证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-SERVER-PREFLIGHT.md`
- 验证证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`
- 架构基线：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md`
- 现有 Worker 基线：`/Users/hoye/Documents/workspace/butler-superagent/v4/V42-VERIFICATION.md`

## 背景

DSH `0.2.2-rc.3` 已证明第三方 Agent Runtime 可以作为 autoloop 的可替换 Worker，但当前依赖较重且仍是 RC。用户希望评估 Pi Agent 作为统一 Worker Runtime：同一套实现承载多个隔离 Specialist Worker，而不是让各 Agent 框架分别成为主 Runtime。

## 目标

1. 明确“Pi 统一 Runtime”和“管家 Worker Contract”的边界，保留 autoloop 作为持久编排内核。
2. 在独立实验目录安装锁定版本 Pi，用一个真实 Pi Worker 替换 V4.2 收录 Worker。
3. 模型固定为 `opencode-go/deepseek-v4.1-flash`，复用 OpenCode Go 订阅的现有内部凭据；不得读取、导出、打印或保存 Key。
4. 验证 Pi 退出后 Hub 与其他 Worker 继续运行，并重跑全量回归。

## Worker 规范边界

Pi 只负责模型调用、工具执行、Agent Loop 和 Session。autoloop/Adapter 继续负责：

- `task_id`、`owner_event_id`、`context_id` 和 `expectedVersion`。
- 对象级 Session、cwd、Home、权限和检查点隔离。
- 超时、取消、重试、恢复和通知去重。
- Worker 候选结果与 Result Lane 可信结果分离。
- 写入幂等、故障对账、工具权限和数据出口。

多个 Worker 可以共用 Pi 实现，但必须使用独立配置和对象上下文，不能共享一个无边界的 Agent Session。

## 步骤

1. **依赖与凭据预检**
   - 锁定当前包名 `@earendil-works/pi-agent-core` / `@earendil-works/pi-ai` `1.5.2`。
   - 依赖只安装到 `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-runtime-lab`，禁用安装脚本。
   - 优先研究 OpenCode 本地服务能否在凭据不离开 CLI/Store 的前提下向 Pi 提供模型桥接。
   - 若没有兼容路径，停止真实调用并报告阻断；不得使用 `opencode auth export`、读取认证数据库或复制认证缓存。
2. **最小 Pi Worker**
   - Root、Specialist、Result Lane 沿用确定性实现，只替换 capture Worker。
   - Pi 仅返回固定 go 决定，不开放写文件或 shell 工具；真正收录继续由确定性收录器执行。
   - 使用本地合成正文，不访问真实 URL，不写正式 vault。
3. **纵向链路**
   - `Owner URL → capture:<document_id> → Pi Worker → task.result → Result Lane 独立复核 → 原 Owner 通知`。
   - 记录实际 provider/model、调用次数、进程退出和通知关联；不记录凭据或私有正文。
4. **存续与回归**
   - Pi 完成后关闭其资源，再运行知识 Worker 查询。
   - 重跑 V4 与 V0～V3；失败不得降低既有断言或冒充通过。

## 验收标准

- 使用真实 Pi 包和真实 `opencode-go/deepseek-v4.1-flash` 模型完成一次收录 Worker 链路。
- OpenCode Go 凭据只由现有 CLI/Store 内部使用，测试代码、日志、证据文件均无 Key。
- 副本 vault 只有一份完整 Markdown，Result Lane 逐字复核通过，每条 Owner 事件只有一条通知。
- Pi 退出后知识 Worker 查询成功；全量回归通过。
- 报告明确区分“模型请求成功”和“Go 控制台扣费渠道已核验”，后者不在本测试断言范围内。

## 授权停点

不读取或导出 OpenCode 凭据，不访问真实 URL，不写正式 vault，不发送真实私有正文，不升级 Syno 生产 vendor，不切换生产。若必须取得明文 Key 才能运行 Pi，立即停止并交由用户决定，不自行绕过。
