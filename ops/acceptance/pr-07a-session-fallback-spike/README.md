# PR-07A Session/Fallback Spike

## Scope

- 固化 OpenCode Session 状态可知性和 fallback 的 fail-closed 条件。
- 记录 OpenCode 1.18.2 的真实健康状态与当前客户端 seam。
- 不停止已运行 Host，不执行真实业务写入，不把 fork/clone 或跨重启调用身份标记为已验证。

## Evidence

- `node scripts/opencode-runtime.mjs status`：OpenCode 1.18.2，`ready=true`，固定三模型链，单一 `opencode-cli-server`。
- `node scripts/probe-opencode-server.mjs`：未执行 destructive 操作；因 4318 已被未知进程占用而 fail closed，结果 `OPENCODE_PORT_OCCUPIED`。
- `node --test tests/opencode-cognitive-runtime.test.mjs`：20/20 passed。
- 完整 `pnpm test`：506/507 passed；唯一失败为既有 `server-calendar-sync.test.mjs` 绑定 `127.0.0.1:52400` 的 Windows `EACCES`，与本 PR 无关。

## Owner gate

- [ ] Owner 在隔离测试会话中验证 abort 后无迟到工具调用。
- [ ] Owner 验证 Session failure/fork/clone 行为；未完成前维持保守 fallback。
- [ ] Owner 确认手机渠道 TEST 消息数量和顺序（来自 PR-04A0），未完成前不宣称 exactly-once。

## Rollback

本 PR 可回滚到前一提交；不触碰 `%LOCALAPPDATA%\\Syno` 状态、不改变移动生产发送路径。
