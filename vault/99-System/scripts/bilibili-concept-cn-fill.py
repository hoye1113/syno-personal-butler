#!/usr/bin/env python3
"""Fill empty 中文 column in ## 关键概念 tables (| — | EN | 白话 |).

Sources (priority):
  1. Paired *对谈稿.md 本章概念 tables
  2. All dialogue concept tables (global EN→中文 map)
  3. Built-in glossary
  4. Heuristic from 白话 (leading Chinese phrase)

Usage:
  python bilibili-concept-cn-fill.py --dry-run
  python bilibili-concept-cn-fill.py --apply
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from path_config import BILI_ROOT

VAULT = BILI_ROOT

GLOSSARY: dict[str, str] = {
    "codex": "Codex 智能体",
    "agentic thread": "智能体线程",
    "elder review": "双智能体审查",
    "cron automation": "定时自动化",
    "tone examples": "语气样例",
    "computer use": "电脑操控",
    "human responsibility": "人类责任",
    "vibe coding": "氛围感编程",
    "skill from workflow": "工作流技能",
    "ambient intelligence": "无感智能",
    "harness": "Harness 工程",
    "guardrails": "护栏",
    "skill chain": "技能链",
    "skill": "技能",
    "skills": "技能",
    "mcp": "MCP 协议",
    "grpo": "GRPO 强化学习",
    "rl": "强化学习",
    "eval": "评估",
    "benchmark": "基准测试",
    "context engineering": "上下文工程",
    "memory": "记忆",
    "compaction": "上下文压缩",
    "orchestration": "编排",
    "observability": "可观测性",
    "deflection rate": "自助解决率",
    "trace": "追踪链路",
    "golden dataset": "黄金数据集",
    "llm-as-judge": "LLM 评判",
    "behavioral eval": "行为评估",
    "thinking mode": "思考模式",
    "subagent": "子智能体",
    "tailscale": "Tailscale 组网",
    "read > write": "读优于写",
    "plugin": "插件",
    "connector": "连接器",
    "cron": "定时任务",
    "scheduled task": "定时任务",
    "alignment research": "对齐研究",
    "long-horizon task": "长程任务",
    "chief of staff workflow": "幕僚长工作流",
    "prompt engineering": "提示词工程",
    "tokenmaxxing": "Token 最大化",
    "composer": "Composer 模型",
    "mid-training": "中期训练",
    "sim/online rl": "仿真与在线 RL",
    "judge": "评判智能体",
    "swarm": "蜂群协作",
    "grounding": "接地",
    "gen media": "生成式媒体",
    "secret ref": "密钥引用",
    "baseline image": "基线镜像",
    "podman": "Podman 容器",
    "kubernetes": "Kubernetes",
    "openclaw": "OpenClaw",
    "agents.md": "AGENTS.md",
    "fde": "前线部署工程师",
    "self-play rl": "自我对弈 RL",
    "stream rag": "流式 RAG",
    "tool discipline": "工具纪律",
    "rubrics": "评分量规",
    "five pillars": "五大支柱",
    "living eval dataset": "活评估数据集",
    "week 7 model selection": "第七周选型",
    "agent bricks": "Agent Bricks",
    "ai-native org": "AI 原生组织",
    "brain": "组织大脑",
    "people + agents + context": "人+智能体+上下文",
    "hitl": "人在回路",
    "agent loop": "智能体循环",
    "stlc": "软件测试生命周期",
    "async": "异步训练",
    "rate limit": "速率限制",
    "switching cost": "切换成本",
    "monorepo": "单仓 monorepo",
    "schema rewind": "Schema 回滚",
    "small sharp tools": "小而精工具",
    "burst/trim/compact/summarize": "突发/裁剪/压缩/摘要",
    "action space": "动作空间",
    "autoresearch": "AutoResearch",
    "multi-agent": "多智能体",
    "delegation": "委派",
    "observe-think-act": "观察-思考-行动",
    "snowflake mcp": "Snowflake MCP",
    "linear": "Linear 工单",
    "snapcat": "Snapcat 视觉 UI",
    "feature flag": "功能开关",
    "retro review": "追溯审查",
    "pr": "Pull Request",
    "pull request": "Pull Request",
}


def norm_key(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def harvest_dialogue_terms(vault: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for path in vault.rglob("*对谈稿*.md"):
        text = path.read_text(encoding="utf-8")
        for block in re.findall(
            r"\| 中文 \| 英文 \| 白话 \|\n\|[-| ]+\|\n((?:\|[^\n]+\|\n)+)",
            text,
        ):
            for row in block.strip().splitlines():
                parts = [p.strip() for p in row.strip("|").split("|")]
                if len(parts) < 3:
                    continue
                zh, en, _ = parts[0], parts[1], parts[2]
                if not zh or zh == "—":
                    continue
                for key in re.split(r"\s*/\s*", en):
                    key = key.strip()
                    if key and key != "—":
                        mapping[norm_key(key)] = zh
    return mapping


def heuristic_zh(en: str, gloss: str) -> str:
    gloss = (gloss or "").strip()
    # gloss starts with Chinese
    m = re.match(r"^([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9·\-/（）()]{0,14})", gloss)
    if m:
        label = m.group(1).strip("：:，,；; ")
        if len(label) >= 2:
            return label
    # gloss has Chinese before colon
    m = re.match(r"^(.{2,12}?)[：:]", gloss)
    if m and re.search(r"[\u4e00-\u9fff]", m.group(1)):
        return m.group(1).strip()
    # translate common EN patterns
    en_l = en.lower().strip()
    if en_l in GLOSSARY:
        return GLOSSARY[en_l]
    for key, zh in GLOSSARY.items():
        if key in en_l or en_l in key:
            return zh
    # title-case words → short label
    words = re.findall(r"[A-Za-z]+", en)
    if len(words) == 1:
        w = words[0]
        if w.isupper() or len(w) <= 5:
            return en  # keep acronym as display when no gloss hint
    if len(words) >= 2:
        # e.g. "Five Pillars" → use glossary or compose
        joined = " ".join(words).lower()
        if joined in GLOSSARY:
            return GLOSSARY[joined]
    # last resort: use EN if it's a product name, else generic
    if re.match(r"^[A-Z][a-z]+(?: [A-Z][a-z]+)*$", en.strip()):
        return en.strip()
    return en.strip()


def lookup_zh(en: str, gloss: str, mapping: dict[str, str]) -> str:
    en = en.strip()
    if not en or en == "—":
        return "—"
    for part in re.split(r"\s*/\s*", en):
        part = part.strip()
        k = norm_key(part)
        if k in mapping:
            return mapping[k]
    k = norm_key(en)
    if k in mapping:
        return mapping[k]
    if k in GLOSSARY:
        return GLOSSARY[k]
    return heuristic_zh(en, gloss)


def fill_concept_table(body: str, mapping: dict[str, str]) -> tuple[str, int]:
    changes = 0

    def repl_row(m: re.Match) -> str:
        nonlocal changes
        en, gloss = m.group(1).strip(), m.group(2).strip()
        new_zh = lookup_zh(en, gloss, mapping)
        if new_zh and new_zh != "—":
            changes += 1
            return f"| {new_zh} | {en} | {gloss} |"
        return m.group(0)

    # only inside ## 关键概念 sections
    def repl_section(m: re.Match) -> str:
        header, table = m.group(1), m.group(2)
        new_table = re.sub(
            r"^\| — \| ([^|]+) \| ([^|]+) \|$",
            repl_row,
            table,
            flags=re.MULTILINE,
        )
        return header + new_table

    pattern = re.compile(
        r"(## 关键概念[^\n]*\n\n)((?:\|[^\n]+\|\n)+)",
        re.MULTILINE,
    )
    new_body = pattern.sub(repl_section, body)
    return new_body, changes


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true", default=True)
    args = ap.parse_args()
    apply = args.apply

    mapping = harvest_dialogue_terms(VAULT)
    print(f"DIALOGUE_TERMS {len(mapping)}")

    total_files = 0
    total_changes = 0
    remaining = 0

    for path in sorted(VAULT.rglob("*.md")):
        if "对谈稿" in path.name:
            continue
        text = path.read_text(encoding="utf-8")
        if "| — |" not in text or "## 关键概念" not in text:
            continue
        new_text, n = fill_concept_table(text, mapping)
        dash_before = text.count("| — |")
        dash_after = new_text.count("| — |")
        if n:
            total_files += 1
            total_changes += n
            remaining += dash_after
            print(f"{'APPLY' if apply else 'DRY'} {path.name}: {n} rows, dash left {dash_after}")
            if apply:
                path.write_text(new_text, encoding="utf-8")
        elif dash_before:
            remaining += dash_before
            print(f"SKIP {path.name}: {dash_before} dash rows unresolved")

    print(f"FILES_CHANGED {total_files}")
    print(f"ROWS_FILLED {total_changes}")
    print(f"DASH_REMAINING {remaining}")


if __name__ == "__main__":
    main()
