# PR-07B 条件 Session/Fallback

## 已固定策略

当前 OpenCode 客户端没有经过真实验证的 read/fork/clone seam，因此策略为：

```text
retain_current_session
```

模型 fallback 仍只在以下条件同时满足时发生：

```text
sessionStateKnown=clean
abortConfirmed=true
irreversibleEffect=false
```

Abort unknown 会冻结 Session 和 Session Scheduler key；不会进入下一模型，不会释放旧顺序权，也不会自动重试写操作。若未来 Owner 验证可靠 fork，则切换到 Attempt Session；若只能可靠读取，则仅复制经过过滤的 user/assistant text。

## 自动证据

- `node --test tests/opencode-cognitive-runtime.test.mjs`：21/21 passed。
- `pnpm verify`：Repository verification 1447 files，active documentation 7 files passed。
- `vault/tests`：Python 3.11 unittest 57/57 passed。

## Owner gate

- [ ] 真实 abort 后迟到工具调用核验。
- [ ] 真实 fork/clone 或消息读取能力核验。
- [ ] 未完成前不得改变 `retain_current_session`，不得升级 fallback 语义。

## 回滚

回滚到 PR-07A `e63b5e9` 不触碰移动状态、不清理 OpenCode Session、不修改 Owner 知识内容。
