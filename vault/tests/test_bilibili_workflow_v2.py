import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_script(name: str):
    path = ROOT / "99-System" / "scripts" / name
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class BilibiliInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = load_script("bilibili-source-inventory.py")

    def test_discovers_transcript_at_bv_root_and_enrichment_under_ingest(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            bv_dir = workspace / "bilibili-retranscribe" / "BVTEST001"
            ingest = bv_dir / "ingest"
            ingest.mkdir(parents=True)
            (bv_dir / "article.md").write_text(
                "---\nduration: 58:54\nspeakers: 2\n---\n### [00:00] Speaker 1\nQ\n### [00:10] Speaker 2\nA",
                encoding="utf-8",
            )
            (bv_dir / "transcript.json").write_text("{}", encoding="utf-8")
            (ingest / "metadata.json").write_text(
                json.dumps({"video": {"title": "测试视频", "duration": 3534}}, ensure_ascii=False),
                encoding="utf-8",
            )
            (ingest / "video_description.md").write_text(
                "# 测试视频\n内容 [01:20]", encoding="utf-8"
            )
            (ingest / "column_article.md").write_text("# 专栏\n" + "正文" * 1800, encoding="utf-8")

            item = self.inventory.discover_bv(bv_dir, workspace, {})

            self.assertEqual(item["bv"], "BVTEST001")
            self.assertTrue(item["files"]["transcript_markdown"].endswith("BVTEST001/article.md"))
            self.assertTrue(item["files"]["column"].endswith("BVTEST001/ingest/column_article.md"))
            self.assertEqual(item["speaker_count"], 2)
            self.assertTrue(item["has_speaker_labels"])
            self.assertTrue(item["description_has_timestamps"])
            self.assertEqual(item["source_completeness"], "complete")

    def test_marks_missing_transcript_as_insufficient(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            bv_dir = workspace / "bilibili-retranscribe" / "BVTEST002"
            ingest = bv_dir / "ingest"
            ingest.mkdir(parents=True)
            (ingest / "metadata.json").write_text("{}", encoding="utf-8")
            (ingest / "video_description.md").write_text("# 只有简介", encoding="utf-8")

            item = self.inventory.discover_bv(bv_dir, workspace, {})

            self.assertEqual(item["source_completeness"], "insufficient")
            self.assertIn("missing transcript", item["warnings"])


class BilibiliNoteValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = load_script("bilibili-note-validate.py")

    def test_accepts_dual_axis_lecture_with_no_dialogue(self):
        text = """---
title: "教程"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: https://www.bilibili.com/video/BVTEST003/
description: "测试"
material_tier: A
content_form: lecture
dialogue_fidelity: none
question_source: none
transcript_source: source/article.md
---
正文

## 相关阅读
- [[相关笔记]]
"""
        result = self.validator.validate_note_text(text, known_paths={"source/article.md"})
        self.assertEqual(result["status"], "complete")
        self.assertEqual(result["errors"], [])

    def test_reconstructed_dialogue_requires_editorial_question_source(self):
        text = """---
title: "演讲改写"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: https://www.bilibili.com/video/BVTEST004/
description: "测试"
material_tier: A
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: transcript
transcript_source: source/article.md
---
## 相关阅读
- [[相关笔记]]
"""
        result = self.validator.validate_note_text(text, known_paths={"source/article.md"})
        self.assertIn("reconstructed dialogue must use question_source: editorial", result["errors"])

    def test_long_video_requires_spot_check(self):
        text = """---
title: "长视频"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: https://www.bilibili.com/video/BVTEST005/
description: "测试"
duration: 58:54
material_tier: A
content_form: lecture
dialogue_fidelity: none
question_source: none
transcript_source: source/article.md
---
## 相关阅读
- [[相关笔记]]
"""
        result = self.validator.validate_note_text(text, known_paths={"source/article.md"})
        self.assertIn("videos >=45 minutes require spot_check", result["errors"])

    def test_file_validation_rejects_duplicate_bv_and_dialogue_sibling(self):
        with tempfile.TemporaryDirectory() as tmp:
            vault = Path(tmp)
            note = vault / "Topic.md"
            duplicate = vault / "Other.md"
            dialogue = vault / "Topic - 对谈稿.md"
            base = """---
title: "{title}"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: https://www.bilibili.com/video/BVDUP001/
description: "测试"
material_tier: A
content_form: lecture
dialogue_fidelity: none
question_source: none
transcript_source: source/article.md
---
## 相关阅读
- [[相关笔记]]
"""
            note.write_text(base.format(title="Topic"), encoding="utf-8")
            duplicate.write_text(base.format(title="Other"), encoding="utf-8")
            dialogue.write_text("---\ntitle: Topic - 对谈稿\n---", encoding="utf-8")

            result = self.validator.validate_note_file(
                note, vault_root=vault, known_paths={"source/article.md"}
            )

            self.assertIn("duplicate BV/source found in Other.md", result["errors"])
            self.assertIn("canonical note has a - 对谈稿 sibling", result["errors"])


class AgentAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.checker = load_script("agent-contract-check.py")

    def test_repository_agent_contracts_are_connected(self):
        result = self.checker.check_repository(ROOT)
        self.assertEqual(result["errors"], [])

    def test_repository_has_no_obsidian_mcp_configuration(self):
        result = self.checker.check_repository(ROOT)
        self.assertNotIn("Obsidian MCP configuration is present", result["errors"])
        self.assertFalse((ROOT / "opencode.json").exists())
        self.assertFalse((ROOT / "skill-collection" / "maps" / "obsidian-mcp-setup.md").exists())


if __name__ == "__main__":
    unittest.main()
