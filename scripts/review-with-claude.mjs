#!/usr/bin/env node

/**
 * scripts/review-with-claude.mjs
 *
 * 自动化代码审查门禁脚本：
 * 1. 拉取目标 PR 信息、关联 Issue 验收标准、以及 Git Diff
 * 2. 挂载指定审查 Skill（默认 /code-review，支持追加其他 skill）
 * 3. 严格限制 Claude Code 仅使用只读工具（Read, Glob, Grep），杜绝擅自修改文件
 * 4. 严格解析首行判决，非零退出与非法结构一律失败关闭
 * 5. 校验 headRefOid 版本一致性（含 TOCTOU 关闭），防止陈旧审查批准新代码
 * 6. 使用 --body-file 避免 Windows shell 字符篡改与环境变量展开
 * 7. 确认标签更新成功后才触发终态桌面通知
 */

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProcessFileLock } from '../packages/syno-core/process-lock.mjs';
import { sendFeishuNotification } from './notify-feishu.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runGh(args) {
  try {
    return execFileSync('gh', args, {
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

export function assertHeadConsistency(initialOid, currentOid) {
  if (!initialOid || !currentOid || initialOid !== currentOid) {
    const err = new Error(`PR head SHA 在审查期间发生变更（审查开始: ${initialOid}，当前: ${currentOid}），放弃发布陈旧版本的审查结果。`);
    err.code = 'HEAD_SHA_MISMATCH';
    throw err;
  }
}

export function chunksToText(chunks) {
  if (!Array.isArray(chunks)) return '';
  return Buffer.concat(chunks).toString('utf8');
}

export function parseReviewDecision(output) {
  if (!output || typeof output !== 'string') {
    throw new Error('Claude Code 审查输出为空');
  }
  const lines = output.trim().split(/\r?\n/);
  const firstLine = lines.find(l => l.trim().length > 0)?.trim();

  if (firstLine === 'RESULT: [APPROVED]') {
    return { decision: 'APPROVED', isApproved: true };
  }
  if (firstLine === 'RESULT: [CHANGES_REQUESTED]') {
    return { decision: 'CHANGES_REQUESTED', isApproved: false };
  }
  throw new Error(`Claude Code 审查输出判定结构无效或含歧义。首行必须严格为 'RESULT: [APPROVED]' 或 'RESULT: [CHANGES_REQUESTED]'，实际首行: '${firstLine}'`);
}

export function sendToast(title, body) {
  try {
    const toastScriptPath = resolve(__dirname, 'show-toast.ps1').replace(/\\/g, '/');
    if (!existsSync(toastScriptPath)) return;

    const tB64 = Buffer.from(title, 'utf8').toString('base64');
    const bB64 = Buffer.from(body, 'utf8').toString('base64');

    const psCommand = `
      param($t, $b)
      $title = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($t))
      $body = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b))
      & "${toastScriptPath}" -Title $title -Body $body
    `;

    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', psCommand,
      tB64,
      bB64
    ], { windowsHide: true, stdio: 'ignore' });

    child.on('error', err => {
      console.warn(`[Toast Warning] 通知子进程启动失败: ${err.message}`);
    });
    child.unref();
  } catch (e) {
    console.warn(`[Toast Warning] 桌面通知发送失败: ${e.message}`);
  }
}

/**
 * 唤起 Claude Code CLI 跑审查
 * 关键参数设计：
 * - --dangerously-skip-permissions: 非交互自动执行
 * - --tools Read,Glob,Grep: 绝对禁止 Edit, Write, Bash，确保物理只读！
 */
export async function runClaudeReview(prompt, options = {}) {
  const timeoutMs = options.timeoutMs || 20 * 60 * 1000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', [
      '-p',
      '--dangerously-skip-permissions',
      '--tools', 'Read,Glob,Grep'
    ], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
      reject(new Error(`Claude Code 审查执行超时 (${timeoutMs / 1000}s)`));
    }, timeoutMs);

    child.stdout.on('data', chunk => stdoutChunks.push(chunk));
    child.stderr.on('data', chunk => stderrChunks.push(chunk));

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) return;

      const stderrText = chunksToText(stderrChunks);
      const stdoutText = chunksToText(stdoutChunks).trim();

      if (code !== 0) {
        reject(new Error(`Claude Code 退出异常 (code ${code}): ${stderrText}`));
      } else {
        resolvePromise(stdoutText);
      }
    });

    // 经 stdin 写入 prompt，避免命令行参数转义与长度限制
    child.stdin.write(prompt + '\n');
    child.stdin.end();
  });
}

