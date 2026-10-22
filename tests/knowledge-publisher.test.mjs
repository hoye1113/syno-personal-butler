import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { KnowledgePublisher } from "../packages/syno-core/knowledge-publisher.mjs";
import { PendingDecisionStore } from "../packages/syno-core/pending-decision.mjs";
import { KnowledgeChanges } from "../packages/syno-core/knowledge-changes.mjs";
import { RecoveryJournal } from "../packages/syno-core/recovery-journal.mjs";
async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-publisher-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const config={mode:"sandbox",sandboxConfirmed:true,targetKey:"isolated",wikiSpaceId:"space",wikiParentId:"parent",appToken:"app",tableId:"table",fields:{id:"ID"}};
 let now=new Date("2026-10-18T00:00:00Z"), version="v1", fail=null, remoteEdited=false, calls=[];
 const source=async()=>({id:"n",version,title:"test",body:"完整正文",complete:true,resources:{complete:true,version:"a1",items:[]}});
 const adapter={async read(){return{fingerprint:remoteEdited?"human":"managed"}},async reconcile(){return null},async apply(target,{effect}){calls.push(target); return effect(`${target}.write`,async()=>{if(fail===target)throw Object.assign(new Error("connection closed"),{code:"ECONNRESET"}); return{remoteId:target,fingerprint:"managed"}})}};
 const publisher=new KnowledgePublisher({config,root,stateRoot:path.join(root,"state"),source,adapter,clock:()=>now,persist:async(record,file)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});const tmp=path.join(root,file)+".tmp";await fs.writeFile(tmp,JSON.stringify(record));await fs.rename(tmp,path.join(root,file));}});
 return{root,publisher,source,adapter,calls,setFail:v=>fail=v,setVersion:v=>version=v,setEdited:v=>remoteEdited=v,tick:()=>now=new Date(+now+61000)};
}
test("disabled publisher never reaches remote or creates a registration",async()=>{
 let writes=0;const p=new KnowledgePublisher({config:{mode:"disabled"},adapter:{apply(){writes++}}});assert.equal((await p.queue("owner",{})).status,"disabled");assert.equal(writes,0);
});
test("all targets agree on one version; replay does not publish twice",async t=>{
 const f=await fixture(t);await f.publisher.queue("owner",await f.source());assert.equal((await f.publisher.run("owner","n")).status,"synced");await f.publisher.retry("owner","n");assert.deepEqual(f.calls,["wiki","images","catalog"]);
});
test("unknown creation never blindly retries; read-only reconciliation can resolve it",async t=>{
 const f=await fixture(t);f.setFail("wiki");await f.publisher.queue("owner",await f.source());const failed=await f.publisher.run("owner","n");assert.equal(failed.targets.wiki.status,"unknown");f.setFail(null);f.tick();await f.publisher.retry("owner","n");assert.deepEqual(f.calls,["wiki"]);
 f.adapter.reconcile=async()=>({remoteId:"wiki",fingerprint:"managed"});assert.equal((await f.publisher.retry("owner","n")).status,"synced");assert.deepEqual(f.calls,["wiki","images","catalog"]);
});
test("remote human edits block replacement; stale version cannot publish",async t=>{
 const f=await fixture(t);await f.publisher.queue("owner",await f.source());await f.publisher.run("owner","n");f.setVersion("v2");await f.publisher.queue("owner",await f.source());f.setEdited(true);const result=await f.publisher.run("owner","n");assert.equal(result.targets.wiki.status,"blocked");assert.equal(result.targets.wiki.errorCode,"SYNC_REMOTE_CONFLICT");assert.equal(f.calls.length,3);
 f.setVersion("v3");assert.equal((await f.publisher.run("owner","n")).status,"stale");
});
test("remote mapping without fingerprint fails closed instead of overwriting", async t => {
 const f=await fixture(t);const key=f.publisher.key("owner","n");const file=path.join(f.root,"ops/knowledge/publish-map",`${key}.json`);
 await fs.mkdir(path.dirname(file),{recursive:true});
 await fs.writeFile(file,JSON.stringify({schemaVersion:1,id:"n",ownerKey:"owner",sourceVersion:"v1",resourceVersion:"a1",targetKey:"isolated",mode:"sandbox",targets:{wiki:{status:"succeeded",expectedVersion:"v1",appliedVersion:"v0",remoteId:"wiki"},images:{status:"pending",expectedVersion:"v1"},catalog:{status:"pending",expectedVersion:"v1"}}}));
 const result=await f.publisher.run("owner","n");
 assert.equal(result.targets.wiki.status,"blocked");
 assert.equal(result.targets.wiki.errorCode,"SYNC_CONFIGURATION_INVALID");
 assert.deepEqual(f.calls,[]);
});
test("durable journal repairs only incomplete tail; never records memory content",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-journal-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,"wal.jsonl"), j=new RecoveryJournal({file});
 await j.append("effect.intent",{id:"n",version:"v"});await fs.appendFile(file,'{"interrupted":');assert.equal((await j.read()).length,1);await j.append("effect.observed",{id:"n",remoteId:"r"});assert.equal((await j.read()).length,2);await assert.rejects(j.append("memory",{statement:"private"}));
});

