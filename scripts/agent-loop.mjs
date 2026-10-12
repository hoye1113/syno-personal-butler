#!/usr/bin/env node

/**
 * scripts/agent-loop.mjs
 *
 * 任务调度与状态扫描引擎（Dispatcher）：
 * 践行核心原则：“一次只做一件，返修优先”
 *
 * 架构特性：
 * 1. 跨进程互斥锁（ProcessFileLock）与忙状态保护，路径锚定 REPO_ROOT
 * 2. 严密的错误传播机制：非零退出与 JSON 解析失败拒绝误报 IDLE
 * 3. 完整 GraphQL 全量分页扫描（--paginate --slurp），消除固定上限，防止分页截断优先级任务
 * 4. 保护脏工作区（忽略子模块内部构建产物脏改动），安全可回滚分支检出
 * 5. 审查子进程异常显式暴露，外层设置 25 分钟安全超时
 * 6. 首见 approved 时间戳去重告警，契约对齐
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProcessFileLock } from '../packages/syno-core/process-lock.mjs';
import { sendFeishuNotification } from './notify-feishu.mjs';
import { sendToast, EXIT_BUSY, extractLinkedIssueNumber } from './review-with-claude.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

export function runGh(args) {
  try {
    return execFileSync('gh', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
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

export const ISSUES_PAGINATED_QUERY = `query($owner: String!, $repo: String!, $endCursor: String) {
  repository(owner: $owner, name: $repo) {
    issues(states: OPEN, first: 100, after: $endCursor) {
      nodes {
        number
        title
        body
        createdAt
        labels(first: 50) {
          nodes { name }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`;

export const PRS_PAGINATED_QUERY = `query($owner: String!, $repo: String!, $endCursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(states: OPEN, first: 100, after: $endCursor) {
      nodes {
        number
        title
        body
        headRefName
        headRefOid
        isDraft
        createdAt
        labels(first: 50) {
          nodes { name }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`;

export function parseGraphQLIssuesPages(pagesRaw) {
  const pages = typeof pagesRaw === 'string' ? JSON.parse(pagesRaw) : pagesRaw;
  if (!Array.isArray(pages)) throw new Error('GraphQL 分页数据必须为数组格式');
  const issues = [];
  for (const page of pages) {
    const nodes = page?.data?.repository?.issues?.nodes || [];
    for (const node of nodes) {
      issues.push({
        number: node.number,
        title: node.title,
        body: node.body || '',
        createdAt: node.createdAt,
        labels: (node.labels?.nodes || []).map(l => ({ name: l.name }))
      });
    }
  }
  return issues;
}

export function parseGraphQLPRsPages(pagesRaw) {
  const pages = typeof pagesRaw === 'string' ? JSON.parse(pagesRaw) : pagesRaw;
  if (!Array.isArray(pages)) throw new Error('GraphQL 分页数据必须为数组格式');
  const prs = [];
  for (const page of pages) {
    const nodes = page?.data?.repository?.pullRequests?.nodes || [];
    for (const node of nodes) {
      prs.push({
        number: node.number,
        title: node.title,
        body: node.body || '',
        headRefName: node.headRefName,
        headRefOid: node.headRefOid,
        isDraft: Boolean(node.isDraft),
        createdAt: node.createdAt,
        labels: (node.labels?.nodes || []).map(l => ({ name: l.name }))
      });
    }
  }
  return prs;
}

export function getOpenIssues(options = {}) {
  const runner = options.runner || runGh;
  const raw = runner([
    'api', 'graphql',
    '--paginate', '--slurp',
    '-F', 'owner=:owner',
    '-F', 'repo=:repo',
    '-f', `query=${ISSUES_PAGINATED_QUERY}`
  ]);
  try {
    return parseGraphQLIssuesPages(raw);
  } catch (e) {
    throw new Error(`解析 GitHub Issue 分页数据失败: ${e.message}。原始数据:\n${raw}`);
  }
}

export function getOpenPRs(options = {}) {
  const runner = options.runner || runGh;
  const raw = runner([
    'api', 'graphql',
    '--paginate', '--slurp',
    '-F', 'owner=:owner',
    '-F', 'repo=:repo',
    '-f', `query=${PRS_PAGINATED_QUERY}`
  ]);
  try {
    return parseGraphQLPRsPages(raw);
  } catch (e) {
    throw new Error(`解析 GitHub PR 分页数据失败: ${e.message}。原始数据:\n${raw}`);
  }
}

export function hasLabel(item, labelName) {
  return (item.labels || []).some(l => l.name === labelName);
}

export function trackApprovedTimeout(pr, options = {}) {
  const persist = options.persist ?? true;
  const reviewsDir = resolve(REPO_ROOT, '.runtime', 'reviews');
  try { mkdirSync(reviewsDir, { recursive: true }); } catch {}
  const stateFile = resolve(reviewsDir, `pr-${pr.number}-approved-since.json`);

  let data = { firstSeenAt: new Date().toISOString(), notified: false };
  if (existsSync(stateFile)) {
    try {
      data = JSON.parse(readFileSync(stateFile, 'utf8'));
    } catch {}
  } else if (persist) {
    try {
      writeFileSync(stateFile, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  }

  const waitingMs = Date.now() - new Date(data.firstSeenAt).getTime();
  const waitingHours = (waitingMs / (1000 * 60 * 60)).toFixed(1);
  const isStale = Number(waitingHours) > 2;
  const shouldNotify = isStale && !data.notified;

  return {
    isStale,
    waitingHours,
    shouldNotify,
    markNotified: () => {
      data.notified = true;
      try {
        writeFileSync(stateFile, JSON.stringify(data, null, 2), 'utf8');
      } catch {}
    }
  };
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
    approvedPRs.forEach(p => {
      const mode = p.isDraft ? '[Draft]' : '[Ready]';
      const timeoutStatus = trackApprovedTimeout(p, { persist: false });
      const staleNotice = timeoutStatus.isStale ? ` ⚠️ approved 已等待 ${timeoutStatus.waitingHours}h` : '';
      console.log(`   - PR #${p.number}: ${p.title} ${mode} (分支: ${p.headRefName})${staleNotice}`);
    });
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

export async function handleNext(options = {}) {
  const prs = options.prs || getOpenPRs();
  const issues = options.issues || getOpenIssues();

  // 0. 超时兜底无条件评估：对所有 approved PR 进行检查并触发超时通知
  const approvedPRs = prs.filter(p => hasLabel(p, 'approved'));
  for (const appPR of approvedPRs) {
    const timeoutStatus = trackApprovedTimeout(appPR, { persist: true });
    if (timeoutStatus.shouldNotify) {
      const toastOk = await sendToast(
        `PR #${appPR.number} 待合超时提醒 (${timeoutStatus.waitingHours}h) ⚠️`,
        `该 PR 已通过 Claude Code 审查并就绪超过 ${timeoutStatus.waitingHours} 小时，等待 Codex 巡检或主人合入。`
      );

      let feishuOk = false;
      try {
        feishuOk = await sendFeishuNotification({
          title: `PR #${appPR.number} 待合超时提醒 (${timeoutStatus.waitingHours}h) ⚠️`,
          content: `**PR 标题**: ${appPR.title}\n**分支**: \`${appPR.headRefName}\`\n**核准后已等待**: ${timeoutStatus.waitingHours} 小时\n\n该 PR 已通过 Claude Code 审查，等待 Codex 巡检或主人合入。`,
          url: `https://github.com/hoye1113/syno-personal-butler/pull/${appPR.number}`,
          status: 'warning'
        });
      } catch (feishuErr) {
        console.warn(`[Warning] 飞书卡片发送异常: ${feishuErr.message}`);
      }

      // 仅当至少有一个通知渠道成功交付时，才将 notified=true 写入持久化状态，防止静默抑制
      if (toastOk || feishuOk) {
        timeoutStatus.markNotified();
      }
    }
  }

  // 1. 返修优先：检查是否有被 Claude Code 打回的 PR
  const fixPR = prs.find(p => hasLabel(p, 'changes-requested'));
  if (fixPR) {
    console.log(`[DISPATCH] 发现待返修任务: PR #${fixPR.number}`);
    console.log(`- 目标分支: ${fixPR.headRefName}`);
    console.log(`- 当前版本 head SHA: ${fixPR.headRefOid}`);
    console.log(`- PR 标题: ${fixPR.title}`);

    // 读取本地持久化的审查报告（校验是否绑定当前 head SHA）
    let reportContent = '';
    const versionedArtifactPath = resolve(REPO_ROOT, '.runtime', 'reviews', `pr-${fixPR.number}-${fixPR.headRefOid}.json`);
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
      } catch (e) {
        console.warn(`[Warning] 从 PR #${fixPR.number} 拉取评论失败: ${e.message}`);
      }
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
    console.log(`正在触发 Claude Code 审查脚本 (Fast Review 极速轻量模式)...\n`);

    // 显式执行审查，外层设置 25 分钟安全超时，大于内层 20 分钟以保留内层清晰诊断
    try {
      execFileSync(process.execPath, [resolve(__dirname, 'review-with-claude.mjs'), '--pr', String(reviewPR.number)], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        timeout: 25 * 60 * 1000
      });
      return { action: 'REVIEW_TRIGGERED', prNumber: reviewPR.number };
    } catch (reviewErr) {
      if (reviewErr.status === EXIT_BUSY) {
        console.warn(`[BUSY] 审查任务正在并发执行中 (PR #${reviewPR.number})，本轮调度保持等待。`);
        return { action: 'BUSY', prNumber: reviewPR.number };
      }
      throw reviewErr;
    }
  }

  // 3. 进行中保护：如果已有正在进行的 Issue，且尚未创建 PR，继续该 Issue
  const activeIssue = issues.find(i => {
    if (!hasLabel(i, 'in-progress')) return false;
    const hasExistingPR = prs.some(p =>
      p.headRefName === `feat/issue-${i.number}` ||
      extractLinkedIssueNumber(p.body) === String(i.number) ||
      extractLinkedIssueNumber(p.title) === String(i.number)
    );
    return !hasExistingPR;
  });
  if (activeIssue) {
    console.log(`[DISPATCH] 发现已有正在进行中（尚未提交 PR）的任务: Issue #${activeIssue.number}`);
    console.log(`- 标题: ${activeIssue.title}`);
    console.log(`\n建议行动：继续在对应特性分支上实现该任务并自测，完毕后提 PR 并打上 needs-review。`);
    return { action: 'CONTINUE_ISSUE', issueNumber: activeIssue.number, title: activeIssue.title };
  }

  // 4. 新需求认领：从 spec 标签认领新需求
  const newIssue = issues.find(i => hasLabel(i, 'spec') && !hasLabel(i, 'in-progress'));
  if (newIssue) {
    console.log(`[DISPATCH] 发现新就绪需求: Issue #${newIssue.number}`);
    console.log(`- 标题: ${newIssue.title}`);

    // 工作区整洁度检查：忽略子模块内部脏构建产物，仅检测当前仓库真实未暂存变更
    const statusOutput = execFileSync('git', ['status', '--porcelain', '--ignore-submodules=dirty'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 }).trim();
    if (statusOutput.length > 0) {
      console.warn(`[工作区保护] 当前工作区存在未提交改动：\n${statusOutput}\n已暂停自动切换分支与认领，请先提交或清理工作区。`);
      return { action: 'DIRTY_WORKTREE_BLOCKED', issueNumber: newIssue.number };
    }

    const currentBranch = execFileSync('git', ['branch', '--show-current'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 }).trim() || 'main';
    const branchName = `feat/issue-${newIssue.number}`;
    console.log(`正在安全建立特性分支 ${branchName} 并标记 in-progress...`);

    let createdNew = false;
    let reusedExisting = false;
    try {
      execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { cwd: REPO_ROOT, timeout: 60000 });
      execFileSync('git', ['checkout', '-b', branchName, 'origin/main'], { cwd: REPO_ROOT, stdio: 'pipe', timeout: 30000 });
      createdNew = true;
    } catch (gitErr) {
      const msg = gitErr.stderr ? gitErr.stderr.toString('utf8').trim() : gitErr.message;
      if (msg.includes('already exists')) {
        console.warn(`[Warning] 本地分支 ${branchName} 已存在，尝试安全复用并检出...`);
        try {
          execFileSync('git', ['checkout', branchName], { cwd: REPO_ROOT, stdio: 'pipe', timeout: 30000 });
          reusedExisting = true;
        } catch (coErr) {
          console.error(`[BLOCKED] 无法切换到已有分支 ${branchName}: ${coErr.message}`);
          return { action: 'BLOCKED', issueNumber: newIssue.number, reason: `Branch ${branchName} checkout failed` };
        }
      } else {
        throw new Error(`准备特性分支 ${branchName} 失败: ${msg}`);
      }
    }

    try {
      runGh(['issue', 'edit', String(newIssue.number), '--add-label', 'in-progress']);
      console.log(`\n✅ 分支 ${branchName} 已就绪，已打标 in-progress，请 Gemini 开始编写实现代码与测试。`);
    } catch (tagErr) {
      // 标签更新失败回滚本地分支到原分支：仅全新建的分支才删除，复用的分支绝不删除！
      if (createdNew) {
        try {
          execFileSync('git', ['checkout', currentBranch], { cwd: REPO_ROOT, timeout: 30000 });
          execFileSync('git', ['branch', '-D', branchName], { cwd: REPO_ROOT, timeout: 30000 });
        } catch (rbErr) {
          console.warn(`[Warning] 回滚并删除分支 ${branchName} 失败: ${rbErr.message}`);
        }
      } else if (reusedExisting) {
        try {
          execFileSync('git', ['checkout', currentBranch], { cwd: REPO_ROOT, timeout: 30000 });
        } catch (rbErr) {
          console.warn(`[Warning] 切回原分支 ${currentBranch} 失败: ${rbErr.message}`);
        }
      }
      throw new Error(`给 Issue #${newIssue.number} 添加 in-progress 标签失败: ${tagErr.message}`);
    }

    return { action: 'START_ISSUE', issueNumber: newIssue.number, branch: branchName };
  }

  // 5. 检查是否有已核准但尚未合并的 PR
  const approvedPR = prs.find(p => hasLabel(p, 'approved'));
  if (approvedPR) {
    const timeoutStatus = trackApprovedTimeout(approvedPR, { persist: false });
    console.log(`[DISPATCH] 所有研发任务已完成！当前 PR #${approvedPR.number} 已通过审查，等待 Codex 或主人合并。(已核准等待 ${timeoutStatus.waitingHours}h)`);
    return { action: 'WAITING_MERGE', prNumber: approvedPR.number };
  }

  console.log('[DISPATCH] 当前流水线暂无待办任务，一切正常就绪。');
  return { action: 'IDLE' };
}

async function main() {
  const command = process.argv[2] || 'status';

  const lockFile = resolve(REPO_ROOT, '.runtime', 'locks', 'agent-loop.lock');
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
        await handleNext();
      } else {
        console.error(`未知命令: ${command}。支持的命令: status, next`);
        process.exitCode = 1;
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
