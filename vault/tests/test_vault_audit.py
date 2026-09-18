import importlib.util
import tempfile
import unittest
from pathlib import Path


def load_vault_audit_module():
    # 通过文件路径动态加载脚本，避免受文件名里连字符影响。
    module_path = Path(__file__).resolve().parents[1] / "99-System" / "scripts" / "vault-audit.py"
    spec = importlib.util.spec_from_file_location("vault_audit", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class VaultAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 测试类只加载一次脚本，减少重复初始化开销。
        cls.module = load_vault_audit_module()

    def test_parse_frontmatter_supports_multiline_lists(self):
        # 用多行 YAML 列表验证 frontmatter 解析的核心路径。
        content = """---
title: "测试笔记"
tags:
  - ai_agent
  - article
created: 2026-07-06
source: https://example.com
author:
  - "[[作者甲]]"
  - "[[作者乙]]"
---

正文
"""

        parsed = self.module.parse_frontmatter(content)

        self.assertEqual(parsed["title"], "测试笔记")
        self.assertEqual(parsed["tags"], ["ai_agent", "article"])
        self.assertEqual(parsed["author"], ["[[作者甲]]", "[[作者乙]]"])

    def test_audit_vault_reports_core_issues_and_ignores_obsidian_dir(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            vault_root = Path(temp_dir)

            # 构造最小 vault 目录，覆盖 frontmatter、坏 tag、死链和 orphan 判定。
            (vault_root / ".obsidian").mkdir()
            (vault_root / ".agents" / "skills" / "adapter").mkdir(parents=True)
            (vault_root / "notes").mkdir()

            (vault_root / ".obsidian" / "ignored.md").write_text("# ignored", encoding="utf-8")
            (vault_root / ".agents" / "skills" / "adapter" / "SKILL.md").write_text(
                "# platform adapter", encoding="utf-8"
            )

            (vault_root / "notes" / "Topic.md").write_text(
                """---
title: "Topic"
tags: [ai_agent, notes]
created: 2026-07-06
source: https://example.com/topic
---

正文
""",
                encoding="utf-8",
            )

            (vault_root / "notes" / "MOC - Topic.md").write_text(
                """---
title: "MOC - Topic"
tags: [ai_agent, moc]
created: 2026-07-06
source: https://example.com/moc
---

- [[Topic]]
""",
                encoding="utf-8",
            )

            (vault_root / "notes" / "Broken.md").write_text(
                """---
title: "Broken"
tags: [AI-Agent]
created: 2026-07-06
source: https://example.com/broken
---

引用 [[Missing Note]]
""",
                encoding="utf-8",
            )

            (vault_root / "notes" / "NoFrontmatter.md").write_text(
                "这里只是普通正文\n",
                encoding="utf-8",
            )

            audit_data = self.module.audit_vault(vault_root)

            # .obsidian 下的文件不应进入审计统计。
            self.assertEqual(audit_data["total_files"], 4)
            self.assertIn("notes/NoFrontmatter.md", audit_data["no_frontmatter"])
            self.assertIn("notes/Broken.md", audit_data["bad_tags"])
            self.assertEqual(
                audit_data["bad_tags"]["notes/Broken.md"][0][0],
                "AI-Agent",
            )
            self.assertIn("notes/Broken.md", audit_data["unmatched_links"])
            self.assertEqual(
                audit_data["unmatched_links"]["notes/Broken.md"][0][1],
                "Missing Note",
            )

            orphan_paths = {path for path, _, _ in audit_data["orphan_files"]}
            # 被 MOC 链入的 Topic 不应再被当作孤岛。
            self.assertNotIn("notes/Topic.md", orphan_paths)
            # 没有任何入链的普通笔记仍应保留为孤岛。
            self.assertIn("notes/NoFrontmatter.md", orphan_paths)


if __name__ == "__main__":
    unittest.main()