test("new versions cannot discard an unknown creation identity", async t => {
 const f=await fixture(t);f.setFail("wiki");await f.publisher.queue("owner",await f.source());await f.publisher.run("owner","n");
 f.setVersion("v2");await assert.rejects(f.publisher.queue("owner",await f.source()),{code:"SYNC_OUTCOME_UNKNOWN"});
 const stored=await f.publisher.status("owner","n");assert.equal(stored.sourceVersion,"v1");assert.equal(stored.targets.wiki.status,"unknown");
});
test("known partial failure retains created identity and retries only after delay", async t => {
 const f=await fixture(t);let creates=0,attempts=0;
 f.adapter.apply=async(target,{state,effect})=>{
   f.calls.push(target);
   if(target!=="wiki") return {remoteId:target,fingerprint:"managed"};
   if(!state.remoteId) await effect("wiki.create",async()=>({remoteId:`node-${++creates}`,docId:"doc"}));
   return effect("wiki.blocks.0",async()=>{if(++attempts===1)throw Object.assign(new Error("rate limit"),{outcomeKnown:true,code:"RATE_LIMIT"});return{remoteId:state.remoteId,docId:"doc",fingerprint:"managed"}});
 };
 await f.publisher.queue("owner",await f.source());let result=await f.publisher.run("owner","n");assert.equal(result.targets.wiki.status,"retryable_failed");assert.equal(result.targets.wiki.remoteId,"node-1");assert.equal(f.calls.length,1);
 await f.publisher.retry("owner","n");assert.equal(attempts,1);f.tick();result=await f.publisher.retry("owner","n");assert.equal(result.status,"synced");assert.equal(creates,1);
});
test("catalog cannot report success while images failed", async t => {
 const f=await fixture(t);f.setFail("images");await f.publisher.queue("owner",await f.source());const r=await f.publisher.run("owner","n");assert.equal(r.status,"pending");assert.equal(r.targets.catalog.status,"pending");assert.deepEqual(f.calls,["wiki","images"]);
});
test("same content at a new path refreshes only the catalog (2026-10-22 note-move staleness)", async t => {
 const f=await fixture(t);
 const note=await f.source();
 await f.publisher.queue("owner",{...note,path:"vault/00-Inbox/n.md"});
 assert.equal((await f.publisher.run("owner","n")).status,"synced");
 assert.deepEqual(f.calls,["wiki","images","catalog"]);
 const record=await f.publisher.status("owner","n");
 assert.equal(record.sourcePath,"vault/00-Inbox/n.md");
 // 移动笔记：内容版本不变，路径变了 → 仅 catalog 回到 pending，wiki/images 不重发。
 await f.publisher.queue("owner",{...note,path:"vault/02-Resources/n.md"});
 const moved=await f.publisher.status("owner","n");
 assert.equal(moved.targets.catalog.status,"pending");
 assert.equal(moved.targets.wiki.status,"succeeded");
 assert.equal(moved.targets.images.status,"succeeded");
 assert.equal(moved.sourcePath,"vault/02-Resources/n.md");
 assert.equal((await f.publisher.run("owner","n")).status,"synced");
 assert.deepEqual(f.calls.slice(3),["catalog"]);
 // 路径再不变 → 完全幂等，不再产生任何远端写。
 await f.publisher.queue("owner",{...note,path:"vault/02-Resources/n.md"});
 assert.deepEqual(f.calls.slice(3),["catalog"]);
});

