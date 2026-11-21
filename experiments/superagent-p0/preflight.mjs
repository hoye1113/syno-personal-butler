// Offline P0 gates. Real adapters must still prove these boundaries with their actual launcher.
export function assertFeishuTestConfig(config) {
  const required = [
    "appId",
    "productionAppId",
    "databasePath",
    "inboxRoot",
    "outboxRoot",
    "productionDatabasePath",
    "productionInboxRoot",
    "productionOutboxRoot",
    "publishTarget",
    "productionPublishTarget",
  ];
  for (const key of required) if (typeof config[key] !== "string" || !config[key]) throw new Error(`飞书测试隔离缺少 ${key}`);
  if (config.appId === config.productionAppId) throw new Error("飞书测试隔离拒绝生产 App ID");
  if (config.publishTarget === config.productionPublishTarget) throw new Error("飞书测试隔离拒绝生产发布目标");
  if (!Array.isArray(config.chatIds) || config.chatIds.length === 0 || config.chatIds.some((id) => typeof id !== "string" || !id))
    throw new Error("飞书测试隔离要求显式 Chat 白名单");
  if (new Set([config.databasePath, config.inboxRoot, config.outboxRoot]).size !== 3)
    throw new Error("飞书测试隔离要求独立数据库、Inbox 和 Outbox");
  for (const [testKey, productionKey] of [
    ["databasePath", "productionDatabasePath"],
    ["inboxRoot", "productionInboxRoot"],
    ["outboxRoot", "productionOutboxRoot"],
  ])
    if (config[testKey] === config[productionKey]) throw new Error(`飞书测试隔离拒绝生产路径 ${productionKey}`);
}

export async function connectIsolatedFeishu({ config, lock, connect }) {
  assertFeishuTestConfig(config);
  const lease = await lock.acquire();
  let connection;
  try {
    connection = await connect(config);
  } catch (error) {
    await lease.release();
    throw error;
  }
  return {
    connection,
    close: async () => {
      try {
        await connection.close?.();
      } finally {
        await lease.release();
      }
    },
  };
}

export const acceptsTestMessage = (config, message) => config.chatIds.includes(message.chatId);

const NEGATIVE_PROBES = ["outside_file", "sentinel_credential", "unapproved_network"];
const POSITIVE_PROBES = ["object_input", "attempt_output"];

export async function runWorkerBoundaryProbes(execute) {
  const results = {};
  for (const probe of [...NEGATIVE_PROBES, ...POSITIVE_PROBES]) results[probe] = await execute(probe);
  return results;
}

export function assertWorkerBoundaryProbes(results) {
  for (const probe of NEGATIVE_PROBES)
    if (results[probe]?.outcome !== "denied") throw new Error(`Worker 隔离探针 ${probe} 未被实际拒绝`);
  for (const probe of POSITIVE_PROBES)
    if (results[probe]?.outcome !== "allowed") throw new Error(`Worker 正向探针 ${probe} 未通过`);
}
