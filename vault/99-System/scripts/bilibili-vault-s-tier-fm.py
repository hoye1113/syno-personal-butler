#!/usr/bin/env python3
"""Patch S-tier Bilibili lecture notes: material_tier, ingest_dir, column_url, dates."""
import json
import re
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
VAULT = BILI_ROOT
MANIFEST = WS / "bilibili/manifest.json"


def is_s_tier(entry: dict) -> bool:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    col = WS / ing / "column_article.md"
    if not col.exists():
        return False
    text = col.read_text(encoding="utf-8")
    return len(text) >= 3000 and ("主持人" in text or "嘉宾" in text)


def extract_original_date(desc: str) -> str | None:
    m = re.search(r"原始视频发布时间[：:]\s*(\d{4}-\d{2}-\d{2})", desc)
    return m.group(1) if m else None


def vault_note(entry: dict) -> Path | None:
    name = Path(entry["vault_path"]).name
    for p in VAULT.rglob(name):
        if not p.name.endswith("对谈稿.md"):
            return p
    return None


def upsert_fm_line(fm_block: str, key: str, value: str, quoted: bool = True) -> str:
    val = f'"{value}"' if quoted else value
    pattern = re.compile(rf"^{re.escape(key)}:.*$", re.M)
    line = f"{key}: {val}"
    if pattern.search(fm_block):
        return pattern.sub(line, fm_block, count=1)
    return fm_block.rstrip() + f"\n{line}\n"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    updated = 0
    for entry in manifest["entries"]:
        if not is_s_tier(entry):
            continue
        path = vault_note(entry)
        if not path:
            continue
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---"):
            continue
        parts = text.split("---", 2)
        fm = parts[1]
        body = parts[2]

        ing = entry.get("ingest_dir", "").replace("workspace/", "Recastory/workspace/")
        fm = upsert_fm_line(fm, "material_tier", "S", quoted=False)
        fm = upsert_fm_line(fm, "ingest_dir", ing)
        if entry.get("column_url"):
            fm = upsert_fm_line(fm, "column_url", entry["column_url"])
        if entry.get("source_url"):
            fm = upsert_fm_line(fm, "source_url", entry["source_url"])

        meta_path = WS / entry.get("ingest_dir", "").replace("workspace/", "") / "metadata.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            desc = meta.get("source", {}).get("description", "")
            od = extract_original_date(desc)
            if od:
                fm = upsert_fm_line(fm, "source_original_date", od)
            dur = meta.get("source", {}).get("duration") or meta.get("duration")
            if dur and not re.search(r"^duration:", fm, re.M):
                fm = upsert_fm_line(fm, "duration", str(dur))

        if "updated:" not in fm:
            fm = upsert_fm_line(fm, "updated", "2026-07-03", quoted=False)

        new_text = f"---{fm}---{body}"
        if new_text != text:
            path.write_text(new_text, encoding="utf-8")
            updated += 1
            print("updated", entry["bv"], path.name)

    print(f"Done: {updated} S-tier lecture notes patched")


if __name__ == "__main__":
    main()
