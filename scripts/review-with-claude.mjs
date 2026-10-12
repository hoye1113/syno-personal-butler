#!/usr/bin/env node

/**
 * scripts/review-with-claude.mjs
 * 
 * 自动化代码审查门禁脚本：
 * 1. 拉取目标 PR 信息、关联 Issue 验收标准、以及 Git Diff
 * 2. 挂载指定审查 Skill（默认 /code-review，支持追加其他 skill）
 * 3. 严格限制 Claude Code 仅使用只读工具（Bash, Read, Glob, Grep），杜绝擅自修改文件
 * 4. 解析 Claude Code 的结构化结论（[APPROVED] 或 [CHANGES_REQUESTED]）
 * 5. 将审查报告回写 GitHub PR，并由 Gemini 自行拉取执行全面返修
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runGh(args) {
  try {
    return execSync(`gh ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'zh_CN.UTF-8' }
    }).trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString('utf8') : err.message;
    throw new Error(`gh ${args} failed: ${stderr}`);
  }
}

function sendToast(title, body) {
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
    child.unref();
  } catch (e) {
    console.warn(`[Toast Warning] 桌面通知发送失败: ${e.message}`);
  }
}

/**
 * 唤起 Claude Code CLI 跑审查
 * 关键参数设计：
 * - --dangerously-skip-permissions: 非交互自动执行
 * - --tools Bash,Read,Glob,Grep: 绝对禁止 Edit 和 Write 工具，确保只读！
 */
async function runClaudeReview(prompt) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', [
      '-p',
      '--dangerously-skip-permissions',
      '--tools', 'Bash,Read,Glob,Grep'
    ], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', err => reject(err));

    child.on('close', code => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Claude Code 退出异常 (code ${code}): ${stderr}`));
      } else {
        resolvePromise(stdout.trim());
      }
    });

    // 经 stdin 写入 prompt，避免命令行参数转义与长度限制
    child.stdin.write(prompt + '\n');
    child.stdin.end();
  });
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

  // 若未指定 PR 编号，尝试自动检测当前分支对应的 PR
  if (!prNumber) {
    try {
      const prJson = runGh('pr view --json number');
      const parsed = JSON.parse(prJson);
      prNumber = parsed.number;
    } catch {
      console.error('错误: 请通过 --pr <PR_NUMBER> 指定审查的 PR，或在关联 PR 的分支下执行。');
      process.exit(1);
    }
  }

  console.log(`[1/4] 获取 PR #${prNumber} 详情与变更 Diff...`);
  const prDataRaw = runGh(`pr view ${prNumber} --json number,title,body,headRefName,baseRefName,labels,state`);
  const pr = JSON.parse(prDataRaw);

  if (pr.state !== 'OPEN') {
    console.log(`PR #${prNumber} 状态为 ${pr.state}，非 OPEN 状态，无需审查。`);
    return;
  }

  const diff = runGh(`pr diff ${prNumber}`);
  if (!diff || !diff.trim()) {
    console.error(`PR #${prNumber} 没有代码变更 (Diff 为空)。`);
    process.exit(1);
  }

  // 解析关联 Issue
  let issueContext = '（未明确关联 Issue 或未找到验收标准，请基于通用高质量工程标准审查）';
  const issueMatch = pr.body.match(/(?:Fixes|Closes|Resolves|Refs|Issue)?\s*#(\d+)/i);
  let relatedIssueNum = null;
  if (issueMatch) {
    relatedIssueNum = issueMatch[1];
    try {
      console.log(`[1/4] 读取关联 Issue #${relatedIssueNum}...`);
      const issueRaw = runGh(`issue view ${relatedIssueNum} --json number,title,body`);
      const issueData = JSON.parse(issueRaw);
      issueContext = `Issue #${issueData.number} 标题: ${issueData.title}\n需求与验收标准详情:\n${issueData.body}`;
    } catch (e) {
      console.warn(`[Warning] 读取关联 Issue #${relatedIssueNum} 失败: ${e.message}`);
    }
  }

  // 组装审查 Skill 管道（默认 /code-review，并支持叠加扩展其他技能）
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

  const isApproved = reviewResult.includes('RESULT: [APPROVED]');
  const isChangesRequested = reviewResult.includes('RESULT: [CHANGES_REQUESTED]');

  if (!isApproved && !isChangesRequested) {
    console.warn('[Warning] Claude Code 输出未包含标准 RESULT 标签，默认作为待调整处理。');
  }

  // 将审查结果持久化存一份到 .runtime/reviews，供 Gemini 读取排查
  try {
    const runtimeDir = resolve(process.cwd(), '.runtime', 'reviews');
    mkdirSync(runtimeDir, { recursive: true });
    const resultFile = resolve(runtimeDir, `pr-${prNumber}-review.md`);
    writeFileSync(resultFile, reviewResult, 'utf8');
    console.log(`[本地归档] 审查报告已持久化到: ${resultFile}`);
  } catch {}

  if (dryRun) {
    console.log('[Dry Run] 演练模式，不修改 GitHub 状态。');
    return;
  }

  console.log(`[4/4] 提交评审结论至 GitHub PR #${prNumber}...`);

  // 写入评论
  const commentBody = `## 🤖 Claude Code (Kimi) 自动化审查报告\n\n${reviewResult}`;
  runGh(`pr review ${prNumber} --comment -b ${JSON.stringify(commentBody)}`);

  if (isApproved) {
    console.log(`✅ 审查结论: [APPROVED] 通过！正在更新标签并触发通知...`);
    try {
      runGh(`pr edit ${prNumber} --add-label "approved" --remove-label "needs-review,changes-requested"`);
    } catch {}

    sendToast(
      `PR #${prNumber} 审查通过 🎉`,
      `Claude Code 评审已通过全部验收标准，请通知 Codex 或您亲自验收合并。`
    );
  } else {
    console.log(`❌ 审查结论: [CHANGES_REQUESTED] 需要修改！已转入返修队列，由 Gemini 进行修复。`);
    try {
      runGh(`pr edit ${prNumber} --add-label "changes-requested" --remove-label "needs-review"`);
    } catch {}

    sendToast(
      `PR #${prNumber} 需返修 ⚠️`,
      `Claude Code 审查发现问题，Gemini 将接手进行全部代码修复。`
    );
  }

  console.log(`完成！PR #${prNumber} 当前流转状态已同步。`);
}

main().catch(err => {
  console.error('[Fatal Error]', err.message);
  process.exit(1);
});
