# PR-01 Bootstrap Host 验证记录

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`41a324d`
- branch：`codex/exec-p01-bootstrap-host`
- head：提交时补录
- 不含真实微信、飞书或 Owner 验收。

## 自动测试

- Node：466/466 passed。
- Vault：`python -m unittest discover -s tests -v`，57/57 passed。
- Repository verify：1408 files，active documentation 7 files passed。
- `git diff --check`：passed。

## 本机探针

- 隔离状态根启动 Syno Host 与 Fake OpenCode：passed。
- 同一状态根同时启动第二 Host、但使用不同 HTTP/OpenCode 端口：第二 Host 在创建副作用前以 `PROCESS_LOCK_HELD` 退出。
- Bootstrap MCP：`initialize`、`ping`、`tools/list` 保持可用；`tools/call` 在 Runtime 未 ready 时返回 `RUNTIME_NOT_READY`。
- Host doctor：无锁返回 `absent`；身份未知锁 fail closed；只有 PID 已确认不存活时才删除。

## 证据边界

- 上述第二 Host 演练属于本机自动化探针，不等于真实登录启动验证。
- Fake OpenCode 只证明 Bootstrap/生命周期集成缝，不证明真实 OpenCode、微信或飞书可用。
- Owner 验收：未执行。
- Windows 下次登录冷启动：未执行，保留到批次门禁和 R6。
