#!/usr/bin/env python3
"""Check that platform adapters point to available canonical vault skills."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


REQUIRED_AGENT_DOCS = ("PROJECT.md", "ROUTER.md", "INGEST-CONTRACT.md", "DENSITY-PROFILE.md")
REQUIRED_SKILLS = ("vskill-vault-curate", "vskill-vault-write", "vskill-vault-relate", "vskill-vault-discuss", "vskill-vault-moc-builder")


def check_repository(root: Path) -> dict[str, list[str]]:
    errors: list[str] = []
    if (root / ".mcp.json").exists() or (root / "opencode.json").exists() or (root / "skill-collection" / "maps" / "obsidian-mcp-setup.md").exists():
        errors.append("Obsidian MCP configuration is present")
    for name in REQUIRED_AGENT_DOCS:
        if not (root / "99-System" / "Agent" / name).is_file():
            errors.append(f"missing Agent contract: {name}")
    agents = root / "AGENTS.md"
    agents_text = agents.read_text(encoding="utf-8") if agents.exists() else ""
    for name in REQUIRED_AGENT_DOCS:
        if f"99-System/Agent/{name}" not in agents_text:
            errors.append(f"AGENTS.md does not route to {name}")
    for skill in REQUIRED_SKILLS:
        canonical = root / "99-System" / "Skills" / skill / "SKILL.md"
        adapter = root / ".agents" / "skills" / skill / "SKILL.md"
        if not canonical.is_file():
            errors.append(f"missing canonical skill: {skill}")
            continue
        canonical_text = canonical.read_text(encoding="utf-8")
        if not re.search(r"^status:\s*available\s*$", canonical_text, re.MULTILINE):
            errors.append(f"canonical skill is not available: {skill}")
        if not adapter.is_file():
            errors.append(f"missing Codex adapter: {skill}")
        elif f"99-System/Skills/{skill}/SKILL.md" not in adapter.read_text(encoding="utf-8"):
            errors.append(f"adapter does not point to canonical skill: {skill}")
    curate_adapter = root / ".agents" / "skills" / "vskill-vault-curate" / "SKILL.md"
    if curate_adapter.is_file():
        adapter_text = curate_adapter.read_text(encoding="utf-8")
        if "B站图文专栏精华收录.md" not in adapter_text:
            errors.append("Bilibili adapter does not route to opus decision document")
        if "必须先读 `99-System/Skills/vskill-vault-curate/SUBDOC - ASR" in adapter_text:
            errors.append("Bilibili adapter still defaults to ASR")
        if "bilibili_opus_ingest_v2" not in adapter_text:
            errors.append("Bilibili adapter does not declare opus ingest v2")
    opus_doc = root / "99-System" / "Skills" / "vskill-vault-curate" / "SUBDOC - B站图文专栏精华收录.md"
    if not opus_doc.is_file():
        errors.append("missing Bilibili opus ingest document")
    else:
        opus_text = opus_doc.read_text(encoding="utf-8")
        required_v2 = (
            "bilibili_opus_ingest_v2",
            "source_form",
            "question_source: column | editorial | none",
            "reconstructed/editorial",
            "知识连接",
        )
        for token in required_v2:
            if token not in opus_text:
                errors.append(f"Bilibili opus v2 contract is missing: {token}")

    default_docs = [
        root / "AGENTS.md",
        root / "99-System" / "Agent" / "ROUTER.md",
        root / "99-System" / "Agent" / "INGEST-CONTRACT.md",
        opus_doc,
        curate_adapter,
    ]
    forbidden_patterns = {
        r"新流程不创建\s+reconstructed": "default opus route forbids reconstructed dialogue",
        r"lecture\s+即使.*保持\s+lecture": "default opus route forces lecture presentation",
        r"dialogue/roundtable.*source/transcript": "default opus route still requires transcript questions",
    }
    for path in default_docs:
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for pattern, message in forbidden_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                errors.append(message)
    return {"errors": errors, "warnings": []}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path, nargs="?", default=Path.cwd())
    args = parser.parse_args()
    result = check_repository(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result["errors"] else 0)


if __name__ == "__main__":
    main()
