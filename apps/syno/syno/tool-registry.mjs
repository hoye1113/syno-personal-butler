import { validateValue } from "./schema-registry.mjs";

const RISK = new Set(["read", "low", "high"]);

class ToolRegistry {
  constructor(definitions = []) {
    this.tools = new Map();
    for (const definition of definitions) this.register(definition);
  }

  register(definition) {
    const name = String(definition?.name || "");
    if (!/^[a-z][a-z0-9_.-]*$/.test(name) || this.tools.has(name)) throw new Error(`非法或重复工具：${name}`);
    if (!RISK.has(definition.risk) || !definition.permission || !definition.version || !definition.outputSchema || typeof definition.execute !== "function") throw new Error(`工具 ${name} 缺少风险、权限、版本、输出 Schema 或实现`);
    const inputSchema = definition.inputSchema || { type: "object", properties: {}, additionalProperties: false };
    this.tools.set(name, Object.freeze({ ...definition, name, inputSchema }));
    return this;
  }

  list() {
    return [...this.tools.values()].map(({ execute, ...publicDefinition }) => publicDefinition);
  }

  resolve(name) {
    const tool = this.tools.get(name);
    if (!tool) {
      const error = new Error(`工具不在白名单：${name}`);
      error.code = "TOOL_NOT_ALLOWED";
      throw error;
    }
    return tool;
  }

  async execute(name, input, context = {}) {
    const tool = this.resolve(name);
    const errors = [];
    validateValue(input, tool.inputSchema, "$", errors);
    if (errors.length) {
      const error = new Error(`工具 ${name} 输入无效：${errors.join("；")}`);
      error.code = "TOOL_INPUT_INVALID";
      throw error;
    }
    const approvedBoundary = tool.approvalBoundary === true && context.allowJobSubmission === true;
    const adjustableBoundary = tool.agentAdjustableBoundary === true && context.allowAgentSettings === true;
    if (tool.risk !== "read" && !context.allowWrites && !approvedBoundary && !adjustableBoundary) {
      const error = new Error(`工具 ${name} 需要经过 Job 审批入口`);
      error.code = "TOOL_APPROVAL_REQUIRED";
      throw error;
    }
    const output = await tool.execute(input, context);
    const outputErrors = [];
    validateValue(output, tool.outputSchema, "$output", outputErrors);
    if (outputErrors.length) {
      const error = new Error(`工具 ${name} 输出无效：${outputErrors.join("；")}`);
      error.code = "TOOL_OUTPUT_INVALID";
      throw error;
    }
    return output;
  }
}

export { ToolRegistry };
