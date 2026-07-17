# Spot check 工作表：Cursor负责人：Composer模型如何训练的？

- **Vault**: `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor负责人-Composer模型如何训练的.md`
- **时长**: 45:12
- **spot_check**: （未登记）
- **transcript_source**: `Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/article.md`
- **ASR**: `${RECASTORY_WORKSPACE}\bilibili-retranscribe\BV1iH7R6tEfJ\article.md`
- **ASR 段数**: 49

## 相关阅读 wikilink
- ✓ 无死链（MOC 除外）

## 分话题 → ASR 锚点（自动；未命中 ≠ P0，需人工读段）

### 1. 为什么 Cursor 要当「基础模型公司」

- `Cursor 里的软件工程` → _ASR 未命中（核对是否为讲义归纳）_
- `把所有 bit 投这一任务` → _ASR 未命中（核对是否为讲义归纳）_
- `比 Opus 便宜数量级` → _ASR 未命中（核对是否为讲义归纳）_
- `specialize 全部权重` → _ASR 未命中（核对是否为讲义归纳）_
- `usage + harness 细节` → _ASR 未命中（核对是否为讲义归纳）_
- `craft model to your environment` → _ASR 未命中（核对是否为讲义归纳）_
- `训练继续推 Pareto frontier` → _ASR 未命中（核对是否为讲义归纳）_
- `独特 tool/环境/轨迹` → _ASR 未命中（核对是否为讲义归纳）_
- ⚠ **本节无自动命中**，优先人工对读

### 2. Composer 2 配方：mid-training + RL 双轴

- `Continual mid-training` → _ASR 未命中（核对是否为讲义归纳）_
- `code token` → other is reinforce learning.The thing that made the composer to very good is pushing in both of these directions.We started off the training
- `Large-scale RL` → _ASR 未命中（核对是否为讲义归纳）_
- `Cursor harness` → And so during reinforcement learning, you know, the model gets to play directly with the cursor harness.And so it gets to learn about the wo
- `tool call、导航、写对 code` → _ASR 未命中（核对是否为讲义归纳）_
- `correct` → And so during reinforcement learning, you know, the model gets to play directly with the cursor harness.And so it gets to learn about the wo
- `为何不自 pretrain` → _ASR 未命中（核对是否为讲义归纳）_
- `Top-down` → _ASR 未命中（核对是否为讲义归纳）_

### 3. RL 循环：不是 next token，是整段 session

- `一次完整 Cursor agent 会话` → _ASR 未命中（核对是否为讲义归纳）_
- `reward` → How it performs for a given rollout.The terminology was just called her lot.And kind of assign the reward, whether it, did something correct
- `forward/backward` → _ASR 未命中（核对是否为讲义归纳）_
- `Orchestrate 环境` → _ASR 未命中（核对是否为讲义归纳）_
- `inference` → very hard on the data dimension.And we know that the models inherently have finite capacity.And so if we want to saturate all that capacity.
- `Sync vs async pipeline` → _ASR 未命中（核对是否为讲义归纳）_
- `算法干净，一半 GPU 空转` → _ASR 未命中（核对是否为讲义归纳）_
- `staleness` → and you want to get your model.Trained quickly in economic fashion.So that' by itself is like very interesting kind of.Problem and intersect

### 4. 全球分布式与权重 delta _ship

- `低峰复用 production Composer 1.5 推理 GPU` → _ASR 未命中（核对是否为讲义归纳）_
- `~1TB 权重 snapshot` → _ASR 未命中（核对是否为讲义归纳）_
- `每 step 只变一小部分 weight` → _ASR 未命中（核对是否为讲义归纳）_
- `delta 压缩` → _ASR 未命中（核对是否为讲义归纳）_
- `lossless reconcile` → _ASR 未命中（核对是否为讲义归纳）_
- `pause ~30s swap weights` → _ASR 未命中（核对是否为讲义归纳）_
- `disaggregate trainer/inference` → _ASR 未命中（核对是否为讲义归纳）_
- `Composer` → title: "Cursor Composer"

### 5. 环境、faking、作弊

- `察觉 fake env` → _ASR 未命中（核对是否为讲义归纳）_
- `ARL 与 production 行为不一致` → _ASR 未命中（核对是否为讲义归纳）_
- `学 reward hack` → _ASR 未命中（核对是否为讲义归纳）_
- `burst 10 万 VM` → _ASR 未命中（核对是否为讲义归纳）_
- `不像 production` → _ASR 未命中（核对是否为讲义归纳）_
- `RL env vendor` → _ASR 未命中（核对是否为讲义归纳）_
- `frontier 通用 lab` → _ASR 未命中（核对是否为讲义归纳）_
- `最强环境就是 production clone` → _ASR 未命中（核对是否为讲义归纳）_
- ⚠ **本节无自动命中**，优先人工对读

### 6. 数值对齐：MoE 的 expert 选错

- `重跑 forward` → _ASR 未命中（核对是否为讲义归纳）_
- `MoE router top-k` → _ASR 未命中（核对是否为讲义归纳）_
- `expert 7 vs 9` → _ASR 未命中（核对是否为讲义归纳）_
- `deterministic kernel 顺序` → _ASR 未命中（核对是否为讲义归纳）_
- `router replay` → this interesting trick which people call a router replay but basically can have your inference just pass extra information to training and s
- `Async RL` → _ASR 未命中（核对是否为讲义归纳）_

### 7. Reward、sim RL vs online RL、long horizon

- `Reward 细节` → _ASR 未命中（核对是否为讲义归纳）_
- `越可 verify 越好 scale` → _ASR 未命中（核对是否为讲义归纳）_
- `craft task + 编码产品体验规则` → _ASR 未命中（核对是否为讲义归纳）_
- `Offline sim RL` → _ASR 未命中（核对是否为讲义归纳）_
- `16–128 并行 try` → _ASR 未命中（核对是否为讲义归纳）_
- `off-policy 乱试` → _ASR 未命中（核对是否为讲义归纳）_
- `Online real-time RL` → _ASR 未命中（核对是否为讲义归纳）_
- `sim 先 bootstrap 到 bar` → _ASR 未命中（核对是否为讲义归纳）_
- ⚠ **本节无自动命中**，优先人工对读

## 原话抽查（英文片段 ≥4 词）

- ⚠ `Allocate all of the bits to`
- ⚠ `The most leveraged attribute is actual`
- ⚠ `The model can figure out when`
- ✓ `If you have your actual product`
- ⚠ `We can't use online RL to`

## 人工结论（P0 清零后归档 audit/）

- P0：
- P1：
- 通过：是 / 否
- 通过后 frontmatter 加：`spot_check: YYYY-MM-DD`