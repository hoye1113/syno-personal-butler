"""Portable paths for legacy vault maintenance scripts.

Set RECASTORY_ROOT or RECASTORY_WORKSPACE when the optional external source
repository is not located at the default sibling path. Syno itself never needs
Recastory for new intake.
"""
from __future__ import annotations

import os
from pathlib import Path

VAULT_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = VAULT_ROOT.parent
BILI_ROOT = VAULT_ROOT / "02-Resources/AI and Agents/B站视频知识库"
AUDIT_ROOT = VAULT_ROOT / "99-System/audit"
RECASTORY_ROOT = Path(os.environ.get("RECASTORY_ROOT", REPO_ROOT.parent / "Recastory")).expanduser().resolve()
RECASTORY_WORKSPACE = Path(os.environ.get("RECASTORY_WORKSPACE", RECASTORY_ROOT / "workspace")).expanduser().resolve()
