import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseReviewDecision,
  runGh,
  assertHeadConsistency,
  chunksToText,
  extractLinkedIssueNumber,
  EXIT_BUSY,
  sendToast,
  formatReviewSummaryForCard,
  buildReviewPrompt
} from '../scripts/review-with-claude.mjs';
import {
  trackApprovedTimeout,
  parseGraphQLPRsPages,
  parseGraphQLIssuesPages,
  handleNext
} from '../scripts/agent-loop.mjs';
import { ProcessFileLock } from '../packages/syno-core/process-lock.mjs';

test('parseReviewDecision: 独立判定行提取、开场白兼容与抗正文误导', () => {
  // 1. 标准 APPROVED
  const approvedText = `RESULT: [APPROVED]

### 1. 评审结论概述
所有验收标准均已满足，无阻断性问题。
`;
  const res1 = parseReviewDecision(approvedText);
  assert.equal(res1.isApproved, true);
  assert.equal(res1.decision, 'APPROVED');

  // 2. CHANGES_REQUESTED，且正文中引用了 RESULT: [APPROVED]（抗正文误导）
  const changesReqText = `RESULT: [CHANGES_REQUESTED]

### 1. 评审结论概述
之前版本曾给过 RESULT: [APPROVED]，但本次发现逻辑漏洞，需要修正。
`;
  const res2 = parseReviewDecision(changesReqText);
  assert.equal(res2.isApproved, false);
  assert.equal(res2.decision, 'CHANGES_REQUESTED');

  // 3. 兼容 LLM 开场白前言，只要独立判定标头唯一明确即可通过
  const preambleText = `静态核验完成。我已读取全部变更文件磁盘实态，准备输出结论。

RESULT: [APPROVED]

### 1. 评审结论概述
通过。
`;
  const res3 = parseReviewDecision(preambleText);
  assert.equal(res3.isApproved, true);
  assert.equal(res3.decision, 'APPROVED');

  // 4. 出现冲突的独立判定标头，必须失败关闭
  const conflictText = `RESULT: [APPROVED]
部分正文...
RESULT: [CHANGES_REQUESTED]
`;
  assert.throws(() => parseReviewDecision(conflictText), /相互冲突/);

  // 5. 空文本必须失败关闭
  assert.throws(() => parseReviewDecision(''), /审查输出为空/);
  assert.throws(() => parseReviewDecision('   \n  \n'), /审查输出为空/);

  // 6. 无独立判定标头必须失败关闭
  assert.throws(() => parseReviewDecision('这是一段没有任何结果标头的审查输出'), /未找到独立成行的判定标头/);

  // 7. 非法结果标头
  assert.throws(() => parseReviewDecision('RESULT: [UNKNOWN_STATE]'), /非法的判定状态/);
});

test('chunksToText: UTF-8 多字节分片拼接保真性（中文、Emoji、环境变量引用）', () => {
  const original = '这是包含特殊变量 %PIPELINE_SENTINEL% 以及 Emoji 🚀 和换行\n的多字节测试文本。';
  const fullBuf = Buffer.from(original, 'utf8');

  // 故意在中文多字节（3字节）中间切断
  const chunk1 = fullBuf.subarray(0, 5);
  const chunk2 = fullBuf.subarray(5, 12);
  const chunk3 = fullBuf.subarray(12);

  const decoded = chunksToText([chunk1, chunk2, chunk3]);

  assert.equal(decoded, original, '分片拼接后的字符串必须与原始多字节内容完全一致');
  assert.ok(!decoded.includes('\uFFFD'), '不得产生 UTF-8 乱码替换符');
});

test('assertHeadConsistency: 真实版本一致性校验纯函数断言', () => {
  const headA = '903621e55041db496f09ff268c5ae402756576e5';
  const headB = 'ce1d1bc55e14c36a5d1255f289a896d8b2abb50f';

  // 相同 SHA 必须无报错通过
  assert.doesNotThrow(() => assertHeadConsistency(headA, headA));

  // 不同 SHA 必须抛出 HEAD_SHA_MISMATCH 异常
  assert.throws(
    () => assertHeadConsistency(headA, headB),
    (err) => err.code === 'HEAD_SHA_MISMATCH' && err.message.includes('PR head SHA 在审查期间发生变更')
  );

  // 缺失任一 SHA 必须抛出异常
  assert.throws(
    () => assertHeadConsistency(headA, null),
    (err) => err.code === 'HEAD_SHA_MISMATCH' && err.message.includes('PR head SHA 在审查期间发生变更')
  );
  assert.throws(
    () => assertHeadConsistency('', headA),
    (err) => err.code === 'HEAD_SHA_MISMATCH' && err.message.includes('PR head SHA 在审查期间发生变更')
  );
});

