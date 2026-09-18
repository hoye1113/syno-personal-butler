---
id: job-20260917-p0-p1-final-four-2367ade9
intent: ingest.apply
status: completed
profile: syno-curate
approval: none
approvalsReceived: 0
phase: execution
risk: merge
channel: web
ownerKey: local-user
threadKey: goal:p0-p1
requestKey: goal:p0-p1:20260917:final-four:ingest.apply
created: 2026-09-17T07:10:23.571Z
updated: 2026-09-17T07:10:23.571Z
---

# Job job-20260917-p0-p1-final-four-2367ade9

<!-- syno:json:start -->
```json
{"id":"job-20260917-p0-p1-final-four-2367ade9","intent":"ingest.apply","status":"completed","profile":"syno-curate","approval":"none","approvalsReceived":0,"phase":"execution","risk":"merge","channel":"web","senderId":"local-user","ownerKey":"local-user","threadKey":"goal:p0-p1","requestKey":"goal:p0-p1:20260917:final-four:ingest.apply","created":"2026-09-17T07:10:23.571Z","updated":"2026-09-17T07:10:23.571Z","request":{"summary":"Syno operation: ingest.apply（当前明确选择的 P0/P1 四篇 B站图文，发布时间不早于 2026-06-01）","payloadDigest":"2367ade9","fields":["kind","operation","payload"],"kind":"syno-operation","operation":"ingest.apply"},"payloadRef":"job-20260917-p0-p1-final-four-2367ade9","decision":{"intent":"ingest.apply","allowed":true,"approval":"none","profile":"syno-curate","risk":"merge","allowedRoots":["vault","ops"],"dateFilter":{"publishedAt":">= 2026-06-01","inclusive":true},"dedupeKeys":["bv","opus_id","column_id","source_url"],"validators":["markdown","vault-contract","ops-contracts","bilibili-opus-specialized-validator"]},"result":{"applied":true,"action":"keep-separate","appliedCount":4,"skippedCount":0,"sources":[{"priority":"P0","publishedAt":"2026-09-17 11:50","opus":"1248884581735596117","column":"cv53021205","bv":"BV1nmeH6JE6c","path":"vault/00-Inbox/redwood-ceo-ai安全-2367ade9.md"},{"priority":"P1","publishedAt":"2026-08-31 23:43","opus":"1242760100068720657","column":"cv52771733","bv":"BV11otP6ZEz5","path":"vault/00-Inbox/science-视网膜假体与脑机接口-87406d7e.md"},{"priority":"P1","publishedAt":"2026-06-19 11:50","opus":"1215486911729106949","column":"cv50592841","bv":"BV152jP6LEEA","path":"vault/00-Inbox/axion-非侵入式脑机接口-559a3cc7.md"},{"priority":"P1","publishedAt":"2026-08-21 18:49","opus":"1238973412116791384","column":"cv52544137","bv":"BV1VZu96eEtw","path":"vault/00-Inbox/max-hodak-深科技组织操作系统-e4063a4b.md"}],"skipped":{"alreadyCaptured":0,"sameBvLegacyCanonical":0,"beforeJune":0,"details":[]},"changedPaths":["vault/00-Inbox/redwood-ceo-ai安全-2367ade9.md","ops/artifacts/2026/09/artifact-20260917-2367ade9.md","ops/artifacts/candidates/candidate-2367ade9.md","ops/artifacts/proposals/ingest-2367ade9.md","vault/00-Inbox/science-视网膜假体与脑机接口-87406d7e.md","ops/artifacts/2026/09/artifact-20260917-87406d7e.md","ops/artifacts/candidates/candidate-87406d7e.md","ops/artifacts/proposals/ingest-87406d7e.md","vault/00-Inbox/axion-非侵入式脑机接口-559a3cc7.md","ops/artifacts/2026/09/artifact-20260917-559a3cc7.md","ops/artifacts/candidates/candidate-559a3cc7.md","ops/artifacts/proposals/ingest-559a3cc7.md","vault/00-Inbox/max-hodak-深科技组织操作系统-e4063a4b.md","ops/artifacts/2026/09/artifact-20260917-e4063a4b.md","ops/artifacts/candidates/candidate-e4063a4b.md","ops/artifacts/proposals/ingest-e4063a4b.md"],"unverifiedIssues":["四篇来源均为 B 站第三方专栏，本轮只核验专栏正文、页面元数据和 BV 映射，未读取原始播客、原始报告、论文、监管文件或官方原始页。","临床效果、产品指标、公司内部流程、模型行为范围和未来判断均保留为专栏口径。","AXION 的历史 offtopic_bci 排除记录是旧审计结果；当前 Owner 明确选择覆盖该记录，历史审计文件未修改。"],"knowledgeState":"captured","completionStatus":"complete","mocUpdates":[],"tagUpdates":[],"unresolved":[]},"lifecycle":{"changedPaths":["vault/00-Inbox/redwood-ceo-ai安全-2367ade9.md","ops/artifacts/2026/09/artifact-20260917-2367ade9.md","ops/artifacts/candidates/candidate-2367ade9.md","ops/artifacts/proposals/ingest-2367ade9.md","vault/00-Inbox/science-视网膜假体与脑机接口-87406d7e.md","ops/artifacts/2026/09/artifact-20260917-87406d7e.md","ops/artifacts/candidates/candidate-87406d7e.md","ops/artifacts/proposals/ingest-87406d7e.md","vault/00-Inbox/axion-非侵入式脑机接口-559a3cc7.md","ops/artifacts/2026/09/artifact-20260917-559a3cc7.md","ops/artifacts/candidates/candidate-559a3cc7.md","ops/artifacts/proposals/ingest-559a3cc7.md","vault/00-Inbox/max-hodak-深科技组织操作系统-e4063a4b.md","ops/artifacts/2026/09/artifact-20260917-e4063a4b.md","ops/artifacts/candidates/candidate-e4063a4b.md","ops/artifacts/proposals/ingest-e4063a4b.md"],"reports":["ops/artifacts/proposals/ingest-2367ade9.md","ops/artifacts/proposals/ingest-87406d7e.md","ops/artifacts/proposals/ingest-559a3cc7.md","ops/artifacts/proposals/ingest-e4063a4b.md"],"status":"complete"}}
```
<!-- syno:json:end -->
