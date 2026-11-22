import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildDocumentAst } from "../experiments/superagent-p0/p5-radar/document-model.mjs";
import { renderAstToFeishuBlocks } from "../packages/syno-core/feishu-doc-ast.mjs";
import { runActivePlugin } from "../packages/syno-core/plugin-runner.mjs";
import { activatePluginVersion, validatePluginManifest } from "../packages/syno-core/plugin-version.mjs";

const pluginDir = path.resolve(process.env.P5_PLUGIN_TEST_DIR || "plugins/p5-radar/2026.11.22.4");
const manifest = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(path.join(pluginDir, "plugin.json"), "utf8")));

test("P5 plugin manifest is valid and health responds over the stdin/stdout contract", () => {
  const validated = validatePluginManifest(manifest, { pluginDir });
  assert.equal(validated.manifest.version, manifest.version);
  assert.deepEqual(validated.capabilities, manifest.capabilities);
  const response = spawnSync(process.execPath, [validated.entry], {
    input: JSON.stringify({ contract: "syno.p5-radar/1", requestId: "test-health", action: "health" }),
    encoding: "utf8",
  });
  assert.equal(response.status, 0, response.stderr);
  const body = JSON.parse(response.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.version, manifest.version);
});

test("active plugin runner invokes the health action through the registry", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-plugin-runner-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const registryFile = path.join(root, "active.json");
  await activatePluginVersion({ pluginDir, manifest, registryFile });
  const result = await runActivePlugin({
    registryFile,
    request: { contract: "syno.p5-radar/1", requestId: "runner-health", action: "health" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.version, manifest.version);
  assert.equal(result.active.version, manifest.version);
});

test("P5 document AST has no Feishu-specific block types and includes publish time", () => {
  const ast = buildDocumentAst({
    date: "2026-11-22",
    entries: [{
      item: {
        item_id: 18,
        title: "Hugging Face harness adapters",
        titleZh: "Hugging Face 推出 harness adapters",
        source_name: "Hugging Face Blog",
        score: 77,
        published_at: "2026-11-20T00:00:00.000Z",
        kind: "article",
        url: "https://huggingface.co/blog/harness-adapters-at-scale",
      },
      summary: {
        titleZh: "Hugging Face 推出 harness adapters",
        summaryZh: "文章介绍在目标 harness 内用 RL 适配模型。",
        points: ["要点一"],
        whyZh: "与 Agent 工程相关",
        sourceStatus: "article-curl",
      },
    }],
  });
  assert.equal(ast.title, "P5 信息雷达 · 2026-11-22");
  assert.equal(ast.items[0].itemId, 18);
  assert.ok(ast.blocks.some((block) => block.type === "heading" && block.text.includes("harness adapters")));
  assert.ok(ast.blocks.some((block) => block.type === "paragraph" && block.text.includes("发布：")));
  assert.ok(ast.blocks.some((block) => block.type === "bullets"));
  assert.equal(ast.blocks.some((block) => /heading2|block_type|text_run/u.test(JSON.stringify(block))), false);
  const feishuBlocks = renderAstToFeishuBlocks(ast);
  assert.ok(feishuBlocks.some((block) => block.block_type === 4));
  assert.ok(feishuBlocks.some((block) => block.block_type === 2 && block.text.elements[0].text_run.content.includes("发布：")));
  assert.ok(feishuBlocks.some((block) => block.block_type === 12));
});