test('审查工具只读边界：白名单仅允许 Read,Glob,Grep，严格剔除 Bash,Edit,Write', async () => {
  const scriptContent = await fs.readFile(path.resolve('scripts/review-with-claude.mjs'), 'utf8');

  assert.match(scriptContent, /'--tools',\s*'Read,Glob,Grep'/);
  assert.doesNotMatch(scriptContent, /'--tools',\s*'.*Bash.*'/);
  assert.doesNotMatch(scriptContent, /'--tools',\s*'.*Edit.*'/);
  assert.doesNotMatch(scriptContent, /'--tools',\s*'.*Write.*'/);
});

test('调度器与审查脚本：GraphQL 全量分页扫描（--paginate --slurp）消除固定上限', async () => {
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');
  assert.match(loopScript, /'--paginate',\s*'--slurp'/);
  assert.doesNotMatch(loopScript, /'--limit'/);
  assert.match(loopScript, /ISSUES_PAGINATED_QUERY/);
  assert.match(loopScript, /PRS_PAGINATED_QUERY/);
});

test('分页回归验证：超过单页上限（>100 条）仍能完整获取多页数据，且深页中较旧的返修任务保持最高优先级', async () => {
  // 1. 模拟多页 GraphQL 响应（第一页 100 条普通 PR，第二页包含 1 条较旧的 changes-requested PR）
  const page1PRs = Array.from({ length: 100 }, (_, i) => ({
    number: i + 1,
    title: `PR #${i + 1}`,
    body: `Body #${i + 1}`,
    headRefName: `feat/branch-${i + 1}`,
    headRefOid: `sha-${i + 1}`,
    isDraft: false,
    createdAt: new Date(Date.now() - (100 - i) * 60000).toISOString(),
    labels: { nodes: [] }
  }));

  const olderFixPR = {
    number: 999,
    title: 'PR #999 需要返修',
    body: 'Fixes #42',
    headRefName: 'feat/branch-older-fix',
    headRefOid: 'sha-older-fix-999',
    isDraft: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    labels: { nodes: [{ name: 'changes-requested' }] }
  };

  const simulatedPages = [
    {
      data: {
        repository: {
          pullRequests: {
            nodes: page1PRs,
            pageInfo: { hasNextPage: true, endCursor: 'cursor-page-1' }
          }
        }
      }
    },
    {
      data: {
        repository: {
          pullRequests: {
            nodes: [olderFixPR],
            pageInfo: { hasNextPage: false, endCursor: 'cursor-page-2' }
          }
        }
      }
    }
  ];

  // 2. 验证 parseGraphQLPRsPages 能够穿透多页全部提取（总数 101 条，突破单页上限）
  const allParsedPRs = parseGraphQLPRsPages(simulatedPages);
  assert.equal(allParsedPRs.length, 101, '解析结果必须包含多页全部 101 条数据');
  assert.equal(allParsedPRs[100].number, 999);
  assert.equal(allParsedPRs[100].body, 'Fixes #42');

  // 3. 验证调度器 handleNext 在 100+ 候选集中，精准找到位于第二页较旧的 changes-requested PR 并优先分发
  const dispatchRes = await handleNext({
    prs: allParsedPRs,
    issues: []
  });

  assert.equal(dispatchRes.action, 'FIX_PR', '深页中的待返修任务必须获得最高分发优先级');
  assert.equal(dispatchRes.prNumber, 999, '必须命中深页中的 PR #999');
});

test('调度与审查锁：failFast 机制防止并发重叠', async (t) => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pipeline-lock-test-'));
  t.after(() => fs.rm(tmpDir, { recursive: true, force: true }));

  const lockFile = path.join(tmpDir, 'test-pipeline.lock');
  const lock1 = new ProcessFileLock({ file: lockFile, failFast: true, metadata: { id: 'proc1' } });
  const lock2 = new ProcessFileLock({ file: lockFile, failFast: true, metadata: { id: 'proc2' } });

  const lease1 = await lock1.acquire();
  try {
    await assert.rejects(lock2.acquire(), (err) => err.code === 'PROCESS_LOCK_HELD');
  } finally {
    await lease1.release();
  }

  const lease2 = await lock2.acquire();
  await lease2.release();
});

