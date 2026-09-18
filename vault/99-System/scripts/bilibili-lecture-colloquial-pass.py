#!/usr/bin/env python3
"""Light colloquial pass on S-tier lecture ## 先搞懂这一期 sections.

Mechanical anti-translation fixes + frontmatter lecture_colloquial: v3.2-lite marker.
Full prose rewrite still needs human/Agent pass; this removes worst ASR/翻译腔 signals.

Usage:
  python bilibili-lecture-colloquial-pass.py --dry-run
  python bilibili-lecture-colloquial-pass.py --apply
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from path_config import BILI_ROOT, RECASTORY_WORKSPACE

VAULT = BILI_ROOT
WS = RECASTORY_WORKSPACE
MANIFEST = WS / "bilibili/manifest.json"

REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"此外，?"), ""),
    (re.compile(r"另外，?"), ""),
    (re.compile(r"值得注意的是，?"), ""),
    (re.compile(r"某种程度上，?"), ""),
    (re.compile(r"本质上，?"), ""),
    (re.compile(r"在这个意义上，?"), "这么说，"),
    (re.compile(r"进行([一-龥]{2,6})"), r"\1"),
    (re.compile(r"做出(选择|决定)"), r"\1"),
    (re.compile(r"拥有(.{1,8})的能力"), r"能\1"),
    (re.compile(r"提供支持"), "撑你"),
    (re.compile(r"让我们"), "我们"),
    (re.compile(r"——这是因为"), "——"),
    (re.compile(r"非 technical 用户"), "非技术用户"),
    (re.compile(r"non-technical"), "非技术"),
    (re.compile(r"knowledge work"), "知识工作"),
    (re.compile(r"Knowledge worker"), "知识工作者"),
    (re.compile(r"extremely reliable"), "非常稳"),
    (re.compile(r"dramatic change"), "大变样"),
    (re.compile(r"augment，不 replace team"), "帮人，不替团队"),
    (re.compile(r"Humans remain responsible"), "人仍要担责"),
    (re.compile(r"technology matured more than people need to change"), "技术成熟了，人不用大改习惯"),
]


def s_tier_stems() -> set[str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    stems: set[str] = set()
    for entry in manifest["entries"]:
        ing = entry.get("ingest_dir", "").replace("workspace/", "")
        col = WS / ing.replace("/ingest", "") / "column_article.md"
        if not col.exists():
            col = WS.parent / ing.split("/")[0] / Path(ing).parent.name / "column_article.md"
        # check knowledge path
        vault_name = Path(entry["vault_path"]).stem
        for p in WS.rglob("column_article.md"):
            if vault_name in str(p) or entry.get("bv", "") in str(p.parent):
                text = p.read_text(encoding="utf-8")
                if len(text) >= 3000 and ("主持人" in text or "嘉宾" in text):
                    stems.add(vault_name)
                    break
        else:
            # fallback from manifest material_tier in vault
            note = next(VAULT.rglob(f"{vault_name}.md"), None)
            if note and "material_tier: S" in note.read_text(encoding="utf-8"):
                stems.add(vault_name)
    # hardcode known 15
    known = {
        "Codex负责人-现场演示Codex",
        "Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿",
        "IBM团队-Harness工程详解",
        "LCA-60分钟变成AI-Native",
        "Cursor-128个Agent团队协作",
        "Claude Code实战-结合Obsidian打造第二大脑",
        "DeepMind-模型将吞噬Harness",
        "Cursor副总裁-构建软件开发过程的Agent",
        "Cursor负责人-Composer模型如何训练的",
        "YC论文俱乐部-5篇论文揭示AI研究趋势",
        "Codex实战-构建全能AI营销团队",
        "Alchemy CPO-从代码审查到自动代理",
        "Taven创始人-将OpenClaw嵌入产品的实战经验",
        "OpenClaw实战-从本地到K8S部署",
        "Snorkel-小模型RL超越大模型",
    }
    return known | stems


def patch_section(body: str) -> tuple[str, int]:
    if "## 先搞懂这一期" not in body:
        return body, 0
    before, rest = body.split("## 先搞懂这一期", 1)
    chunk, after = rest.split("\n## ", 1) if "\n## " in rest else (rest, "")
    original = chunk
    for pat, repl in REPLACEMENTS:
        chunk = pat.sub(repl, chunk)
    changes = sum(1 for a, b in zip(original, chunk) if a != b) if chunk != original else (1 if chunk != original else 0)
    changes = 1 if chunk != original else 0
    new_body = before + "## 先搞懂这一期" + chunk
    if after:
        new_body += "\n## " + after
    return new_body, changes


def patch_fm(text: str) -> tuple[str, bool]:
    if "lecture_colloquial:" in text:
        return text, False
    if not text.startswith("---"):
        return text, False
    parts = text.split("---", 2)
    if len(parts) < 3:
        return text, False
    fm = parts[1].rstrip() + "\nlecture_colloquial: v3.2-lite\n"
    return "---" + fm + "---" + parts[2], True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    stems = s_tier_stems()
    changed = 0
    for path in sorted(VAULT.rglob("*.md")):
        if "对谈稿" in path.name or path.stem not in stems:
            continue
        text = path.read_text(encoding="utf-8")
        new_text, n = patch_section(text)
        new_text, fm = patch_fm(new_text)
        if n or fm:
            changed += 1
            print(f"{'APPLY' if args.apply else 'DRY'} {path.name}")
            if args.apply:
                path.write_text(new_text, encoding="utf-8")
    print(f"S_TIER_TOUCHED {changed}")


if __name__ == "__main__":
    main()
