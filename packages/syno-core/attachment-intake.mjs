// 附件 → 收录 payload（2026-10-16 从 weixin-message-handler 抽出，两条通道共用）。
//
// 契约：artifact 必须来自隔离区（isolated === true、autoRead === false），且必须落在调用方
// 指定的 quarantineRoot 之内；大小与隔离后字节必须一致。认不出的格式一律拒绝，不猜。

import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS, resolveInside } from "./paths.mjs";

async function artifactToIntakePayload(artifact, { quarantineRoot = path.join(PATHS.runtimeRoot, "quarantine") } = {}) {
  if (!artifact || artifact.rejected || artifact.isolated !== true || artifact.autoRead !== false) {
    throw new Error(artifact?.reason || "附件没有通过隔离校验");
  }
  const file = resolveInside(quarantineRoot, artifact.path);
  const bytes = await fs.readFile(file);
  if (Number.isFinite(Number(artifact.size)) && Number(artifact.size) !== bytes.length) throw new Error("附件隔离后的大小发生变化");
  const name = path.basename(file);
  if (artifact.mime === "application/pdf") return { kind: "pdf", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return { kind: "docx", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "text/html") return { kind: "html", name, title: name, base64: bytes.toString("base64") };
  if (artifact.mime === "text/markdown" || (artifact.mime === "text/plain" && /\.(?:md|markdown)$/iu.test(name))) {
    return { kind: "markdown", name, title: name, base64: bytes.toString("base64") };
  }
  if (artifact.mime === "text/plain") return { kind: "txt", name, title: name, base64: bytes.toString("base64") };
  throw new Error(`当前收录流程暂不支持 ${artifact.mime || "未知"} 附件`);
}

export { artifactToIntakePayload };
