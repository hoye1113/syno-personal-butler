# P5 Personal 融合日报 Handoff

日期：2026-11-26
状态：本地实现与验收完成；未提交、未推送、未部署。

## 已完成

- Hacker News 官方采集时点 Top 30，复用文章采集、去重、评分、日报 AST 和 HTML；详情展示排名、points、评论数和 HN 讨论链接。
- AI News Radar 公开 `daily-brief.json` 最多 20 条；48 小时新鲜度检查，展示官方一手／多源一致／单一来源待核实及相关来源链接，不使用 persona 评论作为事实。
- Polymarket 独立只读快照、Top 10、同日幂等、原始响应 SHA-256、失败保留和 stale；不进入文章 DB，不提供文章操作。
- GitHub／Skill 增长榜、信源错误、Polymarket 和 scheduler 异常进入网站异常区；delivery unknown 只提示对账。
- 项目关联与选题继续复用公开文章／字幕的 `why_zh`，不读取或外发真实 vault 正文。
- 详细边界见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P5-INFORMATION-RADAR.md` 第 7.5 节。

## 验证证据

- 定向回归：25 项，25 pass，0 fail。
- 完整 `npm run gate`：788 项，782 pass，0 fail，6 skipped；3606 个文件仓库校验通过；7 个活动文档检查通过；`git diff --check` 通过。
- 公开端点隔离 smoke：HN 30 条成功，AI News Radar 20 条成功；Polymarket Node fetch 和 curl 均连接超时（HTTP 000），真实市场采集未成功。
- 隔离浏览器：HN／AI 证据详情、Polymarket 清单／详情／深链、stale、无文章操作、390×844 暗色和 1200px 亮色通过；控制台无消息。
- 验收截图位于 `/tmp/p5-fusion-ui.y6090l/`，临时目录不作为持久发布物。

## 下一轮 Plan：生产部署与独立验收（需 Owner 明确授权）

### 目标

将本轮融合日报部署为新的不可变生产 release，并确认真实调度下各板块独立成功或明确 stale，不影响既有日报投递。

### 步骤

1. 审查并仅暂存本轮声明的精确路径，本地提交；非 fast-forward 不强推，远端推送需单独授权。
2. 备份生产状态，创建不可变 release；配置网站 `P5_RADAR_SCHEDULER_STATE` 指向现有 scheduler 状态文件，不复制或输出凭据。
3. 单实例重启 Host／网站并核对 Tunnel；不得启动第二个真实消费者。
4. 独立验收网站认证、HN／AI 证据、Polymarket、异常区、移动端和桌面端。生产密码不得发到聊天。
5. 对账下一自然日 09:30 采集、增长榜、Polymarket 和 10:00 日报。缺少记录只先对账，不盲目补跑或重发。
6. 若 Polymarket 生产网络仍不可达，保留最近好快照并标 stale；另做网络出口诊断，不把 fixture 结果当作生产成功。

### 验收标准

- 新 release 和进程身份唯一，旧 release 可回滚。
- HN／AI 新文章进入真实日报，证据链接完整，既有文章编号、已阅、reaction、收藏语义不回归。
- Polymarket 成功时展示真实 Top 10；失败时明确 stale，且资讯日报仍独立成功。
- scheduler／信源／增长榜异常可见；delivery unknown 不自动重发。
- 完整 gate 与生产只读验收均有记录。
