# AGENTS.md - Obsidian Vault Agent 启动契约

> 本仓库是面向 **AI Agent 时代** 的长期 Obsidian Markdown 知识库。Markdown 文件是唯一事实源；Obsidian 只负责人工阅读、编辑与链接呈现，不是 Agent 写入网关。

## 每次进入仓库

1. 先读本文件，确认项目边界和权限。
2. 按任务读取 [ROUTER](99-System/Agent/ROUTER.md)，并根据场景按需唤醒 [[MOC - Agent Skills 武器库]] 中的 31 大 S 级神级武器库。
3. 复杂需求对齐、代码考古、架构设计或契约写作前，遵循现代研发心智：
   - 需求存在未解假设时触发 [[grilling - 交互式需求深度拷问与反向对齐|grilling]]（前沿推进，查环境不问人，附带推荐）；
   - 遇到反常遗留代码时触发 [[wait-what - 历史代码考古学与防御性治理|wait-what]]（强制刹车，Git 考古，特征测试先行，严禁盲目重构）；
   - 重大方案设计时触发 [[design-it-twice - 深度模块设计与强制双对立方案裁决|design-it-twice]]（小接口大实现，强制双轨对立方案权衡比对）；
   - 编写 Agent 文档与规范时触发 [[writing-for-agents - 高确定性高密度 Agent 契约指令写作法|writing-for-agents]]（两项负荷平衡，信息天梯，抗早熟完成防线）。
4. 收录任务必须再读 [INGEST-CONTRACT](99-System/Agent/INGEST-CONTRACT.md) 和对应 canonical Skill。
5. 写正文前读取 [DENSITY-PROFILE](99-System/Agent/DENSITY-PROFILE.md)（严格执行汪曾祺/阿城纯正中文白描，彻底清除 AI 塑料味）。
6. 目录、PARA、frontmatter、tag 与 MOC 细则见 [PROJECT](99-System/Agent/PROJECT.md)。
7. 查找或反哺知识库内容（找笔记、跨笔记讨论）先读 [MOC - 知识库导航](MOC - 知识库导航.md)，按其加载梯子最小化 context。

权威顺序：用户当前指令 > 本文件 > Agent 工作流契约 > canonical Skill > 形态专项 SUBDOC > README > 历史审计报告。

## 任务路由

| 用户意图 | canonical Skill / 武器库网关 |
|---|---|
| 收录外部内容、推文、视频笔记 | `vskill-vault-curate` + [[INGEST-CONTRACT]] |
| 基于素材写观点文或对谈稿 | `vskill-vault-write` / [[ljg-writes]] |
| 找反向链与知识关联 | `vskill-vault-relate` |
| 基于已有笔记讨论与跨知识探讨 | `vskill-vault-discuss` |
| 新建、合并、拆分或审计 MOC | `vskill-vault-moc-builder` |
| 31 大高阶专项任务（攻坚/研报/思辨/生活） | 参见 [[ROUTER]] 与 [[MOC - Agent Skills 武器库]] |

B 站 opus/cv 图文专栏任务使用 `bilibili_opus_ingest_v2`，必须先读：

`99-System/Skills/vskill-vault-curate/SUBDOC - B站图文专栏精华收录.md`

Recastory/ASR 已冻结为 Legacy，不参与新收录；仅在核验历史笔记时按 Legacy 索引加载。

## 收录硬规则

通用收录按以下状态机执行；B站专栏使用专项文档中的扩展状态机：

```text
PREFLIGHT -> ADMISSION -> INVENTORY -> CLASSIFY -> TRANSFORM
          -> RELATE -> INTEGRATE -> VALIDATE/REPORT
```

- 写入前按 BV、opus ID、cv ID、`source_url` 查重。
- B 站新收录只接受用户提供的单篇 opus/cv；不自动扫描空间，完整保留正文配图。
- B站专栏同时区分 `source_tier`、`material_tier`、`source_form` 与最终 `content_form`。
- 默认保留完整来源正文与简要导读，不强制对谈、圆桌、金句或固定空行；深度写作只按主人要求执行。
- 第三方总结使用“专栏整理”，不得把转述写进真实人物口中。
- 1 BV = 1 篇 canonical 笔记；禁止额外生成 `- 对谈稿.md`。
- S级笔记必须用“支持、补充、反驳、限制、依赖、应用于、示例”说明知识关系；不得只放裸 `[[wikilink]]`。
- 找不到真实关系时标 `status: orphan` 并说明缺口，不得凑数。
- 已有 MOC 可随收录更新；明确且无歧义的更新与移动直接执行；知识删除、合并必须展示绑定 ID、版本和范围的预览，等待主人另条真实消息确认。
- 校验未通过或 `unresolved` 非空时，不得报告“收录完成”。
- 新 B站单篇图文默认 full_body_v1，保留真实来源与未核验状态；旧 bilibili_opus_ingest_v2 仅按历史契约解释。
- 基于 vault 回答时，verified 可附来源引用；partial 使用保守措辞；unverified 只作为检索线索。

## 修改边界

- Agent 直接读写 vault 内 Markdown，不依赖 Obsidian MCP、REST API 或 Obsidian 进程。
- Recastory 等外部素材仓默认只读，除非用户明确要求修改。
- 不批量重写存量笔记；协议升级采用新收录强制、旧笔记渐进迁移。
- 不写入、回显或提交 token、cookie、密钥和本地凭据。
- 不创建重复内容，不用不相关链接破孤，不把编辑性提问伪装成现场原话。

## 完成定义

收录完成必须同时满足：目标路径正确、frontmatter 合法、tag 合法、来源可回溯、无重复 source/BV、完整正文与配图已核验、反向链或 orphan 已声明、已有 MOC 已处理、专项校验通过，并向用户披露路径、路由、变更和未解决项。

个人记忆仅存 ops/memory，经主人后续确认后生效，不属于本 vault 普通知识检索或云端发布。同步开发默认关闭，隔离验收与发布授权完成后正式启用。删除与遗忘只影响当前有效内容，不承诺擦除历史。
