# Superagent P0：macOS 实际部署清点

- 快照日期：2026-11-18（本机只读核查）。
- 核查 worktree：`/Users/hoye/Documents/workspace/syno-personal-butler-p0`，分支 `feat/superagent-p0`。
- 源码／文档基线：`53853fff5383e7791fdd379ace2e970c07051c0d`。
- 配套能力清单：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/CAPABILITY-MATRIX.md`。

## 1. 结论先行

1. 当前 LaunchAgent 已安装、已加载并运行，登录启动策略为 `at_login`；健康检查通过。
2. 实际运行目录是 **`/Users/hoye/Documents/workspace/syno-personal-butler`**，不是本 P0 worktree。launchd 监督器、Host 与 DSH chat 的进程命令及 `cwd` 均支持这一结论。
3. 实际部署目录位于 `main`，其 HEAD 与本 P0 worktree 当前 HEAD 相同，均为 **`53853fff5383e7791fdd379ace2e970c07051c0d`**（提交时间 `2026-11-17 12:01:52 +0800`，主题 `syno: complete job-20261117-739c198e`）。
4. 实际部署目录不是干净工作树：至少有 2 个已跟踪的 `ops/jobs` 文件被修改，并存在未跟踪运行记录。本轮未改动、暂存或清理这些内容。
5. 在线只读状态显示 Store、Harness、Channels 均为 ready；飞书已运行、可用且已绑定 Owner。该结论不等于本轮完成了真实飞书消息、模型回合、业务写入或云端发布验收。
6. 登录冷启动、故障后的通知投递与业务恢复仍是待验项；本轮没有注销、重启、停止服务或制造故障。

## 2. 只读核查命令与脱敏证据

以下命令均在快照时实际执行。输出只保留部署事实，不记录环境变量、凭据、App Secret、钥匙串、启动令牌、发布目标标识或 plist 内容。

### 2.1 LaunchAgent 状态

```sh
npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 run macos:status
```

脱敏结果摘要：

```json
{
  "supported": true,
  "installed": true,
  "running": true,
  "startup": "at_login",
  "webUrl": "http://127.0.0.1:8888/",
  "label": "com.syno.butler.host",
  "loaded": true,
  "jobState": "running",
  "pid": 46322,
  "lastExitCode": null,
  "healthOk": true
}
```

这里的 npm 前缀只是执行状态脚本的位置；macOS 服务标签是全机实例，不能据此推断服务从 P0 worktree 启动。

### 2.2 进程、启动时间、命令与工作目录

```sh
ps -p 46322 -o pid=,lstart=,command=
lsof -a -p 46322 -d cwd -Fn
ps -p 46327 -o pid=,ppid=,lstart=,command=
lsof -a -p 46327 -d cwd -Fn
ps -p 46345 -o pid=,ppid=,lstart=,command=
lsof -a -p 46345 -d cwd -Fn
```

| 角色 | PID / PPID | 启动时间 | 实际命令（无敏感参数） | `lsof` 的 `cwd` |
|---|---|---|---|---|
| launchd 监督器 | 46322 / 未查 | 2026-11-17 18:43:37 | `/usr/local/bin/node /Users/hoye/Documents/workspace/syno-personal-butler/scripts/syno-launchd.mjs` | `/Users/hoye/Documents/workspace/syno-personal-butler` |
| Syno Host | 46327 / 46322 | 2026-11-17 18:43:37 | `/usr/local/bin/node /Users/hoye/Documents/workspace/syno-personal-butler/apps/syno/server.mjs` | `/Users/hoye/Documents/workspace/syno-personal-butler` |
| DSH chat | 46345 / 46327 | 2026-11-17 18:43:42 | `/usr/local/bin/node …/vendor/deepseek-harness/node_modules/tsx/dist/cli.mjs …/vendor/deepseek-harness/apps/cli/src/bin.ts --profile syno --host 127.0.0.1 --port 3088 --no-open` | `/Users/hoye/Documents/workspace/syno-personal-butler/vendor/deepseek-harness` |

源码接线与进程表一致：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/scripts/syno-launchd.mjs:286-295,350-358` 从脚本所在仓库计算 `REPO_ROOT`，以该目录为 `cwd` 启动 `apps/syno/server.mjs`。P0 worktree 与部署目录 HEAD 相同，因此可用同基线源码解释进程关系。

