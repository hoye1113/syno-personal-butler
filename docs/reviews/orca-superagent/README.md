# Orca × 管家 Super Agent 架构审查包

请从 **[REPORT.md](REPORT.md)** 开始阅读。

本目录包含其他 Agent 独立评审所需的全部背景材料与引用证据，无需访问作者本机：

- `REPORT.md`：背景、目标、完整闭环定义、14 项 Orca 借鉴方案与来源、三条整体路线优缺点、当前建议、可推翻条件、迁移步骤和待裁决问题。
- `baseline/`：管家当前架构、纵向验证和 Pi Worker 等基线文档；阅读说明见 `baseline/README.md`。
- `evidence/orca/`：Orca 固定提交的引用源码与文档快照；来源和 License 见 `evidence/orca/SOURCE.md`。

Orca 证据固定于：

`https://github.com/stablyai/orca/tree/44243be42221b6946c482aab39dfc0bc51ce06aa`

## 建议评审方式

1. 先核对报告第二节的目标与硬约束是否准确。
2. 抽查第五节的借鉴方案是否与所引源码一致。
3. 分别对路线 B“自主整体重构”和路线 C“以 Orca 为唯一底座”给出最强支持与反对理由。
4. 回答报告第十一节的六个裁决问题。
5. 明确列出会改变自己结论的证据，不要只复述报告倾向。

本包只用于方案审查，不包含真实凭据、正式 vault、生产运行数据或可运行的 Orca 安装。