test('runGh 错误传播与超时控制：非零退出抛出异常，支持显式 timeout', () => {
  assert.throws(
    () => runGh(['invalid-subcommand-definitely-fails-xyz']),
    (err) => err.code === 'GH_COMMAND_FAILED' && err.message.includes('gh invalid-subcommand-definitely-fails-xyz 失败')
  );
});

test('extractLinkedIssueNumber: 严格识别显式关联关键字，忽略偶发哈希', () => {
  assert.equal(extractLinkedIssueNumber('Fixes #2'), '2');
  assert.equal(extractLinkedIssueNumber('Closes #10\nSome details'), '10');
  assert.equal(extractLinkedIssueNumber('This PR Resolves #42.'), '42');
  assert.equal(extractLinkedIssueNumber('Issue #99: test description'), '99');
  assert.equal(extractLinkedIssueNumber('fixes #123'), '123');

  // 偶发哈希或无关联词不应被当作关联 issue
  assert.equal(extractLinkedIssueNumber('PR 描述中提到 #42 但没有关联动作词'), null);
  assert.equal(extractLinkedIssueNumber('commit #abcdef123'), null);
  assert.equal(extractLinkedIssueNumber(''), null);
  assert.equal(extractLinkedIssueNumber(null), null);
  assert.equal(extractLinkedIssueNumber(undefined), null);
});

test('EXIT_BUSY 常量与进程锁忙退出契约', () => {
  assert.equal(EXIT_BUSY, 75);
});

test('trackApprovedTimeout: persist 开关与延迟 markNotified 落盘逻辑', async (t) => {
  const tmpPR = { number: 99999, title: 'Test PR', headRefName: 'test-branch' };
  const reviewsDir = path.resolve('.runtime', 'reviews');
  const stateFile = path.resolve(reviewsDir, `pr-${tmpPR.number}-approved-since.json`);
  t.after(async () => {
    try { await fs.unlink(stateFile); } catch {}
  });

  // 1. persist: false 不写盘
  const res1 = trackApprovedTimeout(tmpPR, { persist: false });
  assert.equal(typeof res1.waitingHours, 'string');
  assert.equal(res1.isStale, false);
  assert.equal(res1.shouldNotify, false);
  const existsAfterNoPersist = await fs.access(stateFile).then(() => true).catch(() => false);
  assert.equal(existsAfterNoPersist, false, 'persist: false 时不得向磁盘写入状态文件');

  // 2. persist: true 首次写盘
  const res2 = trackApprovedTimeout(tmpPR, { persist: true });
  const existsAfterPersist = await fs.access(stateFile).then(() => true).catch(() => false);
  assert.equal(existsAfterPersist, true, 'persist: true 时必须初始化状态文件');

  // 3. 模拟超时但未通知
  const pastDate = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  await fs.writeFile(stateFile, JSON.stringify({ firstSeenAt: pastDate, notified: false }, null, 2), 'utf8');

  const res3 = trackApprovedTimeout(tmpPR, { persist: true });
  assert.equal(res3.isStale, true);
  assert.equal(res3.shouldNotify, true);

  // 确认在调用 markNotified() 之前，文件内的 notified 依然为 false
  const stateBeforeMark = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  assert.equal(stateBeforeMark.notified, false, '在实际通知交付前，notified 状态不得被提前置为 true');

  // 4. 调用 markNotified() 后才真正落盘
  res3.markNotified();
  const stateAfterMark = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  assert.equal(stateAfterMark.notified, true, 'markNotified() 执行后，notified 状态必须落盘');

  // 5. 再次查询时 shouldNotify 变为 false
  const res4 = trackApprovedTimeout(tmpPR, { persist: true });
  assert.equal(res4.isStale, true);
  assert.equal(res4.shouldNotify, false, '已通知过的 PR 不得重复触发通知');
});

