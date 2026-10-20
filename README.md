# Syno · 赛诺个人管家

Syno 是本机运行的知识管家，当前生产平台为 macOS（launchd 登录自启、钥匙串凭据），保留 Windows 兼容支持。日常入口只有已绑定 Owner 的飞书私聊；微信通道栈已于 2026-10-16 删除。它围绕知识检索、资料收录、深度分析、知识维护、待办和独立记忆工作，不提供主动提醒、每日推送、学习或项目管理子系统。

## 快速开始

```sh
git clone --recurse-submodules <repo-url>
cd syno-personal-butler
pnpm install --frozen-lockfile
pnpm harness:setup
pnpm test
pnpm verify
pnpm start
```

使用 Node.js 22 或以上版本，当前平台安装建议见 [平台兼容](docs/PLATFORM-COMPATIBILITY.md)。未设置 `SYNO_DSH_ROOT` 时默认使用子模块 `vendor/deepseek-harness`；外部克隆也必须先完成构建。Kimi key 优先取宿主环境 `KIMI_API_KEY`，缺省由 supervisor 从 gitignored 的仓库根 `.env` 注入；不要将密钥写入参数、日志或仓库。

`127.0.0.1:8888` 是仅本机可访问的控制 API，根路径返回 404，不提供旧工作台页面；健康入口为 `GET /api/syno/health` 与 `/api/syno/readiness`。受控 DSH Web 默认使用 `127.0.0.1:3088`，需要启动令牌认证，与飞书共享 Owner/thread 会话。日常使用飞书无需打开 Web。启动及协议说明见 [运维](docs/OPERATIONS.md)。

长期知识在本仓 `vault/`，任务、记忆、发布映射和审计在 `ops/`；生产环境必须不设置 `SYNO_KNOWLEDGE_ROOT`。`.runtime/` 是可重建缓存，凭据和本机执行状态不提交。Syno 不依赖 Obsidian 或 OpenClaw。

## 当前能力（2026-10-20）

| 能力 | 范围与边界 |
|---|---|
| 检索与分析 | 知识搜索、分段续读全文、联网搜索和受控网页读取；反爬时可升级本机浏览器，登录及验证仍由主人完成 |
| 资料收录 | URL、文本、Markdown、HTML、PDF、DOCX、图片；先查重，支持歧义选择、后台重试和状态查询；裸链接及附件不自动收录 |
| 知识维护 | 修改、分类移动、删除、合并；只读巡检重复内容、来源、内部链接和孤岛等问题；删除与合并先预览，再由主人后续消息确认 |
| 待办 | 创建、查询、修改、完成、归档和记录排期；排期不代表主动提醒 |
| 独立记忆 | 提出候选、后续确认、查询、纠正及遗忘；只落 `ops/memory/`，不进入普通检索或云端发布 |
| 飞书发布 | Wiki 正文、原生图片、目录的版本核验与恢复；生产发布已于 2026-10-19 经主人授权启用 |
| 工作概览 | 按需读取真实待办、待决策项、后台 Job 与收录流程，不自动生成每日计划 |

聊天面提供 25 个受控业务工具、知识三件套、`web_search` 与 `skill`，清单以 `packages/syno-core/business-tools.mjs` 和 `config/deepseek-harness/syno-tool-sets.mjs` 为准。自然语言由模型结合上下文处理，仅 `/new` 与 `/stop` 绕过模型。工具返回“已接收”不代表“已入库”；本地成功也不等于云端同步完成。

## 执行与权限

- 唯一产品运行时是 `DeepSeekHarnessCognitiveRuntime`，固定 Kimi Code 模型链 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`。只有枚举的瞬态或契约错误且没有不可逆副作用时才能推进到下一模型；全部失败进入 `waiting_provider`。
- 模型没有终端、通用文件系统、通用抓取、Git 或系统控制工具，不能修改源码、选择 Provider、安装动态 MCP 或启动子 Agent。
- 明确且无歧义的知识与待办请求通过 Job / Proposal、隔离 worktree、validator 和 GitGuard 执行；记忆生效、知识删除与合并遵守各自的后续确认边界。
- 每次提交只暂存 Job 声明的精确路径；不使用 `git add -A`，不自动 Push。
- 系统不生成主动推送，也不在重启后补发历史聊天回复；主人已发起的异步收录与发布仍有状态、恢复和结果回执。

## 验证状态

2026-10-20 检查基线 `main@f91a40a`：Host、存储、Harness 和渠道均为 ready；飞书运行且已绑定 Owner。本地发布映射共 252 条，Wiki／图片／目录共 756 个目标状态为 succeeded；这是持久状态记录，不代表本轮逐篇重新检查云端页面。

同次 Node 全量测试 772 通过、1 失败、19 跳过；失败项为沙箱禁止写入真实 macOS 钥匙串（`Operation not permitted`）。Repository verification、active docs 和差异检查通过。已保存的 `cfd9b53` 冻结语义评测三轮各 150/150，但不覆盖完整聊天工具循环及真实飞书投递。详见 [P1 验收记录](docs/KNOWLEDGE-FEISHU-P1.md) 和 [已知限制](docs/KNOWN-LIMITATIONS.md)。

## 登录自启

由主人手动执行安装／卸载，产品聊天不能控制生命周期：

```sh
pnpm macos:install   # status / restart / uninstall
```

Windows 对应 `pnpm windows:install`，其余命令见 [运维](docs/OPERATIONS.md)。

更多说明见 [文档索引](docs/INDEX.md)、[架构](docs/ARCHITECTURE.md)、[权限策略](docs/POLICY.md) 和 [安全模型](docs/SECURITY.md)。
