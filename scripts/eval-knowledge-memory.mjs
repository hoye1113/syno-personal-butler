import { knowledgeConfirmationRequest, parseKnowledgeConfirmation } from "../apps/syno/syno/knowledge-confirmation.mjs";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { recallMemories } from "../packages/syno-core/memory-store.mjs";
import { recordVersion } from "../packages/syno-core/domain-records.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
const sha=s=>createHash("sha256").update(s).digest("hex");
function wilson(success,total){if(!total)return null;const z=1.959963984540054,p=success/total,d=1+z*z/total,c=(p+z*z/(2*total))/d,h=z*Math.sqrt((p*(1-p)+z*z/(4*total))/total)/d;return [(Math.abs(c-h)<1e-15?0:Math.max(0,c-h)),Math.min(1,c+h)];}
function ratio(numerator,denominator){return{numerator,denominator,value:denominator?numerator/denominator:null,confidence95:wilson(numerator,denominator)}}
function evaluateRecall(cases){
 const results=cases.map(c=>{const start=performance.now();const items=c.memories.filter(m=>m.ownerKey===c.ownerKey).map(record=>({record,version:recordVersion(record)}));const returned=recallMemories(items,c.query),ids=returned.map(r=>r.id),expected=new Set(c.expectedIds);return{id:c.id,expectedIds:c.expectedIds,returnedIds:ids,missed:c.expectedIds.filter(id=>!ids.includes(id)),unexpected:ids.filter(id=>!expected.has(id)),forbidden:ids.filter(id=>(c.forbiddenIds||[]).includes(id)),invalid:ids.filter(id=>c.memories.some(m=>m.id===id && (m.status!=="active" || m.testData || m.sensitive))),elapsedMs:performance.now()-start};});
 const expected=results.reduce((n,r)=>n+r.expectedIds.length,0),hits=results.reduce((n,r)=>n+r.expectedIds.length-r.missed.length,0),returned=results.reduce((n,r)=>n+r.returnedIds.length,0),negatives=results.filter(r=>!r.expectedIds.length),latencies=results.map(r=>r.elapsedMs).sort((a,b)=>a-b);
 return{results,metrics:{recallAt5:ratio(hits,expected),precision:ratio(hits,returned),negativeFalseRecall:ratio(negatives.filter(r=>r.returnedIds.length).length,negatives.length),missed:expected-hits,unexpected:returned-hits,invalidMemoryLeak:results.reduce((n,r)=>n+r.invalid.length,0),p95Ms:latencies[Math.ceil(latencies.length*.95)-1]||0}};
}
const DATASET_FILES = ['memory-recall-v1.jsonl','memory-recall-calibration-v1.jsonl','knowledge-memory-dialogues-v1.jsonl'];
const MEMORY_EVAL_PERSONA = '你执行个人记忆快照使用评测。依据当前问题和给定的有效记忆选择适用 ID。已确认的全局沟通偏好与长期约定必须默认适用，即使当前问题很短或看似无关；主题记忆仅在相关范围使用；当前明确指令优先。不推断未提供的事实。只输出 JSON {"ids":string[]}，无适用记录返回空数组，不调用工具。';
async function prepareMemoryEvalProfile(configRoot, outputRoot) {
 const directory=path.join(outputRoot,'memory-profile');await fs.mkdir(directory,{recursive:true});
 for(const name of ['syno-chat.cordis.yml','syno-capture.cordis.yml','syno-confirmation.cordis.yml'])await fs.copyFile(path.join(configRoot,name),path.join(directory,name));
 await fs.writeFile(path.join(directory,'syno-confirmation-agent.md'),MEMORY_EVAL_PERSONA+'\n');
 return directory;
}
function frozenDatasetsMatch(labels, datasets) {
 return labels.reviewedByOwner===true && labels.frozen===true && DATASET_FILES.every(name=>typeof datasets[name]==='string' && labels.datasets?.[name]===datasets[name]);
}
function summarizeModelRounds(runs, memoryCases, dialogueCases) {
 return [1,2,3].map(round=>{
  const rows=runs.filter(r=>r.round===round),byId=new Map(rows.map(r=>[r.id,r]));
  let hits=0,expected=0,returned=0,falseRecall=0;
  for(const c of memoryCases){
   const ids=byId.get(c.id)?.actual?.ids || [];expected+=c.expectedIds.length;returned+=ids.length;
   hits+=ids.filter(id=>c.expectedIds.includes(id)).length;if(!c.expectedIds.length&&ids.length)falseRecall++;
  }
  const approvals=dialogueCases.map(c=>({c,r:byId.get(c.id)}));
  const falseApprovals=approvals.filter(({c,r})=>r?.actual?.approvedId!=null&&r.actual.approvedId!==c.expectedApprovedId).length;
  const passed=rows.filter(r=>r.passed).length;
  return {round,passed,total:rows.length,incorrectWrites:falseApprovals,successRate:ratio(passed,rows.length),
   failedCalls:rows.filter(r=>r.code).length,notRun:memoryCases.length+dialogueCases.length-rows.length,
   memory:{recallAt5:ratio(hits,expected),precision:ratio(hits,returned),negativeFalseRecall:ratio(falseRecall,memoryCases.filter(c=>!c.expectedIds.length).length),missed:expected-hits,unexpected:returned-hits},
   decisions:{falseApproval:ratio(falseApprovals,dialogueCases.length),missedApproval:approvals.filter(({c,r})=>c.expectedApprovedId!==null&&r?.actual?.approvedId!==c.expectedApprovedId).length}};
 });
}
async function run({real=false}={}){
 const directory=path.join(PATHS.repoRoot,'tests/eval/fixtures'),datasets={},read=async name=>{const text=await fs.readFile(path.join(directory,name),'utf8');datasets[name]=sha(text);return text.trim().split('\n').map(JSON.parse);};
 const cases=await read('memory-recall-v1.jsonl'),dialogues=await read('knowledge-memory-dialogues-v1.jsonl');
 await read('memory-recall-calibration-v1.jsonl');
 const labels=JSON.parse(await fs.readFile(path.join(directory,'knowledge-memory-labels-v1.json'),'utf8'));
 const frozen=frozenDatasetsMatch(labels,datasets);
 if(labels.frozen && !frozen)throw new Error('冻结数据摘要不一致；拒绝运行，不能静默修改标签');
 const output=path.join(PATHS.runtimeRoot,'evals',new Date().toISOString().replace(/[:.]/g,'-'));await fs.mkdir(output,{recursive:true});
 let checkpointTail=Promise.resolve();
 const checkpoint=result=>{modelRuns.push(result);checkpointTail=checkpointTail.then(()=>fs.appendFile(path.join(output,'model-runs.jsonl'),JSON.stringify(result)+'\n'));return checkpointTail;};
 const codeSha=(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:PATHS.repoRoot})).stdout.trim();
 const startStatus=(await promisify(execFile)('git',['status','--porcelain'],{cwd:PATHS.repoRoot})).stdout;
 if(real&&frozen&&startStatus.trim())throw new Error('正式冻结评测要求干净的已提交版本');
 const deterministic=evaluateRecall(cases),modelRuns=[];
 let modelStatus=real?'pending':'not_run',cost={status:'not_reported',reason:'SDK 未提供逐例计费账单'};
 if(real){
  const {DeepSeekHarnessSupervisor}=await import('../apps/syno/syno/deepseek-harness-supervisor.mjs');
  const {DeepSeekHarnessCognitiveRuntime,DeepSeekHarnessSessionBindingStore}=await import('../apps/syno/syno/deepseek-harness-cognitive-runtime.mjs');
  const { defaultSynoSecretLoader } = await import('../apps/syno/syno/syno-key-loader.mjs');
  const memoryProfile=await prepareMemoryEvalProfile(path.join(PATHS.repoRoot,'config/deepseek-harness'),output);
  const evaluateRound = async round => {
    const supervisor=new DeepSeekHarnessSupervisor({localRoot:path.join(PATHS.runtimeRoot,`eval-harness-${round}`),journal:{record:async()=>{}},fakeAgent:'',secretLoader:()=>defaultSynoSecretLoader({envFile:path.join(process.env.SYNO_EVAL_CREDENTIAL_REPO || PATHS.repoRoot,'.env')})});
    const memorySupervisor=new DeepSeekHarnessSupervisor({configDir:memoryProfile,localRoot:path.join(PATHS.runtimeRoot,`eval-memory-harness-${round}`),journal:{record:async()=>{}},fakeAgent:'',secretLoader:()=>defaultSynoSecretLoader({envFile:path.join(process.env.SYNO_EVAL_CREDENTIAL_REPO || PATHS.repoRoot,'.env')})});
    const confirmationRuntime=new DeepSeekHarnessCognitiveRuntime({supervisor,bindings:new DeepSeekHarnessSessionBindingStore({file:path.join(PATHS.runtimeRoot,`eval-confirmation-bindings-${round}.json`)}),tools:null});
    const memoryRuntime=new DeepSeekHarnessCognitiveRuntime({supervisor:memorySupervisor,bindings:new DeepSeekHarnessSessionBindingStore({file:path.join(PATHS.runtimeRoot,`eval-memory-bindings-${round}.json`)}),tools:null});
    let memoryStopped=false;
    try {
      for(const c of [...cases.map(c=>({id:c.id,query:c.query,memories:recallMemories(c.memories.filter(m=>m.ownerKey===c.ownerKey).map(record=>({record,version:recordVersion(record)})),c.query),expectedIds:c.expectedIds})),...dialogues]) {
        const runtime=c.ownerMessage?confirmationRuntime:memoryRuntime;
        if(c.ownerMessage&&!memoryStopped){await memorySupervisor.stop();memoryStopped=true;}
        const start=performance.now();
        try {
          const request=c.ownerMessage?knowledgeConfirmationRequest({message:c.ownerMessage,decisions:c.decisions}):{text:JSON.stringify({task:'只依据当前有效记忆快照识别适用的记忆 ID；不要推断没有给出的记忆。输出 JSON {ids:string[]}',query:c.query,currentMemorySnapshot:c.memories})};
          const response=await runtime.run(request,{channel:'confirmation',threadKey:`eval:${round}:${c.id}`,ephemeralSession:true,allowedTools:[]});
          let parsed;
          if(c.ownerMessage){
            // 与生产共用同一解析规则：只有 approve + 合法唯一 ID 才算批准，其余意图即使带 ID 也不授权。
            parsed=parseKnowledgeConfirmation(response.text,c.decisions);
          } else {
            try{parsed=JSON.parse(response.text)}catch{throw Object.assign(new Error('invalid JSON'),{code:'EVAL_CONTRACT_INVALID'})}
            if(!parsed || !Array.isArray(parsed.ids)||!parsed.ids.every(id=>typeof id==='string')||new Set(parsed.ids).size!==parsed.ids.length)throw Object.assign(new Error('invalid output shape'),{code:'EVAL_CONTRACT_INVALID'});
          }
          const passed=c.ownerMessage?parsed.approvedId===c.expectedApprovedId:JSON.stringify([...(parsed.ids||[])].sort())===JSON.stringify([...c.expectedIds].sort());
          await checkpoint({id:c.id,round,suite:c.ownerMessage?'confirmation':'memory',passed,actual:c.ownerMessage?{intent:parsed.intent,approvedId:parsed.approvedId}:{ids:parsed.ids},errorWrite:c.ownerMessage?parsed.approvedId!=null&&parsed.approvedId!==c.expectedApprovedId:false,elapsedMs:performance.now()-start,modelId:response.modelId||runtime.lastAttempts.at(-1)?.modelId||null});
        } catch(error) {
          await checkpoint({id:c.id,round,suite:c.ownerMessage?'confirmation':'memory',passed:false,code:error.code||'MODEL_FAILED',elapsedMs:performance.now()-start,modelId:runtime.lastAttempts.at(-1)?.modelId||null});
          if(error.code==='HARNESS_ATTEMPTS_EXHAUSTED'||error.code==='HARNESS_SETUP_REQUIRED') break;
        }
        if(modelRuns.filter(r=>r.round===round).length%10===0) console.log(JSON.stringify({type:'eval.progress',round,completed:modelRuns.filter(r=>r.round===round).length,failed:modelRuns.filter(r=>r.round===round&&!r.passed).length}));
      }
    } finally { const stopped=await Promise.allSettled([supervisor.stop(),memorySupervisor.stop()]);if(stopped.some(r=>r.status==='rejected'))throw Object.assign(new Error('evaluation sidecar cleanup failed'),{code:'EVAL_CLEANUP_FAILED'}); }
  };
  const rounds=await Promise.allSettled([1,2,3].map(evaluateRound));
  modelStatus=rounds.some(r=>r.status==='rejected')?'failed':modelRuns.length===(cases.length+dialogues.length)*3?'completed':'incomplete';
  for(const r of rounds)if(r.status==='rejected')modelRuns.push({passed:false,code:r.reason?.code||'EVAL_ROUND_FAILED'});

 }
 await checkpointTail;
 const modelRounds=summarizeModelRounds(modelRuns,cases,dialogues);
 const gitStatus=(await promisify(execFile)('git',['status','--porcelain'],{cwd:PATHS.repoRoot})).stdout;
 const diff=(await promisify(execFile)('git',['diff','HEAD','--'],{cwd:PATHS.repoRoot,maxBuffer:20*1024*1024})).stdout;
 const finalCodeSha=(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:PATHS.repoRoot})).stdout.trim();
 const versionConsistent=codeSha===finalCodeSha;
 const report={schemaVersion:1,evaluationScope:'frozen dataset: deterministic Host recall; neutral, no-tool memory-snapshot classifier; production confirmation request and persona; no ordinary chat tool loop, actual business writes or Feishu publishing',memoryEvaluationPersona:MEMORY_EVAL_PERSONA,workingTree:{dirty:!!(gitStatus.trim()||startStatus.trim()),trackedDiffSha256:sha(diff)},codeSha,finalCodeSha,versionConsistent,timezone:'Asia/Shanghai',ruleVersion:'memory-recall-local-v1-nonoverlap',datasets,labelStatus:frozen?'owner_reviewed_frozen':'draft_not_release_evidence',sampleCount:cases.length,dialogueCount:dialogues.length,...deterministic,model:{status:modelStatus,runs:modelRuns,rounds:modelRounds,worstRound:modelRounds.filter(r=>r.total).sort((a,b)=>a.passed/a.total-b.passed/b.total)[0]||null,cost},releaseReady:frozen&&versionConsistent&&!gitStatus.trim()&&!startStatus.trim()&&modelStatus==='completed'&&modelRuns.length===(cases.length+dialogues.length)*3&&modelRuns.every(r=>r.passed)&&deterministic.metrics.recallAt5.value>=.9&&deterministic.metrics.precision.value>=.98&&deterministic.metrics.negativeFalseRecall.numerator===0};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:path.join(output,'report.json'),metrics:report.metrics,labelStatus:report.labelStatus,modelStatus,releaseReady:report.releaseReady}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run({real:process.argv.includes('--real')});
export{evaluateRecall,wilson,run,frozenDatasetsMatch,summarizeModelRounds,prepareMemoryEvalProfile,MEMORY_EVAL_PERSONA};