test('审查与调度脚本安全加固契约断言', async () => {
  const reviewScript = await fs.readFile(path.resolve('scripts/review-with-claude.mjs'), 'utf8');
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');

  // 1. 必须使用 --body-file 避免 Windows shell 转义与参数泄漏
  assert.match(reviewScript, /'--body-file'/);

  // 2. 审查报告与版本校验必须显式绑定 headRefOid
  assert.match(reviewScript, /headRefOid/);

  // 3. Windows 超时必须调用 taskkill /PID /T /F 清理进程树，且输出包含 stderr 摘要
  assert.match(reviewScript, /taskkill/);
  assert.match(reviewScript, /\/PID/);
  assert.match(reviewScript, /\/T/);
  assert.match(reviewScript, /\/F/);
  assert.match(reviewScript, /stderrTail/);

  // 4. 路径必须统一锚定 REPO_ROOT 而非不可靠的 process.cwd()
  assert.match(reviewScript, /REPO_ROOT = resolve\(__dirname, '\.\.'\)/);
  assert.match(loopScript, /REPO_ROOT = resolve\(__dirname, '\.\.'\)/);

  // 5. 调度层外层超时 (25m) 必须严格大于审查层内层超时 (20m)
  assert.match(reviewScript, /20\s*\*\s*60\s*\*\s*1000/); // 20m
  assert.match(loopScript, /25\s*\*\s*60\s*\*\s*1000/); // 25m

  // 6. 进程锁忙时专属退出码 75 (EXIT_BUSY) 契约绑定
  assert.match(reviewScript, /process\.exit\(EXIT_BUSY\)/);
  assert.match(loopScript, /reviewErr\.status === EXIT_BUSY/);

  // 7. 调度器超时提醒必须导入并触发 sendToast 桌面提醒
  assert.match(loopScript, /sendToast/);
});

test('sendToast: 正常返回布尔值且不抛出异常', async () => {
  const res = await sendToast('Test Title', 'Test Body');
  assert.equal(typeof res, 'boolean');
});

