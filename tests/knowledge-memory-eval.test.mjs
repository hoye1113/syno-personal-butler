import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecall, wilson } from "../scripts/eval-knowledge-memory.mjs";
test("evaluation keeps false recall distinct from inactive leakage and reports uncertainty",()=>{
 const record={schemaVersion:2,id:"global",ownerKey:"owner",status:"active",kind:"preference",scope:"global",triggers:[],statement:"中文回答"};
 const {metrics}=evaluateRecall([{id:"negative",ownerKey:"owner",query:"无关",memories:[record],expectedIds:[],forbiddenIds:["global"]}]);assert.equal(metrics.negativeFalseRecall.numerator,1);assert.equal(metrics.invalidMemoryLeak,0);assert.equal(metrics.precision.numerator,0);assert.equal(metrics.precision.denominator,1);
 const zero=wilson(0,50),all=wilson(50,50);assert.equal(zero[0],0);assert.ok(zero[1]>.07);assert.ok(all[0]<.93);assert.equal(all[1],1);
});
