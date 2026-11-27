# Syno 当前运维手册

> 更新日期：2026-11-27。本文只描述 P3 native Host、Pi／OpenCode Go、P5 与飞书的当前运维方式。DSH、3088／8888、旧 Harness 恢复和 Windows 服务步骤已经不属于当前生产入口。

## 1. 当前生产基线

2026-11-27 日报编号、插件超时与模块入口契约修复部署后确认的状态如下。2026-11-27 自然调度已完成只读验收，但它早于本次 release，不能代替本次修复的下一次自然调度验收；状态会漂移，操作前必须重新执行只读检查。

| 项 | 最后确认值 |
|---|---|
| 代码目录 | `/Users/hoye/Documents/workspace/syno-personal-butler-releases/current` |
| 不可变 release | `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261127T062949493Z-46c5fbf1dbe1` |
| 公开分支 / 提交 | `main` / `46c5fbf1dbe1c31fa5a02c694bc64410d3afc41f` |
| Host 入口 | `/Users/hoye/Documents/workspace/syno-personal-butler-releases/current/experiments/superagent-p0/real-feishu-client.mjs` |
| launchd 服务 | `com.syno.butler.host` |
| plist | `/Users/hoye/Library/LaunchAgents/com.syno.butler.host.plist` |
| Host PID / generation | `95039` / `25` |
| pending / hold | `0 / 0` |
| 飞书 adapter | `running=true`、`available=true` |
| active P5 插件 | `2026.11.22.8` |
| 雷达网站 | `https://radar.hoyework.online`，`com.syno.butler.radar`，PID `17766`，监听 `127.0.0.1:61210` |
| Host / 网站共享状态 | `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar-site/state`（`P5_RADAR_STATE_HOME`） |
| 网站 scheduler 状态 | `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p5-scheduler.json`（`P5_RADAR_SCHEDULER_STATE`） |
| Tunnel | `com.agentconnect.tunnel`，PID `8915`，保留 `console.hoyework.online` 与 `radar.hoyework.online`，本轮未重启 |
| Cloudflare Web Analytics | `hoyework.online` 已禁用；未删除站点，未修改或放宽 CSP |

本次 prepare 完整 gate 为 795 tests／789 pass／6 skipped／0 fail，仓库 3601 个文件、7 个活动文档、模块入口审计和 `git diff --check` 全部通过；审计报告为 `docs/plans/dead-code-audit-2026-11-27.md`。Host 单实例重启后 PID `95039`、generation `25`，adapter running／available=true，active Task、pending Decision、queued／unknown delivery、handover pending／hold 均为空，reconciliation.blocking=false；phase 为 `startup-takeover`，不仅凭该字段宣称 ready。网站 PID `17766` 与 Tunnel PID `8915` 未重启。

2026-11-27 自然调度于北京时间 09:30 完成采集、增长榜和 Polymarket，状态均为 `ok`；日报于 10:22 生成，投递为 `accepted`，这不表示用户已读。真实日报 50 条、编号连续，其中 Hacker News Top 30 为 18 条、AI News Radar 为 17 条。已认证 UI 核对了两类来源的详情、证据链接、连续编号和已阅／reaction／收藏操作区，未点击按钮改写生产状态。Polymarket UI 与原始快照均为实际 9 条，“Top 10”是最多 10 条的覆盖范围，不能补写为 10 条；原始响应 SHA-256 为 `40d654c169495269453c1c4630d9a77767633f7e0dcc814292dd7adae0b2c561`。未手动补跑或重发。

Cloudflare Web Analytics 经 Owner 明确确认后已永久关闭，返回站点列表后的持久状态为“已禁用”。公开 `/login` 未匹配 `cloudflareinsights`、`beacon.min.js`、`static.cloudflareinsights` 或 `<script`，CSP 仍为 `default-src 'self'; script-src 'self'`，未为第三方统计脚本放宽。

