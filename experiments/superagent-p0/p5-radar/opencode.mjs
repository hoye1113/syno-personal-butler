import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const DEFAULT_MODEL = Object.freeze({ providerID: "opencode-go", id: "deepseek-v4.1-flash" });

function waitForServer(child, timeoutMs) {
  let pending = "";
  let stderr = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OpenCode Server 启动超时")), timeoutMs);
    const fail = (error) => { clearTimeout(timer); reject(error); };
    child.once("error", fail);
    child.once("close", (code) => fail(new Error(`OpenCode Server 启动退出：${code}`)));
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-2000);
    });
    child.stdout.on("data", (chunk) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop();
      for (const line of lines) {
        const match = /^server listening on (http:\/\/127\.0\.0\.1:\d+)\s*$/.exec(line);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
          return;
        }
      }
    });
  });
}

/**
 * Local OpenCode Go client. It starts `opencode serve` with a one-time Basic password and only
 * exposes the experimental generate endpoint, so the P5 worker never handles the subscription key.
 */
export async function createOpenCodeClient({
  bin = process.env.P5_OPENCODE || "opencode",
  model = DEFAULT_MODEL,
  timeout = 180_000,
} = {}) {
  const password = randomBytes(24).toString("base64url");
  const cwd = mkdtempSync(path.join(tmpdir(), "p5-opencode-"));
  const child = spawn(bin, ["serve", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd,
    env: { ...process.env, OPENCODE_SERVER_PASSWORD: password },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let closed = false;
  child.once("close", () => { closed = true; });
  const baseURL = await waitForServer(child, 45_000);
  const authorization = `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;

  return {
    baseURL,
    model,
    async generate({ prompt, model: requested = model, timeout: requestTimeout = timeout } = {}) {
      if (typeof prompt !== "string" || !prompt.trim()) throw new Error("OpenCode 摘要提示词为空");
      const response = await fetch(`${baseURL}/api/experimental/generate`, {
        method: "POST",
        headers: { authorization, "content-type": "application/json" },
        body: JSON.stringify({ prompt, model: requested }),
        signal: AbortSignal.timeout(requestTimeout),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`OpenCode generate 失败：${response.status} ${body.slice(0, 300)}`);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("OpenCode generate 返回非 JSON");
      }
      const text = parsed?.data?.text;
      if (typeof text !== "string" || !text.trim()) throw new Error("OpenCode generate 没有文本回答");
      return {
        text: text.trim(),
        usage: parsed.data?.usage ?? parsed.usage ?? null,
        costUsd: parsed.data?.costUsd ?? parsed.costUsd ?? null,
      };
    },
    async close() {
      if (closed) {
        rmSync(cwd, { recursive: true, force: true });
        return;
      }
      child.kill("SIGTERM");
      await Promise.race([
        once(child, "close"),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
      if (!closed) child.kill("SIGKILL");
      rmSync(cwd, { recursive: true, force: true });
    },
  };
}