test('安全分支认领与回滚契约：仅全新分支允许 branch -D，复用分支绝不强删', async () => {
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');

  // 必须分别跟踪 createdNew 与 reusedExisting
  assert.match(loopScript, /let createdNew = false/);
  assert.match(loopScript, /let reusedExisting = false/);

  // branch -D 必须且只能受 createdNew 保护
  assert.match(loopScript, /if\s*\(createdNew\)\s*\{[\s\S]*?branch', '-D'/);
  assert.doesNotMatch(loopScript, /if\s*\(reusedExisting\)\s*\{[\s\S]*?branch', '-D'/);
});

test('子进程调用安全隔离：全部 gh, git 与 claude 派生进程显式指定 cwd: REPO_ROOT', async () => {
  const reviewScript = await fs.readFile(path.resolve('scripts/review-with-claude.mjs'), 'utf8');
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');

  // runGh 必须包含 cwd: REPO_ROOT
  assert.match(reviewScript, /runGh[\s\S]*?cwd:\s*REPO_ROOT/);
  assert.match(loopScript, /runGh[\s\S]*?cwd:\s*REPO_ROOT/);

  // review-with-claude 派生 claude 进程必须包含 cwd: REPO_ROOT
  assert.match(reviewScript, /spawn\('claude'[\s\S]*?cwd:\s*REPO_ROOT/);

  // agent-loop 派生 review 脚本必须包含 cwd: REPO_ROOT
  assert.match(loopScript, /review-with-claude\.mjs'[\s\S]*?cwd:\s*REPO_ROOT/);
});

test('notify-feishu: 复用 officialSdk 动态懒加载 @larksuiteoapi/node-sdk 契约断言', async () => {
  const feishuScript = await fs.readFile(path.resolve('scripts/notify-feishu.mjs'), 'utf8');
  assert.match(feishuScript, /officialSdk/);
  assert.doesNotMatch(feishuScript, /import\s+\*\s+as\s+lark\s+from\s+'@larksuiteoapi\/node-sdk'/);

  const feishuChannel = await fs.readFile(path.resolve('packages/syno-core/feishu-channel.mjs'), 'utf8');
  assert.match(feishuChannel, /import\("@larksuiteoapi\/node-sdk"\)/);
});

test('notify-feishu: FEISHU_SEND_TIMEOUT_MS 上限与 Promise.race 超时熔断契约', async () => {
  const feishuScript = await fs.readFile(path.resolve('scripts/notify-feishu.mjs'), 'utf8');
  assert.match(feishuScript, /FEISHU_SEND_TIMEOUT_MS/);
  assert.match(feishuScript, /Promise\.race/);
});

test('formatReviewSummaryForCard: 审查报告精炼提取为飞书卡片可读摘要', () => {
  // 1. CHANGES_REQUESTED 场景：提取缺陷条目与结论概述
  const changesRequestedReport = `RESULT: [CHANGES_REQUESTED]

### 1. 评审结论概述
本次审查发现 2 项高风险缺陷，需由 Gemini 修复后方可合入。

### 2. 验收标准逐条核对
- [x] 验收点 1
- [ ] 验收点 2

### 3. 详细缺陷清单与修改指导 (供 Gemini 修复使用)
- **[缺陷级别: 阻断] scripts/agent-loop.mjs:276**
  - **问题分析**: 回滚误删分支
  - **修复建议**: 区分 createdNew 与 reusedExisting
- **[缺陷级别： 高] scripts/notify-feishu.mjs:85**
  - **问题分析**: 发送无超时保护
  - **修复建议**: 增加 Promise.race 20s 限时

### 4. 总结
返修优先级按阻断->高。
`;

  const crCardSummary = formatReviewSummaryForCard(changesRequestedReport, false);
  assert.match(crCardSummary, /待修复缺陷 \(2 项\)/);
  assert.match(crCardSummary, /1\. \*\*\[缺陷级别: 阻断\] scripts\/agent-loop\.mjs:276\*\*/);
  assert.match(crCardSummary, /2\. \*\*\[缺陷级别： 高\] scripts\/notify-feishu\.mjs:85\*\*/);
  assert.match(crCardSummary, /评审概述/);

  // 2. APPROVED 场景：提取核准概述
  const approvedReport = `RESULT: [APPROVED]

### 1. 评审结论概述
全部 16 项回归测试与静态契约核验通过，代码设计符合 SOLID 原则。

### 4. 总结
核准合并。
`;

  const appCardSummary = formatReviewSummaryForCard(approvedReport, true);
  assert.match(appCardSummary, /全部 16 项回归测试/);

  // 3. 边界空值测试
  assert.equal(formatReviewSummaryForCard('', false), '');
  assert.equal(formatReviewSummaryForCard(null, true), '');
});

test('buildReviewPrompt: 极速轻量审查模式 (fast review mode) 契约断言', () => {
  const sampleContext = {
    prNumber: 42,
    title: 'fix(pipeline): support fast review mode',
    headRefOid: 'abcdef1234567890abcdef1234567890abcdef12',
    headRefName: 'feat/fast-review',
    baseRefName: 'main',
    bodyText: 'Fixes #10\nThis PR introduces fast review mode.',
    issueContext: 'Issue #10: 支持快速审查\n验收标准:\n- [ ] 消除沉重全仓遍历',
    diff: 'diff --git a/test.txt b/test.txt\n+fast mode'
  };

  // 1. 默认或显式 fast 模式：绝不包含 /code-review 指令前缀，杜绝触发 Claude CLI 多轮全仓漫游
  const fastPromptDefault = buildReviewPrompt(sampleContext);
  const fastPromptExplicit = buildReviewPrompt(sampleContext, { mode: 'fast' });

  for (const prompt of [fastPromptDefault, fastPromptExplicit]) {
    assert.doesNotMatch(prompt, /\/code-review/, 'fast 模式绝不能包含 /code-review 技能前缀');
    assert.match(prompt, /快速聚焦审查模式（Fast Review）/);
    assert.match(prompt, /Pull Request #42/);
    assert.match(prompt, /abcdef1234567890abcdef1234567890abcdef12/);
    assert.match(prompt, /feat\/fast-review -> main/);
    assert.match(prompt, /Issue #10: 支持快速审查/);
    assert.match(prompt, /diff --git a\/test\.txt b\/test\.txt/);
    assert.match(prompt, /RESULT: \[APPROVED\]/);
    assert.match(prompt, /RESULT: \[CHANGES_REQUESTED\]/);
  }

  // 2. deep 模式：必须包含 /code-review --depth deep 及技能管道声明
  const deepPrompt = buildReviewPrompt(sampleContext, {
    mode: 'deep',
    extraSkills: ['/perf-audit']
  });

  assert.match(deepPrompt, /^\/code-review --depth deep/, 'deep 模式首行必须包含 /code-review --depth deep 指令');
  assert.match(deepPrompt, /执行技能: \/code-review --depth deep/);
  assert.match(deepPrompt, /执行技能: \/perf-audit/);
  assert.match(deepPrompt, /Pull Request #42/);
});

test('审查脚本与调度器模式契约：默认 fast 极速审查，支持 --fast, --deep 与 --mode 参数', async () => {
  const reviewScript = await fs.readFile(path.resolve('scripts/review-with-claude.mjs'), 'utf8');

  // 1. 默认 mode 必须为 fast
  assert.match(reviewScript, /let mode = 'fast'/);

  // 2. 支持命令行参数切换
  assert.match(reviewScript, /args\[i\] === '--fast'/);
  assert.match(reviewScript, /args\[i\] === '--deep'/);
  assert.match(reviewScript, /args\[i\] === '--mode'/);

  // 3. 调度脚本日常审查优先走 Fast Review 极速模式
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');
  assert.match(loopScript, /Fast Review 极速轻量模式/);
});
