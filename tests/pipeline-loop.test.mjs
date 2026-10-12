import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseReviewDecision,
  runGh,
  assertHeadConsistency,
  chunksToText
} from '../scripts/review-with-claude.mjs';
import { ProcessFileLock } from '../packages/syno-core/process-lock.mjs';

test('parseReviewDecision: 严格首行解析与抗正文误导', () => {
  // 1. 标准 APPROVED
  const approvedText = `RESULT: [APPROVED]

### 1. 评审结论概述
所有验收标准均已满足，无阻断性问题。
`;
  const res1 = parseReviewDecision(approvedText);
  assert.equal(res1.isApproved, true);
  assert.equal(res1.decision, 'APPROVED');

  // 2. 首行 CHANGES_REQUESTED，但正文中引用了 RESULT: [APPROVED]
  const changesReqText = `RESULT: [CHANGES_REQUESTED]

### 1. 评审结论概述
之前版本曾给过 RESULT: [APPROVED]，但本次发现逻辑漏洞，需要修正。
`;
  const res2 = parseReviewDecision(changesReqText);
  assert.equal(res2.isApproved, false);
  assert.equal(res2.decision, 'CHANGES_REQUESTED');

  // 3. 首行包含前置无关字符，必须失败关闭
  const invalidLeadingText = `好的，我来做审查。
RESULT: [APPROVED]
`;
  assert.throws(() => parseReviewDecision(invalidLeadingText), /判定结构无效或含歧义/);

  // 4. 空文本必须失败关闭
  assert.throws(() => parseReviewDecision(''), /审查输出为空/);
  assert.throws(() => parseReviewDecision('   \n  \n'), /判定结构无效或含歧义/);

  // 5. 非法结果标头
  assert.throws(() => parseReviewDecision('RESULT: [UNKNOWN_STATE]'), /判定结构无效或含歧义/);
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

test('调度器与审查脚本：查询全量包含 --limit 1000 避免分页截断', async () => {
  const loopScript = await fs.readFile(path.resolve('scripts/agent-loop.mjs'), 'utf8');
  assert.match(loopScript, /'--limit',\s*'1000'/);
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
