import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
test("business tools commit actions and confirmed memory through real Job, validator and isolated Git worktrees", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-transaction-中文-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const env = { ...process.env, NODE_ENV: "test", SYNO_REPO_ROOT: root, SYNO_RUNTIME_ROOT: path.join(root, ".runtime"), SYNO_LOCAL_DATA: path.join(root, ".local") };
  delete env.SYNO_KNOWLEDGE_ROOT;
  const { stdout } = await exec(process.execPath, [path.resolve("tests/support/business-tools-transaction.mjs")], { env, encoding: "utf8", timeout: 60000 });
  const result = JSON.parse(stdout);
  assert.equal(result.firstJobCommits, 3);
  assert.equal(result.proposed, "proposed");
  assert.equal(result.completed, "completed");
  assert.equal(result.memory, "active");
  assert.match(result.note, /以后回答优先用中文实例/);
  assert.equal(result.dirty, "");
  assert.equal(result.vaultExists, false);
});

test("recovery after content merge before terminal projection never repeats the effect", async t => {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-crash-merged-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const env={...process.env,NODE_ENV:"test",SYNO_REPO_ROOT:root,SYNO_RUNTIME_ROOT:path.join(root,".runtime"),SYNO_LOCAL_DATA:path.join(root,".local"),SYNO_CRASH_AFTER_MERGE:"1"};delete env.SYNO_KNOWLEDGE_ROOT;
 const worker=path.resolve("tests/support/business-tools-transaction.mjs");
 await assert.rejects(exec(process.execPath,[worker],{env,encoding:"utf8",timeout:60000}),error=>error.code===77);
 delete env.SYNO_CRASH_AFTER_MERGE;env.SYNO_RECOVERY_ONLY="1";
 const result=JSON.parse((await exec(process.execPath,[worker],{env,encoding:"utf8",timeout:60000})).stdout);
 assert.equal(result.jobs.length,1);assert.equal(result.jobs[0].status,"completed");assert.equal(result.dirty,"");
 const files=await fs.readdir(path.join(root,"ops/actions/2026/10"));assert.equal(files.length,1);
 const again=JSON.parse((await exec(process.execPath,[worker],{env,encoding:"utf8",timeout:60000})).stdout);assert.equal(again.jobs.length,1);assert.equal(again.dirty,"");
});
