// Pure configuration resolution for the isolated real Feishu consumer.
// Importing this module never reads files, creates directories, mutates `env` or touches the network.
import path from "node:path";

export const ISOLATED_TEST_ROOT = "/Users/hoye/Documents/workspace/syno-p0-real-test";
export const ISOLATED_TEST_APP_ID = "cli_aa77744deff89c02";
export const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
export const WORKER_PATH = "/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-worker-probe.mjs";

export const ISOLATED_TEST_MODE = "isolated-test";
export const PRODUCTION_MODE = "production";

// Stable error codes. Callers may branch on `error.code`; the message is diagnostic only.
export const CONFIG_ERROR = Object.freeze({
  UNKNOWN_MODE: "P43A_CONFIG_UNKNOWN_MODE",
  MISSING_APP_ID: "P43A_CONFIG_MISSING_APP_ID",
  INVALID_APP_ID: "P43A_CONFIG_INVALID_APP_ID",
  PRODUCTION_TEST_APP: "P43A_CONFIG_PRODUCTION_TEST_APP",
  MISSING_ROOT: "P43A_CONFIG_MISSING_ROOT",
  MISSING_KNOWLEDGE_ROOT: "P43A_CONFIG_MISSING_KNOWLEDGE_ROOT",
  MISSING_LOCAL_DATA_ROOT: "P43A_CONFIG_MISSING_LOCAL_DATA_ROOT",
  MISSING_RUNTIME_ROOT: "P43A_CONFIG_MISSING_RUNTIME_ROOT",
  RELATIVE_ROOT: "P43A_CONFIG_RELATIVE_ROOT",
  RELATIVE_KNOWLEDGE_ROOT: "P43A_CONFIG_RELATIVE_KNOWLEDGE_ROOT",
  RELATIVE_LOCAL_DATA_ROOT: "P43A_CONFIG_RELATIVE_LOCAL_DATA_ROOT",
  RELATIVE_RUNTIME_ROOT: "P43A_CONFIG_RELATIVE_RUNTIME_ROOT",
  RUNTIME_OUTSIDE_ROOT: "P43A_CONFIG_RUNTIME_OUTSIDE_ROOT",
});

export class RealFeishuConfigError extends Error {
  constructor(code, field, detail) {
    super(`${code}: ${detail}`);
    this.name = "RealFeishuConfigError";
    this.code = code;
    this.field = field;
  }
}

const APP_ID_PATTERN = /^cli_[a-z0-9]{6,32}$/;

const requiredValue = (env, name, code) => {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new RealFeishuConfigError(code, name, `缺少必填环境变量 ${name}`);
  }
  return value;
};

const requiredAbsolutePath = (env, name, missingCode, relativeCode) => {
  const value = requiredValue(env, name, missingCode);
  if (!path.isAbsolute(value)) {
    throw new RealFeishuConfigError(relativeCode, name, `${name} 必须是绝对路径`);
  }
  return path.normalize(value);
};

// Strict containment: the runtime root must be a real descendant, never the root itself.
const isInside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
};

const isolatedConfig = () => ({
  mode: ISOLATED_TEST_MODE,
  nodeEnv: "test",
  appId: ISOLATED_TEST_APP_ID,
  root: ISOLATED_TEST_ROOT,
  knowledgeRoot: ISOLATED_TEST_ROOT,
  localDataRoot: path.join(ISOLATED_TEST_ROOT, "local"),
  runtimeRoot: path.join(ISOLATED_TEST_ROOT, "runtime"),
});