### 2.3 部署目录与 P0 worktree 的 Git 基线

```sh
git -C /Users/hoye/Documents/workspace/syno-personal-butler rev-parse --abbrev-ref HEAD
git -C /Users/hoye/Documents/workspace/syno-personal-butler rev-parse HEAD
git -C /Users/hoye/Documents/workspace/syno-personal-butler log -1 --format='%ci%n%s'
git -C /Users/hoye/Documents/workspace/syno-personal-butler status --porcelain=v1 --untracked-files=no

git -C /Users/hoye/Documents/workspace/syno-personal-butler-p0 rev-parse HEAD
git -C /Users/hoye/Documents/workspace/syno-personal-butler-p0 status --short --branch
```

结果：部署目录为 `main@53853fff5383e7791fdd379ace2e970c07051c0d`；P0 worktree 为 `feat/superagent-p0@53853fff5383e7791fdd379ace2e970c07051c0d`。部署目录的已跟踪差异仅见两个 Job 运行记录；完整 `git status` 另有大量未跟踪运行记录，本文不展开文件名。

### 2.4 本机控制面的脱敏状态

```sh
curl -fsS http://127.0.0.1:8888/api/syno/readiness
curl -fsS http://127.0.0.1:8888/api/syno/channels
curl -fsS http://127.0.0.1:8888/api/syno/harness
```

对 Harness 输出另用本地 Node 只投影状态字段与工具名；没有读取或打印凭据字段。

```json
{
  "readiness": {
    "state": "ready",
    "components": { "store": "ready", "harness": "ready", "channels": "ready" }
  },
  "feishu": {
    "running": true,
    "available": true,
    "ownerBound": true,
    "registration": "idle",
    "home": true
  },
  "harness": {
    "runtimeMode": "deepseek-harness",
    "state": "running",
    "ready": true,
    "chatSurface": "web",
    "runtimeClosureOk": true,
    "runtimeClosureMissing": []
  }
}
```

DSH 根由在线脱敏状态直接给出：`/Users/hoye/Documents/workspace/syno-personal-butler/vendor/deepseek-harness`。chat profile 为 running/ready；capture 与 confirmation profile 当前 stopped、bootable=true、无 PID，符合按需启动形态，不能单凭 stopped 判为故障。

## 3. 部署拓扑与入口

| 组件 | 当前事实 | 边界 |
|---|---|---|
| 飞书私聊 | 唯一日常业务入口；在线状态为 running/available/ownerBound/home | 只接受绑定 Owner 私聊；不是群聊或聊天历史读取能力 |
| `127.0.0.1:8888` | Syno Host 白名单控制 API；health/readiness 可用 | 根路径及旧工作台不是业务页面；不是公开 Web 服务 |
| `127.0.0.1:3088` | 当前 DSH Web chat surface | 需要启动令牌；本文不读取或输出令牌，也未打开会话 |
| 产品模型链 | 在线列出 `kimi-coding/kimi-for-coding`、`kimi-coding/k3-256k` | 本轮未调用真实模型，未验证计时、成本或长会话 |
| Host 工具注册表 | 在线返回 34 个 `syno_*` 工具 | 其中含 capture 专用浏览器工具；不等于 34 个都开放给普通聊天 |
| 系统权限边界 | 在线返回 `terminal=false`、`sourceWrite=false`、`cron=false`、`delegate=false` | 管家不能修改源码、执行终端、主动调度或派生子 Agent |

主要源码入口：

