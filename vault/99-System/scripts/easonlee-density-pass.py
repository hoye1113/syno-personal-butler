#!/usr/bin/env python3
"""Insert 专栏硬核摘录 section from column 摘要/重点速览 into pilot vault notes."""
from __future__ import annotations

import re
from pathlib import Path

VAULT = Path(r"D:/workSpace/obsidian_repository/02-Resources/AI and Agents/B站视频知识库")
WS = Path(r"D:/workSpace/git_clone_test/hoye-git/Recastory/workspace/bilibili-retranscribe")

BATCH = [
    ("BV11H526yEiB", "行业观点与组织/OpenAI总裁-GPT5.5与下一阶段AI发展.md"),
    ("BV12RVf62Ed2", "行业观点与组织/Harvey CEO-31岁运营百亿法律AI公司.md"),
    ("BV1467R6LEzm", "Agent架构与平台/YC合伙人-YC内部AI代理基础设施.md"),
    ("BV14jrKBcEav", "行业观点与组织/Vercel COO-2026世界级GTM与推广工程师.md"),
    ("BV16BQhBEEgH", "Agent架构与平台/Asana CPO-AI时代工作图谱与共享记忆.md"),
    ("BV16JdVBGEyU", "行业观点与组织/黄仁勋-英伟达护城河与计算驱动经济.md"),
    ("BV16wGS6MEEn", "行业观点与组织/Notion CEO-AI原生组织像爵士乐队.md"),
    ("BV17p9yB9Ef3", "行业观点与组织/Replit CEO-建设者与布道者两种人.md"),
    ("BV17x9yBXEug", "行业观点与组织/Meta前高管-一半产品经理为何陷入困境.md"),
    ("BV18grKBNEJA", "行业观点与组织/ElevenLabs与Lovable CEO-坐上AI火箭.md"),
]


def extract_bullets(col: str) -> list[str]:
    bullets: list[str] = []
    in_summary = False
    for line in col.splitlines():
        if line.startswith("## 摘要"):
            in_summary = True
            continue
        if in_summary and line.startswith("## "):
            if line.startswith("## 重点速览"):
                continue
            break
        if in_summary and line.strip().startswith("## 重点速览"):
            continue
        # numbered summary items like "1. GPT-5.5 ..."
        m = re.match(r"^\d+\.\s+(.+)", line.strip())
        if m and in_summary:
            bullets.append(m.group(1).strip())
    # 重点速览 section
    if "## 重点速览" in col:
        part = col.split("## 重点速览", 1)[1].split("\n## ", 1)[0]
        for line in part.splitlines():
            line = line.strip()
            if line.startswith("- "):
                bullets.append(line[2:].strip())
    # Q&A from column if present
    if "## 问答精选" in col:
        qa = col.split("## 问答精选", 1)[1].split("\n## ", 1)[0]
        for line in qa.splitlines():
            line = line.strip()
            if line.startswith("- Q：") or line.startswith("- A："):
                bullets.append(line[2:].strip())
    # dedupe preserve order
    seen: set[str] = set()
    out: list[str] = []
    for b in bullets:
        key = b[:80]
        if key not in seen and len(b) > 15:
            seen.add(key)
            out.append(b)
    return out[:18]


def build_section(bullets: list[str]) -> str:
    if not bullets:
        return ""
    lines = [
        "",
        "## 专栏硬核摘录",
        "",
        "> 摘自 `column_article.md` 摘要/速览/Q&A，对话正文未展开的细节。",
        "",
    ]
    for b in bullets:
        lines.append(f"- {b}")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    for bv, rel in BATCH:
        col_path = WS / bv / "ingest" / "column_article.md"
        note_path = VAULT / rel.replace("/", "\\") if "\\" in str(VAULT) else VAULT / rel
        note_path = VAULT / Path(rel)
        if not col_path.is_file() or not note_path.is_file():
            print("SKIP missing", bv)
            continue
        col = col_path.read_text(encoding="utf-8")
        text = note_path.read_text(encoding="utf-8")
        if "## 专栏硬核摘录" in text:
            text = re.sub(
                r"\n## 专栏硬核摘录\n.*?(?=\n## 总结\n)",
                "\n",
                text,
                flags=re.S,
            )
        bullets = extract_bullets(col)
        section = build_section(bullets)
        if not section:
            print("NO bullets", bv)
            continue
        if "## 总结" not in text:
            print("NO 总结", bv)
            continue
        text = text.replace("\n## 总结\n", section + "\n## 总结\n", 1)
        # bump updated
        text = re.sub(r"^updated: \d{4}-\d{2}-\d{2}", "updated: 2026-07-08", text, count=1, flags=re.M)
        note_path.write_text(text, encoding="utf-8")
        print(f"OK {bv} +{len(bullets)} bullets -> {note_path.name}")


if __name__ == "__main__":
    main()
