# BLOCKED

- P3.0 旧定向计数已在文档与机器证据中按实测修正为 **14/14**（P1 6 + P2 6 + P3.0 2）；旧口径不再作为有效验收数字。
- 第一轮返工：已修复 continue/compare 丢弃本轮输入、限制 Worker 新正文的问题；新增空正文、Worker 超时、reportWorkerDone 不结算 Task 的回归测试。无新增阻塞。
- 真实 Worker 接线：OpenCode/Pi 各 1 次本地真实模型调用成功；真实测试客户端未启动、未连接飞书。无新增阻塞。
- P1 drain 返工：修复同对象多条 queued 在首条完成后不再自动 drain 的控制流；新增确定性回归覆盖同对象连续两条、不同对象并行、无进展停止。旧条件 `while (ideaDrainRequested)` 会使“第二条继续 queued”的回归在第二条未完成时即退出。
- P3.1 文档收尾：真实飞书 6 个 Task 与本地 Pi 切换 1 个 Task 均已完成并审计；真实 Host 重启 queued 恢复仍未执行（归 P3.4）；真实飞书仅有 1 条 queued 事件，“两条 queued”仅为确定性回归；accepted 不代表已读，usage/cost 未返回。无阻塞。
- 其余：无。
