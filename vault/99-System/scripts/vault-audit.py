#!/usr/bin/env python3
"""
vault-audit.py - Obsidian Vault 长期主义审计脚本

按 AGENTS.md §10 反模式清单 + §3 frontmatter 规范 + §4 tag 字典
自动扫描 vault，输出 markdown 报告。

Usage:
    python vault-audit.py [vault_path] [report_path]
    默认: vault_path = 脚本所在 vault 根，report_path = 99-System/audit-report.md
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict

# === 配置（按 AGENTS.md §4 tag 字典）===
APPROVED_TAGS_PREFIX = {
    # 主题（一级）
    "ai_agent", "ai_coding", "ai_evaluation", "ai_safety", "ai_career", "ai_philosophy",
    # 形态（二级）
    "article", "video_transcript", "podcast", "course", "moc", "notes",
    # 来源（三级）
    "zhihu", "wechat", "bilibili", "youtube", "podcast_rss",
    # 工具
    "claude_code", "codex", "cursor", "devin", "chatgpt", "claude", "openai", "anthropic",
    # 主题细分
    "harness_engineering", "memory", "multi_agent", "context_engineering",
    "skills", "hooks", "mcp", "prompting", "fde",
    # 其它允许的（基于 vault 现状）
    "agents", "resources", "humanintheloop", "harness",
    "anthropic_claude_code", "claude_code_practice", "claude_code_principles",
    "claude_code_safety", "claude_code_skills", "claude_code_architecture",
    "claude_code_test", "claude_code_cli", "claude_code_hooks",
    "ai", "ai_agent_native", "frontendagentinterview", "video", "knowledge_base",
    "obsidian", "mcp_setup", "skill_setup", "dailynote", "template",
    "web_clipping", "content_creation", "text_refinement",
    # P1.2 连字符统一后新 tag
    "loock_ai", "coding_agent", "frontend_agent_interview",
    "context_engineering", "human_in_the_loop", "ai_era",
    # 之前被误放 DISALLOWED["中文"] 的英文 tag
    "taste", "9_tips", "engineer_evaluation",
    "ai_macro", "agent_management", "ai_to_b", "ai_native", "ubi",
    # 中文 tag 英文别名（P1.2 新增）
    "workflow", "methodology", "philosophy", "psychology",
    "zen", "self_cognition", "confidence",
    "product_perspective", "classical_management",
    "hiring_interview", "intelligence_deflation",
    "career_planning", "swarm_organization", "agent_organization",
}

# 已知合法的 `[[wikilink]]` 目标（作者引用 / 概念引用 / 模板元引用）
# 既不是文件也不是目录，但属于 intentional wikilink
ALLOWED_UNMATCHED = {
    # 作者/人物
    "三元同学", "孟岩", "佳芮的创业笔记", "数字生命卡兹克", "日日皆好",
    "智能沿界", "李继刚", "柯芃丞", "特工宇宙", "花叔", "莫失莫忘",
    "魔术师卡颂", "极客公园", "CitrinResearch",
    "vault 主人", "OpenAI", "Anthropic 官方", "作者名",
    # 概念/公司/工具（intentional wikilink for future notes）
    "AI Native Company", "Agent Loop", "Agent Memory Patterns",
    "AutoResearch", "Chat vs Agent", "Claude Code", "Code Review Patterns",
    "Codex", "Context Engineering", "Deep Agents",
    "Foundation Model Training", "Harness Engineering",
    "OpenClaw", "Second Brain Patterns", "To-Do List Pattern",
    "OpenDeepResearch", "Sitor AI", "ClotChef", "Sitor",
    # 模板/元引用
    "X", "wikilink", "kb-english-chinese-translation",
    # 无 ? 版本（Obsidian 模糊匹配）：文件带 ? 但 wikilink 不带
    "80% 的 App 未来会消失吗我不这么认为",
    "Agent 越用越翻车，怎么破局答案藏在经典管理学里",
}

# 反向 tag（不允许用）
# 注意：中文 tag 按 D3 决策"保留+补英文别名"——不再在此禁止
DISALLOWED_TAGS = {
    "中文": [],  # 按 D3 决策：保留中文 + 补英文别名，不再禁止
    "连字符": ["harness-engineering", "human-in-the-loop", "AI-era",
              "human-in-the-loop"],
    "旧名": ["AI-Agent", "openaicodex", "AIera",
            "AIAgent工作流方法论Skill", "openai-codex", "agent-管理",
            "frontend-agent-interview"],
}

# frontmatter 必填字段
REQUIRED_FIELDS = ["title", "tags", "created", "source"]
RECOMMENDED_FIELDS = ["description", "author"]
IGNORED_DIRS = {".obsidian", ".agents", ".claude", ".git", ".pytest_cache", "__pycache__"}


def is_ignored_path(path):
    return any(part in IGNORED_DIRS for part in Path(path).parts)


def parse_frontmatter(content):
    """解析 YAML frontmatter（简化版，只支持简单 key: value / key: [list]）"""
    if not content.startswith("---"):
        return None
    end = content.find("\n---", 3)
    if end == -1:
        return None
    fm_block = content[3:end].strip()
    result = {}
    current_key = None
    current_list = None
    for line in fm_block.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # 检测列表项
        if line.startswith(("  - ", "    - ", "- ", "  ")) and current_key:
            item = stripped.lstrip("- ").strip()
            if item.startswith('"') and item.endswith('"'):
                item = item[1:-1]
            if item.startswith("'") and item.endswith("'"):
                item = item[1:-1]
            current_list.append(item)
            continue
        # 检测 key: value
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value == "":
                # 可能是多行列表
                current_key = key
                current_list = []
                result[key] = current_list
            elif value.startswith("[") and value.endswith("]"):
                # 内联列表
                items = [x.strip().strip('"').strip("'") for x in value[1:-1].split(",")]
                result[key] = items
                current_key = None
                current_list = None
            else:
                # 字符串值
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                if value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                result[key] = value
                current_key = None
                current_list = None
    return result


def extract_wikilinks(content):
    """提取所有 [[wikilink]]"""
    return re.findall(r"\[\[([^\]]+)\]\]", content)


def extract_filename_from_wikilink(link):
    """从 [[X]] 或 [[X|Y]] 提取目标文件名（不含路径）"""
    target = link.split("|")[0].split("#")[0].strip()
    return target


def audit_vault(vault_path):
    """执行审计，返回报告数据"""
    vault_path = Path(vault_path)
    all_md = [p for p in vault_path.rglob("*.md")
              if not is_ignored_path(p) and "audit-report.md" != p.name]

    # 1. 索引所有文件名（用于死链检测）
    filenames = {p.stem: p for p in all_md}
    rel_paths = {p.relative_to(vault_path).with_suffix("").as_posix()
                 : p for p in all_md}
    # 1.5. 索引所有目录名（目录 wikilink 合法）
    directory_names = set()
    for p in vault_path.rglob("*"):
        if p.is_dir() and not is_ignored_path(p) and ".idea" not in p.parts:
            directory_names.add(p.name)
    # 也加隐含的：文件名 root 匹配（如 "三元同学" 可能既是作者引用也可能是不存在文件）
    # 不做模糊匹配——只精确匹配目录名

    # 2. 报告数据
    no_frontmatter = []
    incomplete_frontmatter = defaultdict(list)
    bad_tags = defaultdict(list)  # file -> [(tag, reason)]
    dead_links = defaultdict(list)  # file -> [(link, target)]
    unmatched_links = defaultdict(list)  # 既不是文件也不是目录（可能作者引用或真死链）
    orphan_files = []
    bad_filenames = []
    file_to_inlinks = defaultdict(int)  # basename -> 被链入次数
    inlinks = defaultdict(list)  # basename -> [source files]

    # 3. 扫描所有文件
    for md_path in all_md:
        rel = md_path.relative_to(vault_path).as_posix()
        try:
            content = md_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"SKIP {rel}: {e}", file=sys.stderr)
            continue

        # --- frontmatter ---
        fm = parse_frontmatter(content)
        if fm is None:
            no_frontmatter.append(rel)
        else:
            for field in REQUIRED_FIELDS:
                if field not in fm or not fm[field]:
                    incomplete_frontmatter[rel].append(field)
            # tag 风格
            tags = fm.get("tags", [])
            if isinstance(tags, str):
                tags = [tags]
            for tag in tags:
                # 检查旧名（已覆盖需禁止的 tag）
                for cat, names in DISALLOWED_TAGS.items():
                    if tag in names:
                        bad_tags[rel].append((tag, f"旧名 ({cat})"))

        # --- wikilink ---
        links = extract_wikilinks(content)
        for link in links:
            target_name = extract_filename_from_wikilink(link)
            inlinks[target_name].append(rel)
            # 死链检测
            if target_name not in filenames and target_name not in rel_paths:
                if target_name in directory_names:
                    # 目录 wikilink（如 [[Loock AI]] → 目录名），合法
                    continue
                if target_name in ALLOWED_UNMATCHED:
                    # 白名单中的作者/概念/模板引用，合法
                    continue
                # 既不是文件、目录、也不是白名单——真死链或需要关注的引用
                unmatched_links[rel].append((link, target_name))

    # --- 文件名反模式 ---
    bad_name_patterns = [
        (r"：", "全角冒号"),
        (r"_/(\s|$)", "下划线替代斜杠"),
    ]
    for md_path in all_md:
        name = md_path.name
        for pat, reason in bad_name_patterns:
            if re.search(pat, name):
                bad_filenames.append((md_path.relative_to(vault_path).as_posix(), reason))

    # --- 孤岛：0 个被链入 ---
    for md_path in all_md:
        stem = md_path.stem
        inlink_count = len(inlinks.get(stem, []))
        # MOC 入口也算链接（被 MOC 链入）
        is_moc_linked = any("MOC" in s for s in inlinks.get(stem, []))
        if inlink_count == 0:
            orphan_files.append((md_path.relative_to(vault_path).as_posix(),
                                inlink_count, is_moc_linked))

    return {
        "total_files": len(all_md),
        "no_frontmatter": no_frontmatter,
        "incomplete_frontmatter": dict(incomplete_frontmatter),
        "bad_tags": dict(bad_tags),
        "unmatched_links": dict(unmatched_links),
        "orphan_files": orphan_files,
        "bad_filenames": bad_filenames,
        "inlinks": dict(inlinks),
    }


def generate_report(data, vault_path):
    """生成 markdown 报告"""
    lines = []
    lines.append("# Vault 审计报告\n")
    lines.append(f"**审计时间**：2026-06-11  ")
    lines.append(f"**审计对象**：`{vault_path}`  ")
    lines.append(f"**脚本版本**：vault-audit.py v1.0  ")
    lines.append(f"**总文件数**：{data['total_files']}\n")
    lines.append("---\n")

    # 1. 真死链或需关注的 wikilink（白名单/目录匹配已过滤）
    lines.append("## 1. 需要关注的 wikilink\n")
    lines.append("**说明**：非文件、非目录、不在白名单中的 `[[wikilink]]`。可能是真死链或需要创建对应笔记。\n\n")
    if data["unmatched_links"]:
        all_targets = set()
        for src, links in data["unmatched_links"].items():
            for link, target in links:
                all_targets.add(target)
        lines.append(f"共 {len(all_targets)} 个唯一目标，{sum(len(v) for v in data['unmatched_links'].values())} 处引用。\n")
        for target in sorted(all_targets):
            lines.append(f"- `[[{target}]]`")
    else:
        lines.append("✅ 所有 wikilink 都有匹配文件或目录\n")
    lines.append("")

    # 2. 孤岛
    lines.append("## 2. 孤岛笔记（0 个被链入）\n")
    if data["orphan_files"]:
        for path, count, is_moc in data["orphan_files"]:
            moc_mark = "（被 MOC 链入 ✓）" if is_moc else "（真孤岛）"
            lines.append(f"- `{path}` {moc_mark}")
    else:
        lines.append("✅ 无孤岛\n")
    lines.append("")

    # 3. 无 frontmatter
    lines.append("## 3. 无 frontmatter 的文件\n")
    if data["no_frontmatter"]:
        for path in data["no_frontmatter"]:
            lines.append(f"- `{path}`")
    else:
        lines.append("✅ 所有文件都有 frontmatter\n")
    lines.append("")

    # 4. frontmatter 字段缺失
    lines.append("## 4. frontmatter 必填字段缺失\n")
    if data["incomplete_frontmatter"]:
        for path, fields in data["incomplete_frontmatter"].items():
            lines.append(f"- `{path}` 缺失: {', '.join(fields)}")
    else:
        lines.append("✅ 所有文件 frontmatter 完整\n")
    lines.append("")

    # 5. tag 风格问题
    lines.append("## 5. tag 风格违规（按 §4 字典）\n")
    if data["bad_tags"]:
        for path, tags in data["bad_tags"].items():
            tag_list = ", ".join([f"`{t}` ({r})" for t, r in tags])
            lines.append(f"- `{path}`: {tag_list}")
    else:
        lines.append("✅ 所有 tag 符合字典规范\n")
    lines.append("")

    # 6. 文件名反模式
    lines.append("## 6. 文件名反模式\n")
    if data["bad_filenames"]:
        for path, reason in data["bad_filenames"]:
            lines.append(f"- `{path}` ({reason})")
    else:
        lines.append("✅ 所有文件名规范\n")
    lines.append("")

    # 7. 被链入最多的文件（Top 10）
    lines.append("## 7. 被链入最多的文件（Top 10 hub）\n")
    sorted_inlinks = sorted(data["inlinks"].items(),
                            key=lambda x: len(x[1]), reverse=True)
    for stem, sources in sorted_inlinks[:10]:
        lines.append(f"- `{stem}` ({len(sources)} 个反向链)")
    lines.append("")

    return "\n".join(lines)


def main():
    script_dir = Path(__file__).parent
    # 默认 vault 路径：脚本在 99-System/scripts/，向上 2 级才是 vault 根
    default_vault = script_dir.parent.parent
    vault_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_vault
    report_path = Path(sys.argv[2]) if len(sys.argv) > 2 \
        else vault_path / "99-System" / "audit-report.md"

    if not vault_path.exists():
        print(f"Vault path not found: {vault_path}", file=sys.stderr)
        sys.exit(1)

    # Windows GBK console 兼容
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    print(f"Auditing: {vault_path}")
    data = audit_vault(vault_path)

    report = generate_report(data, vault_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")

    # 简短 stdout 总结（用 ASCII 避免 GBK 编码问题）
    print(f"[OK] Audit complete")
    print(f"  - Total files: {data['total_files']}")
    print(f"  - Unmatched wikilinks: {sum(len(v) for v in data['unmatched_links'].values())}")
    print(f"  - Orphan files: {len(data['orphan_files'])}")
    print(f"  - No frontmatter: {len(data['no_frontmatter'])}")
    print(f"  - Incomplete FM: {len(data['incomplete_frontmatter'])}")
    print(f"  - Bad tags: {len(data['bad_tags'])}")
    print(f"  - Bad filenames: {len(data['bad_filenames'])}")
    print(f"  - Report: {report_path}")


if __name__ == "__main__":
    main()
