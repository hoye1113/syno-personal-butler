# NEXT_SESSION — 当前交接

> 更新时间：2026-11-23。本文只保留当前事实、验证证据和下一步。2026-11-23 之前的 DSH、8888、Windows 与旧分支交接已由本文件替换；历史内容可从 Git 记录和归档文档追溯，不再作为执行指令。

## 1. 当前一句话状态

生产仍运行 P3 native Host + 飞书 + Pi／OpenCode Go + P5；P0、P1-4、P2 四项及后续审查发现的 5 个 P1 均已完成代码与隔离验证，但**未部署、未重启生产**。P1-5 多日观察仍在等待跨日证据。

## 2. 生产事实（2026-11-23 交接基线）

| 项 | 值 |
|---|---|
| 生产代码 | `/Users/hoye/Documents/workspace/syno-personal-butler-prod` |
| 分支 / 提交 | `production/main` / `a2a68bec8` |
| 入口 | `experiments/superagent-p0/real-feishu-client.mjs` |
| launchd | `com.syno.butler.host` |
| plist | `/Users/hoye/Library/LaunchAgents/com.syno.butler.host.plist` |
| Host PID / generation | `62024` / `14` |
| pending / hold | `0 / 0` |
| Feishu adapter | running / available / ownerBound |
| P5 active | `2026.11.22.7` |
| 运行数据 | `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data` |
| Host 状态 | `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/host-status.json` |
| 统一业务 DB | `/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p3-decision-memory.db` |

