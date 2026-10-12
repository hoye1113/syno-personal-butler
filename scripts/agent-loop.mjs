#!/usr/bin/env node

/**
 * scripts/agent-loop.mjs
 *
 * 任务调度与状态扫描引擎（Dispatcher）：
 * 践行核心原则：“一次只做一件，返修优先”
 *
 * 架构特性：
 * 1. 跨进程互斥锁（ProcessFileLock）与忙状态保护
 * 2. 严密的错误传播机制：非零退出与 JSON 解析失败拒绝误报 IDLE
 * 3. 完整候选集扫描（--limit 1000），防止分页截断优先级任务
 * 4. 保护脏工作区，禁止未受控切换分支；采用可回滚的安全分支检出
 * 5. 审查子进程异常显式暴露，不吞掉失败
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProcessFileLock } from '../packages/syno-core/process-lock.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runGh(args) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, LANG: 'zh_CN.UTF-8' }
    }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString('utf8').trim() : err.message;
    const error = new Error(`gh ${args.join(' ')} 失败: ${stderr}`);
    error.code = 'GH_COMMAND_FAILED';
    throw error;
  }
}

export function getOpenIssues() {
  const raw = runGh(['issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,labels,createdAt']);
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`解析 GitHub Issue 列表 JSON 失败: ${e.message}。原始数据:\n${raw}`);
  }
}

export function getOpenPRs() {
  const raw = runGh(['pr', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,labels,headRefName,headRefOid,createdAt']);
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`解析 GitHub PR 列表 JSON 失败: ${e.message}。原始数据:\n${raw}`);
  }
}

export function hasLabel(item, labelName) {
  return (item.labels || []).some(l => l.name === labelName);
}

export function printStatus() {
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
    fixPRs.forEach(p => console.log(`   - PR #${p.number}: ${p.title} (分支: ${p.headRefName}, SHA: ${p.headRefOid})`));
  }

  console.log('\n【2. 待审查队列 (PR with needs-review) - 优先级: 次高】');
  const reviewPRs = prs.filter(p => hasLabel(p, 'needs-review'));
  if (reviewPRs.length === 0) {
    console.log('   (暂无待审查 PR)');
  } else {
    reviewPRs.forEach(p => console.log(`   - PR #${p.number}: ${p.title} (分支: ${p.headRefName}, SHA: ${p.headRefOid})`));
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

export function handleNext(options = {}) {
  const prs = getOpenPRs();
  const issues = getOpenIssues();

  // 1. 返修优先：检查是否有被 Claude Code 打回的 PR
  const fixPR = prs.find(p => hasLabel(p, 'changes-requested'));
  if (fixPR) {
    console.log(`[DISPATCH] 发现待返修任务: PR #${fixPR.number}`);
    console.log(`- 目标分支: ${fixPR.headRefName}`);
    console.log(`- 当前版本 head SHA: ${fixPR.headRefOid}`);
    console.log(`- PR 标题: ${fixPR.title}`);

    // 读取本地持久化的审查报告（校验是否绑定当前 head SHA）
    let reportContent = '';
    const versionedArtifactPath = resolve(process.cwd(), '.runtime', 'reviews', `pr-${fixPR.number}-${fixPR.headRefOid}.json`);
    if (existsSync(versionedArtifactPath)) {
      try {
        const artifact = JSON.parse(readFileSync(versionedArtifactPath, 'utf8'));
        reportContent = artifact.report;
        console.log(`[本地审查证据] 成功匹配当前版本 (${fixPR.headRefOid}) 归档报告`);
      } catch {}
    }

    if (!reportContent) {
      try {
        const commentsRaw = runGh(['pr', 'view', String(fixPR.number), '--json', 'comments']);
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
      headRefOid: fixPR.headRefOid,
      title: fixPR.title,
      reviewReport: reportContent
    };
  }

  // 2. 审查优先：检查是否有刚提上来需要 Claude Code 审查的 PR
  const reviewPR = prs.find(p => hasLabel(p, 'needs-review'));
  if (reviewPR) {
    console.log(`[DISPATCH] 发现待审查 PR: PR #${reviewPR.number}`);
    console.log(`正在触发 Claude Code 审查脚本 (加载 /code-review 技能)...\n`);

    if (options.skipExecuteReview) {
      return { action: 'REVIEW_TRIGGERED', prNumber: reviewPR.number };
    }

    // 显式执行审查，非零退出与异常向外传播，不吞掉失败
    execFileSync(process.execPath, [resolve(__dirname, 'review-with-claude.mjs'), '--pr', String(reviewPR.number)], {
      stdio: 'inherit'
    });

    return { action: 'REVIEW_TRIGGERED', prNumber: reviewPR.number };
  }

  // 3. 进行中保护：如果已有正在进行的 Issue，且当前没有返修阻塞，继续该 Issue
  const activeIssue = issues.find(i => hasLabel(i, 'in-progress'));
  if (activeIssue) {
    console.log(`[DISPATCH] 发现已有正在进行中的任务: Issue #${activeIssue.number}`);
    console.log(`- 标题: ${activeIssue.title}`);
    console.log(`\n建议行动：继续在对应特性分支上实现该任务并自测，完毕后提 PR 并打上 needs-review。`);
    return { action: 'CONTINUE_ISSUE', issueNumber: activeIssue.number, title: activeIssue.title };
  }

  // 4. 新需求认领：从 spec 标签认领新需求
  const newIssue = issues.find(i => hasLabel(i, 'spec') && !hasLabel(i, 'in-progress'));
  if (newIssue) {
    console.log(`[DISPATCH] 发现新就绪需求: Issue #${newIssue.number}`);
    console.log(`- 标题: ${newIssue.title}`);

    // 工作区整洁度检查：如果当前工作区存在未暂存脏改动，绝不擅自切换分支或破坏工作区
    const statusOutput = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
    if (statusOutput.length > 0) {
      console.warn(`[工作区保护] 当前工作区存在未提交改动：\n${statusOutput}\n已暂停自动切换分支与认领，请先提交或清理工作区。`);
      return { action: 'DIRTY_WORKTREE_BLOCKED', issueNumber: newIssue.number };
    }

    const branchName = `feat/issue-${newIssue.number}`;
    console.log(`正在安全建立特性分支 ${branchName} 并标记 in-progress...`);

    let branchCreated = false;
    try {
      execFileSync('git', ['fetch', 'origin', 'main', '--quiet']);
      execFileSync('git', ['checkout', '-b', branchName, 'origin/main'], { stdio: 'pipe' });
      branchCreated = true;
    } catch (gitErr) {
      const msg = gitErr.stderr ? gitErr.stderr.toString('utf8').trim() : gitErr.message;
      throw new Error(`准备特性分支 ${branchName} 失败: ${msg}`);
    }

    try {
      runGh(['issue', 'edit', String(newIssue.number), '--add-label', 'in-progress']);
      console.log(`\n✅ 分支 ${branchName} 已就绪，已打标 in-progress，请 Gemini 开始编写实现代码与测试。`);
    } catch (tagErr) {
      // 标签更新失败回滚本地分支
      if (branchCreated) {
        try {
          execFileSync('git', ['checkout', 'main']);
          execFileSync('git', ['branch', '-D', branchName]);
        } catch {}
      }
      throw new Error(`给 Issue #${newIssue.number} 添加 in-progress 标签失败: ${tagErr.message}`);
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

async function main() {
  const command = process.argv[2] || 'status';

  const lockFile = resolve(process.cwd(), '.runtime', 'locks', 'agent-loop.lock');
  const lock = new ProcessFileLock({
    file: lockFile,
    failFast: true,
    metadata: { entrypoint: 'agent-loop', command }
  });

  try {
    await lock.run(async () => {
      if (command === 'status') {
        printStatus();
      } else if (command === 'next') {
        handleNext();
      } else {
        console.error(`未知命令: ${command}。支持的命令: status, next`);
        process.exit(1);
      }
    });
  } catch (err) {
    if (err.code === 'PROCESS_LOCK_HELD') {
      console.warn(`[BUSY] 调度任务已在运行中 (持有者 PID: ${err.owner?.pid})，跳过本次执行。`);
      process.exit(0);
    }
    console.error('[Fatal Error]', err.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main().catch(err => {
    console.error('[Fatal Error]', err.message);
    process.exit(1);
  });
}
