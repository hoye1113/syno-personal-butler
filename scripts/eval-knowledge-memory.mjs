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
async function run({real=false}={}){
 const directory=path.join(PATHS.repoRoot,'tests/eval/fixtures'),datasets={},read=async name=>{const text=await fs.readFile(path.join(directory,name),'utf8');datasets[name]=sha(text);return text.trim().split('\n').map(JSON.parse);};
 const cases=await read('memory-recall-v1.jsonl'),dialogues=await read('knowledge-memory-dialogues-v1.jsonl');
 const labels=JSON.parse(await fs.readFile(path.join(directory,'knowledge-memory-labels-v1.json'),'utf8'));
 const deterministic=evaluateRecall(cases),modelRuns=[];
 let modelStatus=real?'pending':'not_run',cost={status:'not_reported',reason:'SDK 未提供逐例计费账单'};
 if(real){
  const {DeepSeekHarnessSupervisor}=await import('../apps/syno/syno/deepseek-harness-supervisor.mjs');
  const {DeepSeekHarnessCognitiveRuntime,DeepSeekHarnessSessionBindingStore}=await import('../apps/syno/syno/deepseek-harness-cognitive-runtime.mjs');
  const { defaultSynoSecretLoader } = await import('../apps/syno/syno/syno-key-loader.mjs');
  const evaluateRound = async round => {
    const supervisor=new DeepSeekHarnessSupervisor({localRoot:path.join(PATHS.runtimeRoot,`eval-harness-${round}`),journal:{record:async()=>{}},fakeAgent:'',secretLoader:()=>defaultSynoSecretLoader({envFile:path.join(process.env.SYNO_EVAL_CREDENTIAL_REPO || PATHS.repoRoot,'.env')})});
    const runtime=new DeepSeekHarnessCognitiveRuntime({supervisor,bindings:new DeepSeekHarnessSessionBindingStore({file:path.join(PATHS.runtimeRoot,`eval-bindings-${round}.json`)}),tools:null});
    try {
      for(const c of [...cases.map(c=>({id:c.id,query:c.query,memories:recallMemories(c.memories.filter(m=>m.ownerKey===c.ownerKey).map(record=>({record,version:recordVersion(record)})),c.query),expectedIds:c.expectedIds})),...dialogues]) {
        const start=performance.now();
        try {
          const prompt=c.ownerMessage?{task:'只判断原始主人消息是否明确批准唯一具体预览。否定、引用、假设、讨论、多对象不清不得批准。只输出 JSON {approvedId:string|null}',ownerMessage:c.ownerMessage,pendingPreviews:c.decisions}:{task:'只依据当前有效记忆快照识别适用的记忆 ID；不要推断没有给出的记忆。输出 JSON {ids:string[]}',query:c.query,currentMemorySnapshot:c.memories};
          const response=await runtime.run({text:JSON.stringify(prompt)},{channel:'confirmation',threadKey:`eval:${round}:${c.id}`,ephemeralSession:true,allowedTools:[]});
          let parsed;try{parsed=JSON.parse(response.text)}catch{throw Object.assign(new Error('invalid JSON'),{code:'EVAL_CONTRACT_INVALID'})}
          const passed=c.ownerMessage?parsed.approvedId===c.expectedApprovedId:JSON.stringify([...(parsed.ids||[])].sort())===JSON.stringify([...c.expectedIds].sort());
          modelRuns.push({id:c.id,round,passed,actual:c.ownerMessage?{approvedId:parsed.approvedId}:{ids:parsed.ids},errorWrite:c.ownerMessage?parsed.approvedId!=null&&parsed.approvedId!==c.expectedApprovedId:false,elapsedMs:performance.now()-start,modelId:response.modelId||runtime.lastAttempts.at(-1)?.modelId||null});
        } catch(error) {
          modelRuns.push({id:c.id,round,passed:false,code:error.code||'MODEL_FAILED',elapsedMs:performance.now()-start});
          if(error.code==='HARNESS_ATTEMPTS_EXHAUSTED'||error.code==='HARNESS_SETUP_REQUIRED') break;
        }
        if(modelRuns.filter(r=>r.round===round).length%10===0) console.log(JSON.stringify({type:'eval.progress',round,completed:modelRuns.filter(r=>r.round===round).length,failed:modelRuns.filter(r=>r.round===round&&!r.passed).length}));
      }
    } finally { await supervisor.stop().catch(()=>{}); }
  };
  try { await Promise.all([1,2,3].map(evaluateRound)); modelStatus=modelRuns.length===(cases.length+dialogues.length)*3?'completed':'incomplete'; }
  catch(error){modelStatus='failed';modelRuns.push({passed:false,code:error.code||'MODEL_UNAVAILABLE'});}

 }
 const modelRounds=[1,2,3].map(round=>({round,passed:modelRuns.filter(r=>r.round===round&&r.passed).length,total:modelRuns.filter(r=>r.round===round).length,incorrectWrites:modelRuns.filter(r=>r.round===round&&r.errorWrite).length}));
 const frozen=labels.reviewedByOwner===true&&labels.frozen===true&&Object.entries(datasets).every(([k,v])=>labels.datasets[k]===v);
 const gitStatus=(await promisify(execFile)('git',['status','--porcelain'],{cwd:PATHS.repoRoot})).stdout;
 const diff=(await promisify(execFile)('git',['diff','HEAD','--'],{cwd:PATHS.repoRoot,maxBuffer:20*1024*1024})).stdout;
 const report={schemaVersion:1,workingTree:{dirty:!!gitStatus.trim(),trackedDiffSha256:sha(diff)},codeSha:(await promisify(execFile)('git',['rev-parse','HEAD'],{cwd:PATHS.repoRoot})).stdout.trim(),timezone:'Asia/Shanghai',ruleVersion:'memory-recall-local-v1-nonoverlap',datasets,labelStatus:frozen?'owner_reviewed_frozen':'draft_not_release_evidence',sampleCount:cases.length,dialogueCount:dialogues.length,...deterministic,model:{status:modelStatus,runs:modelRuns,rounds:modelRounds,worstRound:modelRounds.filter(r=>r.total).sort((a,b)=>a.passed/a.total-b.passed/b.total)[0]||null,cost},releaseReady:frozen&&modelStatus==='completed'&&modelRuns.length===(cases.length+dialogues.length)*3&&modelRuns.every(r=>r.passed)&&deterministic.metrics.recallAt5.value>=.9&&deterministic.metrics.precision.value>=.98&&deterministic.metrics.negativeFalseRecall.numerator===0};
 const output=path.join(PATHS.runtimeRoot,'evals',new Date().toISOString().replace(/[:.]/g,'-'));await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:path.join(output,'report.json'),metrics:report.metrics,labelStatus:report.labelStatus,modelStatus,releaseReady:report.releaseReady}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run({real:process.argv.includes('--real')});
export{evaluateRecall,wilson,run};
