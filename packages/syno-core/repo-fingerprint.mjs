import { createHash } from "node:crypto";
import path from "node:path";

// 仓库指纹：健康接口与启动器/服务管理器共同的事实。大小写归一后取 sha256 前 16 位十六进制，
// 与 scripts/start-syno.ps1 的 Get-SynoRepoFingerprint 保持同一口径。
function repoFingerprintFor(root) {
  return createHash("sha256").update(path.resolve(root).toLocaleLowerCase("en-US"), "utf8").digest("hex").slice(0, 16);
}

export { repoFingerprintFor };
