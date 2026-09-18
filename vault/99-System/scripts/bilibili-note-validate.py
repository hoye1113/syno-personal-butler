#!/usr/bin/env python3
"""Validate one Bilibili vault note against the v2 dual-axis contract."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


VALID_TIERS = {"S", "A", "B"}
VALID_FORMS = {"dialogue", "lecture", "roundtable"}
VALID_FIDELITY = {"source", "reconstructed", "none"}
VALID_QUESTION_SOURCE = {"transcript", "editorial", "none"}


def parse_frontmatter(text: str) -> dict[str, object]:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    result: dict[str, object] = {}
    active_list: str | None = None
    for line in parts[1].splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if active_list and stripped.startswith("- "):
            value = stripped[2:].strip().strip('"\'')
            cast = result.setdefault(active_list, [])
            if isinstance(cast, list):
                cast.append(value)
            continue
        active_list = None
        if line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        raw = value.strip().strip('"\'')
        key = key.strip()
        if not raw:
            result[key] = []
            active_list = key
        elif raw.startswith("[") and raw.endswith("]"):
            result[key] = [item.strip().strip('"\'') for item in raw[1:-1].split(",") if item.strip()]
        else:
            result[key] = raw
    return result


def _duration_seconds(value: object) -> int:
    match = re.fullmatch(r"(\d+):(\d{2})(?::(\d{2}))?", str(value or ""))
    if not match:
        return 0
    first, second, third = match.groups()
    return int(first) * 60 + int(second) if third is None else int(first) * 3600 + int(second) * 60 + int(third)


def validate_note_text(text: str, known_paths: set[str] | None = None) -> dict[str, object]:
    fm = parse_frontmatter(text)
    errors: list[str] = []
    warnings: list[str] = []
    for key in ("title", "tags", "created", "source", "description"):
        if key not in fm:
            errors.append(f"missing frontmatter field: {key}")
    if fm.get("material_tier") not in VALID_TIERS:
        errors.append("material_tier must be S, A, or B")
    if fm.get("content_form") not in VALID_FORMS:
        errors.append("content_form must be dialogue, lecture, or roundtable")
    if fm.get("dialogue_fidelity") not in VALID_FIDELITY:
        errors.append("dialogue_fidelity must be source, reconstructed, or none")
    if fm.get("question_source") not in VALID_QUESTION_SOURCE:
        errors.append("question_source must be transcript, editorial, or none")
    form = fm.get("content_form")
    fidelity = fm.get("dialogue_fidelity")
    question_source = fm.get("question_source")
    if form != "dialogue" and (fidelity != "none" or question_source != "none"):
        errors.append("non-dialogue notes must use dialogue_fidelity/question_source: none")
    if form == "dialogue" and fidelity == "reconstructed" and question_source != "editorial":
        errors.append("reconstructed dialogue must use question_source: editorial")
    if form == "dialogue" and fidelity == "source" and question_source != "transcript":
        errors.append("source dialogue must use question_source: transcript")
    factual_status = fm.get("factual_status")
    if factual_status is not None and factual_status not in {"verified", "partial", "unverified"}:
        errors.append("factual_status must be verified, partial, or unverified")
    basis = fm.get("verification_basis", [])
    unresolved = fm.get("unresolved_facts", [])
    if factual_status == "verified":
        if not fm.get("factual_reviewed"):
            errors.append("verified notes require factual_reviewed")
        if not isinstance(basis, list) or not basis:
            errors.append("verified notes require verification_basis")
        if isinstance(unresolved, list) and unresolved:
            errors.append("verified notes cannot contain unresolved_facts")

    transcript = str(fm.get("transcript_source", ""))
    if not transcript and factual_status != "unverified":
        errors.append("missing transcript_source")
    elif transcript and known_paths is not None and transcript not in known_paths:
        errors.append("transcript_source does not exist")
    if isinstance(basis, list) and "transcript" in basis and not transcript:
        errors.append("verification_basis transcript requires transcript_source")
    if _duration_seconds(fm.get("duration")) >= 45 * 60 and "spot_check" not in fm:
        errors.append("videos >=45 minutes require spot_check")
    has_link = bool(re.search(r"\[\[[^]]+\]\]", text))
    if not has_link and fm.get("status") != "orphan":
        errors.append("note requires a wikilink or status: orphan")
    if " - 对谈稿" in str(fm.get("title", "")):
        errors.append("canonical title must not use - 对谈稿")
    if fidelity == "reconstructed" and re.search(r'host_name:\s*["\']?Moderator（现场）', text):
        errors.append("editorial questions must not impersonate a real onsite moderator")
    if factual_status == "unverified":
        warnings.append("unverified note is a discovery lead, not a citable fact source")
    status = "complete" if not errors else "incomplete"
    return {"workflow": "vault_ingest_v2", "checks": {}, "errors": errors, "warnings": warnings, "unresolved": errors.copy(), "status": status}


def _source_ids(text: str) -> set[str]:
    fm = parse_frontmatter(text)
    ids: set[str] = set()
    for key in ("source", "source_url"):
        raw = fm.get(key, "")
        values = raw if isinstance(raw, list) else [raw]
        for item in values:
            value = str(item).strip().rstrip("/")
            if value.startswith(("http://", "https://")):
                ids.add(value)
                ids.update(re.findall(r"BV[0-9A-Za-z]+", value))
    return ids


def validate_note_file(
    note_path: Path,
    vault_root: Path,
    known_paths: set[str] | None = None,
) -> dict[str, object]:
    text = note_path.read_text(encoding="utf-8")
    result = validate_note_text(text, known_paths)
    errors = list(result["errors"])
    own_ids = _source_ids(text)
    for other in vault_root.rglob("*.md"):
        if other.resolve() == note_path.resolve():
            continue
        other_text = other.read_text(encoding="utf-8", errors="replace")
        if own_ids and own_ids.intersection(_source_ids(other_text)):
            errors.append(f"duplicate BV/source found in {other.relative_to(vault_root).as_posix()}")
    sibling = note_path.with_name(f"{note_path.stem} - 对谈稿.md")
    if sibling.exists():
        errors.append("canonical note has a - 对谈稿 sibling")
    result["errors"] = errors
    result["unresolved"] = errors.copy()
    result["status"] = "complete" if not errors else "incomplete"
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("note", type=Path)
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--vault-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    known = None
    if args.source_root:
        known = {p.relative_to(args.source_root).as_posix() for p in args.source_root.rglob("*") if p.is_file()}
    result = validate_note_file(args.note, args.vault_root, known)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "complete" else 1)


if __name__ == "__main__":
    main()
