# Syno · 赛诺个人管家

Syno 是一个本机运行的知识闭环私人管家（当前生产在 macOS：launchd 登录自启 + 钥匙串凭据；Windows 仍兼容，后台服务由主人手动安装）。当前只启用飞书通道（`SYNO_CHANNELS=feishu`；微信栈已于 2026-10-16 删除）。只在你说话时回复，不发任何主动消息。它以 Markdown + YAML 为长期事实源，沿用 Afu 的收件箱、选题卡和周历工作台，统一管理收录、整理、学习、复习、创作与反馈，并保留可审计的执行与恢复边界。

## 快速开始

```powershell
# 1. 递归拉取主仓与 deepseek-harness 子模块
git clone --recurse-submodules <repo-url>
cd syno-personal-butler

# 2. 安装依赖并构建运行时（若未递归克隆，执行 pnpm harness:setup 亦会自动拉取与构建）
pnpm install --frozen-lockfile
pnpm harness:setup

# 3. 运行测试并启动
pnpm test
pnpm verify
pnpm start
```

若未设置环境变量 `$env:SYNO_DSH_ROOT`，系统会自动缺省使用本仓内置的子模块 `./vendor/deepseek-harness`。如果本机已有独立的 Harness 克隆，亦可通过 `$env:SYNO_DSH_ROOT = "<外部路径>"` 覆盖。浏览器打开 <http://127.0.0.1:8888> 进入控制面（凭据、渠道、Policy）。日常对话在受控 DSH Web（默认 <http://127.0.0.1:3088>）。启动、事件协议和 permission 表的踩坑见 [运维](docs/OPERATIONS.md)。Syno 不依赖 Obsidian，也不依赖 OpenClaw。

知识库与运行记录住在知识仓库（由 `SYNO_KNOWLEDGE_ROOT` 指向；未设置时回退到代码仓库根的单库形态，见 [运维](docs/OPERATIONS.md)「知识仓库拆分」）。token-cloud Provider 与飞书均按需配置；未配置时不影响本地知识阅读、任务、提醒与待决策项。

## 核心约束

- Markdown 是唯一长期事实源；索引和数据库都是可重建缓存。
- 产品只启用 `DeepSeekHarnessCognitiveRuntime`；模型链固定为 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`（Kimi Code 订阅，经 DSH 内置 pi-ai 路由；key 由仓库根 `.env` 的 `KIMI_API_KEY` 提供）。绝不自动切换 Provider、Runtime 或升级到另一个 Agent。
- OpenCode 与 Hermes 已从产品路径删除，不是可选运行时。
- 读取可直接执行；任何写入先形成 Job，并在隔离 worktree 中产生可审计差异。
- 删除、覆盖、移动、新 MOC、新 tag 与代码修改在隔离工作区自动执行，并产生可审计差异。
- 新增与修改均在隔离工作区自动执行；高风险写入经 validator 与 GitGuard 兜底，整理冲突时暂停澄清。
- 每次提交只暂存精确的 `changed_paths`；不使用 `git add -A`，不自动 Push。

## 聊天业务工具（2026-10-18）

日常业务由聊天模型结合上下文调用工具，中文固定口令不再提前拦截消息。裸链接和附件不会自动收录；附件先隔离校验，再作为待理解的素材。收录、待办、记忆候选、工作概览和歧义处理均有受控工具入口。长期记忆仍先提出候选、等待主人后续确认；知识写入继续经过 Job / Proposal 与 Git 校验。仅显式 `/new`、`/stop` 绕过模型进行会话控制。

工作概览读取真实待办、待决策项和后台流程，不主动生成每日计划或推送消息。排期只记录时间。工具返回“已接收”不代表“已入库”。

## 已交付流程

- Afu 收件箱 → 选题卡 → Content Brief → Markdown/飞书排期。
- 知识库搜索、全文阅读和低显著度原文编辑入口，无需 Obsidian。
- 任务、待决策项、通知、学习证据、输出机会和“问赛诺”工作抽屉。
- 报告按需生成（无定时推送）；单一 Syno Host 独立于浏览器运行。

登录自启 Syno Host：

```powershell
pnpm windows:install
```

macOS（LaunchAgent，登录自动拉起 + 崩溃退避重启与桌面告警）：

```sh
pnpm macos:install   # 其余命令：macos:status / macos:restart / macos:uninstall
```

完整设计见 [架构](docs/ARCHITECTURE.md)、[权限策略](docs/POLICY.md)、[执行语义 ADR](docs/adr/0003-execution-semantics.md)、[移动交付 ADR](docs/adr/0004-mobile-delivery-contract.md)、[运维与恢复](docs/OPERATIONS.md)、[切换清单](docs/CUTOVER-CHECKLIST.md) 和 [已知限制](docs/KNOWN-LIMITATIONS.md)。