const productionConfig = (env) => {
  const appId = requiredValue(env, "SYNO_P0_APP_ID", CONFIG_ERROR.MISSING_APP_ID);
  if (!APP_ID_PATTERN.test(appId)) {
    throw new RealFeishuConfigError(CONFIG_ERROR.INVALID_APP_ID, "SYNO_P0_APP_ID", "SYNO_P0_APP_ID 格式不合法");
  }
  if (appId === ISOLATED_TEST_APP_ID) {
    throw new RealFeishuConfigError(CONFIG_ERROR.PRODUCTION_TEST_APP, "SYNO_P0_APP_ID", "生产模式不得复用隔离测试 App");
  }
  const root = requiredAbsolutePath(env, "SYNO_P0_ROOT", CONFIG_ERROR.MISSING_ROOT, CONFIG_ERROR.RELATIVE_ROOT);
  const knowledgeRoot = requiredAbsolutePath(env, "SYNO_P0_KNOWLEDGE_ROOT", CONFIG_ERROR.MISSING_KNOWLEDGE_ROOT, CONFIG_ERROR.RELATIVE_KNOWLEDGE_ROOT);
  const localDataRoot = requiredAbsolutePath(env, "SYNO_P0_LOCAL_DATA_ROOT", CONFIG_ERROR.MISSING_LOCAL_DATA_ROOT, CONFIG_ERROR.RELATIVE_LOCAL_DATA_ROOT);
  const runtimeRoot = requiredAbsolutePath(env, "SYNO_P0_RUNTIME_ROOT", CONFIG_ERROR.MISSING_RUNTIME_ROOT, CONFIG_ERROR.RELATIVE_RUNTIME_ROOT);
  if (!isInside(root, runtimeRoot)) {
    throw new RealFeishuConfigError(CONFIG_ERROR.RUNTIME_OUTSIDE_ROOT, "SYNO_P0_RUNTIME_ROOT", "SYNO_P0_RUNTIME_ROOT 必须位于 SYNO_P0_ROOT 内");
  }
  return { mode: PRODUCTION_MODE, nodeEnv: "production", appId, root, knowledgeRoot, localDataRoot, runtimeRoot };
};

// Production must share the legacy FeishuChannelAdapter lock: `${stateStore.file}.lock`
// (stateStore.file = localDataRoot/state/feishu-channel.json). The isolated consumer keeps
// its own dedicated lock so both never contend on the same file.
const derive = (base) => {
  const stateFile = path.join(base.localDataRoot, "state", "feishu-channel.json");
  const lockFile = base.mode === PRODUCTION_MODE
    ? `${stateFile}.lock`
    : path.join(base.runtimeRoot, "locks", "feishu-test-channel.lock");
  return Object.freeze({
    ...base,
    vaultRoot: path.join(base.knowledgeRoot, "vault"),
    sourceUrl: SOURCE_URL,
    sourcePath: path.join(base.root, "public-article.txt"),
    workerPath: WORKER_PATH,
    inboxRoot: path.join(base.root, "inbox"),
    captureEvents: path.join(base.root, "inbox", "capture-events.jsonl"),
    chatFile: path.join(base.runtimeRoot, "test-chat.json"),
    statusFile: path.join(base.runtimeRoot, "feishu-client-status.json"),
    hostStatusFile: path.join(base.runtimeRoot, "host-status.json"),
    databasePath: path.join(base.runtimeRoot, "p3-decision-memory.db"),
    knowledgeIndexFile: path.join(base.runtimeRoot, "p2-knowledge-index.json"),
    knowledgeResultRoot: path.join(base.runtimeRoot, "p3-knowledge-results"),
    ideaRoot: path.join(base.runtimeRoot, "p3-idea-artifacts"),
    projectRoot: path.join(base.runtimeRoot, "p3-project-artifacts"),
    memoryRoot: path.join(base.runtimeRoot, "p3-memory-artifacts"),
    stateFile,
    lockFile,
  });
};

export function resolveRealFeishuConfig(env = process.env) {
  const mode = env.SYNO_P0_RUNTIME_MODE || ISOLATED_TEST_MODE;
  if (mode === ISOLATED_TEST_MODE) return derive(isolatedConfig());
  if (mode === PRODUCTION_MODE) return derive(productionConfig(env));
  throw new RealFeishuConfigError(CONFIG_ERROR.UNKNOWN_MODE, "SYNO_P0_RUNTIME_MODE", `未知运行模式：${mode}`);
}
