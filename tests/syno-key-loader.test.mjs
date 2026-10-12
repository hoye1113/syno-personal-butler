import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SYNO_SECRET_NAMES, defaultSynoSecretLoader, parseDotenvValue } from "../apps/syno/syno/syno-key-loader.mjs";

async function withTempEnv(content, run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "syno-secret-env-"));
  const file = path.join(dir, ".env");
  await fs.writeFile(file, content, "utf8");
  try {
    return await run(file);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("SYNO_SECRET_NAMES covers the Kimi key and the three search providers", () => {
  assert.deepEqual([...SYNO_SECRET_NAMES], ["KIMI_API_KEY", "DOUBAO_SEARCH_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY"]);
});

test("parseDotenvValue reads a plain key, skips comments, and trims whitespace", () => {
  const text = [
    "# Syno 本机密钥文件（中文注释）",
    "",
    "KIMI_API_KEY=abc-123",
    "DECOY=value",
  ].join("\r\n");
  assert.equal(parseDotenvValue(text, "KIMI_API_KEY"), "abc-123");
});

test("parseDotenvValue strips export prefix and matching quotes", () => {
  assert.equal(parseDotenvValue("export KIMI_API_KEY=\"quoted-key\"", "KIMI_API_KEY"), "quoted-key");
  assert.equal(parseDotenvValue("KIMI_API_KEY='single-quoted'", "KIMI_API_KEY"), "single-quoted");
});

test("defaultSynoSecretLoader returns every filled key and omits empty ones", async () => {
  const content = [
    "# 主人填写的密钥",
    "KIMI_API_KEY=kimi-for-test",
    "DOUBAO_SEARCH_API_KEY=doubao-for-test",
    "TAVILY_API_KEY=",
    "EXA_API_KEY=exa-for-test",
  ].join("\n");
  await withTempEnv(content, async (file) => {
    assert.deepEqual(await defaultSynoSecretLoader({ envFile: file, env: {} }), {
      KIMI_API_KEY: "kimi-for-test",
      DOUBAO_SEARCH_API_KEY: "doubao-for-test",
      EXA_API_KEY: "exa-for-test",
    });
  });
});

test("process environment wins per key over the env file", async () => {
  await withTempEnv("KIMI_API_KEY=file-kimi\nTAVILY_API_KEY=file-tavily\n", async (file) => {
    const secrets = await defaultSynoSecretLoader({ envFile: file, env: { TAVILY_API_KEY: "env-tavily" } });
    assert.deepEqual(secrets, { KIMI_API_KEY: "file-kimi", TAVILY_API_KEY: "env-tavily" });
  });
});

test("defaultSynoSecretLoader returns an empty record when the file is missing", async () => {
  const missing = path.join(os.tmpdir(), "syno-secret-env-missing", ".env");
  assert.deepEqual(await defaultSynoSecretLoader({ envFile: missing, env: {} }), {});
});
