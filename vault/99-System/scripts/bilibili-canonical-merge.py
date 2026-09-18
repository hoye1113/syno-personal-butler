#!/usr/bin/env python3
"""Merge S-tier {主题} - 对谈稿.md into {主题}.md (canonical single file).

Usage:
  python bilibili-canonical-merge.py --stem "IBM团队-Harness工程详解" --dry-run
  python bilibili-canonical-merge.py --all-s --apply
  python bilibili-canonical-merge.py --fix-wikilinks --apply
"""
from __future__ import annotations

import argparse
import re
from datetime import date
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE, REPO_ROOT

VAULT = BILI_ROOT
REPO = REPO_ROOT
WS = RECASTORY_WORKSPACE

SKIP_FM_KEYS = {"lecture_colloquial", "curate_method", "dialogue_version", "genre"}


def split_fm(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return "", text
    return parts[1], parts[2]


def parse_fm_simple(fm_text: str) -> dict[str, str]:
    fm: dict[str, str] = {}
    for line in fm_text.splitlines():
        if line.strip().startswith("#"):
            continue
        if ":" in line and not line.startswith(" ") and not line.startswith("-"):
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm


def extract_yaml_block(fm_text: str, key: str) -> str | None:
    """Extract multi-line YAML block starting at key: (e.g. concepts)."""
    lines = fm_text.splitlines()
    out: list[str] = []
    in_block = False
    for line in lines:
        if line.startswith(f"{key}:"):
            in_block = True
            out.append(line)
            continue
        if in_block:
            if line and not line.startswith(" ") and ":" in line:
                break
            out.append(line)
    return "\n".join(out) if out else None


def strip_fm_block(fm_text: str, key: str) -> str:
    lines = fm_text.splitlines()
    out: list[str] = []
    skip = False
    for line in lines:
        if line.startswith(f"{key}:"):
            skip = True
            continue
        if skip:
            if line and not line.startswith(" ") and not line.startswith("-"):
                skip = False
            else:
                continue
        out.append(line)
    return "\n".join(out)


def merge_frontmatter(lecture_fm_text: str, dialogue_fm_text: str) -> str:
    lec = parse_fm_simple(lecture_fm_text)
    dlg = parse_fm_simple(dialogue_fm_text)

    base = lecture_fm_text
    for key in SKIP_FM_KEYS | {"author", "concepts", "updated", "column_source"}:
        base = strip_fm_block(base, key)

    out_lines = [l for l in base.splitlines() if l.strip()]

    if dlg.get("description") and len(dlg.get("description", "")) >= len(lec.get("description", "")):
        out_lines = [l for l in out_lines if not l.startswith("description:")]
        out_lines.append(f'description: "{dlg["description"]}"')

    for key in ("host_name", "guest_name", "guest_title", "speaker_inference", "speaker_confidence"):
        if dlg.get(key):
            out_lines = [l for l in out_lines if not l.startswith(f"{key}:")]
            out_lines.append(f'{key}: "{dlg[key]}"')

    for block_key in ("author", "concepts"):
        block = extract_yaml_block(dialogue_fm_text, block_key)
        if block:
            out_lines.append(block)

    ingest = lec.get("ingest_dir", dlg.get("ingest_dir", ""))
    if ingest:
        rel = ingest.replace("Recastory/workspace/", "").replace("\\", "/").strip("/")
        if rel.endswith("ingest"):
            rel = str(Path(rel).parent).replace("\\", "/")
        out_lines.append(f'column_source: "Recastory/workspace/{rel}/ingest/column_article.md"')

    out_lines.append('curate_method: "vskill-vault-write canonical-dialogue v3.2"')
    out_lines.append("dialogue_version: v3.2")
    out_lines.append("genre: Host-Guest canonical")
    out_lines.append(f"updated: {date.today().isoformat()}")

    return "---\n" + "\n".join(out_lines) + "\n---\n"


def extract_section(body: str, heading: str) -> str:
    pat = re.compile(rf"## {re.escape(heading)}[^\n]*\n(.*?)(?=\n## |\Z)", re.DOTALL)
    m = pat.search(body)
    return m.group(1).strip() if m else ""


def load_chapters(lecture_fm: dict[str, str], lecture_body: str) -> list[tuple[str, str]]:
    ingest = lecture_fm.get("ingest_dir", "")
    rel = ingest.replace("Recastory/workspace/", "").replace("\\", "/").strip("/")
    if rel.endswith("ingest"):
        rel = str(Path(rel).parent).replace("\\", "/")
    desc_path = WS / rel / "ingest" / "video_description.md"
    if desc_path.exists():
        rows: list[tuple[str, str]] = []
        for line in desc_path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^(\d+)\.\s+(.+?)\s+\[(\d+:\d+)\]", line.strip())
            if m:
                rows.append((m.group(3), m.group(2).strip()))
            m2 = re.match(r"^(\d+)\.\s+\[(\d+:\d+)\]\s*(.+)", line.strip())
            if m2:
                rows.append((m2.group(2), m2.group(3).strip()))
        if rows:
            return rows
    return []


def build_appendix(lecture_body: str, lecture_fm: dict[str, str]) -> str:
    related = extract_section(lecture_body, "相关阅读")
    source = extract_section(lecture_body, "来源")
    chapters = load_chapters(lecture_fm, lecture_body)

    lines = ["## 附录", ""]

    if chapters:
        lines += ["### 章节时间戳", "", "| 时间 | 主题 |", "|------|------|"]
        for t, topic in chapters:
            lines.append(f"| {t} | {topic} |")
        lines.append("")

    lines += ["### 素材路径", ""]
    if lecture_fm.get("ingest_dir"):
        lines.append(f"- **ingest**：`{lecture_fm['ingest_dir']}`")
    if lecture_fm.get("transcript_source"):
        lines.append(f"- **ASR**：`{lecture_fm['transcript_source']}`")
    if lecture_fm.get("column_url"):
        lines.append(f"- **专栏主源**：{lecture_fm['column_url']}")
    if lecture_fm.get("source_url"):
        lines.append(f"- **B 站**：{lecture_fm['source_url']}")
    if lecture_fm.get("duration"):
        lines.append(f"- **时长**：{lecture_fm['duration']}")
    lines.append("")

    if related:
        related = re.sub(r"\[\[[^\]]+ - 对谈稿[^\]]*\]\][^\n]*\n?", "", related)
        lines += ["### 相关阅读", "", related.strip(), ""]

    lines += ["### 收录说明", ""]
    if source:
        source = re.sub(r"v2 读者向讲义.*", "canonical Host-Guest v3.2（2026-07-03；原讲义已合并）", source)
        lines.append(source.strip())
    else:
        lines.append(f"- **版本**：canonical Host-Guest v3.2（{date.today().isoformat()}）")
    lines.append("")

    return "\n".join(lines)


def merge_dialogue_body(dialogue_body: str, lecture_body: str, lecture_fm: dict[str, str], stem: str) -> str:
    body = dialogue_body.lstrip()
    for cut in ("## 相关阅读", "## 来源", "## 概念索引"):
        if cut in body:
            body = body.split(cut, 1)[0].rstrip()

    body = re.sub(
        rf"- \[\[{re.escape(stem)}\]\].*\n",
        "",
        body,
    )
    body = re.sub(r"\n---\n---\n", "\n---\n", body)
    body = body.rstrip()

    appendix = build_appendix(lecture_body, lecture_fm)
    return body + "\n\n---\n\n" + appendix + "\n"


def find_dialogue_stems() -> list[str]:
    stems = []
    for p in sorted(VAULT.rglob("* - 对谈稿.md")):
        stems.append(p.name.replace(" - 对谈稿.md", ""))
    return stems


def find_pair(stem: str) -> tuple[Path, Path]:
    lec = [p for p in VAULT.rglob(f"{stem}.md") if "对谈稿" not in p.name]
    dlg = list(VAULT.rglob(f"{stem} - 对谈稿.md"))
    if len(lec) != 1 or len(dlg) != 1:
        raise SystemExit(f"Pair not found for {stem}: lecture={len(lec)} dialogue={len(dlg)}")
    return lec[0], dlg[0]


def merge_one(stem: str, apply: bool) -> bool:
    try:
        lecture_path, dialogue_path = find_pair(stem)
    except SystemExit as e:
        print(f"SKIP {stem}: {e}")
        return False

    lecture_text = lecture_path.read_text(encoding="utf-8")
    dialogue_text = dialogue_path.read_text(encoding="utf-8")
    lec_fm_text, lecture_body = split_fm(lecture_text)
    dlg_fm_text, dialogue_body = split_fm(dialogue_text)
    lecture_fm = parse_fm_simple(lec_fm_text)

    if lecture_fm.get("dialogue_version") == "v3.2" and "canonical-dialogue" in lecture_text:
        print(f"SKIP {stem}: already canonical")
        if dialogue_path.exists() and apply:
            dialogue_path.unlink()
            print(f"  DELETED orphan {dialogue_path.name}")
        return False

    fm_block = merge_frontmatter(lec_fm_text, dlg_fm_text)
    merged = fm_block + merge_dialogue_body(dialogue_body, lecture_body, lecture_fm, stem)

    print(f"{'APPLY' if apply else 'DRY'} {stem} -> {len(merged)} chars, delete {dialogue_path.name}")
    if apply:
        lecture_path.write_text(merged, encoding="utf-8")
        dialogue_path.unlink()
    return True


def fix_wikilinks(apply: bool) -> int:
    count = 0
    patterns = [
        (re.compile(r"\[\[([^|\]]+) - 对谈稿\]\]"), r"[[\1]]"),
        (re.compile(r"\[\[([^|\]]+) - 对谈稿\|([^\]]+)\]\]"), r"[[\1|\2]]"),
        (re.compile(r"（\[\[[^\]]+ - 对谈稿\\?\|对谈稿 v3\.2\]\]）"), ""),
    ]
    for path in REPO.rglob("*.md"):
        if ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        new = text
        for pat, repl in patterns:
            new = pat.sub(repl, new)
        if new != text:
            count += 1
            print(f"{'FIX' if apply else 'DRY-FIX'} {path.relative_to(REPO)}")
            if apply:
                path.write_text(new, encoding="utf-8")
    return count


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stem")
    ap.add_argument("--all-s", action="store_true")
    ap.add_argument("--fix-wikilinks", action="store_true")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    if args.fix_wikilinks:
        n = fix_wikilinks(args.apply)
        print(f"WIKILINK_FILES {n}")
        return

    stems = [args.stem] if args.stem else (find_dialogue_stems() if args.all_s else [])
    if not stems:
        ap.error("Provide --stem or --all-s")

    ok = 0
    for stem in stems:
        if merge_one(stem, args.apply):
            ok += 1
    print(f"MERGED {ok}/{len(stems)}")


if __name__ == "__main__":
    main()
