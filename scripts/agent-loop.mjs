#!/usr/bin/env node

/**
 * scripts/agent-loop.mjs
 * 
 * 任务调度与状态扫描引擎（Dispatcher）：
 * 践行核心原则：“一次只做一件，返修优先”
 * 
 * 命令支持：
 * - status : 查看当前整个流水线（Issue / PR）的健康度与阶段分布
 * - next   : 按优先级计算并执行/分派下一个动作：
 *            1. [最高优先级] 返修 PR (changes-requested) -> 展示 Claude 审查报告供 Gemini 修复
 *            2. [次高优先级] 审查 PR (needs-review -> 自动调用 review-with-claude.mjs)
 *            3. [常规优先级] 认领新 Issue (spec -> 创建分支并标为 in-progress)
 *            4. [就绪待合] 审查已通过 PR (approved -> 提示 Codex/主人验收)
 *            5. [空闲状态] 结束
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runGh(cmd) {
  try {
    return execSync(`gh ${cmd}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (err) {
    return '';
  }
}

function getOpenIssues() {
  const raw = runGh('issue list --state open --json number,title,labels,createdAt');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function getOpenPRs() {
  const raw = runGh('pr list --state open --json number,title,labels,headRefName,createdAt');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function hasLabel(item, labelName) {
  return (item.labels || []).some(l => l.name === labelName);
}

function printStatus() {
  const issues = getOpenIssues();
  const prs = getOpenPRs();

  console.log('====================================================');
  console.log('       🤖 多智能体开发流水线任务看板状态            ');
  console.log('====================================================\n');

  console.log('【1. 待返修队列 (PR with changes-requested) - 优先级: 最高】');
  const fixPRs = prs.filter(p => hasLabel(p, 'changes-requested'));
  if (fixPRs.length === 0) {
    console.log('   (暂无待返修 PR)');
  } else {
    fixPRs.forEach(p => console.log(`   - PR #${p.number}: ${p.title} (分支: ${p.headRefName})`));
  }

  console.log('\n【2. 待审查队列 (PR with needs-review) - 优先级: 次高】');
  const reviewPRs = prs.filter(p => hasLabel(p, 'needs-review'));
  if (reviewPRs.length === 0) {
    console.log('   (暂无待审查 PR)');
  } else {
    reviewPRs.forEach(p => console.log(`   - PR #${p.number}: ${p.title} (分支: ${p.headRefName})`));
  }

  console.log('\n【3. 待合并队列 (PR with approved) - 等待 Codex/主人合入】');
  const approvedPRs = prs.filter(p => hasLabel(p, 'approved'));
  if (approvedPRs.length === 0) {
    console.log('   (暂无已核准待合并 PR)');
  } else {
    approvedPRs.forEach(p => console.log(`   - PR #${p.number}: ${p.title} (分支: ${p.headRefName})`));
  }

  console.log('\n【4. 进行中任务 (Issue with in-progress)】');
  const inProgressIssues = issues.filter(i => hasLabel(i, 'in-progress'));
  if (inProgressIssues.length === 0) {
    console.log('   (暂无正在编码中的 Issue)');
  } else {
    inProgressIssues.forEach(i => console.log(`   - Issue #${i.number}: ${i.title}`));
  }

  console.log('\n【5. 待认领需求池 (Issue with spec)】');
  const specIssues = issues.filter(i => hasLabel(i, 'spec') && !hasLabel(i, 'in-progress'));
  if (specIssues.length === 0) {
    console.log('   (需求池暂无待认领 Issue)');
  } else {
    specIssues.forEach(i => console.log(`   - Issue #${i.number}: ${i.title}`));
  }

  console.log('\n====================================================');
}

function handleNext() {
  const prs = getOpenPRs();
  const issues = getOpenIssues();

  // 1. 返修优先：检查是否有被 Claude Code 打回的 PR
  const fixPR = prs.find(p => hasLabel(p, 'changes-requested'));
  if (fixPR) {
    console.log(`[DISPATCH] 发现待返修任务: PR #${fixPR.number}`);
    console.log(`- 目标分支: ${fixPR.headRefName}`);
    console.log(`- PR 标题: ${fixPR.title}`);

    // 读取本地持久化的审查报告或从 GitHub 提取
    const reviewFilePath = resolve(process.cwd(), '.runtime', 'reviews', `pr-${fixPR.number}-review.md`);
    let reportContent = '';
    if (existsSync(reviewFilePath)) {
      reportContent = readFileSync(reviewFilePath, 'utf8');
    } else {
      try {
        const commentsRaw = runGh(`pr view ${fixPR.number} --json comments`);
        const parsed = JSON.parse(commentsRaw);
        const lastComment = parsed.comments && parsed.comments[parsed.comments.length - 1];
        if (lastComment) reportContent = lastComment.body;
      } catch {}
    }

    console.log('\n----------------- Claude Code 审查报告 -----------------');
    console.log(reportContent || '(未找到具体评论内容，请使用 gh pr view 查看)');
    console.log('--------------------------------------------------------\n');

    console.log(`【Gemini 修复指南】：`);
    console.log(`1. 执行: git checkout ${fixPR.headRefName}`);
    console.log(`2. 依据上述 Claude Code 审查报告中的缺陷清单，逐项修改相关文件`);
    console.log(`3. 运行本地测试确认修复无误`);
    console.log(`4. 提交并推送到远端: git commit -am "fix(pr-${fixPR.number}): resolve cr feedback" && git push`);
    console.log(`5. 将 PR 切回待审状态并触发重审:`);
    console.log(`   gh pr edit ${fixPR.number} --add-label "needs-review" --remove-label "changes-requested"`);
    console.log(`   node scripts/review-with-claude.mjs --pr ${fixPR.number}`);

    return {
      action: 'FIX_PR',
      prNumber: fixPR.number,
      branch: fixPR.headRefName,
      title: fixPR.title,
      reviewReport: reportContent
    };
  }

  // 2. 审查优先：检查是否有刚提上来需要 Claude Code 审查的 PR
  const reviewPR = prs.find(p => hasLabel(p, 'needs-review'));
  if (reviewPR) {
    console.log(`[DISPATCH] 发现待审查 PR: PR #${reviewPR.number}`);
    console.log(`正在自动触发 Claude Code 审查脚本 (加载 /code-review 技能)...\n`);
    try {
      execSync(`node "${resolve(__dirname, 'review-with-claude.mjs')}" --pr ${reviewPR.number}`, {
        stdio: 'inherit'
      });
    } catch (e) {
      console.error(`审查脚本执行失败: ${e.message}`);
    }
    return { action: 'REVIEW_TRIGGERED', prNumber: reviewPR.number };
  }

  // 3. 进行中保护：如果已有正在进行的 Issue，且当前没有返修阻塞，继续该 Issue
  const activeIssue = issues.find(i => hasLabel(i, 'in-progress'));
  if (activeIssue) {
    console.log(`[DISPATCH] 发现已有正在进行中的任务: Issue #${activeIssue.number}`);
    console.log(`- 标题: ${activeIssue.title}`);
    console.log(`\n建议行动：继续在对应特性分支上实现该任务并自测，完毕后提 PR 并打上 needs-review。`);
    return { action: 'CONTINUE_ISSUE', issueNumber: activeIssue.number };
  }

  // 4. 新需求认领：从 spec 标签认领新需求
  const newIssue = issues.find(i => hasLabel(i, 'spec') && !hasLabel(i, 'in-progress'));
  if (newIssue) {
    console.log(`[DISPATCH] 发现新就绪需求: Issue #${newIssue.number}`);
    console.log(`- 标题: ${newIssue.title}`);
    const branchName = `feat/issue-${newIssue.number}`;
    console.log(`正在标记为 in-progress 并建立特性分支 ${branchName}...`);
    try {
      runGh(`issue edit ${newIssue.number} --add-label "in-progress"`);
      execSync(`git checkout main && git pull origin main && git checkout -b ${branchName}`, {
        stdio: 'inherit'
      });
      console.log(`\n✅ 分支 ${branchName} 已就绪，请 Gemini 开始编写实现代码与测试。`);
    } catch (e) {
      console.warn(`准备分支遇到提示: ${e.message}`);
    }
    return { action: 'START_ISSUE', issueNumber: newIssue.number, branch: branchName };
  }

  // 5. 检查是否有已核准但尚未合并的 PR
  const approvedPR = prs.find(p => hasLabel(p, 'approved'));
  if (approvedPR) {
    console.log(`[DISPATCH] 所有研发任务已完成！当前 PR #${approvedPR.number} 已通过审查，等待 Codex 或主人合并。`);
    return { action: 'WAITING_MERGE', prNumber: approvedPR.number };
  }

  console.log('[DISPATCH] 当前流水线暂无待办任务，一切正常就绪。');
  return { action: 'IDLE' };
}

const command = process.argv[2] || 'status';
if (command === 'status') {
  printStatus();
} else if (command === 'next') {
  handleNext();
} else {
  console.log(`未知命令: ${command}。支持的命令: status, next`);
}
