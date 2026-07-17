# Syno · 赛诺个人管家

Syno 是一个 Windows 本地运行的个人管家和第二大脑。它以 Markdown + YAML 为长期事实源，沿用 Afu 的收件箱、选题卡和周历工作台，并加入知识检索、审批式 Agent 执行、内容策划、定时简报与可选的微信 iLink 私聊入口。

## 快速开始

```powershell
npm test
npm start
```

浏览器打开 <http://127.0.0.1:4317>。Syno 不依赖 Obsidian，也不依赖 OpenClaw。

首次启动默认使用仓库内的 `vault/`、`ops/content/` 与 `ops/artifacts/inbox/`。飞书、OpenCode、Claude Code 和微信均按需配置；未配置时不影响知识阅读与工作台。

## 核心约束

- Markdown 是唯一长期事实源；索引和数据库都是可重建缓存。
- OpenCode 按固定免费模型顺序执行，复杂或高风险任务才升级 Claude Code。
- 读取可直接执行；任何写入先形成 Job 并经过确定性 Policy。
- 删除、覆盖、移动、新 MOC、新 tag 与代码修改必须差异预览和双审批。
- 普通任务只提交精确的 `changed_paths`；不使用 `git add -A`，不自动 Push。
- 微信只连接独立 ClawBot 私聊，不读取个人聊天记录或控制微信群。

完整设计见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [docs/POLICY.md](docs/POLICY.md)。

