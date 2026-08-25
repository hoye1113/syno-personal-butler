# Syno · 赛诺个人管家

Syno 是一个 Windows 本地运行的主动式知识闭环私人管家。它以 Markdown + YAML 为长期事实源，沿用 Afu 的收件箱、选题卡和周历工作台，统一管理收录、整理、学习、复习、创作与反馈，并保留可审计的执行与恢复边界。

## 快速开始

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm verify
$env:SYNO_DSH_ROOT = "<absolute-path-to-deepseek-harness>"
pnpm start
```

`SYNO_DSH_ROOT` 里的 clone 必须先 `pnpm run build`。浏览器打开 <http://127.0.0.1:8888> 进入控制面（凭据、渠道、Policy）。日常对话在受控 DSH Web（默认 <http://127.0.0.1:3088>），与微信同一会话。启动、事件协议和 permission 表的踩坑见 [运维](docs/OPERATIONS.md)。Syno 不依赖 Obsidian，也不依赖 OpenClaw。

首次启动默认使用仓库内的 `vault/`、`ops/content/` 与 `ops/artifacts/inbox/`。token-cloud Provider、飞书和微信均按需配置；未配置时不影响本地知识阅读、任务、提醒与待决策项。

## 核心约束

- Markdown 是唯一长期事实源；索引和数据库都是可重建缓存。
- 产品只启用 `DeepSeekHarnessCognitiveRuntime`；模型链固定为 `deepseek/deepseek-v4-flash-vision-exp` → `deepseek/deepseek-v4-flash`。绝不自动切换 Provider、Runtime 或升级到另一个 Agent。
- OpenCode 与 Hermes 已从产品路径删除，不是可选运行时。
- 读取可直接执行；任何写入先形成 Job，并在隔离 worktree 中产生可审计差异。
- 删除、覆盖、移动、新 MOC、新 tag 与代码修改在隔离工作区自动执行，并产生可审计差异。
- 新增与修改均在隔离工作区自动执行；高风险写入经 validator 与 GitGuard 兜底，整理冲突时暂停澄清。
- 每次提交只暂存精确的 `changed_paths`；不使用 `git add -A`，不自动 Push。
- 微信只连接独立 ClawBot 私聊，不读取个人聊天记录或控制微信群。

## 已交付流程

- Afu 收件箱 → 选题卡 → Content Brief → Markdown/飞书排期。
- 知识库搜索、全文阅读和低显著度原文编辑入口，无需 Obsidian。
- 任务、待决策项、通知、学习证据、输出机会和“问赛诺”工作抽屉。
- 08:30 晨报、22:00 晚间复盘、周日 20:00 周报；单一 Syno Host 独立于浏览器运行。
- 可选微信 iLink 私聊渠道。二维码兼容探针与完整限制见 [docs/WEIXIN-ANDROID-PROBE.md](docs/WEIXIN-ANDROID-PROBE.md)。

Windows 登录启动 Syno Host：

```powershell
pnpm windows:install
```

完整设计见 [架构](docs/ARCHITECTURE.md)、[权限策略](docs/POLICY.md)、[执行语义 ADR](docs/adr/0003-execution-semantics.md)、[移动交付 ADR](docs/adr/0004-mobile-delivery-contract.md)、[运维与恢复](docs/OPERATIONS.md)、[切换清单](docs/CUTOVER-CHECKLIST.md) 和 [已知限制](docs/KNOWN-LIMITATIONS.md)。