export async function reviewPR(prNumber, options = {}) {
  const num = Number(prNumber);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`非法的 PR 编号: ${prNumber}`);
  }

  const dryRun = options.dryRun || false;
  const extraSkills = options.extraSkills || [];

  console.log(`[1/4] 获取 PR #${num} 详情与变更 Diff...`);
  const prDataRaw = runGh(['pr', 'view', String(num), '--json', 'number,title,body,headRefName,baseRefName,headRefOid,labels,state,isDraft']);
  const pr = JSON.parse(prDataRaw);

  if (pr.state !== 'OPEN') {
    console.log(`PR #${num} 状态为 ${pr.state}，非 OPEN 状态，无需审查。`);
    return { skipped: true, state: pr.state };
  }

  const initialHeadOid = pr.headRefOid;
  if (!initialHeadOid) {
    throw new Error(`无法获取 PR #${num} 的 headRefOid`);
  }

  const diff = runGh(['pr', 'diff', String(num)]);
  if (!diff || !diff.trim()) {
    throw new Error(`PR #${num} 没有代码变更 (Diff 为空)`);
  }

  // 解析关联 Issue，若有关联则必须可读，不可读时不得降级放行
  let issueContext = '';
  const issueMatch = pr.body.match(/(?:Fixes|Closes|Resolves|Refs|Issue)?\s*#(\d+)/i);
  if (issueMatch) {
    const relatedIssueNum = issueMatch[1];
    console.log(`[1/4] 读取关联 Issue #${relatedIssueNum}...`);
    try {
      const issueRaw = runGh(['issue', 'view', relatedIssueNum, '--json', 'number,title,body']);
      const issueData = JSON.parse(issueRaw);
      if (!issueData.body || !issueData.body.trim()) {
        throw new Error(`关联 Issue #${relatedIssueNum} 内容为空`);
      }
      issueContext = `Issue #${issueData.number} 标题: ${issueData.title}\n需求与验收标准详情:\n${issueData.body}`;
    } catch (e) {
      throw new Error(`读取关联 Issue #${relatedIssueNum} 失败: ${e.message}。关联 spec 不可读时禁止批准审查。`);
    }
  } else {
    issueContext = '（未明确关联 Issue，请严格核验 PR 描述中的验收条件与通用工程稳健性）';
  }

  // 组装审查 Skill 管道
  const skillsToInvoke = ['/code-review --depth deep', ...extraSkills];
  const skillsAnnouncement = skillsToInvoke.map(s => `- 执行技能: ${s}`).join('\n');

  console.log(`[2/4] 组装审查上下文，挂载技能管道并唤起 Claude Code...`);
  console.log(`已加载审查技能:\n${skillsAnnouncement}\n`);

  const reviewPrompt = `${skillsToInvoke[0]}

【审查角色与铁律】
你是严格的代码质量守护者与架构审查员。
你【绝对严禁】修改任何文件，【绝对严禁】调用 Edit/Write 工具，你仅负责指出问题并提供修改指导！所有后续修复由 Gemini 承担。

【审查技能管道要求】
本次审查必须同时满足以下技能的审查标准与深度核验：
${skillsAnnouncement}

【审查目标】
Pull Request #${pr.number} ("${pr.title}")
PR 版本 (head SHA): ${initialHeadOid}
PR 分支: ${pr.headRefName} -> ${pr.baseRefName}
PR 说明:
${pr.body}

关联需求与验收标准:
${issueContext}

代码变更 (Git Diff):
\`\`\`diff
${diff}
\`\`\`

【输出格式强制规范】
你的回答首行必须明确判定结果，且只能是以下两种格式之一：
RESULT: [APPROVED]
或
RESULT: [CHANGES_REQUESTED]

紧接着按照以下结构输出详细分析，确保给 Gemini 留下明确可执行的修复指引：
### 1. 评审结论概述
(说明是否达到合并标准，总体评价)

### 2. 验收标准逐条核对
- [x] 或 [ ] 验收点 1: 说明
- [x] 或 [ ] 验收点 2: 说明

### 3. 详细缺陷清单与修改指导 (供 Gemini 修复使用)
- **[缺陷级别: 阻断/高/中/低] 文件路径:行号**
  - **问题分析**: 说明根本原因或违背规范之处
  - **修复建议**: 给出具体的代码改法或方案建议

### 4. 总结
(若通过说明合格；若未通过则列出 Gemini 返修优先级顺序)
`;

  const reviewResult = await runClaudeReview(reviewPrompt);
  console.log(`[3/4] Claude Code 审查完成，分析审查结论...\n`);
  console.log('----------------------------------------------------');
  console.log(reviewResult);
  console.log('----------------------------------------------------\n');

  const { isApproved, decision } = parseReviewDecision(reviewResult);

  // 版本一致性校验：在发布前确认 head SHA 未被改写
  const currentPrRaw = runGh(['pr', 'view', String(num), '--json', 'headRefOid,state']);
  const currentPr = JSON.parse(currentPrRaw);
  assertHeadConsistency(initialHeadOid, currentPr.headRefOid);

  // 持久化审查报告（绑定已审查 headRefOid）
  const runtimeDir = resolve(process.cwd(), '.runtime', 'reviews');
  mkdirSync(runtimeDir, { recursive: true });
  const artifactFile = resolve(runtimeDir, `pr-${num}-${initialHeadOid}.json`);
  const artifactData = {
    prNumber: num,
    headRefOid: initialHeadOid,
    decision,
    report: reviewResult,
    timestamp: new Date().toISOString()
  };
  writeFileSync(artifactFile, JSON.stringify(artifactData, null, 2), 'utf8');
  console.log(`[本地归档] 审查报告已持久化到: ${artifactFile}`);

  if (dryRun) {
    console.log('[Dry Run] 演练模式，不修改 GitHub 状态。');
    return { decision, isApproved, artifactFile };
  }

  console.log(`[4/4] 提交评审结论至 GitHub PR #${num}...`);

  // 使用 --body-file 提交 review，避免 Windows shell 注入与环境变量展开
  const tmpReviewFile = resolve(runtimeDir, `tmp-review-post-${num}-${Date.now()}.md`);
  const commentContent = `## 🤖 Claude Code (Kimi) 自动化审查报告\n\n- 审查基准 Commit: \`${initialHeadOid}\`\n\n${reviewResult}`;
  writeFileSync(tmpReviewFile, commentContent, 'utf8');

  try {
    runGh(['pr', 'review', String(num), '--comment', '--body-file', tmpReviewFile]);
  } finally {
    if (existsSync(tmpReviewFile)) {
      try { unlinkSync(tmpReviewFile); } catch {}
    }
  }

  // 关闭 TOCTOU 窗口：在打标前再次复核 headRefOid
  const preEditPrRaw = runGh(['pr', 'view', String(num), '--json', 'headRefOid']);
  const preEditPr = JSON.parse(preEditPrRaw);
  assertHeadConsistency(initialHeadOid, preEditPr.headRefOid);

  if (isApproved) {
    console.log(`✅ 审查结论: [APPROVED] 通过！正在更新标签并触发通知...`);
    runGh(['pr', 'edit', String(num), '--add-label', 'approved', '--remove-label', 'needs-review,changes-requested']);

    // 确认标签状态成功更新
    const verifyPr = JSON.parse(runGh(['pr', 'view', String(num), '--json', 'labels']));
    const hasApproved = (verifyPr.labels || []).some(l => l.name === 'approved');
    const hasChangesReq = (verifyPr.labels || []).some(l => l.name === 'changes-requested');

    if (!hasApproved || hasChangesReq) {
      throw new Error(`PR #${num} 标签状态校验失败：未成功添加 approved 或仍存在 changes-requested`);
    }

    // 若原 PR 处于 Draft 状态，审查通过后自动翻转为 Ready for review，供 Codex 巡检认领合并
    try {
      const currentPrDraftCheck = JSON.parse(runGh(['pr', 'view', String(num), '--json', 'isDraft']));
      if (currentPrDraftCheck.isDraft) {
        console.log(`[Draft -> Ready] 自动将 PR #${num} 翻转为 Ready for review...`);
        runGh(['pr', 'ready', String(num)]);
      }
    } catch (readyErr) {
      console.warn(`[Warning] 翻转 Ready PR 提示: ${readyErr.message}`);
    }

    sendToast(
      `PR #${num} 审查通过 🎉`,
      `Claude Code 评审已通过全部验收标准，请通知 Codex 或您亲自验收合并。`
    );

    sendFeishuNotification({
      title: `PR #${num} 审查通过，就绪待合并 🎉`,
      content: `**PR 标题**: ${pr.title}\n**分支**: \`${pr.headRefName}\`\n**版本**: \`${initialHeadOid}\`\n\n已通过 Claude Code 严格审查，符合全部验收标准，请通知 Codex 巡检或您亲自验收合并。`,
      url: `https://github.com/hoye1113/syno-personal-butler/pull/${num}`,
      status: 'success'
    }).catch(() => {});
  } else {
    console.log(`❌ 审查结论: [CHANGES_REQUESTED] 需要修改！已转入返修队列，由 Gemini 进行修复。`);
    runGh(['pr', 'edit', String(num), '--add-label', 'changes-requested', '--remove-label', 'needs-review,approved']);

    // 确认标签状态已剥离 approved 并打上 changes-requested
    const verifyPr = JSON.parse(runGh(['pr', 'view', String(num), '--json', 'labels']));
    const hasChangesReq = (verifyPr.labels || []).some(l => l.name === 'changes-requested');
    const hasApproved = (verifyPr.labels || []).some(l => l.name === 'approved');

    if (!hasChangesReq || hasApproved) {
      throw new Error(`PR #${num} 标签状态校验失败：未成功打上 changes-requested 或未移除 approved`);
    }

    sendFeishuNotification({
      title: `PR #${num} 审查提出修改建议 ⚠️`,
      content: `**PR 标题**: ${pr.title}\n**分支**: \`${pr.headRefName}\`\n\nClaude Code 提出了修改建议，Gemini 已接手进入全量返修队列。`,
      url: `https://github.com/hoye1113/syno-personal-butler/pull/${num}`,
      status: 'warning'
    }).catch(() => {});
  }

  console.log(`完成！PR #${num} 当前流转状态已同步。`);
  return { decision, isApproved, artifactFile };
}

