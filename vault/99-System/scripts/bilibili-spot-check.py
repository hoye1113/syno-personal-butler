#!/usr/bin/env python3
"""Spot-check worksheet: vault v2 Bilibili note vs Recastory ASR article.md.

Usage:
  python bilibili-spot-check.py <vault-note.md> [--out report.md]
  python bilibili-spot-check.py --list-long [--min-minutes 45]
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import date
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE, VAULT_ROOT

sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_RECASTORY = RECASTORY_WORKSPACE

SKIP_QUERY = {
    "和你何干",
    "说法",
    "例子",
    "默认能力",
    "threshold",
    "Tool",
    "Pruning",
}


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" in line and not line.strip().startswith("-"):
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm, parts[2]


def parse_duration_minutes(duration: str) -> int | None:
    """Parse MM:SS or H:MM:SS to total minutes (floor)."""
    if not duration:
        return None
    parts = duration.strip().split(":")
    try:
        nums = [int(p) for p in parts]
    except ValueError:
        return None
    if len(nums) == 2:
        return nums[0]
    if len(nums) == 3:
        return nums[0] * 60 + nums[1]
    return None


def find_recastory_workspace() -> Path:
    env = os.environ.get("RECASTORY_WORKSPACE")
    if env:
        p = Path(env)
        if (p / "bilibili-retranscribe").is_dir():
            return p
    candidates = [
        DEFAULT_RECASTORY,
        VAULT_ROOT.parent / "git_clone_test" / "hoye-git" / "Recastory" / "workspace",
    ]
    for p in candidates:
        if (p / "bilibili-retranscribe").is_dir():
            return p
    return DEFAULT_RECASTORY


def resolve_asr(transcript_source: str, recastory: Path) -> Path | None:
    # bilibili-retranscribe (canonical v2)
    m = re.search(r"bilibili-retranscribe/(BV[\w]+)/article\.md", transcript_source)
    if m:
        p = recastory / "bilibili-retranscribe" / m.group(1) / "article.md"
        if p.is_file():
            return p
    # knowledge/* legacy ASR (knowledge 13 backlog)
    m2 = re.search(r"knowledge/([^/]+)/article\.md", transcript_source)
    if m2:
        p = recastory / "knowledge" / m2.group(1) / "article.md"
        if p.is_file():
            return p
    return None


def section_topics(body: str) -> list[tuple[str, str]]:
    topics: list[tuple[str, str]] = []
    in_section = False
    buf: list[str] = []
    current = ""
    for line in body.splitlines():
        if line.startswith("## 分话题讲"):
            in_section = True
            continue
        if in_section and line.startswith("## ") and not line.startswith("###"):
            break
        if in_section and line.startswith("### "):
            if current:
                topics.append((current, "\n".join(buf[:12])))
            current = line[4:].strip()
            buf = []
            continue
        if in_section and current:
            buf.append(line)
    if current:
        topics.append((current, "\n".join(buf[:12])))
    return topics


def is_cjk(s: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", s))


def extract_queries(snippet: str) -> list[str]:
    queries: list[str] = []

    def add(q: str) -> None:
        q = q.strip().rstrip("？?：:")
        if len(q) < 4 or q in SKIP_QUERY or q in queries:
            return
        if is_cjk(q) and not re.search(r"[A-Za-z]{3,}", q):
            return
        queries.append(q)

    # English bold terms (highest signal)
    for m in re.finditer(r"\*\*([^*]+)\*\*", snippet):
        add(m.group(1))
    # Numbers with optional unit
    for m in re.finditer(
        r"\b(\d+[\d,]*\s*(?:k|K|×|x|%|min|turn|tool|PR|lines|次)?)\b", snippet
    ):
        add(m.group(1))
    # Product / proper names
    for m in re.finditer(r"\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b", snippet):
        add(m.group(1))

    return queries[:8]


def find_asr_hits(asr: str, query: str) -> list[str]:
    hits: list[str] = []
    q = query.lower()
    if len(q) < 3:
        return hits
    for line in asr.splitlines():
        if q in line.lower():
            # prefer timestamp lines
            prefix = line.strip()[:140]
            hits.append(prefix)
            if len(hits) >= 2:
                break
    return hits


def quote_probe(quote: str) -> str:
    """Use longest contiguous English run (≥4 words) for ASR search."""
    words = re.findall(r"[A-Za-z']+", quote)
    if len(words) >= 4:
        return " ".join(words[:6])
    return words[0] if words else quote[:20]


def extract_quotes(body: str) -> list[str]:
    quotes: list[str] = []
    in_q = False
    for line in body.splitlines():
        if line.startswith("## 值得记住的原话"):
            in_q = True
            continue
        if in_q and line.startswith("## "):
            break
        if in_q and line.startswith("> **\""):
            m = re.search(r'>\s*\*\*"([^"]+)"', line)
            if m:
                quotes.append(m.group(1))
    return quotes


def extract_wikilinks(body: str) -> list[str]:
    return re.findall(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", body)


def resolve_wikilink_target(name: str) -> Path | None:
    """Find note by wikilink stem anywhere under vault."""
    stem = name.strip()
    matches = list(VAULT_ROOT.rglob(f"{stem}.md"))
    return matches[0] if matches else None


def build_report(note_path: Path, recastory: Path) -> str:
    text = note_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    title = fm.get("title", note_path.stem)
    ts = fm.get("transcript_source", "")
    duration = fm.get("duration", "")
    spot = fm.get("spot_check", "")
    asr_path = resolve_asr(ts, recastory)

    lines: list[str] = [
        "---",
        f'title: "Spot check - {title}"',
        "tags: [notes, bilibili, ai_agent]",
        f"created: {date.today().isoformat()}",
        f'source: "{note_path.relative_to(VAULT_ROOT).as_posix()}"',
        'description: "B站长视频笔记与Recastory ASR的事实抽样工作表。"',
        "---",
        "",
        f"# Spot check 工作表：{title}",
        "",
    ]
    lines.append(f"- **Vault**: `{note_path.relative_to(VAULT_ROOT).as_posix()}`")
    lines.append(f"- **时长**: {duration or '—'}")
    lines.append(f"- **spot_check**: {spot or '（未登记）'}")
    lines.append(f"- **transcript_source**: `{ts}`")

    if not asr_path:
        lines.append(f"- **ASR**: ⚠ 未找到（检查 RECASTORY_WORKSPACE 或 transcript_source）")
        lines.append("")
        lines.append("## 阻塞：无法加载 ASR，先修复路径再对读。")
        return "\n".join(lines)

    asr = asr_path.read_text(encoding="utf-8")
    lines.append(f"- **ASR**: `{asr_path}`")
    lines.append(f"- **ASR 段数**: {asr.count('### [')}")
    lines.append("")

    # Wikilinks
    lines.append("## 相关阅读 wikilink")
    dead = []
    for link in extract_wikilinks(body):
        if link.startswith("MOC "):
            continue
        if resolve_wikilink_target(link) is None:
            dead.append(link)
    if dead:
        for d in dead:
            lines.append(f"- ⚠ 死链：`[[{d}]]`")
    else:
        lines.append("- ✓ 无死链（MOC 除外）")
    lines.append("")

    lines.append("## 分话题 → ASR 锚点（自动；未命中 ≠ P0，需人工读段）")
    lines.append("")
    for heading, snippet in section_topics(body):
        lines.append(f"### {heading}")
        lines.append("")
        queries = extract_queries(snippet)
        if not queries:
            lines.append("_（未提取到英文/数字锚点，请按节标题在 ASR 搜关键词）_")
            lines.append("")
            continue
        hit_any = False
        for q in queries:
            hits = find_asr_hits(asr, q)
            if hits:
                hit_any = True
                lines.append(f"- `{q}` → {hits[0]}")
            else:
                lines.append(f"- `{q}` → _ASR 未命中（核对是否为讲义归纳）_")
        if not hit_any:
            lines.append("- ⚠ **本节无自动命中**，优先人工对读")
        lines.append("")

    lines.append("## 原话抽查（英文片段 ≥4 词）")
    lines.append("")
    for q in extract_quotes(body):
        probe = quote_probe(q)
        hits = find_asr_hits(asr, probe)
        status = "✓" if hits else "⚠"
        lines.append(f"- {status} `{probe}`")
    lines.append("")
    lines.append("## 人工结论（P0 清零后归档 audit/）")
    lines.append("")
    lines.append("- P0：")
    lines.append("- P1：")
    lines.append("- 通过：是 / 否")
    lines.append("- 通过后 frontmatter 加：`spot_check: YYYY-MM-DD`")
    return "\n".join(lines)


def list_long_notes(min_minutes: int) -> list[tuple[Path, int, str]]:
    rows: list[tuple[Path, int, str]] = []
    if not BILI_ROOT.is_dir():
        return rows
    for md in sorted(BILI_ROOT.rglob("*.md")):
        fm, _ = parse_frontmatter(md.read_text(encoding="utf-8"))
        dur = fm.get("duration", "")
        mins = parse_duration_minutes(dur)
        if mins is None or mins < min_minutes:
            continue
        spot = fm.get("spot_check", "")
        rows.append((md, mins, spot))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Bilibili vault spot-check worksheet")
    parser.add_argument("note", nargs="?", help="Vault note path (relative to vault root)")
    parser.add_argument("--out", "-o", help="Write report to file")
    parser.add_argument("--list-long", action="store_true", help="List notes >= min minutes")
    parser.add_argument("--min-minutes", type=int, default=45, help="Long video threshold (default 45)")
    args = parser.parse_args()

    recastory = find_recastory_workspace()

    if args.list_long:
        rows = list_long_notes(args.min_minutes)
        print(f"# B站笔记 ≥{args.min_minutes} min（spot_check 状态）\n")
        print(f"Recastory: `{recastory}`\n")
        print("| 分钟 | spot_check | 笔记 |")
        print("|------|------------|------|")
        for path, mins, spot in rows:
            rel = path.relative_to(VAULT_ROOT).as_posix()
            sc = spot or "—"
            print(f"| {mins} | {sc} | `{rel}` |")
        pending = sum(1 for _, _, s in rows if not s)
        print(f"\n**待 spot check**: {pending} / {len(rows)}")
        return

    if not args.note:
        parser.print_help()
        sys.exit(1)

    note_path = Path(args.note)
    if not note_path.is_absolute():
        note_path = VAULT_ROOT / note_path
    if not note_path.is_file():
        print(f"ERROR: not found: {note_path}", file=sys.stderr)
        sys.exit(2)

    report = build_report(note_path, recastory)
    if args.out:
        out = Path(args.out)
        if not out.is_absolute():
            out = VAULT_ROOT / out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Wrote {out}")
    else:
        print(report)


if __name__ == "__main__":
    main()
