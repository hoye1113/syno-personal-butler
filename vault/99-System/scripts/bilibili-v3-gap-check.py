#!/usr/bin/env python3
"""Quick gap check for Bilibili v3 rollout (single-file canonical model)."""
import json
import re
import sys
from pathlib import Path
from path_config import AUDIT_ROOT, BILI_ROOT, RECASTORY_WORKSPACE

VAULT = BILI_ROOT
WS = RECASTORY_WORKSPACE
MANIFEST = WS / "bilibili/manifest.json"

# A-lecture: tutorial/solo — nine-section 讲义 v3 (not Host-Guest asr)
A_LECTURE_STEMS = {
    "Karpathy爆火项目-AutoResearch解读与启发",
    "Agent实战-打造一个AI Agent的完整教程",
    "OpenAI官方-Codex新手教程",
    "Claude Code实战-构建一个AI数据分析师",
    "30分钟精通OpenClaw",
    "Codex实战-Notion第二大脑与技能封装",
}

BATCH_JSON = AUDIT_ROOT / "bilibili-p0-batch.json"


def has_s_column(entry: dict) -> bool:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    col = WS / ing / "column_article.md"
    if not col.exists():
        return False
    text = col.read_text(encoding="utf-8")
    if len(text) < 3000:
        return False
    if entry.get("column_url"):
        return True
    return "主持人" in text or "嘉宾" in text


