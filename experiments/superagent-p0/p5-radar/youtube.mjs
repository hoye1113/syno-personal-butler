import { execFile } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CUE_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?[.,]\d{3}\s*-->/u;

function cueSeconds(line) {
  const match = CUE_TIME.exec(line);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);
  return third === null ? first * 60 + second : first * 3600 + second * 60 + third;
}

function formatCueTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function cleanCueLine(line) {
  return String(line ?? "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Parse VTT/SRT cues while retaining the start time of each cue. */
export function parseSubtitleSegments(text) {
  const lines = String(text ?? "").replace(/\r\n?/gu, "\n").split("\n");
  const segments = [];
  let start = null;
  let cueLines = [];
  const flush = () => {
    let cleaned = cueLines.map(cleanCueLine).filter(Boolean).join(" ").trim();
    cueLines = [];
    if (!cleaned || start === null) return;
    const previous = segments[segments.length - 1];
    if (previous) {
      if (previous.text === cleaned) return;
      // YouTube auto-captions often repeat the previous line and append a suffix.
      // Keep only the new suffix so the plain transcript does not stutter.
      if (cleaned.startsWith(`${previous.text} `)) cleaned = cleaned.slice(previous.text.length).trim();
      if (!cleaned) return;
    }
    segments.push({ start, text: cleaned });
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      start = null;
      continue;
    }
    if (/^(?:WEBVTT|NOTE|STYLE|REGION|X-TIMESTAMP-MAP)\b/iu.test(line)) continue;
    const cue = cueSeconds(line);
    if (cue !== null) {
      flush();
      start = cue;
      continue;
    }
    if (/^\d+$/u.test(line)) continue;
    cueLines.push(line);
  }
  flush();
  return segments;
}

export function cleanTimed(text, { maxChars = 120_000 } = {}) {
  return parseSubtitleSegments(text)
    .map((segment) => `[${formatCueTime(segment.start)}] ${segment.text}`)
    .join("\n")
    .slice(0, maxChars);
}

export function cleanVtt(text) {
  return parseSubtitleSegments(text)
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120_000);
}

export function cleanSrt(text) {
  return cleanVtt(text);
}

function subtitleFiles(dir) {
  return readdirSync(dir)
    .filter((name) => /\.(vtt|srt)$/iu.test(name))
    .sort((left, right) => {
      const score = (name) => (/\.zh/i.test(name) ? 0 : /\.en/i.test(name) ? 1 : 2);
      return score(left) - score(right) || left.localeCompare(right);
    })
    .map((name) => path.join(dir, name));
}

export async function fetchTranscript(url, {
  ytDlp = process.env.P5_YTDLP || "yt-dlp",
  proxy = "",
  timeout = 120_000,
  langs = "en,zh,zh-CN,zh-TW",
} = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "p5-yt-"));
  try {
    const args = [
      "--js-runtimes", "node",
      "--skip-download",
      "--write-auto-subs",
      "--write-subs",
      "--sub-langs", langs,
      "--sub-format", "vtt/srt/best",
      "-o", path.join(dir, "%(id)s.%(ext)s"),
      url,
    ];
    let stderr = "";
    try {
      const result = await execFileAsync(ytDlp, args, {
        timeout,
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          ...(proxy ? { HTTPS_PROXY: proxy, HTTP_PROXY: proxy } : {}),
        },
      });
      stderr = result.stderr || "";
    } catch (error) {
      stderr = String(error?.stderr || error?.message || error);
    }
    const files = subtitleFiles(dir);
    if (!files.length) {
      return { status: "missing", text: "", error: stderr.slice(-500) || "no subtitle file" };
    }
    const file = files[0];
    const raw = readFileSync(file, "utf8");
    const text = /\.srt$/iu.test(file) ? cleanSrt(raw) : cleanVtt(raw);
    if (text.length < 200) {
      return { status: "missing", text, timedText: "", error: stderr.slice(-500) || "subtitle too short" };
    }
    return {
      status: "ok",
      text,
      timedText: cleanTimed(raw),
      file: path.basename(file),
      error: stderr ? stderr.slice(-500) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
