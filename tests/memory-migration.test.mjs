import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { migrationManifest,applyMemoryMigration,restoreMemoryMigration } from "../packages/syno-core/memory-migration.mjs";
test("legacy approvals never activate; reviewed migration is repeatable and restores original bytes",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-migration-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));const dir=path.join(root,"ops/memory/proposals");await fs.mkdir(dir,{recursive:true});
 const original='---\nid: legacy\nstatement: 资料收录意图\nstatus: approved\nreason: old\n---\n';await fs.writeFile(path.join(dir,"legacy.md"),original);await fs.writeFile(path.join(dir,"README.md"),'guide');
 const manifest=await migrationManifest(root);assert.equal(manifest.entries.length,1);assert.equal(manifest.entries[0].status,"requires_review");assert.equal(manifest.entries[0].kind,null);
 await assert.rejects(applyMemoryMigration({root,manifest,reviewedDigest:manifest.digest,backupRoot:path.join(root,"backup")}));
 manifest.reviewed=true;manifest.entries[0].action='migrate';manifest.entries[0].record={schemaVersion:2,id:'legacy',ownerKey:'owner',kind:'background',scope:'global',triggers:[],status:'rejected',statement:'资料收录意图',reason:'已核查不是个人记忆',sourceMessageId:'',created:'2026-10-18T00:00:00Z',updated:'2026-10-18T00:00:00Z'};delete manifest.digest;manifest.digest=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 const args={root,manifest,reviewedDigest:manifest.digest,backupRoot:path.join(root,'backup')};await applyMemoryMigration(args);await applyMemoryMigration(args);await restoreMemoryMigration(args);assert.equal(await fs.readFile(path.join(dir,'legacy.md'),'utf8'),original);
});
