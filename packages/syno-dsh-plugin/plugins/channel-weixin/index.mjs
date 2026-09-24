import { WeixinIlinkAdapter } from "../../../../packages/syno-core/weixin-ilink.mjs";
import { createOpsRuntime } from "../capabilities/ops-tools.mjs";
import { createInprocessWeixinChannel } from "./channel-core.mjs";
import { createWeixinChannelHandler } from "./channel-handler.mjs";

export const name = "syno-channel-weixin";
export const inject = ["agents", "agentPresets", "workspaceRegistry"];

export function apply(ctx, config = {}) {
  if (String(process.env.SYNO_CHANNEL_OWNER || "").trim() !== "dsh") return;
  const adapter = config.adapter || new WeixinIlinkAdapter({});
  let createHandler = config.createHandler || null;
  if (!createHandler) {
    const core = config.core || createOpsRuntime().core;
    createHandler = (runtime) => createWeixinChannelHandler({ runtime, core });
  }
  const channel = createInprocessWeixinChannel({
    ctx,
    adapter,
    workspacePath: config.workspacePath || process.env.DSH_CWD || process.cwd(),
    createHandler,
    ...(config.model ? { model: config.model } : {}),
    ...(config.timeoutMs ? { timeoutMs: config.timeoutMs } : {}),
  });
  channel.attach();
  if (config.adapter || config.autoStart === false) return;
  adapter.start().catch((error) => {
    process.stderr.write(`syno-channel-weixin: 微信适配器启动失败：${error?.message || error}\n`);
  });
}
