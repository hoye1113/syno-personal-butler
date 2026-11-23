// P4.3-A: pure configuration contract for the real Feishu client.
// No Host, Feishu connection, credential store or model is touched here.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_ERROR,
  ISOLATED_TEST_APP_ID,
  ISOLATED_TEST_ROOT,
  RealFeishuConfigError,
  resolveRealFeishuConfig,
} from "../experiments/superagent-p0/real-feishu-config.mjs";

const CONFIG_MODULE = fileURLToPath(new URL("../experiments/superagent-p0/real-feishu-config.mjs", import.meta.url));
const CLIENT_MODULE = fileURLToPath(new URL("../experiments/superagent-p0/real-feishu-client.mjs", import.meta.url));

const withTempBase = (run) => {
  const base = mkdtempSync(path.join(tmpdir(), "syno-p43a-config-"));
  try {
    return run(base);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
};

const productionEnv = (base) => {
  const root = path.join(base, "runtime-work");
  return {
    SYNO_P0_RUNTIME_MODE: "production",
    SYNO_P0_APP_ID: "cli_aa1234567890beef",
    SYNO_P0_ROOT: root,
    SYNO_P0_KNOWLEDGE_ROOT: path.join(base, "knowledge"),
    SYNO_P0_LOCAL_DATA_ROOT: path.join(base, "local-data"),
    SYNO_P0_RUNTIME_ROOT: path.join(root, "runtime"),
  };
};

const expectConfigError = (env, code) => assert.throws(
  () => resolveRealFeishuConfig(env),
  (error) => {
    assert.ok(error instanceof RealFeishuConfigError, `应为 RealFeishuConfigError，实际 ${error?.name}`);
    assert.equal(error.code, code);
    return true;
  },
);

test("默认配置逐字段等于当前隔离值", () => {
  const config = resolveRealFeishuConfig({});
  assert.equal(config.mode, "isolated-test");
  assert.equal(config.nodeEnv, "test");
  assert.equal(config.appId, "cli_aa77744deff89c02");
  assert.equal(config.root, "/Users/hoye/Documents/workspace/syno-p0-real-test");
  assert.equal(config.knowledgeRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test");
  assert.equal(config.localDataRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/local");
  assert.equal(config.runtimeRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime");
  assert.equal(config.vaultRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/vault");
  assert.equal(config.sourceUrl, "https://code.claude.com/docs/en/best-practices");
  assert.equal(config.sourcePath, "/Users/hoye/Documents/workspace/syno-p0-real-test/public-article.txt");
  assert.equal(config.inboxRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/inbox");
  assert.equal(config.captureEvents, "/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-events.jsonl");
  assert.equal(config.chatFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/test-chat.json");
  assert.equal(config.statusFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/feishu-client-status.json");
  assert.equal(config.hostStatusFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/host-status.json");
  assert.equal(config.databasePath, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db");
  assert.equal(config.knowledgeIndexFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p2-knowledge-index.json");
  assert.equal(config.knowledgeResultRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-knowledge-results");
  assert.equal(config.ideaRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-idea-artifacts");
  assert.equal(config.projectRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/vault/04-Projects");
  assert.equal(config.projectWorktreeRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/worktrees");
  assert.equal(config.legacyProjectRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-project-artifacts");
  assert.equal(config.memoryRoot, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-memory-artifacts");
  assert.equal(config.stateFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/local/state/feishu-channel.json");
  assert.equal(config.lockFile, "/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/locks/feishu-test-channel.lock");
  assert.equal(config.workerPath, "/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-worker-probe.mjs");
});

test("显式 isolated-test 与默认完全一致", () => {
  assert.deepEqual(resolveRealFeishuConfig({ SYNO_P0_RUNTIME_MODE: "isolated-test" }), resolveRealFeishuConfig({}));
});

test("合法 production 合成配置通过且派生路径正确", () => withTempBase((base) => {
  const env = productionEnv(base);
  const config = resolveRealFeishuConfig(env);
  const { SYNO_P0_ROOT: root } = env;
  assert.equal(config.mode, "production");
  assert.equal(config.nodeEnv, "production");
  assert.equal(config.appId, env.SYNO_P0_APP_ID);
  assert.equal(config.root, root);
  assert.equal(config.knowledgeRoot, env.SYNO_P0_KNOWLEDGE_ROOT);
  assert.equal(config.localDataRoot, env.SYNO_P0_LOCAL_DATA_ROOT);
  assert.equal(config.runtimeRoot, env.SYNO_P0_RUNTIME_ROOT);
  assert.equal(config.vaultRoot, path.join(env.SYNO_P0_KNOWLEDGE_ROOT, "vault"));
  assert.equal(config.sourcePath, path.join(root, "public-article.txt"));
  assert.equal(config.inboxRoot, path.join(root, "inbox"));
  assert.equal(config.databasePath, path.join(env.SYNO_P0_RUNTIME_ROOT, "p3-decision-memory.db"));
  assert.equal(config.knowledgeIndexFile, path.join(env.SYNO_P0_RUNTIME_ROOT, "p2-knowledge-index.json"));
  assert.equal(config.stateFile, path.join(env.SYNO_P0_LOCAL_DATA_ROOT, "state", "feishu-channel.json"));
  assert.equal(config.lockFile, `${path.join(env.SYNO_P0_LOCAL_DATA_ROOT, "state", "feishu-channel.json")}.lock`);
  assert.equal(config.chatFile, path.join(env.SYNO_P0_RUNTIME_ROOT, "test-chat.json"));
  // Test and production values never leak into each other.
  assert.notEqual(config.appId, ISOLATED_TEST_APP_ID);
  assert.ok(!config.root.startsWith(ISOLATED_TEST_ROOT));
  assert.ok(!config.stateFile.startsWith(ISOLATED_TEST_ROOT));
  const isolated = resolveRealFeishuConfig({});
  assert.ok(!isolated.stateFile.startsWith(root));
  assert.ok(!Object.values(isolated).some((value) => typeof value === "string" && value.startsWith(base)));
}));

test("生产消费者锁与旧 adapter 一致且不占用隔离锁", () => withTempBase((base) => {
  const production = resolveRealFeishuConfig(productionEnv(base));
  const isolated = resolveRealFeishuConfig({});
  // The legacy FeishuChannelAdapter defaults to `${stateStore.file}.lock`.
  assert.equal(production.lockFile, `${production.stateFile}.lock`);
  assert.equal(production.lockFile, `${path.join(production.localDataRoot, "state", "feishu-channel.json")}.lock`);
  assert.equal(production.lockFile, path.join(base, "local-data", "state", "feishu-channel.json.lock"));
  assert.equal(isolated.lockFile, path.join(ISOLATED_TEST_ROOT, "runtime", "locks", "feishu-test-channel.lock"));
  assert.notEqual(production.lockFile, isolated.lockFile);
  assert.notEqual(production.lockFile, path.join(production.runtimeRoot, "locks", "feishu-test-channel.lock"));
}));

test("缺每个生产必填项均失败且 code 稳定", () => withTempBase((base) => {
  const cases = [
    ["SYNO_P0_APP_ID", CONFIG_ERROR.MISSING_APP_ID],
    ["SYNO_P0_ROOT", CONFIG_ERROR.MISSING_ROOT],
    ["SYNO_P0_KNOWLEDGE_ROOT", CONFIG_ERROR.MISSING_KNOWLEDGE_ROOT],
    ["SYNO_P0_LOCAL_DATA_ROOT", CONFIG_ERROR.MISSING_LOCAL_DATA_ROOT],
    ["SYNO_P0_RUNTIME_ROOT", CONFIG_ERROR.MISSING_RUNTIME_ROOT],
  ];
  for (const [key, code] of cases) {
    const env = productionEnv(base);
    delete env[key];
    expectConfigError(env, code);
  }
}));

test("空值按缺失处理", () => withTempBase((base) => {
  const cases = [
    ["SYNO_P0_APP_ID", CONFIG_ERROR.MISSING_APP_ID],
    ["SYNO_P0_ROOT", CONFIG_ERROR.MISSING_ROOT],
    ["SYNO_P0_KNOWLEDGE_ROOT", CONFIG_ERROR.MISSING_KNOWLEDGE_ROOT],
    ["SYNO_P0_LOCAL_DATA_ROOT", CONFIG_ERROR.MISSING_LOCAL_DATA_ROOT],
    ["SYNO_P0_RUNTIME_ROOT", CONFIG_ERROR.MISSING_RUNTIME_ROOT],
  ];
  for (const [key, code] of cases) {
    expectConfigError({ ...productionEnv(base), [key]: "" }, code);
    expectConfigError({ ...productionEnv(base), [key]: "   " }, code);
  }
}));

test("未知 mode 失败", () => {
  expectConfigError({ SYNO_P0_RUNTIME_MODE: "staging" }, CONFIG_ERROR.UNKNOWN_MODE);
  expectConfigError({ SYNO_P0_RUNTIME_MODE: "Production" }, CONFIG_ERROR.UNKNOWN_MODE);
});

test("非法或复用隔离测试 App 失败", () => withTempBase((base) => {
  expectConfigError({ ...productionEnv(base), SYNO_P0_APP_ID: "not-an-app-id" }, CONFIG_ERROR.INVALID_APP_ID);
  expectConfigError({ ...productionEnv(base), SYNO_P0_APP_ID: "cli_AAA77744DEFF89C02" }, CONFIG_ERROR.INVALID_APP_ID);
  expectConfigError({ ...productionEnv(base), SYNO_P0_APP_ID: ISOLATED_TEST_APP_ID }, CONFIG_ERROR.PRODUCTION_TEST_APP);
}));

test("相对路径逐项失败", () => withTempBase((base) => {
  const cases = [
    ["SYNO_P0_ROOT", CONFIG_ERROR.RELATIVE_ROOT],
    ["SYNO_P0_KNOWLEDGE_ROOT", CONFIG_ERROR.RELATIVE_KNOWLEDGE_ROOT],
    ["SYNO_P0_LOCAL_DATA_ROOT", CONFIG_ERROR.RELATIVE_LOCAL_DATA_ROOT],
    ["SYNO_P0_RUNTIME_ROOT", CONFIG_ERROR.RELATIVE_RUNTIME_ROOT],
  ];
  for (const [key, code] of cases) {
    expectConfigError({ ...productionEnv(base), [key]: "relative/path" }, code);
  }
}));

test("runtime 越界或等于 root 失败", () => withTempBase((base) => {
  const env = productionEnv(base);
  expectConfigError(
    { ...env, SYNO_P0_RUNTIME_ROOT: path.join(base, "outside-runtime") },
    CONFIG_ERROR.RUNTIME_OUTSIDE_ROOT,
  );
  expectConfigError({ ...env, SYNO_P0_RUNTIME_ROOT: env.SYNO_P0_ROOT }, CONFIG_ERROR.RUNTIME_OUTSIDE_ROOT);
  expectConfigError(
    { ...env, SYNO_P0_RUNTIME_ROOT: path.join(env.SYNO_P0_ROOT, "..", "escape") },
    CONFIG_ERROR.RUNTIME_OUTSIDE_ROOT,
  );
}));

test("配置对象不可变", () => {
  for (const env of [{}, { SYNO_P0_RUNTIME_MODE: "isolated-test" }]) {
    const config = resolveRealFeishuConfig(env);
    assert.equal(Object.isFrozen(config), true);
    assert.throws(() => { config.appId = "cli_aaaaaaaaaaaaaaaa"; }, TypeError);
    assert.equal(config.appId, ISOLATED_TEST_APP_ID);
  }
});

test("解析不创建目录、不改传入 env、不发起网络", () => withTempBase((base) => {
  const env = productionEnv(base);
  const snapshot = structuredClone(env);
  resolveRealFeishuConfig(env);
  resolveRealFeishuConfig({});
  assert.deepEqual(env, snapshot);
  assert.deepEqual(readdirSync(base), []);
  const source = readFileSync(CONFIG_MODULE, "utf8");
  assert.ok(!/from\s+"node:(fs|net|http|https|dns|tls)"/.test(source));
  assert.ok(!/\brequire\(/.test(source));
}));

test("real-feishu-client.mjs 语法检查通过", () => {
  for (const file of [CONFIG_MODULE, CLIENT_MODULE]) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(result.status, 0, `${file} 语法检查失败：${result.stderr}`);
  }
});
