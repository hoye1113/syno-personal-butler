#!/usr/bin/env python3
"""Discover Recastory Bilibili source artifacts without assuming a fixed layout."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any


BV_RE = re.compile(r"^BV[0-9A-Za-z]+$")
SPEAKER_RE = re.compile(r"^###\s+\[[^]]+\]\s+Speaker\s+(\d+)", re.MULTILINE | re.IGNORECASE)
TIMESTAMP_RE = re.compile(r"(?:\[|\b)\d{1,2}:\d{2}(?::\d{2})?(?:\]|\b)")


def _relative(path: Path | None, root: Path) -> str | None:
    if path is None:
        return None
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def _first(base: Path, names: tuple[str, ...]) -> Path | None:
    for name in names:
        matches = sorted(base.rglob(name), key=lambda p: (len(p.parts), str(p)))
        if matches:
            return matches[0]
    return None


def _load_json(path: Path | None) -> dict[str, Any]:
    if not path:
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return {}


def _nested(data: dict[str, Any], *keys: str) -> Any:
    current: Any = data
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def discover_bv(bv_dir: Path, workspace: Path, manifest_entry: dict[str, Any]) -> dict[str, Any]:
    metadata_path = _first(bv_dir, ("metadata.json",))
    description_path = _first(bv_dir, ("video_description.md",))
    transcript_path = _first(bv_dir, ("article.md",))
    transcript_json_path = _first(bv_dir, ("transcript.json",))
    column_path = _first(bv_dir, ("column_article.md",))
    uploader_path = _first(bv_dir, ("uploader_comment.md",))
    knowledge_path = _first(bv_dir, ("knowledge.md",))

    metadata = _load_json(metadata_path)
    transcript = transcript_path.read_text(encoding="utf-8", errors="replace") if transcript_path else ""
    description = description_path.read_text(encoding="utf-8", errors="replace") if description_path else ""
    speakers = {int(value) for value in SPEAKER_RE.findall(transcript)}
    fm_speakers = re.search(r"^speakers:\s*(\d+)", transcript, re.MULTILINE)
    speaker_count = max(speakers, default=0)
    if fm_speakers:
        speaker_count = max(speaker_count, int(fm_speakers.group(1)))

    title = (
        metadata.get("title")
        or _nested(metadata, "video", "title")
        or _nested(metadata, "data", "title")
        or (description.splitlines()[0].lstrip("# ").strip() if description else "")
        or manifest_entry.get("title")
        or bv_dir.name
    )
    duration: Any = (
        metadata.get("duration")
        or _nested(metadata, "video", "duration")
        or _nested(metadata, "data", "duration")
    )
    if not duration:
        match = re.search(r'^duration:\s*["\']?([^"\'\n]+)', transcript, re.MULTILINE)
        duration = match.group(1).strip() if match else None

    warnings: list[str] = []
    if not transcript_path:
        warnings.append("missing transcript")
    if not metadata_path:
        warnings.append("missing metadata")
    if not description_path:
        warnings.append("missing description")
    if manifest_entry.get("ingest_dir"):
        declared = manifest_entry["ingest_dir"].replace("\\", "/")
        actual = _relative(bv_dir, workspace)
        if actual and actual not in declared and declared not in actual:
            warnings.append("manifest workspace path differs from discovered BV directory")

    if transcript_path and metadata_path and description_path:
        completeness = "complete"
    elif transcript_path:
        completeness = "partial"
    else:
        completeness = "insufficient"

    def size(path: Path | None) -> int:
        return path.stat().st_size if path else 0

    return {
        "bv": bv_dir.name,
        "title": title,
        "workspace_dir": _relative(bv_dir, workspace),
        "files": {
            "metadata": _relative(metadata_path, workspace),
            "description": _relative(description_path, workspace),
            "transcript_markdown": _relative(transcript_path, workspace),
            "transcript_json": _relative(transcript_json_path, workspace),
            "column": _relative(column_path, workspace),
            "uploader_comment": _relative(uploader_path, workspace),
            "legacy_knowledge": _relative(knowledge_path, workspace),
        },
        "sizes": {
            "transcript_bytes": size(transcript_path),
            "column_bytes": size(column_path),
            "description_bytes": size(description_path),
        },
        "source_completeness": completeness,
        "has_speaker_labels": bool(speakers),
        "speaker_count": speaker_count,
        "duration": duration,
        "description_has_timestamps": bool(TIMESTAMP_RE.search(description)),
        "existing_vault_path": manifest_entry.get("vault_path"),
        "manifest_ingest_dir": manifest_entry.get("ingest_dir"),
        "warnings": warnings,
    }


def load_manifest(workspace: Path) -> dict[str, dict[str, Any]]:
    path = workspace / "bilibili" / "manifest.json"
    data = _load_json(path)
    return {entry["bv"]: entry for entry in data.get("entries", []) if isinstance(entry, dict) and entry.get("bv")}


def build_inventory(workspace: Path) -> dict[str, Any]:
    manifest = load_manifest(workspace)
    candidates: dict[str, Path] = {}
    for path in workspace.rglob("*"):
        if path.is_dir() and BV_RE.match(path.name):
            current = candidates.get(path.name)
            if current is None or len(path.parts) < len(current.parts):
                candidates[path.name] = path
    entries = [discover_bv(path, workspace, manifest.get(bv, {})) for bv, path in sorted(candidates.items())]
    for bv, manifest_entry in manifest.items():
        if bv not in candidates:
            entries.append({
                "bv": bv,
                "title": manifest_entry.get("title") or bv,
                "workspace_dir": manifest_entry.get("workspace_dir"),
                "files": {},
                "sizes": {},
                "source_completeness": "insufficient",
                "has_speaker_labels": False,
                "speaker_count": 0,
                "duration": None,
                "description_has_timestamps": False,
                "existing_vault_path": manifest_entry.get("vault_path"),
                "manifest_ingest_dir": manifest_entry.get("ingest_dir"),
                "warnings": ["manifest entry has no discovered BV directory"],
            })
    entries.sort(key=lambda item: item["bv"])
    completeness = Counter(item["source_completeness"] for item in entries)
    summary = {
        "total_entries": len(entries),
        "complete": completeness["complete"],
        "partial": completeness["partial"],
        "insufficient": completeness["insufficient"],
        "with_column": sum(bool(item.get("files", {}).get("column")) for item in entries),
        "with_speaker_labels": sum(item["has_speaker_labels"] for item in entries),
        "with_description_timestamps": sum(item["description_has_timestamps"] for item in entries),
        "with_existing_vault_path": sum(bool(item["existing_vault_path"]) for item in entries),
        "warning_count": sum(len(item["warnings"]) for item in entries),
    }
    return {"schema_version": "vault.bilibili.source-inventory.v1", "generated": date.today().isoformat(), "workspace": str(workspace), "summary": summary, "entries": entries}


def render_markdown(data: dict[str, Any]) -> str:
    summary = data["summary"]
    lines = [
        "---", 'title: "B站素材结构全量统计"', "tags: [notes, bilibili, ai_agent]", f"created: {data['generated']}", f'source: "{data["workspace"]}"', 'description: "Recastory B站素材的只读发现结果，供收录路由和路径漂移审计使用。"', "---", "", "# B站素材结构全量统计", "",
        "## 摘要", "",
        f"- 条目：{summary['total_entries']}", f"- complete / partial / insufficient：{summary['complete']} / {summary['partial']} / {summary['insufficient']}", f"- 有专栏：{summary['with_column']}", f"- 有 Speaker 标签：{summary['with_speaker_labels']}", f"- 简介含时间戳：{summary['with_description_timestamps']}", f"- 已映射 vault：{summary['with_existing_vault_path']}", f"- 警告：{summary['warning_count']}", "",
        "## 路径结论", "", "`article.md` 可能位于 BV 根目录，enrich 文件通常位于 `ingest/`。收录前必须动态发现，不能拼接固定路径。", "", "## 异常条目", "",
    ]
    for item in data["entries"]:
        if item["warnings"]:
            lines.append(f"- `{item['bv']}` ({item['source_completeness']})：{'；'.join(item['warnings'])}")
    lines.extend(["", "## 相关阅读", "", "- [[MOC - Agent Theory and Design]]", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--md-out", type=Path, required=True)
    args = parser.parse_args()
    data = build_inventory(args.workspace)
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    args.md_out.write_text(render_markdown(data), encoding="utf-8")
    print(json.dumps(data["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