## 2. 目录与数据边界

| 路径 | 用途 | 运维约束 |
|---|---|---|
| `/Users/hoye/Documents/workspace/syno-personal-butler-releases/current` | 当前生产代码软链 | 不在软链目标中直接改代码；通过受控 release 切换 |
| `/Users/hoye/Documents/workspace/syno-personal-butler-releases` | 不可变生产 releases | 已存在 release 不覆盖；删除旧 release 需单独授权 |
| `/Users/hoye/Documents/workspace/syno-personal-butler-prod` | 旧生产 worktree／旧布局回滚点 | 保持 `a2a68bec8` 与干净工作树，不作为普通实验目录 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data` | P5、渠道状态与本地运行数据 | 不提交、不公开、不复制到测试仓库 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0` | Host 状态、锁、统一 SQLite 与插件注册表 | 不直接编辑业务事实 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/host-status.json` | 统一只读状态快照 | 首先检查的 Host 状态入口 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p3-decision-memory.db` | P3 业务事实数据库 | 不用普通写 SQL 修复；静态副本需按一致性规则制备 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar/settings.json` | P5 展示条数与偏好相关设置 | 优先通过雷达命令修改 |
| `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/plugins/p5-radar/active.json` | P5 active 插件注册表 | 只能由受控发布流程修改 |
| `/Users/hoye/Documents/workspace/syno-personal-butler-p0` | 私有历史开发与交接 worktree | 已归档，不是生产入口 |

凭据只由既有加密 Store、钥匙串和受控配置加载。不得把 `.env`、Token、Cookie、App Secret、认证缓存或凭据数据库复制进仓库、日志、测试夹具或聊天。

## 3. 日常只读检查

### 3.1 Host 与 adapter

```bash
jq -c '{phase:.host.phase,pid:.host.pid,generation:.handover.generation,pending:.handover.pendingCount,hold:.handover.holdCount,adapter:.host.adapter}' \
  /Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/host-status.json
```

需要看业务积压时，继续只读查看统一状态中的字段：

```bash
jq '{frozen,activeTasks,decisions,deliveries,reconciliation,handover}' \
  /Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/host-status.json
```

重点分别核对：

- active Task 与各领域的 queued；
- pending Decision；
- `deliveries.unknown` 与 `reconciliation.blocking`；
- handover pending／hold；
- adapter 是否 running、available 且绑定正确 Owner。

`accepted` 只表示提供方接受，不表示用户已读。状态文件不存在、过旧或与实际进程不一致时，不得据此宣称 ready。

### 3.2 launchd 与实际进程

```bash
launchctl print gui/$(id -u)/com.syno.butler.host
pgrep -fl '/experiments/superagent-p0/real-feishu-client.mjs'
```

两者都要看。launchd 已 bootout 不代表旧进程一定退出；旧消费者仍存活时，禁止启动第二个真实消费者。Host 日志位置以 plist 的 `StandardOutPath`／`StandardErrorPath` 为准，引用日志前必须脱敏。

### 3.3 P5

```bash
jq . /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar/settings.json
jq . /Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/plugins/p5-radar/active.json
jq . /Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p5-scheduler.json
jq . /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar/radar-growth-status.json
launchctl print gui/$(id -u)/com.syno.butler.radar
launchctl print gui/$(id -u)/com.agentconnect.tunnel
```

增长榜在 09:30 采集后、10:00 日报前同日最多尝试一次。两个来源独立结算；失败只记录 `lastGrowthStatus=failed`，不得每个 tick 重试，也不得阻断资讯日报。网站回退最近好快照并显示 stale，不得伪造今日数据。公网 `/api/growth` 必须登录；匿名返回 401。登录对 `Origin: null` 的唯一兼容仅限 `Sec-Fetch-Site: same-origin`，其他写接口不接受空 Origin。

Polymarket 同样在增长榜后、日报前独立结算，每日最多一次，不阻断资讯日报或 HTML 短链。有好快照时失败回退并标 stale；首次失败且没有好快照时，网站通过 `P5_RADAR_SCHEDULER_STATE` 显示 scheduler 告警。修改网站 plist 环境后必须 bootout/bootstrap 重新加载，`kickstart -k` 只重启进程，不会把新增环境键注入 launchd 服务。

日常状态优先在绑定 Owner 的飞书私聊发送 `雷达状态`。每日展示量、偏好权重和反馈效果需要跨 2–3 天观察；一次成功采集或一篇日报不能代替多日评估。

## 4. 开发验证

固定工具链为 Node `24.21.0` 与 pnpm `12.11.2`。在独立开发工作树执行：

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run gate
```

