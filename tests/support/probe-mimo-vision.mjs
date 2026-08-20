import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createGlyphPng } from "../../apps/syno/syno/image-png.mjs";
import { defaultOpencodeZenKeyLoader } from "../../apps/syno/syno/opencode-key-loader.mjs";
import { VISION_MODEL, ZEN_CHAT_COMPLETIONS } from "../../apps/syno/syno/opencode-vision-client.mjs";
import { locateCommand, spawnPortable } from "../../apps/syno/syno/process-runner.mjs";

const QUESTION = "What background color is this image, and what exact Latin letters or digits are visible? Reply with JSON {color,text}.";

function runProcess(command, args, { cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawnPortable(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, code: "timeout", stdout, stderr });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, code: error.code || "spawn", stdout, stderr: error.message });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

function looksCorrect(text) {
  const body = String(text || "");
  const color = /green|greenish|#00|#0[0-9a-f]{2}b4|rgb\(\s*0\s*,\s*180/i.test(body);
  const letters = /SYNO42|SYN042|SYN0 42/i.test(body);
  return { color, letters, ok: color };
}

async function probeZen(png, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150_000);
  try {
    const response = await fetch(ZEN_CHAT_COMPLETIONS, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: QUESTION },
            { type: "image_url", image_url: { url: `data:image/png;base64,${png.toString("base64")}` } },
          ],
        }],
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

const root = await mkdtemp(path.join(os.tmpdir(), "syno-vision-probe-"));
const pngPath = path.join(root, "shot.png");
const png = createGlyphPng("SYNO42");
await writeFile(pngPath, png);
const key = await defaultOpencodeZenKeyLoader();
const report = {
  pngBytes: png.length,
  pngPath,
  zen: null,
  cliBare: null,
  primary: null,
};

try {
  if (!key) {
    report.zen = { ok: false, reason: "missing-key" };
  } else {
    const zen = await probeZen(png, key);
    let content = zen.text;
    try {
      content = JSON.parse(zen.text)?.choices?.[0]?.message?.content || zen.text;
    } catch {}
    const verdict = looksCorrect(content);
    report.zen = {
      ok: zen.status === 200 && verdict.ok,
      status: zen.status,
      color: verdict.color,
      letters: verdict.letters,
      excerpt: String(content).slice(0, 500),
    };
  }

  const configDir = path.join(process.env.LOCALAPPDATA || os.homedir(), "Syno", "vision-opencode");
  report.cliBare = await runProcess(locateCommand("opencode", "OPENCODE_BIN"), [
    "run",
    "-m", "opencode/mimo-v2.5-free",
    QUESTION,
    "--file", pngPath,
    "--format", "json",
    "--pure",
  ], {
    cwd: root,
    env: { ...process.env, OPENCODE_CONFIG_DIR: configDir },
    timeoutMs: 120_000,
  });
  report.cliBare.verdict = looksCorrect(`${report.cliBare.stdout}\n${report.cliBare.stderr}`);

  report.primary = report.zen?.ok ? "zen-http" : (report.cliBare.verdict?.ok ? "cli-bare" : "none");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.primary === "none" ? 1 : 0;
} finally {
  await rm(root, { recursive: true, force: true }).catch(() => {});
}

void fileURLToPath;
