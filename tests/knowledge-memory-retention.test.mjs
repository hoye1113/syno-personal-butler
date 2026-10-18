import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { JobStore } from "../packages/syno-core/job-store.mjs";
import { EffectReceiptStore } from "../apps/syno/syno/effect-receipt-store.mjs";
const protect=async s=>Buffer.from(s).toString("base64"),unprotect=async s=>Buffer.from(s,"base64").toString("utf8");
test("retention removes terminal payloads at 30 days and only verified terminal journals at 90",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-retention-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));let now=new Date("2026-01-01T00:00:00Z");
 const store=new JobStore({opsRoot:path.join(root,"ops"),payloadRoot:path.join(root,"state/payloads"),clock:()=>now,protect,unprotect});
 const make=()=>store.create({request:{operation:"memory.proposals.create",payload:{statement:"中文偏好"}},decision:{intent:"ops",profile:"syno-ops",allowed:true,approval:"none",risk:"low"},ownerKey:"owner"});
 const done=await make(),pending=await make(),unverified=await make();done.status="completed";unverified.status="completed";await store.save(done);await store.save(unverified);await store.project(done);await store.projectionCommitted(done,{commit:"verified-sha"});
 now=new Date(+now+31*86400000);assert.equal((await store.prune()).payloads,2);await fs.access(path.join(store.payloadRoot,`${pending.payloadRef}.json`));await fs.access(store.journalFor(done.id).file);
 now=new Date(+now+60*86400000);assert.equal((await store.prune()).journals,1);await assert.rejects(fs.access(store.journalFor(done.id).file),{code:"ENOENT"});await fs.access(store.journalFor(pending.id).file);await fs.access(store.journalFor(unverified.id).file);
});
test("effect receipts retain dedupe metadata and unfinished effects beyond retention",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-receipt-retention-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));let now=new Date("2026-01-01T00:00:00Z");const store=new EffectReceiptStore({root:path.join(root,"metadata"),payloadRoot:path.join(root,"payloads"),lockFile:path.join(root,"lock"),clock:()=>now,protect,unprotect});
 for(const key of ["done","pending"])await store.begin({toolInvocationKey:key,toolName:"memory_propose",ownerKey:"owner",argumentsDigest:key});
 await store.commit({toolInvocationKey:"done",argumentsDigest:"done",result:{memoryRef:"m"},directEffect:{status:"committed"},businessOutcome:{status:"completed"}});now=new Date(+now+31*86400000);assert.equal((await store.prune()).removed,1);
 assert.equal((await store.get("done")).status,"committed");assert.equal((await store.get("done")).memoryRef,"m");assert.equal((await store.begin({toolInvocationKey:"done",toolName:"memory_propose",argumentsDigest:"done"})).created,false);assert.equal((await store.get("pending")).status,"pending");
});
