#!/usr/bin/env python3
"""Risk-rank existing Bilibili canonical notes against discovered Recastory evidence."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any


BV_RE = re.compile(r"BV[0-9A-Za-z]+")
NUMBER_RE = re.compile(r"(?<![A-Za-z])(?:\$|¥|￥)?\d+(?:\.\d+)?\s*(?:%|倍|万|亿|美元|元|年|个月|天|小时|分钟|ms|秒)?")
QUOTE_RE = re.compile(r"(?:^|\n)>\s|[“\"]{1}[^\n“\"]{8,}[”\"]{1}")
PRIORITY_TOPIC_RE = re.compile(r"Harness|评估|Evaluation|RAG|检索|安全|Safety|FDE", re.IGNORECASE)


def parse_frontmatter(text: str) -> dict[str, Any]:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    result: dict[str, Any] = {}
    active: str | None = None
    for line in parts[1].splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if active and stripped.startswith("- "):
            result[active].append(stripped[2:].strip().strip('"\''))
            continue
        active = None
        if line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key, value = key.strip(), value.strip().strip('"\'')
        if not value:
            result[key] = []
            active = key
        else:
            result[key] = value
    return result


def duration_seconds(value: Any) -> int:
    match = re.fullmatch(r"(\d+):(\d{2})(?::(\d{2}))?", str(value or ""))
    if not match:
        return 0
    first, second, third = match.groups()
    return int(first) * 60 + int(second) if third is None else int(first) * 3600 + int(second) * 60 + int(third)


def risk_level(score: int) -> str:
    if score >= 90:
        return "P0"
    if score >= 60:
        return "P1"
    if score >= 30:
        return "P2"
    return "P3"


def score_note(
    note_path: Path,
    text: str,
    inventory_entry: dict[str, Any] | None,
    backlinks: int,
) -> dict[str, Any]:
    inventory_entry = inventory_entry or {}
    fm = parse_frontmatter(text)
    bv_match = BV_RE.search(text)
    bv = bv_match.group(0) if bv_match else ""
    files = inventory_entry.get("files", {}) or {}
    discovered_transcript = files.get("transcript_markdown")
    discovered_column = files.get("column")
    declared_transcript = str(fm.get("transcript_source", ""))
    ingest_dir = str(fm.get("ingest_dir", ""))
    genre = str(fm.get("genre", ""))
    inference = str(fm.get("speaker_inference", ""))
    fidelity = str(fm.get("dialogue_fidelity", ""))
    question_source = str(fm.get("question_source", ""))
    duration = duration_seconds(fm.get("duration"))
    numeric_count = len(NUMBER_RE.findall(text.split("---", 2)[-1]))
    quote_count = len(QUOTE_RE.findall(text))
    moderator_markers = len(re.findall(r"Moderator|合成 Host|synthetic Host|主题演讲.*Host", text, re.IGNORECASE))
    asr_primary = "ASR primary" in genre or "asr primary" in text.lower()
    reasons: list[str] = []
    score = 0

    if (declared_transcript or asr_primary) and not discovered_transcript:
        score += 100
        reasons.append("declared ASR/transcript source is missing")

    synthetic = bool(re.search(r"monologue\s*[→-]+\s*synthetic|Host 为过渡提问|过渡提问合成|solo_keynote_reframed", inference, re.IGNORECASE))
    if synthetic and not (fidelity == "reconstructed" and question_source == "editorial"):
        score += 90
        reasons.append("synthetic/editorial dialogue is not labelled reconstructed")

    heuristic_only = "heuristic" in inference.lower() and not re.search(r"column.*(?:label|主持|嘉宾)|original|原节目|外源核", inference, re.IGNORECASE)
    if heuristic_only:
        score += 70
        reasons.append("speaker identity relies on heuristic without traceable evidence")

    if duration >= 45 * 60 and not fm.get("spot_check"):
        score += 60
        reasons.append("long video lacks spot_check")

    if numeric_count >= 3 and not fm.get("factual_status") and not fm.get("factual_reviewed"):
        score += 40
        reasons.append("numeric claims lack factual review")

    discovered_workspace = str(inventory_entry.get("workspace_dir", ""))
    normalized_ingest = ingest_dir.replace("\\", "/").replace("Recastory/workspace/", "").removesuffix("/ingest")
    if ingest_dir and discovered_workspace and normalized_ingest != discovered_workspace:
        score += 30
        reasons.append("declared ingest path differs from discovered workspace")

    if discovered_column and not discovered_transcript and fm.get("factual_status") != "unverified" and ("Host-Guest" in genre or quote_count > 0):
        score += 20
        reasons.append("column is the only body source for high-confidence dialogue or quotes")

    if not all(fm.get(key) for key in ("content_form", "dialogue_fidelity", "question_source")):
        score += 10
        reasons.append("legacy note lacks dual-axis fidelity fields")

    recommended = "review metadata and evidence only"
    if score >= 90:
        recommended = "verify source claims and repair fidelity metadata before citation"
    elif score >= 60:
        recommended = "complete spot check and identity/numeric verification"
    elif score >= 30:
        recommended = "repair path or evidence-chain drift when next touched"

    return {
        "note_path": note_path.as_posix(),
        "title": str(fm.get("title", note_path.stem)),
        "bv": bv,
        "source_url": str(fm.get("source_url", fm.get("source", ""))),
        "manifest_path": inventory_entry.get("existing_vault_path"),
        "discovered_sources": {
            "metadata": files.get("metadata"),
            "description": files.get("description"),
            "transcript_markdown": discovered_transcript,
            "transcript_json": files.get("transcript_json"),
            "column": discovered_column,
        },
        "declared": {
            "transcript_source": declared_transcript or None,
            "ingest_dir": ingest_dir or None,
            "genre": genre or None,
            "speaker_inference": inference or None,
            "speaker_confidence": fm.get("speaker_confidence"),
            "spot_check": fm.get("spot_check"),
            "factual_status": fm.get("factual_status"),
        },
        "signals": {
            "duration_seconds": duration,
            "numeric_claim_count": numeric_count,
            "quote_count": quote_count,
            "moderator_markers": moderator_markers,
            "asr_primary_claim": asr_primary,
            "source_path_exists": bool(discovered_transcript),
            "backlinks": backlinks,
        },
        "risk_level": risk_level(score),
        "risk_score": score,
        "risk_reasons": reasons,
        "recommended_action": recommended,
    }


def _selection_key(item: dict[str, Any]) -> tuple[int, int, int, str]:
    topic = 1 if PRIORITY_TOPIC_RE.search(item.get("title", "")) else 0
    backlinks = int(item.get("signals", {}).get("backlinks", 0))
    return (-int(item["risk_score"]), -topic, -backlinks, item["note_path"])


def select_first_batch(entries: list[dict[str, Any]], target: int = 15) -> list[dict[str, Any]]:
    p0 = sorted((item for item in entries if item["risk_level"] == "P0"), key=_selection_key)
    remaining = sorted((item for item in entries if item["risk_level"] != "P0"), key=_selection_key)
    return (p0 + remaining)[:target]


def backlink_counts(vault: Path) -> Counter[str]:
    counts: Counter[str] = Counter()
    for note in vault.rglob("*.md"):
        text = note.read_text(encoding="utf-8", errors="replace")
        for link in re.findall(r"\[\[([^\]|#]+)", text):
            counts[link.strip()] += 1
    return counts


def build_audit(vault: Path, inventory: dict[str, Any], target: int = 15) -> dict[str, Any]:
    by_bv = {entry["bv"]: entry for entry in inventory.get("entries", [])}
    backlinks = backlink_counts(vault)
    entries: list[dict[str, Any]] = []
    for note in sorted(vault.rglob("*.md")):
        if note.name.lower() == "readme.md" or " - 对谈稿" in note.stem:
            continue
        text = note.read_text(encoding="utf-8", errors="replace")
        match = BV_RE.search(text)
        inventory_entry = by_bv.get(match.group(0), {}) if match else {}
        entries.append(score_note(note.relative_to(vault), text, inventory_entry, backlinks[note.stem]))
    entries.sort(key=_selection_key)
    batch = select_first_batch(entries, target)
    levels = Counter(item["risk_level"] for item in entries)
    return {
        "schema_version": "vault.bilibili.trust-audit.v1",
        "generated": date.today().isoformat(),
        "summary": {"total": len(entries), **{level: levels[level] for level in ("P0", "P1", "P2", "P3")}, "first_batch": len(batch)},
        "first_batch": [item["note_path"] for item in batch],
        "entries": entries,
    }


def render_markdown(data: dict[str, Any]) -> str:
    s = data["summary"]
    lines = [
        "---", 'title: "B站存量笔记可信度审计"', "tags: [notes, bilibili, ai_agent]", f"created: {data['generated']}", 'source: "vault + Recastory inventory"', 'description: "B站 canonical 笔记的来源、人物、数字与对谈忠实度风险清单。"', "---", "", "# B站存量笔记可信度审计", "",
        "## 摘要", "", f"- 总数：{s['total']}", f"- P0 / P1 / P2 / P3：{s['P0']} / {s['P1']} / {s['P2']} / {s['P3']}", f"- 首批：{s['first_batch']}", "", "## 首批修复名单", "",
    ]
    lookup = {item["note_path"]: item for item in data["entries"]}
    for path in data["first_batch"]:
        item = lookup[path]
        lines.append(f"- `{path}` — {item['risk_level']} {item['risk_score']}：{'；'.join(item['risk_reasons'])}")
    for level in ("P0", "P1", "P2", "P3"):
        lines.extend(["", f"## {level}", ""])
        for item in data["entries"]:
            if item["risk_level"] == level:
                lines.append(f"- `{item['note_path']}` ({item['risk_score']})：{'；'.join(item['risk_reasons']) or '无显著风险'}")
    lines.extend(["", "## 相关阅读", "", "- [[MOC - Agent Theory and Design]]"])
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vault", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--md-out", type=Path, required=True)
    parser.add_argument("--target", type=int, default=15)
    args = parser.parse_args()
    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    data = build_audit(args.vault, inventory, args.target)
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    args.md_out.write_text(render_markdown(data), encoding="utf-8")
    print(json.dumps(data["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