`gate` 包含全量 Node 测试、仓库验证、active 文档检查、模块入口审计和 `git diff --check`。CI 在 main 推送和 Pull Request 上执行相同冻结安装与 gate，不读取生产凭据，也不部署生产。

普通测试必须使用隔离 App、临时数据库和临时运行目录。不得用生产 App、生产 DB、生产 Inbox／Outbox、生产 Wiki 或真实 Owner 会话做普通回归。模型 Worker 固定使用 `opencode-go/deepseek-v4.1-flash`；不得为了测试改用高成本主 Agent 额度。

提交只暂存声明的精确路径，禁止 `git add -A`。合并、Push、生产部署和重启分别需要授权，不能由测试通过自动推导。

## 5. 不可变 release 与 current

详细契约见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/PRODUCTION-DEPLOYMENT.md`。代码合入目标分支后，在 Owner 批准的窗口由主 Agent 执行：

```bash
node scripts/deploy-production.mjs prepare --releases-root <绝对 releases 目录>
node scripts/deploy-production.mjs activate --release <上一步生成的绝对 release 目录>
```

`prepare` 要求干净工作树，运行完整 gate，从 `HEAD` 生成唯一 release，冻结安装生产依赖并写入 manifest。`activate` 校验 release 后原子切换同级 `current` 软链，保留旧 release。

这两条命令都**不重启 Host**，也不复制 `.env`、运行数据或 vault。当前生产 launchd 已指向 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/current`；`current` 是软链，激活新 release 后仍须按授权窗口重启并验收 Host。

回滚代码时，将 `activate --release` 指向上一份完整 release。若需要回退本次迁移前的旧布局，旧 worktree `/Users/hoye/Documents/workspace/syno-personal-butler-prod` 保持 `a2a68bec8`，旧 launchd 配置备份为 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/launchd-backups/20261123T141453Z-a82bac5ac/com.syno.butler.host.plist`。回退前必须确认当前消费者退出，恢复后按同一清单验收，不得并行启动两个 Host。

当前 release 是 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261127T062949493Z-46c5fbf1dbe1`，上一 release 是 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261127T000903054Z-82616b2ad0ba`；plist 备份位于 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/launchd-backups/20261126T120747Z-a00088840`。回滚时必须同时核对 `current`、实际进程身份和网站 `P5_RADAR_SCHEDULER_STATE`，不得只切软链便宣称完成。更早的阅读／跟进状态保真步骤见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P5-FOLLOW-UI-PRODUCTION-HANDOFF.md`。

## 6. 服务生命周期

以下都是生产变更，只能在 Owner 明确批准的窗口执行；文档列出命令不代表已授权运行。

### 6.1 重启

```bash
launchctl kickstart -k gui/$(id -u)/com.syno.butler.host
```

重启后必须同时检查 launchd、实际 PID、`host-status.json`、adapter 与 pending／hold。不得仅凭进程存在或一条 `accepted` 回复认定业务闭环恢复。

### 6.2 停止与启动

```bash
launchctl bootout gui/$(id -u)/com.syno.butler.host
launchctl bootstrap gui/$(id -u) /Users/hoye/Library/LaunchAgents/com.syno.butler.host.plist
```

bootout 后先用 `pgrep` 核实旧 Host 已退出。若旧进程遗留，先查明并停止旧消费者，不能直接 bootstrap 新实例。恢复后还要检查冻结状态、spool、unknown delivery 和 queued drain，避免把接管期间的 hold 当作可重发任务。

## 7. 生产接管与恢复

完整 P4 流程与证据要求见：

- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md`

