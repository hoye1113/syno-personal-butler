# PR-08/09 Capture 与持久 Chunk

## Scope

- Capture 分析使用临时 OpenCode Session，成功后清理，不写正式 Binding。
- 持久 Chunk Manifest 支持 identity、claim lease、完成/失败状态、重启恢复、策略失效和 coverage。
- 当前不自动发布 incomplete Proposal，避免部分分析被误当作完整结论。

## 自动证据

- `node --test tests/opencode-cognitive-runtime.test.mjs tests/capture-chunk-store.test.mjs`：定向测试通过（新增 ephemeral Session 与 Chunk Store 场景）。
- `CaptureChunkStore` 使用本机 stateRoot；Chunk 元数据不复制正文。
- 固定模型链保持不变；Capture 请求使用 `ephemeralSession=true` 且 `allowedTools=[]`。

## Owner gate

- [ ] 微信 Markdown、飞书 PDF/DOCX 和浏览器抓取各一条真实输入。
- [ ] 中途失败一个 Chunk，确认重试只补失败 Chunk，已完成 Chunk 不重跑。
- [ ] Host 重启后确认 running Chunk 恢复 pending；删除异常进入 orphan cleanup。
- [ ] Owner 看到 coverage 后再决定是否接受 incomplete 版本（功能尚未开放前保持阻断）。

## Rollback

停止新的 Capture ingress 后可回滚到 `043d3ba`；不修改 Owner vault，不删除旧 workflow 或 proposal 状态。