def parse_fm(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    fm = {}
    for line in parts[1].splitlines():
        if ":" in line and not line.strip().startswith("#"):
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm


def is_s_canonical(text: str, fm: dict) -> bool:
    return (
        fm.get("material_tier") == "S"
        and fm.get("dialogue_version") == "v3.2"
        and "canonical-dialogue" in text
        and "v3.2-asr" not in text
    )


def is_a_dialogue_asr(text: str, fm: dict) -> bool:
    return (
        fm.get("material_tier") == "A"
        and ("canonical-dialogue v3.2-asr" in text or "canonical (ASR primary)" in text)
        and fm.get("dialogue_version") == "v3.2"
    )


def is_a_lecture(text: str, fm: dict) -> bool:
    return (
        fm.get("material_tier") == "A"
        and "讲义 v3" in text
        and "canonical-dialogue v3.2-asr" not in text
        and "## 先搞懂这一期" in text
    )


def validate_v2_contract(fm: dict) -> list[str]:
    errors = []
    if fm.get("material_tier") not in {"S", "A", "B"}:
        errors.append("bad material_tier")
    if fm.get("content_form") not in {"dialogue", "lecture", "roundtable"}:
        errors.append("bad content_form")
    if fm.get("dialogue_fidelity") not in {"source", "reconstructed", "none"}:
        errors.append("bad dialogue_fidelity")
    if fm.get("question_source") not in {"transcript", "editorial", "none"}:
        errors.append("bad question_source")
    if fm.get("factual_status") not in {"verified", "partial", "unverified"}:
        errors.append("bad factual_status")
    return errors


def load_lecture_stems() -> set[str]:
    stems = set(A_LECTURE_STEMS)
    if BATCH_JSON.exists():
        batch = json.loads(BATCH_JSON.read_text(encoding="utf-8"))
        for e in batch.get("entries", []):
            if e.get("tier_hint") == "A-lecture":
                stems.add(Path(e["vault_path"]).stem)
    return stems


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    lecture_stems = load_lecture_stems()
    s_not_canonical: list[str] = []
    a_dialogue_bad: list[str] = []
    a_lecture_bad: list[str] = []
    tier_mismatch: list[str] = []
    dead_links: list[str] = []
    s_no_tier: list[str] = []
    no_ingest: list[str] = []
    long_no_spot: list[tuple[str, str]] = []
    concept_dash_en: list[tuple[str, int]] = []
    v2_bad: list[str] = []

    dlg_count = len(list(VAULT.rglob("* - 对谈稿.md")))
    vault_md = len([p for p in VAULT.rglob("*.md") if p.name.lower() != "readme.md"])

    s_ok = a_dialogue_ok = a_lecture_ok = 0

    mapped = [e for e in manifest["entries"] if e.get("vault_path")]
    expect_s = expect_a_dlg = expect_a_lec = 0
    missing_vault: list[str] = []

    for entry in mapped:
        vp = entry.get("vault_path")
        name = Path(vp).name
        stem = Path(name).stem
        note = next(VAULT.rglob(name), None)
        if not note:
            status = entry.get("vault_status", "")
            if status == "vault_v2_done":
                missing_vault.append(f"{entry['bv']} {name}")
                print("MISSING_VAULT", entry["bv"], name)
            continue
        if entry.get("vault_status") not in ("vault_v2_done", None):
            if entry.get("vault_status") == "vault_pending":
                continue
        text = note.read_text(encoding="utf-8")
        fm = parse_fm(text)
        is_s = has_s_column(entry)
        expect_lecture = stem in lecture_stems

        is_v2 = bool(fm.get("content_form"))
        if is_v2:
            errors = validate_v2_contract(fm)
            if errors:
                v2_bad.append(f"{name}: {', '.join(errors)}")
        elif expect_lecture:
            expect_a_lec += 1
            if not is_a_lecture(text, fm):
                a_lecture_bad.append(name)
            else:
                a_lecture_ok += 1
            if fm.get("material_tier") != "A":
                tier_mismatch.append(f"{name} (expect A lecture)")
        elif is_s:
            expect_s += 1
            if fm.get("material_tier") != "S":
                s_no_tier.append(name)
            if not is_s_canonical(text, fm):
                s_not_canonical.append(name)
            else:
                s_ok += 1
        else:
            expect_a_dlg += 1
            if not is_a_dialogue_asr(text, fm):
                a_dialogue_bad.append(name)
            else:
                a_dialogue_ok += 1
            if fm.get("material_tier") != "A":
                tier_mismatch.append(f"{name} (expect A dialogue)")

        if "ingest_dir" not in text:
            no_ingest.append(name)

        dur = fm.get("duration", "")
        m = re.match(r"(\d+):(\d+)", dur)
        if m:
            secs = int(m.group(1)) * 60 + int(m.group(2))
            if secs >= 45 * 60 and "spot_check" not in text:
                long_no_spot.append((name, dur))

        for link in re.findall(r"\[\[([^\]|]+ - 对谈稿)", text):
            dead_links.append(f"{name} -> {link}")

        if "## 关键概念" in text:
            block = text.split("## 关键概念", 1)[1].split("\n## ", 1)[0]
            if "| 英文 |" not in block:
                concept_dash_en.append((name, -1))
            else:
                rows = [
                    r
                    for r in block.splitlines()
                    if r.startswith("|") and "---" not in r and "英文" not in r
                ]
                dash = sum(1 for r in rows if re.search(r"\|\s*—\s*\|", r))
                if dash:
                    concept_dash_en.append((name, dash))

    done_count = len([e for e in mapped if e.get("vault_status") == "vault_v2_done"])
    print("VAULT_MD", vault_md, f"(manifest done {done_count})")
    print("ORPHAN_DIALOGUE_FILES", dlg_count, "(expect 0)")
    print("S_CANONICAL", s_ok, f"(expect {expect_s})")
    print("A_DIALOGUE_ASR", a_dialogue_ok, f"(expect {expect_a_dlg})")
    print("A_LECTURE", a_lecture_ok, f"(expect {expect_a_lec})")
    print("S_NOT_CANONICAL", len(s_not_canonical))
    for x in s_not_canonical:
        print(" ", x)
    print("A_DIALOGUE_BAD", len(a_dialogue_bad))
    for x in a_dialogue_bad:
        print(" ", x)
    print("A_LECTURE_BAD", len(a_lecture_bad))
    for x in a_lecture_bad:
        print(" ", x)
    print("TIER_MISMATCH", len(tier_mismatch))
    for x in tier_mismatch:
        print(" ", x)
    print("DEAD_WIKILINKS", len(dead_links))
    for x in dead_links:
        print(" ", x)
    print("S_NO_material_tier", len(s_no_tier))
    for x in s_no_tier:
        print(" ", x)
    print("NO_ingest_dir", len(no_ingest))
    for x in no_ingest:
        print(" ", x)
    print("LONG_NO_spot_check", len(long_no_spot))
    for x in long_no_spot:
        print(" ", x[0], x[1])
    print("CONCEPT_EN_DASH", len(concept_dash_en), "files")
    total_dash = sum(c for _, c in concept_dash_en if c > 0)
    print("CONCEPT_EN_DASH_ROWS", total_dash)
    print("V2_CONTRACT_BAD", len(v2_bad))
    for x in v2_bad:
        print(" ", x)

    failed = (
        missing_vault
        or dlg_count
        or s_not_canonical
        or a_dialogue_bad
        or a_lecture_bad
        or tier_mismatch
        or dead_links
        or s_ok != expect_s
        or a_dialogue_ok != expect_a_dlg
        or a_lecture_ok != expect_a_lec
        or v2_bad
    )
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