以上是最后交接值，不是本轮重新验收结果。下一位 Agent 操作前必须按 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/OPERATIONS.md` 重新只读核对，不得直接沿用 PID 或把历史 accepted 当作当前在线证据。

## 3. 工作树与提交

### 3.1 公开架构修复工作树

```text
路径：/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening
分支：fix/p0-runtime-hardening
基线：a2a68bec8 refactor: retire legacy DSH runtime (#21)
```

已有提交：

1. `f7a52135 fix: 将 Pi Worker 固定为仓库内依赖`
   - `pi-worker-client.mjs` 改用包名导入；
   - `@earendil-works/pi-agent-core` 与 `@earendil-works/pi-ai` 固定为 1.5.2；
   - 新增依赖解析和真实 Pi 无工具轮次测试；
   - gate：715 tests／709 pass／6 skipped／0 fail。

2. `c17ff5bb62f7043aa49b9435fe459718daa6cb69 build: 固定生产工具链与不可变发布`
   - 固定 Node 24.21.0、pnpm 12.11.2 与冻结锁文件；
   - 新增 GitHub Actions gate；
   - 新增 release prepare／current activate、manifest 与部署测试；
   - gate：717 tests／711 pass／6 skipped／0 fail；
   - 已在 `/private/tmp` 从干净提交完成真实隔离 prepare／activate，未触生产。

3. `87a99ea84 docs: 重写 P3 Host 当前架构与运维交接`
   - 当前架构、运维与本交接正文已去除 DSH／8888 现行语义。

4. `558b024d8 feat: 将项目写任务接入隔离工作区`
   - 真实 project Specialist／Host 接缝使用 TaskWorkspaceManager；候选在独立 worktree，Result Lane 后按 pinned commit 合回；
   - 覆盖建树、commit、merge、业务结算之间的崩溃恢复与旧产物只读修订。

5. `49be5a5ac feat: 增加 X 时间线只读采集`
   - 复用 P5 链，显式账号 CLI，Bearer Token 仅经进程环境和 curl stdin；只完成离线 mock 验收，未连接真实 X。

6. `143c5fe79 feat: 支持自由聊天中的显式偏好`
   - 明确的多关注／少推／别推句式进入原 P5 偏好链，普通聊天与对象命令不被劫持。

7. `7fc5148ec feat: 接入插件对话批准与回滚`
   - `插件状态`、`插件批准 <version> <canary-commit>`、`插件回滚 <当前version> <active-sha256>`；版本或内容身份不符拒绝，merge 后按 pinned commit 对账恢复。

8. `df21ec0fa fix: 让干净 CI 与不可变 release 自包含`
   - Host 使用的 autoloop 最小导入闭包固定在 `packages/syno-autoloop`，来源为 `agent-autoloop@aa946b85392efb84e8565742ddff43b1a0f06169`，保留 MIT 许可证；
   - CI 使用项目支持的 macOS runner；release prepare／activate 实际加载真实入口模块图，不再只做语法检查。

9. `8d34b0b8c fix: 将插件批准绑定到 canary 内容`
   - 同版本 canary 丢弃重建后，旧批准命令以 `P5_CANARY_COMMIT_MISMATCH` 拒绝；直接 API 同样要求完整 commit。

10. `37a5839c4 fix: 保持插件版本不可变并绑定回滚内容`
    - canary 与直接 release 均拒绝覆盖已存在版本目录；active 历史中的同版本不同内容直接拒绝；
    - 回滚绑定版本与完整 active SHA-256；CLI approve／rollback 同步内容身份参数。

11. `c8398cd63 fix: 在发布验收中加载真实入口`
    - `real-feishu-client.mjs --verify-import` 加载入口全部顶层静态／动态依赖后，在存储、凭据和网络操作前退出；
    - prepare／activate 均执行真实入口，回归覆盖入口独有的缺失依赖。

P2 最终 gate：744 tests／738 pass／6 skipped／0 fail。首轮修复双次 gate 均为 747 tests／741 pass／6 skipped／0 fail。本次边界修复后，本工作树及 `c8398cd63` 的独立干净 worktree 各跑一次完整 gate：均为 748 tests／742 pass／6 skipped／0 fail；Repository verification 3577 files、Active documentation 7 files、`git diff --check` 均通过。干净提交另完成真实 release prepare、生产依赖冻结安装和真实入口加载，未 activate 或部署。

### 3.2 私有历史工作树

```text
路径：/Users/hoye/Documents/workspace/syno-personal-butler-p0
提交：c45af573 docs: 归档 p0 并记录 P0 修复
标记：/Users/hoye/Documents/workspace/syno-personal-butler-p0/ARCHIVED.md
交接：/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/HANDOFF-2026-11-23.md
```

p0 只保留私有开发、审查、ops／event 和交接历史，不再是生产入口或新功能默认开发目录。既有未提交运行记录保持原样，不得混入代码或文档提交。

## 4. 当前架构锚点

- Owner 只面对一个管家；飞书私聊是唯一日常入口。
- Root Router → Domain Specialist → Object Context；多候选指代必须通过 Decision 追问。
- 统一 SQLite 保存 Event／Inbox／Context／Task／Attempt／Candidate／Decision／Delivery／Handover。
- Worker 完成只结算 Attempt；Result Lane 与 Host 独立复核后才结算业务 Task。
- Delivery 原子 claim；`unknown` 保持 `may_send=false`，先对账，不盲目重发。
- 本地 Markdown vault 保留；运行数据库不替代长期知识与审计资料。
- Pi／OpenCode Go 是可替换 Worker，不是主 Runtime；模型固定 `opencode-go/deepseek-v4.1-flash`。
- P5 默认每日 50 条，支持偏好、跟进、忽略、Wiki 日报与插件 canary／approve／rollback。
- DSH、DSH 插件、vendor 与旧 8888 已退役，不得作为生产回退重新引入。

当前完整契约见：

- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/ARCHITECTURE.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/OPERATIONS.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/PRODUCTION-DEPLOYMENT.md`

## 5. P1-4 文档重写

本轮已将以下三份活动文档从旧 DSH 正文改为当前 P3 native Host 架构：

- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/ARCHITECTURE.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/OPERATIONS.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/NEXT_SESSION.md`

重写范围包括路由与对象隔离、统一事实日志、Result Lane、delivery、Handover、Worker 边界、P5 插件、macOS launchd、固定工具链、不可变部署、备份回滚和故障判据。旧运行细节只保留“已退役／仅历史追溯”的说明。

验证命令：

```bash
corepack pnpm run gate
```

最终验证：717 tests／711 pass／6 skipped／0 fail；Repository verification 通过（3556 files）；Active documentation 通过（7 files）；`git diff --check` 通过。文档变更未触生产代码、运行数据或服务。

## 6. 下一步：等待 P1-5 跨日观察

### P1-5：P5 多日观察（仍在进行）

连续观察 2–3 天后再决定每日 40／50／60 条及偏好权重。每天至少记录：

- 日期、active 插件版本、设置中的 maxItems；
- 实际采集与展示条数、偏好优先／圈外探索／其余分布；
- 日报与飞书短链接是否完成，失败或空结果是否如实呈现；
- Owner 的跟进／忽略／偏好反馈及后续排序是否体现；
- 重复、过时、低相关和语言／摘要质量问题；
- 不改变生产设置的只读证据与必要的脱敏说明。

短时检查不能冒充多日观察。观察期结束前不提前选择 40／50／60，也不自动改生产权重。

### P2：四项已完成代码与隔离验收

1. TaskWorkspace 接真实写任务：`558b024d8`；
2. P5.1 X 只读直连：`49be5a5ac`；
3. 自由聊天偏好解析：`143c5fe79`；
4. 管家窗口内插件 canary 批准／回滚：`7fc5148ec`。

X 仅有离线 fixture／假 curl／临时 SQLite 证据，不能声称真实 API 已验收；插件命令仅完成临时真实 Git 仓验收，未操作生产 active。后续若要把公开 main 用于生产，必须另开授权窗口，重新审查、制备 release、激活并验收。

## 7. 授权与停止条件

当前授权覆盖独立工作树中的实现、隔离测试、文档与精确提交、清理完成后 fast-forward 更新公开 main，以及 P5 的只读多日观察。以下事项**没有**新的授权：

- 创建或激活生产发布；
- 修改 `/Users/hoye/Documents/workspace/syno-personal-butler-prod`；
- 切换生产 current、安装或修改 launchd；
- 停止、启动或重启生产 Host；
- 修改生产 P5 条数、权重或 active 插件；
- 读取、复制或输出凭据、私有 Memory 值或无关 vault 正文；
- 删除 p0、知识仓或历史运行记录。

遇到生产效果未知时先只读对账；遇到多候选对象时追问；遇到授权缺口时停下问 Owner。系统后台通知不是 Owner 批准。

## 8. 历史追溯

- 2026-11-23 总交接：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/HANDOFF-2026-11-23.md`
- p0 归档说明：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/ARCHIVED.md`
- P4 历史接管 Runbook：`/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`
- 本文件旧版：通过本文件路径的 Git 历史读取，不与当前指令混用。
