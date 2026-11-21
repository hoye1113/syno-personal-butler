# P3.1 Idea 确定性内核进度

目标：隔离 Context/版本/Task/Attempt/Markdown/delivery；Router 只选动作与对象，不生成正文。
顺序：0 基线核对 → 1 idea 对象与纯路由 → 2 原生执行与 Result Lane → 3 确定性测试 → 4 验收。
约束：合成想法输入 + 本地真实 Worker；不接飞书、不启动 P3.2；仅改白名单文件；不提交推送。
最大风险：同对象 queued 与原生 lane 的 claim 归属。若 claimNext 可能领到别的对象，必须在本轮自检“自己的 run 才是第一个可领”后才 claim，否则只保持 queued。
基线：代码检查点 `bbe0cffe6`、`5f7298b01`；真实客户端数据库独立为 `runtime/p3-idea.db`；未推送。
状态：P3.1 文档与机器证据收尾完成；Idea 定向 18/18，P1/P2/P3.0/P3.1 合跑 32/32、0 skipped；全量 gate 886 项、867 通过、19 跳过、0 失败；Repository 5143 files、active docs 8 files；当前停手等待 P3.2 授权。
真实证据：6 个真实飞书 Task + 1 个本地 Pi 切换 Task，全部 Result Lane passed、delivery accepted/may_send=false/provider_message_id=null；审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-real-audit.json`；切换结果 `.../p3-idea-worker-switch/2026-11-19T10-57-42-778Z/result.json`。
P1 修复：`idea-worker-drain.mjs` 以“本批有推进或收到新请求则继续”为循环条件；同对象连续 queued 在前序完成后自动依次 drain，不同对象同批并行，无进展即停，不重放 Worker/delivery。
证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-worker-smoke/opencode-2026-11-19T10-28-59-040Z/result.json`、`.../pi-2026-11-19T10-29-13-922Z/result.json`。
