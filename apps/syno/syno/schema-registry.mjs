import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTRACT_ROOT = fileURLToPath(new URL("../../../contracts/", import.meta.url));
const cache = new Map();

function typeMatches(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function validateValue(value, schema, location, errors) {
  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${location} 应为 ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${location} 不在允许枚举中`);
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location} 长度不足`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${location} 格式不匹配`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) errors.push(`${location} 不是合法 date-time`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${location} 小于最小值`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${location} 大于最大值`);
  }
  if (Array.isArray(value)) {
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location} 含重复项`);
    if (schema.items) value.forEach((item, index) => validateValue(item, schema.items, `${location}[${index}]`, errors));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) errors.push(`${location}.${required} 缺失`);
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) validateValue(value[key], child, `${location}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      const unknown = Object.keys(value).filter((key) => !Object.hasOwn(schema.properties || {}, key));
      if (unknown.length) errors.push(`${location} 含未知字段：${unknown.join(", ")}`);
    }
  }
}

async function loadContract(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`非法 Contract 名称：${name}`);
  if (!cache.has(name)) {
    const schema = JSON.parse(await fs.readFile(path.join(CONTRACT_ROOT, `${name}.schema.json`), "utf8"));
    cache.set(name, schema);
  }
  return cache.get(name);
}

async function validateContractRecord(name, value) {
  const schema = await loadContract(name);
  const errors = [];
  validateValue(value, schema, "$", errors);
  if (name === "claim" && value?.stability === "volatile" && !value.reviewAfter) {
    errors.push("$.reviewAfter 时效主张必须安排复核时间");
  }
  if (name === "settings-registry") {
    const groups = [value?.agentAdjustable || [], value?.confirmationRequired || [], value?.immutable || []];
    const flattened = groups.flat();
    if (new Set(flattened).size !== flattened.length) errors.push("$ 设置权限分组不能重叠");
  }
  if (errors.length) {
    const error = new Error(`${name} Contract 校验失败：${errors.join("；")}`);
    error.code = "CONTRACT_VALIDATION_FAILED";
    error.errors = errors;
    throw error;
  }
  return value;
}

export { loadContract, validateContractRecord, validateValue };
