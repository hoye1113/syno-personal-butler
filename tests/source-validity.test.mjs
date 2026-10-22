import test from "node:test";
import assert from "node:assert/strict";
import { sourceValidity, assertValidSource } from "../packages/syno-core/source-validity.mjs";
import { IntakeService } from "../packages/syno-core/intake.mjs";
test("verification page fails closed, normal verification discussion remains valid", () => {
  for (const text of ["环境异常\n当前环境异常，完成验证后即可继续访问。\n去验证", "当前环境异常，完成验证后即可继续访问。 去验证"]) assert.equal(sourceValidity({ text }).code, "SOURCE_VERIFICATION_REQUIRED");
  for (const text of ["这篇文章讨论验证码设计，遇到环境异常应检查浏览器。", "验证码与登录验证的实现方法：本文比较各类人机验证的优缺点。", "如何处理‘完成验证后即可继续访问’提示？这是工程排查指南。", "环境异常处理指南：先检查日志，再检查代理。"]) assert.equal(sourceValidity({ text }).valid, true);
  assert.equal(sourceValidity({ text: "继续", url: "https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha" }).valid, false);
  assert.throws(() => assertValidSource({ text: "有效但截断正文", truncated: true }), { code: "SOURCE_BODY_INCOMPLETE" });
});
test("empty title plus script residue fails closed as a wall page", () => {
  const js = `!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t(e.colorLib={})}(this,function(e){"use strict";var n=function(e,t){return e<t?-1:e>t?1:0};e.rgb=function(e){return e};const r=(e,t)=>e.map(e=>t(e));let o=0;for(o=0;o<256;o++){r([o],e=>e)};if(o>0){return o}});`;
  const residue = js.repeat(5);
  assert.deepEqual(sourceValidity({ text: residue, title: "" }), { valid: false, code: "SOURCE_VERIFICATION_REQUIRED", reason: "script_residue" });
  // 有标题的代码教程、无标题的长中文正文都不算残留。
  assert.equal(sourceValidity({ text: residue, title: "渲染器源码导读" }).valid, true);
  assert.equal(sourceValidity({ text: "公众号文章正文。".repeat(100), title: "" }).valid, true);
});
test("HTTP substitute and browser snapshot use identical intake barrier", async () => {
  const intake = new IntakeService({ sourceFetcher: async () => ({ text: "当前环境异常，完成验证后即可继续访问。 去验证", url: "https://example.com" }) });
  await assert.rejects(intake.prepare({ kind: "url", value: "https://example.com" }), { code: "SOURCE_VERIFICATION_REQUIRED" });
  await assert.rejects(intake.prepare({ kind: "url", value: "https://example.com", browserSnapshot: { text: "环境异常 当前环境异常，完成验证后即可继续访问。 去验证" } }), { code: "SOURCE_VERIFICATION_REQUIRED" });
});