这些文档记录特定历史窗口，不能替代新窗口授权。任何新接管仍须执行：

```text
freeze → 旧消费者退出 → 安全事实导入 → 静态一致 DB 副本
→ takeover preflight → 数据快照 → 唯一新 Runtime 持锁
→ recover → drain frozen → unfreeze → ready → 领域 queued drain
```

强制约束：

- 显式传递正整数 `--takeover-freeze-generation`；
- preflight 只接受无活跃写者、无 sidecar、非 WAL 文件头的静态副本；
- before 属于旧 Runtime，during drain 与 after 属于同一个新 Runtime；
- 最终验收使用观察期后重新制备的 final 静态副本；
- 任何 event／inbox、Result Lane 或 delivery 证据缺失都保持阻断；
- 不修改 expectation、不补写生产事实、不盲目重跑 drain 来制造通过。

## 8. 备份与回滚

备份至少分别覆盖：

1. 统一 SQLite 的一致性静态副本及必要事实导出；
2. 本地 `vault/`、`ops/` 与需要保留的审计记录；
3. launchd plist、P5 active 注册表和 release manifest；
4. 当前代码提交或不可变 release 标识。

凭据继续由系统钥匙串／加密 Store 保管，不进入普通备份包。`state:archive` 或单个运行状态文件不等于完整生产备份。

回滚前先冻结并确认旧消费者退出，再选择代码、插件或数据层面的对应回滚。代码回滚不应自动回滚业务事实；插件回滚只改变 active 指针，不自动证明 Host 已加载目标版本；数据恢复不能覆盖恢复窗口内新增事实。每一步都需保留前后状态与独立验收。

P5 插件的 Host 对话控制命令为 `插件状态`、`插件批准 <version> <canary-commit>`、`插件回滚 <当前version> <active-sha256>`。先从状态回复复制完整命令，避免操作期间状态已变化；批准要求版本与完整 canary commit 匹配，回滚要求版本与完整 active 内容摘要匹配。已合并的插件版本目录不可覆盖，修订必须升级版本号。merge 后崩溃按 pinned commit 对账恢复，不重复合并。这些命令已随 `a82bac5ac` 部署；本次部署未操作生产 active 插件，也不构成后续批准或回滚授权。

## 9. 故障判据

| 现象 | 首先检查 | 禁止动作 |
|---|---|---|
| 飞书无回复 | adapter、Inbox／Event、active Task、Attempt、Result Lane、Delivery | 直接重发用户消息或重跑 Worker |
| `delivery=unknown` | 外部只读对账、消息 ID 与既有发送证据 | 将 `may_send` 改回 true 或自动重试 |
| handover hold | spool 状态、ownerInstanceId、转发回执与实际进程 | 假定外部副作用未发生 |
| pending／queued 增长 | 对象 lane、Decision、Worker Attempt 与 Host phase | 跨对象合并 Session 或提前推进 Context |
| P5 插件失败 | active manifest、canary 证据、插件日志与保留版本 | 未 canary 直接 approve，或把回退当新版成功 |
| 启动即失败 | Node／pnpm 版本、冻结依赖、实际入口与脱敏错误日志 | 恢复 DSH 或旧 8888 作为生产回退 |
| 结果无法确定 | 统一事实日志与外部状态 | 以“至少执行过一次”推断“只执行一次” |

历史 Windows、DPAPI、DSH setup、Kimi key loader、3088／8888 与旧 Harness 故障记录只用于考古；当前排障不得从这些旧入口开始。
