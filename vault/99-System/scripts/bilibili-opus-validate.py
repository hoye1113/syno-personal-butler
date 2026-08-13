#!/usr/bin/env python3
"""Validate Bilibili opus notes against the column-first ingest contract."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


VALID_SOURCE_TIERS = {"C1", "C2"}
VALID_MATERIAL_TIERS = {"S", "A", "B"}
VALID_FORMS = {"lecture", "dialogue", "roundtable"}
VALID_VOICE_BASIS = {"direct_speech", "attributed_paraphrase", "editorial_summary", "mixed"}
VALID_VERIFICATION_SCOPES = {"column_only", "column_plus_original"}
VALID_FACTUAL = {"verified", "partial", "unverified"}
V2_WORKFLOW = "bilibili_opus_ingest_v2"
TYPED_RELATIONS = {
    "支持": "supports",
    "补充": "extends",
    "反驳": "contradicts",
    "限制": "limits",
    "依赖": "depends_on",
    "应用于": "applies_to",
    "示例": "example_of",
}
LEGACY_SOURCE_FIELDS = ("transcript_source", "ingest_dir", "asr_version", "spot_check")
NOISE_LINES = (
    "关注UP主", "关注 UP 主", "点赞", "投币", "收藏", "评论区", "展位",
    "没有更多评论", "分享至", "投诉或建议",
)
# Locked-template (v2.1) sections that never require 核心判断: navigation,
# summary, and provenance blocks. Everything else is a content chapter.
LOCKED_META_SECTIONS = {"开场", "摘要", "限制与边界", "知识连接", "来源说明", "来源声明"}


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
            if result.get(active_list) == "":
                result[active_list] = []
            cast = result.setdefault(active_list, [])
            if isinstance(cast, list):
                cast.append(stripped[2:].strip().strip('"\''))
            continue
        active_list = None
        if line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        raw = value.strip().strip('"\'')
        if not raw:
            result[key] = ""
            active_list = key
        elif raw.startswith("[") and raw.endswith("]"):
            result[key] = [item.strip().strip('"\'') for item in raw[1:-1].split(",") if item.strip()]
        else:
            result[key] = raw
    return result


def classify_source(has_body: bool, has_sections: bool, has_identity: bool, has_anchor: bool) -> str:
    return "C1" if all((has_body, has_sections, has_identity, has_anchor)) else "C2"


def classify_form(text: str) -> str:
    if re.search(r"^##\s*(主题演讲|核心判断|关键机制|演讲)", text, re.MULTILINE):
        return "lecture"
    labels = re.findall(r"^([^\n：:]{1,24})[：:]", text, re.MULTILINE)
    unique = {label.strip() for label in labels if label.strip() not in {"现场提问", "观众提问"}}
    if len(unique) >= 3:
        return "roundtable"
    if len(unique) >= 2:
        return "dialogue"
    return "lecture"


def normalize_column_text(text: str) -> str:
    text = re.sub(r"^unknown[：:]", "现场提问：", text, flags=re.MULTILINE | re.IGNORECASE)
    text = re.sub(r"!\[[^]]*\]\([^)]*\)", "", text)
    output: list[str] = []
    seen: set[str] = set()
    for line in text.splitlines():
        stripped = line.strip()
        if any(noise in stripped for noise in NOISE_LINES):
            continue
        if stripped and stripped in seen and not stripped.startswith("#"):
            continue
        if stripped:
            seen.add(stripped)
        output.append(line.rstrip())
    return "\n".join(output).strip()


def _body(text: str) -> str:
    parts = text.split("---", 2)
    return parts[2] if len(parts) == 3 else text


def _ids(text: str) -> dict[str, str]:
    fm = parse_frontmatter(text)
    return {
        key: str(fm.get(key, "")).strip().rstrip("/")
        for key in ("bv", "opus_id", "column_id", "source_url")
    }


def _is_knowledge_note(path: Path, vault_root: Path) -> bool:
    relative = path.relative_to(vault_root)
    return bool(relative.parts) and relative.parts[0] in {"00-Inbox", "01-Areas", "02-Resources", "03-Archive"}


def _section(body: str, heading: str) -> str:
    match = re.search(
        rf"^##\s+{re.escape(heading)}\s*$\n?(.*?)(?=^##\s+|\Z)",
        body,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def _speaker_labels(body: str) -> set[str]:
    return {
        label.strip()
        for label in re.findall(r"^\*\*([^*：:\n]{1,30})[：:]\*\*", body, re.MULTILINE)
    }


def _has_typed_relation(section: str) -> bool:
    labels = "|".join(map(re.escape, TYPED_RELATIONS))
    return bool(re.search(
        rf"^-\s+\*\*(?:{labels})\*\*\s+\[\[[^]]+\]\][：:]\s*\S+",
        section,
        re.MULTILINE,
    ))


def _content_chapters(body: str) -> list[tuple[str, str]]:
    """Chapters that must start with 核心判断 under the locked v2.1 template.

    A content chapter is any ``##``/``###`` section outside LOCKED_META_SECTIONS.
    When a ``##`` section is a pure container (its body is split into ``###``
    children, e.g. ``## 对话实录``), the children are the chapters; a flat
    ``##`` section is a chapter itself, so content cannot dodge the rule by
    hiding behind an unnumbered or container-style heading.
    """
    heads = [
        (m.group(1), m.group(2).strip(), m.start(), m.end())
        for m in re.finditer(r"(?m)^(#{2,3})[ \t]+([^\n]+)$", body)
    ]
    chapters: list[tuple[str, str]] = []
    i = 0
    while i < len(heads):
        level, heading, _start, end = heads[i]
        if level == "###":
            # Orphan ### (no enclosing ##): evaluate as its own chapter.
            cend = heads[i + 1][2] if i + 1 < len(heads) else len(body)
            if heading not in LOCKED_META_SECTIONS:
                chapters.append((heading, body[end:cend]))
            i += 1
            continue
        j = i + 1
        children: list[tuple[str, str]] = []
        while j < len(heads) and heads[j][0] == "###":
            cend = heads[j + 1][2] if j + 1 < len(heads) else len(body)
            children.append((heads[j][1], body[heads[j][3]:cend]))
            j += 1
        if children:
            for child_heading, child_content in children:
                if child_heading not in LOCKED_META_SECTIONS:
                    chapters.append((child_heading, child_content))
        elif heading not in LOCKED_META_SECTIONS:
            cend = heads[i + 1][2] if i + 1 < len(heads) else len(body)
            chapters.append((heading, body[end:cend]))
        i = j
    return chapters


def validate_note_text(text: str, sources_read: set[str] | None = None) -> dict[str, object]:
    fm = parse_frontmatter(text)
    errors: list[str] = []
    warnings: list[str] = []
    declared_workflow = fm.get("ingest_workflow")
    is_v2 = declared_workflow == V2_WORKFLOW
    if declared_workflow and not is_v2:
        errors.append("ingest_workflow must be bilibili_opus_ingest_v2 when declared")
    for key in ("title", "tags", "created", "source", "description"):
        if key not in fm:
            errors.append(f"missing frontmatter field: {key}")
    if fm.get("source_type") != "bilibili_opus":
        errors.append("source_type must be bilibili_opus")
    if fm.get("primary_source") != "column":
        errors.append("primary_source must be column")
    if fm.get("source_tier") not in VALID_SOURCE_TIERS:
        errors.append("source_tier must be C1 or C2")
    if fm.get("material_tier") not in VALID_MATERIAL_TIERS:
        errors.append("material_tier must be S, A, or B")
    if fm.get("content_form") not in VALID_FORMS:
        errors.append("content_form must be lecture, dialogue, or roundtable")
    opus = str(fm.get("opus_id", ""))
    column = str(fm.get("column_id", ""))
    bv = str(fm.get("bv", ""))
    if opus and not re.fullmatch(r"\d{10,}", opus):
        errors.append("opus_id must be a numeric Bilibili opus id")
    if column and not re.fullmatch(r"cv\d+", column):
        errors.append("column_id must match cv<digits>")
    if bv and not re.fullmatch(r"BV[0-9A-Za-z]+", bv):
        errors.append("bv must match BV<id>")
    if not opus and not column:
        errors.append("primary_source column requires opus_id or column_id")
    if fm.get("source_tier") == "C1" and not bv:
        errors.append("C1 source requires a BV mapping")
    if fm.get("source_tier") == "C2" and not bv:
        warnings.append("C2 source has no BV mapping; disclose it as unresolved")

    form = fm.get("content_form")
    fidelity = fm.get("dialogue_fidelity")
    question = fm.get("question_source")
    material = fm.get("material_tier")
    source_form = fm.get("source_form")
    voice_basis = fm.get("voice_basis")

    if is_v2:
        source_url = str(fm.get("source_url", ""))
        if not re.fullmatch(r"https://www\.bilibili\.com/(?:opus/\d+|read/cv\d+)/?", source_url):
            errors.append("source_url must be a Bilibili opus or cv URL")
        if source_form not in VALID_FORMS:
            errors.append("source_form must be lecture, dialogue, or roundtable")
        if fidelity not in {"source", "reconstructed", "none"}:
            errors.append("dialogue_fidelity must be source, reconstructed, or none")
        if question not in {"column", "editorial", "none"}:
            errors.append("question_source must be column, editorial, or none")
        if voice_basis not in VALID_VOICE_BASIS:
            errors.append("voice_basis is invalid")

        if form == "lecture" and (fidelity != "none" or question != "none"):
            errors.append("lecture must use dialogue_fidelity/question_source: none")
        if form in {"dialogue", "roundtable"} and fidelity == "source" and question != "column":
            errors.append("source dialogue/roundtable must use question_source: column")
        if form == "dialogue" and fidelity == "reconstructed" and question != "editorial":
            errors.append("reconstructed dialogue must use question_source: editorial")
        if form == "roundtable" and (fidelity != "source" or question != "column"):
            errors.append("roundtable must use source/column")

        if material == "S" and source_form == "lecture" and not (
            form == "dialogue" and fidelity == "reconstructed" and question == "editorial"
        ):
            errors.append("S source lecture must publish as reconstructed/editorial dialogue")
        if material == "S" and source_form == "dialogue" and not (
            form == "dialogue" and fidelity == "source" and question == "column"
        ):
            errors.append("S source dialogue must publish as source/column dialogue")
        if material == "S" and source_form == "roundtable" and not (
            form == "roundtable" and fidelity == "source" and question == "column"
        ):
            errors.append("S source roundtable must publish as source/column roundtable")
        if material == "B" and fidelity == "reconstructed":
            errors.append("B material must not use reconstructed dialogue")

        for key in LEGACY_SOURCE_FIELDS:
            if key in fm:
                errors.append(f"v2 opus notes must not declare legacy field: {key}")
    else:
        warnings.append("legacy v1 opus note; migrate only when touched")
        if form == "lecture" and (fidelity != "none" or question != "none"):
            errors.append("lecture must use dialogue_fidelity/question_source: none")
        if form in {"dialogue", "roundtable"} and (fidelity != "source" or question != "transcript"):
            errors.append("dialogue/roundtable must use source/transcript")

    factual = fm.get("factual_status")
    if factual not in VALID_FACTUAL:
        errors.append("factual_status must be verified, partial, or unverified")
    if fm.get("source_tier") == "C2" and not bv and factual == "verified":
        errors.append("C2 source without BV mapping cannot be verified")
    basis = fm.get("verification_basis", [])
    unresolved = fm.get("unresolved_facts", [])
    verification_scope = fm.get("verification_scope")
    if is_v2 and verification_scope not in VALID_VERIFICATION_SCOPES:
        errors.append("verification_scope must be column_only or column_plus_original")
    if factual == "verified":
        if not fm.get("factual_reviewed"):
            errors.append("verified notes require factual_reviewed")
        if not isinstance(basis, list) or not basis:
            errors.append("verified notes require verification_basis")
        if isinstance(unresolved, list) and unresolved:
            errors.append("verified notes cannot contain unresolved_facts")
    if isinstance(basis, list) and sources_read is not None:
        for item in basis:
            if item not in sources_read:
                errors.append(f"verification_basis contains unread source: {item}")
    if is_v2 and verification_scope == "column_only" and isinstance(basis, list):
        if any(item != "column" for item in basis):
            errors.append("column_only verification_basis may only contain column")

    body = _body(text)
    if re.search(r"^(?:Moderator|unknown)[：:]", body, re.MULTILINE | re.IGNORECASE):
        errors.append("column notes must not contain Moderator or unknown speaker labels")
    if re.search(r"!\[[^]]*\]\([^)]*\)", body):
        errors.append("column notes must not embed downloaded or recognized images")

    if is_v2:
        labels = _speaker_labels(body)
        if fidelity == "reconstructed" and "编者问" not in labels:
            errors.append("reconstructed dialogue must label editorial questions as 编者问")
        if fidelity == "reconstructed" and labels.intersection({"Moderator", "Host", "主持人"}):
            errors.append("reconstructed dialogue must not invent a host or Moderator")
        if voice_basis == "editorial_summary":
            answer_labels = labels.difference({"编者问", "现场提问", "观众提问"})
            if "专栏整理" not in answer_labels or answer_labels.difference({"专栏整理"}):
                errors.append("editorial_summary answers must use 专栏整理")

        if material == "S":
            for required in ("限制与边界", "知识连接"):
                if not re.search(rf"^##\s+{required}\s*$", body, re.MULTILINE):
                    errors.append(f"S notes require section: {required}")
            knowledge = _section(body, "知识连接")
            has_link = bool(re.search(r"\[\[[^]]+\]\]", knowledge))
            has_typed = _has_typed_relation(knowledge)
            if has_link and not has_typed:
                errors.append("knowledge links must use an allowed typed relation")
            if not has_typed and fm.get("status") != "orphan":
                errors.append("S notes require a typed knowledge relation or status: orphan")

            # Locked template v2.1 (①④⑤ hard gate; ③ timestamps stay skipped):
            for heading, content in _content_chapters(body):
                first = next((line.strip() for line in content.splitlines() if line.strip()), "")
                if not re.match(r"\*\*核心判断[：:]", first):
                    errors.append(f"S notes require 核心判断 at the start of chapter: {heading}")
            if not re.search(r"^>[ \t]*\*\*核心主张[：:]", body, re.MULTILINE):
                errors.append("S notes require a 核心主张 line in the leading blockquote")
            attributions = re.findall(r"^>[ \t]*——[ \t]*\S", body, re.MULTILINE)
            if not attributions:
                errors.append("S notes require a pull-quote attribution line (> ——姓名)")
            elif len(attributions) > 1:
                warnings.append(f"pull-quote should be unique; found {len(attributions)} attribution lines")
        elif not re.search(r"\[\[[^]]+\]\]", body) and fm.get("status") != "orphan":
            errors.append("note requires a wikilink or status: orphan")
    elif not re.search(r"\[\[[^]]+\]\]", body) and fm.get("status") != "orphan":
        errors.append("note requires a wikilink or status: orphan")
    if " - 对谈稿" in str(fm.get("title", "")):
        errors.append("canonical title must not use - 对谈稿")
    if factual == "unverified":
        warnings.append("unverified note is a discovery lead, not a citable fact source")

    workflow = V2_WORKFLOW if is_v2 else "bilibili_opus_ingest_v1"
    return {
        "workflow": workflow,
        "source_id": {"opus": opus, "column": column, "bv": bv},
        "route": {
            "source_tier": fm.get("source_tier"),
            "material_tier": material,
            "source_form": source_form,
            "content_form": form,
            "dialogue_fidelity": fidelity,
            "question_source": question,
            "voice_basis": voice_basis,
        },
        "sources_read": sorted(sources_read or set(basis if isinstance(basis, list) else [])),
        "sources_skipped": ["images", "transcript", "recastory"] if is_v2 else ["images", "transcript"],
        "retention": {"total_units": None, "retained": None, "removed": None, "unresolved": len(unresolved) if isinstance(unresolved, list) else None},
        "related_notes": [],
        "concept_candidates": [],
        "moc_updates": [],
        "checks": {
            "duplicate": None,
            "source_completeness": fm.get("source_tier") in VALID_SOURCE_TIERS,
            "provenance": not any("voice" in error or "host" in error.lower() for error in errors),
            "retention_coverage": None,
            "dialogue_plan": None,
            "voice_integrity": not any("editorial_summary" in error or "Moderator" in error for error in errors),
            "numeric_context": None,
            "constraints_preserved": "## 限制与边界" in body if material == "S" else None,
            "relation_quality": _has_typed_relation(_section(body, "知识连接")) if is_v2 else None,
            "discussion_readiness": None,
            "frontmatter": not any(error.startswith("missing frontmatter") for error in errors),
            "wikilinks": bool(re.search(r"\[\[[^]]+\]\]", body)) or fm.get("status") == "orphan",
            "locked_layout": (
                not any("核心判断" in error or "核心主张" in error or "attribution" in error for error in errors)
            ) if is_v2 and material == "S" else None,
        },
        "errors": errors,
        "warnings": warnings,
        "unresolved": errors.copy(),
        "status": "complete" if not errors else "incomplete",
    }


def validate_note_file(note_path: Path, vault_root: Path, sources_read: set[str] | None = None) -> dict[str, object]:
    text = note_path.read_text(encoding="utf-8")
    result = validate_note_text(text, sources_read)
    errors = list(result["errors"])
    own = _ids(text)
    for other in vault_root.rglob("*.md"):
        if other.resolve() == note_path.resolve():
            continue
        if not _is_knowledge_note(other, vault_root):
            continue
        candidate = _ids(other.read_text(encoding="utf-8", errors="replace"))
        for key in ("bv", "opus_id", "column_id", "source_url"):
            if own[key] and own[key] == candidate[key]:
                errors.append(f"duplicate {key} found in {other.relative_to(vault_root).as_posix()}")
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
    parser.add_argument("--vault-root", type=Path, default=Path.cwd())
    parser.add_argument("--sources-read", nargs="*", default=["column"])
    args = parser.parse_args()
    result = validate_note_file(args.note, args.vault_root, set(args.sources_read))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "complete" else 1)


if __name__ == "__main__":
    main()
