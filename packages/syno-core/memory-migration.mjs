import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseRecord, writeRecord } from "./markdown-record.mjs";
import { frontmatterData } from "./validator.mjs";
import { validateContractRecord } from "./schema-registry.mjs";
const digest = s => createHash("sha256").update(s).digest("hex");
async function migrationManifest(root) {
 const entries=[];
 async function walk(directory){for(const e of await fs.readdir(directory,{withFileTypes:true}).catch(x=>{if(x.code==='ENOENT')return[];throw x})){const file=path.join(directory,e.name);if(e.isDirectory())await walk(file);else if(e.isFile()&&e.name.endsWith('.md')&&e.name.toLowerCase()!=='readme.md'){
  const text=await fs.readFile(file,'utf8');let r,anomalies=[];
  try{r=text.includes('<!-- syno:json:')?parseRecord(text):frontmatterData(text).values;await validateContractRecord(r.schemaVersion===2?'personal-memory':'memory-proposal',r);}catch{anomalies.push('invalid_record');}
  const testData=r?.testData===true||String(r?.statement||'').includes('【仅测试，非真实偏好】');
  const status=r?.status==='rejected'?'rejected':r?.schemaVersion===2?r.status:'requires_review';
  if(!r?.ownerKey)anomalies.push('owner_unverified');if(r?.status==='approved'&&r?.schemaVersion!==2)anomalies.push('legacy_approval_not_personal_confirmation');
  entries.push({originalPath:path.relative(root,file).replaceAll('\\','/'),originalDigest:digest(text),id:r?.id||null,schemaVersion:r?.schemaVersion||null,ownerKey:r?.ownerKey||null,kind:r?.schemaVersion===2?r.kind:null,status,testData,target:path.relative(root,file).replaceAll('\\','/'),action:r?.schemaVersion===2?'retain':'review',anomalies});
 }}}
 await walk(path.join(root,'ops/memory'));
 const manifest={schemaVersion:1,timezone:'Asia/Shanghai',entries:entries.sort((a,b)=>a.originalPath.localeCompare(b.originalPath)),reviewed:false};
 return{...manifest,digest:digest(JSON.stringify(manifest))};
}
async function applyMemoryMigration({root,manifest,reviewedDigest,backupRoot}){
 if(!manifest.reviewed||reviewedDigest!==digest(JSON.stringify({...manifest,digest:undefined}))||reviewedDigest!==manifest.digest)throw new Error('迁移清单未审核冻结或摘要不匹配');
 const approved=manifest.entries.filter(e=>e.action==='migrate');
 for(const e of approved){
  if(!/^ops\/memory\/(?!.*\.\.)[\p{L}\p{N}/_.-]+\.md$/u.test(e.originalPath)||e.target!==e.originalPath)throw new Error('迁移仅允许原位置映射');
  await validateContractRecord('personal-memory',e.record);
  const file=path.join(root,e.originalPath),text=await fs.readFile(file,'utf8');
  if(digest(text)!==e.originalDigest){try{if(JSON.stringify(parseRecord(text))===JSON.stringify(e.record))continue;}catch{}throw new Error('迁移源已变化');}
  const backup=path.join(backupRoot,e.originalPath);await fs.mkdir(path.dirname(backup),{recursive:true});await fs.writeFile(backup,text,{flag:'wx'}).catch(x=>{if(x.code!=='EEXIST')throw x});
  if(digest(await fs.readFile(backup,'utf8'))!==e.originalDigest)throw new Error('备份校验失败');
  await writeRecord(file,e.record,{schema:'personal-memory',title:`Memory ${e.record.id}`});
 }
 return{migrated:approved.length,backupRoot};
}
async function restoreMemoryMigration({root,manifest,backupRoot}){
 for(const e of manifest.entries.filter(e=>e.action==='migrate')){
  if(!/^ops\/memory\/(?!.*\.\.)[\p{L}\p{N}/_.-]+\.md$/u.test(e.originalPath))throw new Error('恢复路径越界');
  const text=await fs.readFile(path.join(backupRoot,e.originalPath),'utf8');if(digest(text)!==e.originalDigest)throw new Error('备份摘要不匹配');
  await fs.writeFile(path.join(root,e.originalPath),text,'utf8');
 }
}
export {migrationManifest,applyMemoryMigration,restoreMemoryMigration};
