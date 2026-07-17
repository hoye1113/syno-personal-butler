#!/usr/bin/env python3
"""Phase 3B: Light v3 frontmatter refresh for A-tier Bilibili vault notes."""
import json
import re
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
VAULT = BILI_ROOT
MANIFEST = WS / "bilibili/manifest.json"


def parse_frontmatter(text: str) -> tuple[dict, str, str]:
    if not text.startswith("---"):
        return {}, text, ""
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text, ""
    body = parts[2].lstrip("\n")
    fm_raw = parts[1]
    fm = {}
    for line in fm_raw.splitlines():
        if ":" in line and not line.strip().startswith("#"):
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip().strip('"')
    return fm, body, fm_raw


def extract_original_date(desc: str) -> str | None:
    m = re.search(r"原始视频发布时间[：:]\s*(\d{4}-\d{2}-\d{2})", desc)
    return m.group(1) if m else None


def vault_path(entry: dict) -> Path | None:
    name = Path(entry["vault_path"]).name
    for p in VAULT.rglob(name):
        return p
    return None


def has_column(entry: dict) -> bool:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    return (WS / ing / "column_article.md").exists() if ing else False


def update_note(path: Path, entry: dict, meta: dict) -> bool:
    text = path.read_text(encoding="utf-8")
    fm, body, _ = parse_frontmatter(text)
    if not fm:
        return False

    src = meta.get("source", {})
    enrich = meta.get("enrichment", {})
    desc = src.get("description", "")

    fm["material_tier"] = "A"
    fm["updated"] = "2026-07-03"
    if entry.get("source_url"):
        fm["source_url"] = entry["source_url"]
    if entry.get("column_url") or enrich.get("column_url"):
        fm["column_url"] = entry.get("column_url") or enrich.get("column_url", "")
    od = extract_original_date(desc)
    if od:
        fm["source_original_date"] = od
    ing = entry.get("ingest_dir", "")
    if ing:
        fm["ingest_dir"] = ing.replace("workspace/", "Recastory/workspace/")
    fm["curate_method"] = "vskill-vault-curate v3-ingest（讲义 v2 + ingest 元数据）"

    # rebuild minimal frontmatter (preserve tags block roughly)
    lines = ["---"]
    order = [
        "title", "source", "source_url", "column_url", "source_original_date",
        "speaker", "host_name", "guest_name", "duration", "saved", "tags",
        "created", "updated", "description", "material_tier", "ingest_dir",
        "transcript_source", "curate_method", "spot_check",
    ]
    seen = set()
    for key in order:
        if key in fm and key not in seen:
            seen.add(key)
            val = fm[key]
            if key == "tags":
                continue  # keep original tags from file
            lines.append(f'{key}: "{val}"' if key in {
                "title", "source", "source_url", "column_url", "speaker",
                "description", "transcript_source", "curate_method", "ingest_dir", "column_url",
                "host_name", "guest_name", "guest_title",
            } else f"{key}: {val}")

    # copy tags from original
    tag_match = re.search(r"^tags:\n((?:  - .+\n)+)", text, re.M)
    if tag_match:
        lines.append("tags:")
        lines.extend(tag_match.group(1).rstrip().splitlines())
    else:
        lines.append("tags:")
        lines.append("  - ai_agent")
        lines.append("  - bilibili")

    for k, v in fm.items():
        if k not in seen and k != "tags":
            lines.append(f"{k}: {v}")

    lines.append("---")

    # append ingest block to ## 来源 if missing
    if "## 来源" in body and "ingest_dir" not in body:
        body = body.replace(
            "## 来源",
            f"## 来源\n\n- **ingest**：`{fm.get('ingest_dir', '')}`\n- **video_description**：`{{ingest}}/video_description.md`",
            1,
        )

    path.write_text("\n".join(lines) + "\n\n" + body, encoding="utf-8")
    return True


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    updated = skipped = 0
    for entry in manifest["entries"]:
        if has_column(entry):
            continue  # S tier — skip batch
        vp = vault_path(entry)
        if not vp or vp.name.endswith("对谈稿.md"):
            skipped += 1
            continue
        ing = entry.get("ingest_dir", "").replace("workspace/", "")
        meta_path = WS / ing / "metadata.json"
        if not meta_path.exists():
            skipped += 1
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if update_note(vp, entry, meta):
            updated += 1
            print("updated", entry["bv"], vp.name)
    print(f"Done: updated={updated} skipped={skipped}")


if __name__ == "__main__":
    main()
