#!/usr/bin/env python3
"""Batch-apply Bilibili vault v3 mechanical rules (A 级讲义层).

- 读完应带走 -> 要点
- ## 关键概念: 2-col -> 3-col
- curate_method -> v3-ingest（讲义 v3）
- **跳过** S 级 canonical（dialogue_version / canonical-dialogue）——勿插入对谈稿 callout

Usage:
  python bilibili-vault-v3-batch.py --dry-run
  python bilibili-vault-v3-batch.py --apply
  python bilibili-vault-v3-batch.py --a-tier-only --apply
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
VAULT = BILI_ROOT
MANIFEST = WS / "bilibili/manifest.json"


def parse_term_cell(cell: str) -> tuple[str, str]:
    cell = cell.strip()
    m = re.match(r"\*\*(.+?)（(.+?)）\*\*", cell)
    if m:
        en, zh = m.group(1).strip(), m.group(2).strip()
        return zh, en
    m = re.match(r"\*\*(.+?)\*\*", cell)
    if m:
        term = m.group(1).strip()
        if re.search(r"[A-Za-z]", term):
            return "—", term
        return term, "—"
    if re.search(r"[A-Za-z]", cell):
        return "—", cell
    return cell, "—"


def upgrade_concept_table(body: str) -> tuple[str, int]:
    """Upgrade ## 关键概念 tables from 2-col to 3-col."""
    changes = 0

    def repl_section(m: re.Match) -> str:
        nonlocal changes
        header = m.group(1)
        table = m.group(2)
        if "| 英文 |" in table or "| English |" in table:
            return m.group(0)
        lines = table.strip().splitlines()
        if len(lines) < 2:
            return m.group(0)
        sep = lines[1]
        if "白话" not in lines[0]:
            return m.group(0)
        new_lines = ["| 中文 | 英文 | 白话 |", "|------|------|------|"]
        for row in lines[2:]:
            if not row.strip().startswith("|"):
                continue
            parts = [p.strip() for p in row.strip("|").split("|")]
            if len(parts) < 2:
                continue
            zh, en = parse_term_cell(parts[0])
            gloss = parts[1] if len(parts) > 1 else ""
            if en == "—" and gloss and re.search(r"[A-Za-z]{3,}", gloss.split()[0] if gloss else ""):
                pass
            new_lines.append(f"| {zh} | {en} | {gloss} |")
            changes += 1
        return header + "\n".join(new_lines) + "\n"

    pattern = re.compile(
        r"(## 关键概念[^\n]*\n\n)(\|[^\n]+\|\n\|[-| ]+\|\n(?:\|[^\n]+\|\n)+)",
        re.MULTILINE,
    )
    new_body = pattern.sub(repl_section, body)
    return new_body, changes


def dialogue_basename(vault_path: str) -> str:
    stem = Path(vault_path).stem
    return f"{stem} - 对谈稿"


def has_column(entry: dict) -> bool:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    col = WS / ing / "column_article.md"
    if not col.exists():
        return False
    text = col.read_text(encoding="utf-8")
    return len(text) >= 3000 and ("主持人" in text or "嘉宾" in text)


def insert_dialogue_callout(body: str, dialogue_link: str, done: bool) -> tuple[str, bool]:
    marker = "**对谈稿"
    if marker in body:
        return body, False
    if done:
        block = (
            f"> **对谈稿（v3.2）**：[[{dialogue_link}]] — Host/Guest 精读体。"
            f" 下文为 **讲义 v3**（vault 检索用）。\n\n"
        )
    else:
        block = (
            f"> **对谈稿（v3.2）**：[[{dialogue_link}]] — *待生成*（S 级 column 主源）。"
            f" 下文为 **讲义 v2/v3**（vault 检索用）。\n\n"
        )
    if "## 先搞懂这一期" in body:
        body = body.replace("## 先搞懂这一期\n\n", f"## 先搞懂这一期\n\n{block}", 1)
        return body, True
    if body.startswith("# "):
        lines = body.split("\n", 2)
        if len(lines) >= 2:
            return lines[0] + "\n\n" + block + "\n".join(lines[1:]), True
    return block + body, True


def is_canonical_s(text: str) -> bool:
    """S 级已合并为单篇 Host-Guest canonical — batch 不得改写。"""
    return "canonical-dialogue" in text or "dialogue_version: v3.2" in text


def process_file(path: Path, entry: dict | None, apply: bool, a_tier_only: bool) -> dict:
    text = path.read_text(encoding="utf-8")
    orig = text
    stats = {"path": str(path.name), "changes": []}

    if is_canonical_s(text):
        stats["skipped"] = "canonical_s"
        return stats

    if a_tier_only and entry and has_column(entry):
        stats["skipped"] = "s_column"
        return stats

    if "读完应带走" in text:
        text = text.replace("**读完应带走：**", "**要点：**")
        text = text.replace("读完应带走：", "要点：")
        stats["changes"].append("要点")

    text, n_concept = upgrade_concept_table(text)
    if n_concept:
        stats["changes"].append(f"concept_cols={n_concept}")

    if "curate_method:" in text and "讲义 v3" not in text:
        text = re.sub(
            r'curate_method:\s*"[^"]*"',
            'curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"',
            text,
            count=1,
        )
        stats["changes"].append("curate_method")

    # legacy: 双文件时代插入对谈稿 callout — canonical 合并后已禁用
    # if entry and has_column(entry) ...

    if text != orig:
        stats["modified"] = True
        if apply:
            path.write_text(text, encoding="utf-8")
    else:
        stats["modified"] = False
    return stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true", default=True)
    ap.add_argument(
        "--a-tier-only",
        action="store_true",
        help="Only touch A-tier (skip entries with column_article in manifest)",
    )
    args = ap.parse_args()
    apply = args.apply
    if apply:
        args.dry_run = False

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bv_to_entry = {e["bv"]: e for e in manifest["entries"]}

    modified = 0
    skipped = 0
    for path in sorted(VAULT.rglob("*.md")):
        if path.name.endswith("对谈稿.md"):
            continue
        entry = None
        for e in manifest["entries"]:
            if Path(e["vault_path"]).name == path.name:
                entry = e
                break
        st = process_file(path, entry, apply, args.a_tier_only)
        if st.get("skipped"):
            skipped += 1
            continue
        if st.get("modified"):
            modified += 1
            flag = "APPLY" if apply else "DRY"
            print(f"[{flag}]", path.name, st["changes"])

    print(f"Done: modified={modified} skipped={skipped} apply={apply}")


if __name__ == "__main__":
    main()
