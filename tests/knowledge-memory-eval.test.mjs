import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecall, wilson } from "../scripts/eval-knowledge-memory.mjs";
test("evaluation keeps false recall distinct from inactive leakage and reports uncertainty",()=>{
 const record={schemaVersion:2,id:"global",ownerKey:"owner",status:"active",kind:"preference",scope:"global",triggers:[],statement:"中文回答"};
 const {metrics}=evaluateRecall([{id:"negative",ownerKey:"owner",query:"无关",memories:[record],expectedIds:[],forbiddenIds:["global"]}]);assert.equal(metrics.negativeFalseRecall.numerator,1);assert.equal(metrics.invalidMemoryLeak,0);assert.equal(metrics.precision.numerator,0);assert.equal(metrics.precision.denominator,1);
 const zero=wilson(0,50),all=wilson(50,50);assert.equal(zero[0],0);assert.ok(zero[1]>.07);assert.ok(all[0]<.93);assert.equal(all[1],1);
});

test("Owner-reviewed fixture revisions stay internally consistent with their dataset digests", async () => {
 const {readFile}=await import("node:fs/promises"),{createHash}=await import("node:crypto");
 const read=async name=>readFile(new URL(`./eval/fixtures/${name}`,import.meta.url),"utf8");
 const labels=JSON.parse(await read("knowledge-memory-labels-v1.json"));
 for(const [name,digest] of Object.entries(labels.datasets)) assert.equal(createHash("sha256").update(await read(name)).digest("hex"),digest,`${name} digest`);
 const cases=(await read("memory-recall-v1.jsonl")).trim().split("\n").map(JSON.parse);
 assert.deepEqual(cases.find(c=>c.id==="M045").expectedIds,["m104"]);
 const m060=cases.find(c=>c.id==="M060");assert.deepEqual(m060.expectedIds,[]);assert.deepEqual(m060.forbiddenIds,["m309"]);assert.equal(m060.memories[0].kind,"standing_instruction");
 const dialogues=(await read("knowledge-memory-dialogues-v1.jsonl")).trim().split("\n").map(JSON.parse);
 for(const id of ["D001","D011"]){const c=dialogues.find(c=>c.id===id);assert.equal(c.expectedApprovedId,null);assert.equal(c.shouldWrite,false);assert.equal(c.operation,null);assert.deepEqual(c.objectIds,[]);assert.equal(c.expectedAction,"clarify");}
});

test("frozen evaluation requires all three matching dataset digests", async () => {
 const {frozenDatasetsMatch}=await import("../scripts/eval-knowledge-memory.mjs");
 const datasets={"memory-recall-v1.jsonl":"memory","memory-recall-calibration-v1.jsonl":"calibration","knowledge-memory-dialogues-v1.jsonl":"dialogues"};
 const labels={reviewedByOwner:true,frozen:true,datasets:{...datasets}};
 assert.equal(frozenDatasetsMatch(labels,datasets),true);
 assert.equal(frozenDatasetsMatch(labels,{...datasets,"memory-recall-calibration-v1.jsonl":"changed"}),false);
 assert.equal(frozenDatasetsMatch(labels,{"memory-recall-v1.jsonl":"memory","knowledge-memory-dialogues-v1.jsonl":"dialogues"}),false);
 assert.equal(frozenDatasetsMatch({...labels,reviewedByOwner:false},datasets),false);
});

test("model round reports separate missed recall, false recall, false approval and failed calls", async()=>{
 const {summarizeModelRounds}=await import("../scripts/eval-knowledge-memory.mjs");
 const memory=[{id:"positive",expectedIds:["valid"]},{id:"negative",expectedIds:[]}],dialogues=[{id:"deny",expectedApprovedId:null},{id:"allow",expectedApprovedId:"decision-ok"}];
 const runs=[{id:"positive",round:1,passed:false,actual:{ids:[]}},{id:"negative",round:1,passed:false,actual:{ids:["unexpected"]}},{id:"deny",round:1,passed:false,actual:{approvedId:"bad"}},{id:"allow",round:1,passed:false,code:"EVAL_CONTRACT_INVALID"}];
 const [first,second]=summarizeModelRounds(runs,memory,dialogues);
 assert.equal(first.memory.missed,1);assert.equal(first.memory.unexpected,1);assert.equal(first.memory.negativeFalseRecall.numerator,1);assert.equal(first.decisions.falseApproval.numerator,1);assert.equal(first.decisions.falseApproval.denominator,2);assert.equal(first.decisions.missedApproval,1);assert.equal(first.failedCalls,1);assert.equal(first.successRate.numerator,0);assert.equal(second.notRun,4);
});

test("memory evaluation uses an isolated persona and leaves the production confirmation profile intact",async t=>{
 const {prepareMemoryEvalProfile,MEMORY_EVAL_PERSONA}=await import('../scripts/eval-knowledge-memory.mjs');
 const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const root=await mkdtemp(path.join(tmpdir(),'syno-eval-persona-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const configRoot=path.resolve('config/deepseek-harness'),before=await readFile(path.join(configRoot,'syno-confirmation-agent.md'),'utf8');
 const copy=await prepareMemoryEvalProfile(configRoot,root);
 assert.equal(await readFile(path.join(copy,'syno-confirmation-agent.md'),'utf8'),MEMORY_EVAL_PERSONA+'\n');assert.match(MEMORY_EVAL_PERSONA,/ids/);assert.doesNotMatch(MEMORY_EVAL_PERSONA,/approvedId/);
 assert.equal(await readFile(path.join(configRoot,'syno-confirmation-agent.md'),'utf8'),before);
 assert.equal(await readFile(path.join(copy,'syno-confirmation.cordis.yml'),'utf8'),await readFile(path.join(configRoot,'syno-confirmation.cordis.yml'),'utf8'));
});
