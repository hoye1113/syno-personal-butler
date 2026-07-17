#!/usr/bin/env python3
"""Score unmapped ASR-ready Bilibili entries for vault ingest priority."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from path_config import AUDIT_ROOT, BILI_ROOT, RECASTORY_WORKSPACE

WS = RECASTORY_WORKSPACE
VAULT = BILI_ROOT
OUT = AUDIT_ROOT / "bilibili-ingest-priority-2026-07-06.md"

# Already in vault — penalize near-duplicate angles
VAULT_KEYWORDS = [
    "codex负责人", "codex新手", "codex实战-构建全能", "openai官方-codex",
    "claude code负责人", "boris", "obsidian", "第二大脑", "数据分析师",
    "openclaw创始人", "30分钟精通openclaw", "taven", "k8s部署",
    "128个agent", "cursor副总裁", "composer模型", "cursor负责人",
    "openai员工", "上下文工程", "openai评估", "loop-agent", "manus创始人",
    "workos", "planetscale", "databricks", "deepmind团队-当数百万",
    "ibm团队-harness", "模型将吞噬harness", "5次创业者", "a16z",
    "yc论文", "snorkel", "lca-60分钟", "agent实战-完整教程", "karpathy-autoresearch",
    "alchemy cpo", "codex负责人-现场",
]

THEME_RULES: list[tuple[str, int, str]] = [
    (r"harness|ralph loop|agent工程|agent平台|sandbox|skill", 30, "harness_engineering"),
    (r"评估|eval|agenta|benchmark|低估模型", 28, "ai_evaluation"),
    (r"多agent|multi.?agent|数百万agent", 26, "multi_agent"),
    (r"上下文工程|context engineering|memory|记忆", 24, "context_engineering"),
    (r"codex", 22, "codex"),
    (r"claude code|cowork", 22, "claude_code"),
    (r"cursor", 20, "cursor"),
    (r"openai(?!官方)", 18, "openai"),
    (r"anthropic|claude团队|claude agent", 18, "anthropic"),
    (r"deepmind", 16, "deepmind"),
    (r"devin|cognition", 16, "devin"),
    (r"openclaw", 14, "openclaw"),
    (r"loop", 14, "loop_engineering"),
    (r"skill", 12, "skills"),
    (r"mcp|tool", 10, "mcp"),
]

SKIP_PATTERNS = [
    r"AI创业思路",
    r"23 个让我",
    r"9个最大的 AI创业",
    r"2026年 如何Code",
    r"Dan Koe",
    r"C\+\+之父",
    r"Cerebras.*IPO",
]


@dataclass
class Candidate:
    bv: str
    title: str
    duration: str
    batch: str
    score: int = 0
    themes: list[str] = field(default_factory=list)
    tier_guess: str = "A-dialogue"
    skip_reason: str = ""
    url: str = ""
    has_column: bool = False
    col_chars: int = 0


def title_of(entry: dict) -> str:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    p = WS / ing / "metadata.json"
    if p.exists():
        m = json.loads(p.read_text(encoding="utf-8"))
        t = m.get("title") or m.get("name") or ""
        if t:
            return t.strip()
    vd = WS / ing / "video_description.md"
    if vd.exists():
        for line in vd.read_text(encoding="utf-8").splitlines():
            if line.strip():
                return line.strip()
    return ""


def duration_of(entry: dict) -> str:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    p = WS / ing / "metadata.json"
    if p.exists():
        m = json.loads(p.read_text(encoding="utf-8"))
        return str(m.get("duration") or m.get("duration_str") or "")
    return ""


def column_info(entry: dict) -> tuple[bool, int]:
    ing = entry.get("ingest_dir", "").replace("workspace/", "")
    f = WS / ing / "column_article.md"
    if not f.exists():
        return False, 0
    text = f.read_text(encoding="utf-8")
    return True, len(text)


def has_article(entry: dict) -> bool:
    d = entry.get("workspace_dir", "")
    return (WS / d / "article.md").exists() if d else False


def guess_tier(title: str, entry: dict) -> str:
    t = title.lower()
    if re.search(r"教程|完整教程|95%|新手|30分钟掌握|100分钟", title):
        return "A-lecture"
    if re.search(r"实战：|演示|walkthrough", title) and not re.search(
        r"ceo|负责人|团队|之父|主管|专家", title
    ):
        return "A-lecture"
    return "A-dialogue"


def score_candidate(entry: dict) -> Candidate:
    title = title_of(entry)
    c = Candidate(
        bv=entry["bv"],
        title=title,
        duration=duration_of(entry),
        batch=entry.get("batch", ""),
        url=entry.get("source_url", f"https://www.bilibili.com/video/{entry['bv']}/"),
        has_column=column_info(entry)[0],
        col_chars=column_info(entry)[1],
        tier_guess=guess_tier(title, entry),
    )
    tl = title.lower().replace("#", "").strip()

    for pat in SKIP_PATTERNS:
        if re.search(pat, title, re.I):
            c.skip_reason = f"低优先级形态: {pat}"
            c.score = -100
            return c

    for vk in VAULT_KEYWORDS:
        if vk in tl.replace(" ", ""):
            c.skip_reason = f"与 vault 32 篇角度重叠: {vk}"
            c.score = -50
            return c

    # duplicate-prone subtitles
    dup_checks = [
        (r"第二大脑", "已有 Claude Code+Obsidian 第二大脑"),
        (r"codex.*新手|新手.*codex", "已有 OpenAI Codex 新手教程"),
        (r"openclaw", "OpenClaw 已收 3+1 篇"),
    ]
    for pat, reason in dup_checks:
        if re.search(pat, title, re.I):
            c.skip_reason = reason
            c.score = -40
            return c

    for pat, pts, theme in THEME_RULES:
        if re.search(pat, title, re.I):
            c.score += pts
            if theme not in c.themes:
                c.themes.append(theme)

    # boost signals
    if re.search(r"负责人|CEO|CPO|之父|联创|团队|专家|主管", title):
        c.score += 12
    if c.has_column and c.col_chars >= 3000:
        c.score += 40
        c.tier_guess = "S"
    elif c.has_column:
        c.score += 15

    # long interview spot-check candidate
    if re.search(r"\d{2,}:\d{2}", c.duration) or (c.duration.isdigit() and int(c.duration or 0) > 2700):
        c.score += 5

    return c


def main() -> None:
    manifest = json.loads((WS / "bilibili/manifest.json").read_text(encoding="utf-8"))
    ready = [
        e
        for e in manifest["entries"]
        if not e.get("vault_path") and e.get("asr_status") == "asr_ready" and has_article(e)
    ]
    scored = [score_candidate(e) for e in ready]
    pool = [c for c in scored if c.score > 0]
    pool.sort(key=lambda x: (-x.score, x.title))
    skipped = [c for c in scored if c.score <= 0]

    p0 = pool[:15]
    p1 = pool[15:35]

    lines = [
        "---",
        "title: B站下一批收录优先级",
        "created: 2026-07-06",
        "tags: [audit, bilibili]",
        "description: 从 Recastory 175 条 ASR 就绪中筛出 P0/P1 收录清单",
        "---",
        "",
        "# B站下一批收录优先级（2026-07-06）",
        "",
        "> 数据源：`Recastory/workspace/bilibili/manifest.json`",
        "> 方法：主题加权（Harness/Eval/Multi-Agent/Codex/Claude Code）+ 去重 vault 32 篇 + 排除创业清单类",
        "",
        "## 汇总",
        "",
        f"| 池子 | 数量 |",
        f"|------|------|",
        f"| ASR 就绪未收录 | {len(ready)} |",
        f"| 评分 >0（可收录候选） | {len(pool)} |",
        f"| 排除/降权 | {len(skipped)} |",
        f"| **P0 建议首批** | **{len(p0)}** |",
        f"| P1 第二批 | {len(p1)} |",
        "",
        "## P0 首批收录（15）",
        "",
        "| # | BV | 预估轨 | 主题 | 标题 |",
        "|---|-----|--------|------|------|",
    ]
    for i, c in enumerate(p0, 1):
        themes = ", ".join(c.themes[:3]) or "ai_agent"
        short = c.title.replace("|", "/")[:55]
        lines.append(f"| {i} | [{c.bv}]({c.url}) | {c.tier_guess} | {themes} | {short} |")

    lines += [
        "",
        "## P1 第二批（20）",
        "",
        "| # | BV | 预估轨 | score | 标题 |",
        "|---|-----|--------|-------|------|",
    ]
    for i, c in enumerate(p1, 1):
        short = c.title.replace("|", "/")[:60]
        lines.append(f"| {i} | {c.bv} | {c.tier_guess} | {c.score} | {short} |")

    lines += [
        "",
        "## 收录口令（每 BV）",
        "",
        "```bash",
        "# Recastory 仓（已 ingest 可跳过 backfill）",
        "python 99-System/scripts/bilibili-ingest-reconcile.py  # 对新 BV 需先写入 manifest vault_path",
        "# vault 侧",
        "# → ASR 分轨 SUBDOC → write dialogue 或九段 → gap-check",
        "python 99-System/scripts/bilibili-v3-gap-check.py",
        "```",
        "",
        "## 已排除样例（勿重复收录）",
        "",
    ]
    for c in skipped[:12]:
        if c.skip_reason:
            lines.append(f"- {c.bv}：{c.skip_reason} — {c.title[:50]}")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"WROTE {OUT}")
    print(f"P0={len(p0)} P1={len(p1)} pool={len(pool)} skipped={len(skipped)}")
    for c in p0:
        print(f"  {c.bv} [{c.score}] {c.tier_guess} | {c.title[:70]}")


if __name__ == "__main__":
    main()
