#!/usr/bin/env python3
"""Phase 0: Recastory ingest × vault reconcile audit."""
import json
import re
from collections import Counter
from pathlib import Path
from path_config import AUDIT_ROOT, BILI_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
VAULT = BILI_ROOT
OUT = AUDIT_ROOT / "bilibili-ingest-reconcile-2026-07-03.md"


def ingest_path(entry: dict) -> Path | None:
    d = entry.get("ingest_dir", "").replace("workspace/", "")
    return WS / d if d else None


def has_file(entry: dict, name: str) -> bool:
    p = ingest_path(entry)
    return (p / name).exists() if p else False


def column_info(entry: dict) -> tuple[int, bool, str]:
    p = ingest_path(entry)
    if not p:
        return 0, False, ""
    f = p / "column_article.md"
    if not f.exists():
        return 0, False, ""
    text = f.read_text(encoding="utf-8")
    chars = len(text)
    dialogue = bool(re.search(r"（主持人）|（嘉宾）", text))
    host_guest = ""
    if dialogue:
        hm = re.search(r"([^\（]+)（主持人）", text)
        gm = re.search(r"([^\（]+)（嘉宾）", text)
        if hm and gm:
            host_guest = f"{hm.group(1).strip()[:40]} × {gm.group(1).strip()[:40]}"
    return chars, dialogue, host_guest


def tier(entry: dict, col_chars: int, dialogue: bool) -> str:
    if has_file(entry, "column_article.md") and col_chars >= 3000 and dialogue:
        return "S"
    if has_file(entry, "column_article.md") and col_chars >= 1000:
        return "S-"
    if has_file(entry, "video_description.md"):
        return "A"
    return "B"


def vault_file(entry: dict) -> Path | None:
    name = Path(entry.get("vault_path", "")).name
    for root in VAULT.rglob("*.md"):
        if root.name == name:
            return root
    return None


def main() -> None:
    manifest = json.loads((WS / "bilibili/manifest.json").read_text(encoding="utf-8"))
    rows = []
    for e in manifest["entries"]:
        col_chars, dialogue, host_guest = column_info(e)
        ing = ingest_path(e)
        meta = {}
        if ing and (ing / "metadata.json").exists():
            meta = json.loads((ing / "metadata.json").read_text(encoding="utf-8"))
        enrich = meta.get("enrichment", {})
        rows.append(
            {
                "bv": e.get("bv", ""),
                "vault_path": e.get("vault_path", ""),
                "vault_exists": vault_file(e) is not None,
                "enrich_status": e.get("enrich_status", ""),
                "tier": tier(e, col_chars, dialogue),
                "column": has_file(e, "column_article.md"),
                "column_chars": col_chars,
                "dialogue_in_column": dialogue,
                "desc": has_file(e, "video_description.md"),
                "comment": has_file(e, "comment_summary.md"),
                "column_url": e.get("column_url") or enrich.get("column_url"),
                "host_guest_column": host_guest,
                "warnings": "; ".join(e.get("enrich_warnings") or [])[:100],
            }
        )

    c = Counter(r["tier"] for r in rows)
    lines = [
        "---",
        'title: "B站 ingest 对账审计"',
        "created: 2026-07-03",
        "tags: [audit, bilibili]",
        "---",
        "",
        "# B站 ingest × vault 对账（Phase 0）",
        "",
        f"> Recastory workspace · manifest {len(rows)} 条 · 生成 2026-07-03",
        "",
        "## 汇总",
        "",
        f"- **素材等级**：S={c['S']} · S-={c.get('S-', 0)} · A={c['A']} · B={c['B']}",
        f"- **enrich**：ok={sum(1 for r in rows if r['enrich_status']=='ok')} · "
        f"partial={sum(1 for r in rows if r['enrich_status']=='partial')} · "
        f"skipped={sum(1 for r in rows if r['enrich_status']=='skipped')}",
        f"- **column_article**：{sum(1 for r in rows if r['column'])}/32",
        f"- **vault 文件存在**：{sum(1 for r in rows if r['vault_exists'])}/32",
        "",
        "## 分级说明",
        "",
        "| 等级 | 条件 | Phase 3 策略 |",
        "|------|------|--------------|",
        "| **S** | column ≥3k 字 + 含主持人/嘉宾 | 对谈稿或 v3 重写 |",
        "| **S-** | column ≥1k 字 | 优先读 column |",
        "| **A** | 仅有 video_description | 轻量 v3 |",
        "| **B** | 仅 ASR | 补来源 |",
        "",
        "## 全量清单",
        "",
        "| BV | 等级 | enrich | column | 字 | 对话体 | column_url | Host×Guest | vault | 备注 |",
        "|----|------|--------|--------|-----|--------|------------|------------|-------|------|",
    ]
    for r in sorted(rows, key=lambda x: (x["tier"], x["bv"])):
        lines.append(
            "| {bv} | {tier} | {es} | {col} | {chars} | {dia} | {cu} | {hg} | {vf} | {warn} |".format(
                bv=r["bv"],
                tier=r["tier"],
                es=r["enrich_status"],
                col="✓" if r["column"] else "—",
                chars=r["column_chars"] or "—",
                dia="✓" if r["dialogue_in_column"] else "—",
                cu="✓" if r["column_url"] else "—",
                hg=r["host_guest_column"] or "—",
                vf="✓" if r["vault_exists"] else "**缺失**",
                warn=r["warnings"] or "—",
            )
        )

    lines += ["", "## Phase 1 待补 column（partial 且无 column）", ""]
    for r in rows:
        if r["enrich_status"] == "partial" and not r["column"]:
            lines.append(f"- {r['bv']} → `{r['vault_path']}`")

    lines += [
        "",
        "## 已知 vault 与 ingest 冲突",
        "",
        "- **A8 BV12qTu6WETP**：vault「Deep Dive Podcast」→ column **Marina Mogilko × Thibault Sottiaux**",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT}")
    print("Tiers:", dict(c))


if __name__ == "__main__":
    main()
