#!/usr/bin/env python3
"""List or invoke Recastory backfill for manifest partial (A-tier) entries.

Usage:
  python bilibili-partial-enrich-run.py --list
  python bilibili-partial-enrich-run.py --dry-run
  python bilibili-partial-enrich-run.py --run --force   # needs WebBridge @ :10086
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from path_config import RECASTORY_ROOT, RECASTORY_WORKSPACE

MANIFEST = RECASTORY_WORKSPACE / "bilibili/manifest.json"
RECASTORY = RECASTORY_ROOT


def partial_entries(manifest: dict) -> list[dict]:
    out = []
    for e in manifest.get("entries", []):
        status = e.get("enrich_status") or e.get("enrich", {}).get("status")
        if status == "partial":
            out.append(e)
        elif not e.get("column_url") and e.get("material_tier") == "A":
            out.append(e)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="Print partial BV list")
    ap.add_argument("--dry-run", action="store_true", help="Print backfill commands only")
    ap.add_argument("--run", action="store_true", help="Execute backfill --force for each partial")
    ap.add_argument("--force", action="store_true", help="Pass --force to backfill")
    args = ap.parse_args()

    if not MANIFEST.exists():
        print(f"manifest not found: {MANIFEST}", file=sys.stderr)
        sys.exit(1)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    partial = partial_entries(manifest)
    print(f"partial count: {len(partial)}")

    for e in partial:
        bv = e["bv"]
        name = Path(e.get("vault_path", "")).name
        reason = e.get("enrich_notes") or e.get("partial_reason") or "no column_url"
        print(f"  {bv}  {name}  ({reason})")

    if args.list or (not args.dry_run and not args.run):
        return

    cmd_base = [
        sys.executable,
        "-m",
        "tools.ingest.bilibili_backfill",
        "--manifest",
        str(MANIFEST),
    ]
    if args.force:
        cmd_base.append("--force")

    failed = 0
    for e in partial:
        cmd = cmd_base + ["--bv", e["bv"]]
        line = " ".join(cmd)
        if args.dry_run:
            print(f"DRY: {line}")
            continue
        print(f"RUN: {e['bv']}")
        r = subprocess.run(cmd, cwd=RECASTORY)
        if r.returncode != 0:
            failed += 1

    if args.run and failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
