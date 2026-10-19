import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedSynoApiPath } from "../apps/syno/syno/server-api-allowlist.mjs";

test("Syno Host exposes Harness status without exposing its restart route", () => {
  assert.equal(isAllowedSynoApiPath("/api/syno/harness"), true);
  assert.equal(isAllowedSynoApiPath("/api/syno/harness/restart"), false);
  assert.equal(isAllowedSynoApiPath("/api/syno/private/unknown"), false);
});

test("publishing routes are narrowly exposed", () => {
  for (const suffix of ["probe", "recover", "check"]) assert.equal(isAllowedSynoApiPath(`/api/syno/knowledge/sync/${suffix}`), true);
  assert.equal(isAllowedSynoApiPath("/api/syno/knowledge/sync/config"), false);
});

test("publishing HTTP routes reject cross-origin and non-JSON writes before invoking Host", async () => {
 const { routeSynoApi } = await import('../apps/syno/syno/runtime.mjs');
 let writes=0;
 const runtime={core:{async execute(){writes++;return{ok:true}}},publisher:{async recover(){writes++;return{ok:true}},async check(){return{mode:'disabled'}}}};
 const url=new URL('http://127.0.0.1:8888/api/syno/knowledge/sync/probe');
 const headers={host:'127.0.0.1:8888','content-type':'application/json',origin:'http://127.0.0.1:8888'};
 await assert.rejects(routeSynoApi(runtime,{method:'POST',headers:{...headers,origin:'https://attacker.invalid'}},url,async()=>({})),{code:'PUBLISH_ORIGIN_DENIED'});
 await assert.rejects(routeSynoApi(runtime,{method:'POST',headers:{...headers,'content-type':'text/plain'}},url,async()=>({})),{code:'PUBLISH_JSON_REQUIRED'});
 await assert.rejects(routeSynoApi(runtime,{method:"GET",headers},url,async()=>({})),{code:"PUBLISH_METHOD_DENIED"});
 assert.equal(writes,0);
 await routeSynoApi(runtime,{method:'POST',headers},url,async()=>({}));assert.equal(writes,1);
 url.pathname='/api/syno/knowledge/sync/check';
 assert.equal((await routeSynoApi(runtime,{method:'GET',headers},url,async()=>({}))).mode,'disabled');
});