- Host：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/server.mjs:12-18,36-51`。
- 业务与发布组装：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:320-346,432-455,1007-1014`。
- 普通聊天工具集：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/config/deepseek-harness/syno-tool-sets.mjs:3-29`。
- 业务工具真源：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/business-tools.mjs:16-44`。

## 4. 数据与配置边界

- 单仓事实源的设计位置是部署仓库的 `vault/` 与 `ops/`；任务、发布映射和审计归 `ops/`，可重建缓存归 `.runtime/`。路径规则见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/paths.mjs:45-47,82-96`。
- 当前发布配置的 `mode` 为 `production`；本文只记录该非敏感字段，配置中的目标标识和 token 不复制到本文。装配入口见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:432-434`。
- 本地状态与凭据根允许受本机配置覆盖。本轮按要求未检查环境变量、`.env`、钥匙串或 plist，因此 **实际生效的本地状态绝对路径、是否存在路径覆盖均为待验**；不能把默认路径写成已核实事实。
- 运行仓库已有未提交业务状态，HEAD 相同不表示磁盘上所有运行记录与 Git 完全一致，也不表示本轮做了逐文件哈希校验。

## 5. 恢复机制：已接线，不等于本轮故障验收通过

源码中存在以下机制：

- 初始化时恢复 Host Job、capture chunks 与未完成收录 Workflow：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:1186-1204`。
- 渠道恢复后 drain 工作流 Outbox；Outbox 每 15 秒处理一次，收录与发布每 60 秒恢复一次：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:1222-1254`。
- 收录重启恢复会按阶段重新 prepare 或对账执行结果：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/ingest-workflow-coordinator.mjs:680-729`。
- 通知 Outbox 使用幂等键、租约、指数退避、终态出口与失败事件：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/workflow-outbox.mjs:138-161,214-281`。
- 发布按 Wiki → 图片 → 目录推进，记录恢复 journal，未知效果先对账，人工冲突需后续确认：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/knowledge-publisher.mjs:161-236`。
- launchd 有崩溃退避与崩溃循环桌面告警，但这是本机运维告警，不是已删除的产品主动推送。

本轮只验证进程与 ready 状态，未验证上述恢复在真实故障中的行为。

## 6. 关键待验项与已知限制

| 优先级 | 待验／限制 | 当前证据与缺口 |
|---|---|---|
| 高 | macOS 登录冷启动 | 当前 `startup=at_login` 只证明配置与现况；未注销或重启。既有计划也明确保留该项，见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/mac-deployment-remaining-work.md:22-35` |
| 高 | 飞书真实收录、待办、记忆、待决卡片 | 当前渠道与工具在线，但本轮没有发送真实 Owner 消息，没有创建业务数据 |
| 高 | Wiki／图片／目录当前版本端到端发布 | 配置为 production，历史记录称 2026-10-20 的 756 个目标 succeeded；本轮未读云端页面，也未做新发布或恢复 |
| 高 | 通知重试、重启恢复与未知效果对账 | 源码与计时器存在；本轮未制造断网、崩溃、锁超时或远端冲突 |
| 中 | 收录状态文案错误 | 当前源码 `workflowSummary()` 仍对 committed/reported 固定返回“云端发布未启用”，见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/business-tools.mjs:46-59`；应结合 `sync` 或 `knowledge.sync_status`，限制说明见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/KNOWN-LIMITATIONS.md:12-15` |
| 中 | 模型长会话与真实成本 | 在线 ready 不覆盖 compaction、长回合超时与逐例成本；见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/KNOWN-LIMITATIONS.md:37,44` |
| 中 | 实际路径覆盖与本地状态位置 | 为避免读取敏感运行配置，本轮未查；保持待验 |
| 低 | 当前测试基线 | 本轮是只读部署清点，未跑全量测试；旧文档的通过数不能当作 2026-11-18 结果 |

## 7. 本轮未执行事项

未重启／停止服务，未读取 plist 或环境变量，未触发真实飞书、模型或外部写入，未修改业务数据，未提交或推送 Git。仅新增本文件与配套能力矩阵。
