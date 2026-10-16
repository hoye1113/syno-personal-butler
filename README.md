# Syno · 赛诺个人管家

Syno 是一个本机运行的主动式知识闭环私人管家（当前生产在 macOS：launchd 登录自启 + 钥匙串凭据；Windows 仍兼容，后台服务由主人手动安装）。它以 Markdown + YAML 为长期事实源，沿用 Afu 的收件箱、选题卡和周历工作台，统一管理收录、整理、学习、复习、创作与反馈，并保留可审计的执行与恢复边界。

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

若未设置环境变量 `$env:SYNO_DSH_ROOT`，系统会自动缺省使用本仓内置的子模块 `./vendor/deepseek-harness`。如果本机已有独立的 Harness 克隆，亦可通过 `$env:SYNO_DSH_ROOT = "<外部路径>"` 覆盖。浏览器打开 <http://127.0.0.1:8888> 进入控制面（凭据、渠道、Policy）。日常对话在受控 DSH Web（默认 <http://127.0.0.1:3088>），与微信同一会话。启动、事件协议和 permission 表的踩坑见 [运维](docs/OPERATIONS.md)。Syno 不依赖 Obsidian，也不依赖 OpenClaw。

知识库与运行记录住在知识仓库（由 `SYNO_KNOWLEDGE_ROOT` 指向；未设置时回退到代码仓库根的单库形态，见 [运维](docs/OPERATIONS.md)「知识仓库拆分」）。token-cloud Provider、飞书和微信均按需配置；未配置时不影响本地知识阅读、任务、提醒与待决策项。

## 核心约束

- Markdown 是唯一长期事实源；索引和数据库都是可重建缓存。
- 产品只启用 `DeepSeekHarnessCognitiveRuntime`；模型链固定为 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`（Kimi Code 订阅，经 DSH 内置 pi-ai 路由；key 由仓库根 `.env` 的 `KIMI_API_KEY` 提供）。绝不自动切换 Provider、Runtime 或升级到另一个 Agent。
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

登录自启 Syno Host：

```powershell
pnpm windows:install
```

macOS（LaunchAgent，登录自动拉起 + 崩溃退避重启与桌面告警）：

```sh
pnpm macos:install   # 其余命令：macos:status / macos:restart / macos:uninstall
```

完整设计见 [架构](docs/ARCHITECTURE.md)、[权限策略](docs/POLICY.md)、[执行语义 ADR](docs/adr/0003-execution-semantics.md)、[移动交付 ADR](docs/adr/0004-mobile-delivery-contract.md)、[运维与恢复](docs/OPERATIONS.md)、[切换清单](docs/CUTOVER-CHECKLIST.md) 和 [已知限制](docs/KNOWN-LIMITATIONS.md)。
