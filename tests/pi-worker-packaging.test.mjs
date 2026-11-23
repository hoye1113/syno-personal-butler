import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Pi Worker 只使用仓库内锁定依赖，不依赖外部实验目录", () => {
  const source = readFileSync(path.join(root, "experiments/superagent-p0/pi-worker-client.mjs"), "utf8");
  assert.doesNotMatch(source, /\/Users\/|pi-runtime-lab/);
  assert.match(source, /from "@earendil-works\/pi-agent-core"/);
  assert.match(source, /from "@earendil-works\/pi-ai"/);

  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  for (const name of ["@earendil-works/pi-agent-core", "@earendil-works/pi-ai"]) {
    assert.equal(manifest.dependencies[name], "1.5.2");
    const packagePath = realpathSync(path.join(root, "node_modules", name, "package.json"));
    const relative = path.relative(path.join(root, "node_modules"), packagePath);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), `${name} 必须解析到本仓库 node_modules`);
    assert.equal(JSON.parse(readFileSync(packagePath, "utf8")).version, "1.5.2");
    assert.match(import.meta.resolve(name), /^file:/);
  }
});

test("Pi Worker 在仓库内完成无工具模型轮次", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "syno-pi-packaging-"));
  const broker = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: { text: "OK" }, usage: null, costUsd: null }));
  });
  broker.listen(0, "127.0.0.1");
  await once(broker, "listening");
  t.after(() => {
    broker.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const requestPath = path.join(directory, "request.json");
  const outputPath = path.join(directory, "output.json");
  writeFileSync(requestPath, JSON.stringify({
    broker: `http://127.0.0.1:${broker.address().port}`,
    prompt: "只回复 OK",
  }));
  const child = spawn(process.execPath, [
    path.join(root, "experiments/superagent-p0/pi-worker-client.mjs"),
    "--request", requestPath,
    "--output", outputPath,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const [status] = await once(child, "close");
  assert.equal(status, 0, stderr);
  const result = JSON.parse(readFileSync(outputPath, "utf8"));
  assert.equal(result.data.text, "OK");
  assert.deepEqual(result.pi, { version: "1.5.2", providerRequests: 1, toolEvents: 0 });
});