test("explicit rate-limit responses honor server Retry-After and remain known failures",async t=>{
 const f=await fixture(t);f.adapter.apply=async(target,{effect})=>effect(`${target}.write`,async()=>{throw Object.assign(new Error("limited"),{response:{status:429,headers:{"retry-after":"180"}}})});await f.publisher.queue("owner",await f.source());const r=await f.publisher.run("owner","n");assert.equal(r.targets.wiki.status,"retryable_failed");assert.equal(r.targets.wiki.errorCode,"SYNC_RATE_LIMITED");assert.equal(r.targets.wiki.nextRetryAt,"2026-10-18T00:03:00.000Z");
});

test("conflict retry previews differences; only later Owner approval authorizes the exact remote revision",async t=>{
 const f=await fixture(t);f.publisher.decisions=new PendingDecisionStore({file:path.join(f.root,"decisions.json")});
 await f.publisher.queue("owner",await f.source());await f.publisher.run("owner","n");f.setVersion("v2");await f.publisher.queue("owner",await f.source());f.setEdited(true);await f.publisher.run("owner","n");
 const preview=await f.publisher.conflictPreview("owner","n",{threadKey:"main",messageId:"preview"});assert.equal(preview.status,"awaiting_confirmation");assert.equal(preview.conflicts[0].remoteFingerprint,"human");assert.equal(f.calls.length,3);
 const decisions=f.publisher.decisions,job={id:"approve-job",ownerKey:"owner",threadKey:"main",request:{sourceMessageId:"later"}},workspace=path.join(f.root,"isolated");
 await assert.rejects(f.publisher.authorizeRetry({decision:(await decisions.list())[0],job,workspace}),{code:"OWNER_CONFIRMATION_REQUIRED"});
 const changes=new KnowledgeChanges({root:f.root,decisions,judge:async({message,decisions})=>message==="采用本地覆盖刚才云端预览"?decisions[0].id:null});
 await changes.prepareTurn({ownerKey:"owner",threadKey:"main",messageId:"later",text:"引用资料：采用本地覆盖刚才云端预览"});await assert.rejects(f.publisher.authorizeRetry({decision:(await decisions.list())[0],job,workspace}),{code:"OWNER_CONFIRMATION_REQUIRED"});
 await changes.prepareTurn({ownerKey:"owner",threadKey:"main",messageId:"later",text:"采用本地覆盖刚才云端预览"});
 const d=(await decisions.list())[0];await assert.rejects(f.publisher.authorizeRetry({decision:d,job:{...job,ownerKey:"other"},workspace}),{code:"OWNER_CONFIRMATION_REQUIRED"});
 f.setEdited(false);await assert.rejects(f.publisher.authorizeRetry({decision:d,job,workspace}),{code:"OBJECT_VERSION_CHANGED"});f.setEdited(true);
 const result=await f.publisher.authorizeRetry({decision:d,job,workspace});assert.equal(result.changedPaths.length,1);assert.equal((await f.publisher.status("owner","n")).targets.wiki.status,"blocked");
 await fs.copyFile(path.join(workspace,result.changedPaths[0]),path.join(f.root,result.changedPaths[0]));
 const apply=f.adapter.apply;f.adapter.apply=async(target,args)=>{const value=await apply(target,args);if(target==="wiki")f.setEdited(false);return value};assert.equal((await f.publisher.retry("owner","n")).status,"synced");
 await assert.rejects(f.publisher.authorizeRetry({decision:(await decisions.list())[0],job:{...job,id:"replay-other"},workspace}),{code:"OWNER_CONFIRMATION_REQUIRED"});
});

test("publishing check reports configuration and scoped maps without writes",async t=>{
 const f=await fixture(t);let reads=0;
 f.adapter.inspect=async()=>{reads++;return{writeAccess:'not_verified_by_read_check',checks:{}}};
 await f.publisher.queue('owner',await f.source());
 const before=await fs.readFile(path.join(f.root,'ops/knowledge/publish-map',`${f.publisher.key('owner','n')}.json`),'utf8');
 const r=await f.publisher.check('owner');assert.equal(reads,1);assert.equal(r.registeredNotes,1);assert.equal(r.targetStates.pending,3);assert.equal(r.diagnostic.writeAccess,'not_verified_by_read_check');
 assert.equal((await f.publisher.check('other')).registeredNotes,0);
 assert.equal(await fs.readFile(path.join(f.root,'ops/knowledge/publish-map',`${f.publisher.key('owner','n')}.json`),'utf8'),before);
});
