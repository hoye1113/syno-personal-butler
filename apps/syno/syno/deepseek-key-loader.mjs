import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// 用户本机 opencode 的凭据存储（opencode auth login 写入）。Harness 子进程的 XDG 目录被
// 重定向到隔离 profile、看不到它；这里只读 deepseek 条目经环境变量注入子进程——
// key 只过内存，不落新文件、不进日志。读不到一律返回空串（主链快速失败后由调用方处理）。
async function defaultDeepseekKeyLoader({ authFile } = {}) {
  const file = authFile || path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "opencode", "auth.json");
  try {
    const entry = JSON.parse(await fs.readFile(file, "utf8"))?.deepseek;
    return typeof entry?.key === "string" ? entry.key : "";
  } catch {
    return "";
  }
}

export { defaultDeepseekKeyLoader };
