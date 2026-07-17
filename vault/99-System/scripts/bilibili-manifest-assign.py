#!/usr/bin/env python3
"""Assign vault_path + vault_status on Recastory manifest entries from batch JSON."""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from path_config import AUDIT_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
MANIFEST = WS / "bilibili/manifest.json"
DEFAULT_BATCH = AUDIT_ROOT / "bilibili-p0-batch.json"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", type=Path, default=DEFAULT_BATCH)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--mark-done", action="store_true", help="Set vault_v2_done for batch entries with vault_path")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    batch = json.loads(args.batch.read_text(encoding="utf-8"))
    by_bv = {e["bv"]: e for e in batch["entries"]}

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    updated = 0
    missing = []

    for entry in manifest["entries"]:
        bv = entry.get("bv")
        if bv not in by_bv:
            continue
        spec = by_bv[bv]
        vp = spec["vault_path"]
        if args.mark_done:
            if entry.get("vault_path") == vp:
                print(f"MARK_DONE {bv}")
                entry["vault_status"] = "vault_v2_done"
                updated += 1
            continue
        if entry.get("vault_path") == vp and entry.get("vault_status") == "vault_v2_done":
            continue
        print(f"{'APPLY' if args.apply else 'DRY'} {bv} -> {vp}")
        if args.apply:
            entry["vault_path"] = vp
            entry["vault_status"] = "vault_pending"
            entry["batch_assign"] = batch.get("batch", "")
            entry["assign_date"] = date.today().isoformat()
        updated += 1

    for bv in by_bv:
        if not any(e.get("bv") == bv for e in manifest["entries"]):
            missing.append(bv)

    if missing:
        print("NOT IN MANIFEST:", ", ".join(missing))

    if args.apply and updated:
        manifest["updated"] = date.today().isoformat()
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {updated} entries in {MANIFEST}")
    else:
        print(f"Would update {updated} entries")


if __name__ == "__main__":
    main()