async function main() {
  const args = process.argv.slice(2);
  let prNumber = null;
  let dryRun = false;
  const extraSkills = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pr' && args[i + 1]) {
      prNumber = args[i + 1];
      i++;
    } else if (args[i] === '--skill' && args[i + 1]) {
      extraSkills.push(args[i + 1]);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!prNumber) {
    try {
      const prJson = runGh(['pr', 'view', '--json', 'number']);
      const parsed = JSON.parse(prJson);
      prNumber = parsed.number;
    } catch (e) {
      console.error('错误: 请通过 --pr <PR_NUMBER> 指定审查的 PR，或在关联 PR 的分支下执行。原始错误: ' + e.message);
      process.exit(1);
    }
  }

  const lockFile = resolve(process.cwd(), '.runtime', 'locks', 'review-with-claude.lock');
  const lock = new ProcessFileLock({
    file: lockFile,
    failFast: true,
    metadata: { entrypoint: 'review-with-claude', pr: prNumber }
  });

  try {
    await lock.run(async () => {
      await reviewPR(prNumber, { dryRun, extraSkills });
    });
  } catch (err) {
    if (err.code === 'PROCESS_LOCK_HELD') {
      console.warn(`[BUSY] 另一项审查任务正在进行中 (持有者 PID: ${err.owner?.pid})，跳过本次执行。`);
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
