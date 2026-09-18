# 知识仓库拆分验收（D13，2026-09-01）

拆库设计冻结（#14，`98cd3ed`）、实施与 cutover（#15，`24e97af`+`97e557a`+`60a8c43`）、回归与封板（#16）。

## 状态

- 拆库形态（`SYNO_KNOWLEDGE_ROOT` 设置）：**通过**。
- 单库回退形态（env 未设置）：**通过**（712 pass + 1 skip）。
- 代码仓当前工作树：零产品写入（`git status` 干净，vault/ops 已物理迁出）。

## 事实

- 知识仓：`D:\workSpace\syno-knowledge`，`git init -b main`，初始提交 `7e0d0b0`（源 HEAD `24e97af`）。
- 代码仓删除提交：`60a8c43`（含防御性 `.gitignore` 的 `vault/`、`ops/` 条目）。
- 用户级环境变量：`SYNO_KNOWLEDGE_ROOT=D:\workSpace\syno-knowledge`；planner 配置 `%LOCALAPPDATA%\Syno\state\topic-planner.config.json` 的 vaultRoot 已同步。
- 全量备份：`C:\tmp\syno-pre-split-24e97af.bundle`（36MB，含拆库前全部历史）。
- 迁移核对：vault 666 文件、ops 684 文件（robocopy 计数），双仓均无损。
- junction 方案废弃（13.1 实证）：拆库前两个提交的 checkout 会穿透 junction 把内容写回知识仓，构成数据丢失通道；当前布局下该通道不存在（代码仓内无知识内容）。

## 关键机制（拆库形态）

- `PATHS.knowledgeRoot` 派生 `vaultRoot`/`opsRoot`；逻辑路径恒对实例根求相对（D13.6 修正：`97e557a`，实例根优先于进程级 env）。
- GitGuard：默认 `repoRoot=knowledgeRoot`；产品锁恒落代码仓 `.runtime/locks`；`productBranch: "main"` 断言仅在主检出生效（提交与合回均受限，worktree `syno/job/*` 不受限）。
- validator 双根：vault 扫描/HEAD 比对在知识仓，`config/vault-contract.json` 在代码仓（策略即代码）。
- verify 双模式：env 设置时追加知识仓形态检查（vault/ops/.git/branch=main）。

## 证据

- 结构性证据：活 Job `job-20260901-77b57d20`（知识 profile）在 cutover 后于知识仓完成；知识仓 main 连续产品提交；代码仓 `git status` 干净。
- 回归证据：双模式全量 Node 测试通过（拆库形态 713/713、0 fail——集成用例真实库运行；回退形态 712 pass + 1 skip——集成用例按设计安静跳过）。
- verify：双形态通过（env 设置：Repository verification 341 files 含知识仓形态检查；env 缺席：同 341 files 无形态检查）——拆库前为 1655 files，代码仓已零知识内容是物理迁出证明；active docs 8 files。
- fresh clone（代码仓 `D:\tmp\syno-fresh-16`）：`pnpm install --frozen-lockfile` 成功（warm store），env 缺席 `pnpm test` 712 pass + 1 skip、0 fail——零配置可跑（D13.2 回退形态承诺）。
- 卫生修正：AGENTS.md / NEXT_SESSION.md 首稿各含本机绝对路径被 verify 扫描器拦截；机制留契约、本机路径只进 docs/（verify 规则不放宽）。
- 集成用例：repo-split（PATHS 解析、GitGuard 拆库形态与 productBranch 双路径——提交+合回、validator 双根）。

## 已知限制与操作要点

- 不得从拆库前（< `60a8c43`）的分支/提交启动 Host：旧代码会在代码仓根重建 vault/ops 并写入（双轨漂移路径）。
- 回滚预案：unset `SYNO_KNOWLEDGE_ROOT` + revert `60a8c43`；历史可经 bundle 恢复。
- 本机 Host 自下次自然重启起运行 `97e557a` 之后代码（当前运行的是 `60a8c43` 时点代码，生产等价：测试与实例根修正不改变产品路径）。
