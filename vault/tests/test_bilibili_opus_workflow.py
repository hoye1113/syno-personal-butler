import importlib.util
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


BASE = """---
title: "{title}"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: "https://www.bilibili.com/opus/{opus}"
description: "测试专栏"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/{opus}"
opus_id: "{opus}"
column_id: "{column}"
video_url: "https://www.bilibili.com/video/{bv}/"
bv: "{bv}"
uploader: "Easonlee的AI笔记"
ingest_workflow: bilibili_opus_ingest_v2
source_tier: {source_tier}
primary_source: column
material_tier: {material_tier}
source_form: {source_form}
content_form: {form}
dialogue_fidelity: {fidelity}
question_source: {question_source}
voice_basis: {voice_basis}
factual_status: {factual_status}
factual_reviewed: 2026-07-13
verification_scope: {verification_scope}
verification_basis:
  - column
{extra}---
# {title}

> 人物、主题、核心问题和阅读导航。
>
> **核心主张：机制理解先于结论复述，专栏的价值在于讲清机制。**

> 金句样板一句，供锁定模板校验。
> ——讲者

## 开场

**编者问：** 为什么这个问题值得讨论？

**讲者：** 因为它影响 Agent 的实际工作方式。

## 01 为什么机制比结论重要？

**核心判断：机制决定结论的适用边界，先看机制再看结论。**

**编者问：** 核心机制是什么？

**讲者：** 机制和案例共同支撑判断。

## 限制与边界

该判断只适用于素材描述的场景。

## 知识连接

- **支持** [[相关笔记]]：为同一机制提供了新的案例。

## 来源说明

正文依据 B 站图文专栏整理，图片与转写均未读取。
"""


class OpusWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_script("bilibili-opus-validate.py")

    def note(self, **overrides):
        values = dict(
            title="专栏测试", opus="1224198797632995337", column="cv51417405",
            bv="BV1U4Tz6CEzu", source_tier="C1", material_tier="S",
            source_form="lecture", form="dialogue", fidelity="reconstructed",
            question_source="editorial", voice_basis="direct_speech",
            factual_status="verified", verification_scope="column_only", extra="",
        )
        values.update(overrides)
        return BASE.format(**values)

    def test_complete_opus_is_c1(self):
        self.assertEqual(self.module.classify_source(True, True, True, True), "C1")

    def test_incomplete_opus_is_c2(self):
        self.assertEqual(self.module.classify_source(True, True, False, True), "C2")

    def test_c2_may_lack_bv_mapping_with_warning(self):
        result = self.module.validate_note_text(self.note(
            source_tier="C2", bv="", factual_status="partial",
            extra="unresolved_facts:\n  - BV 映射待确认\n",
        ))
        self.assertEqual(result["status"], "complete", result["errors"])
        self.assertIn("C2 source has no BV mapping; disclose it as unresolved", result["warnings"])

    def test_c1_requires_bv_mapping(self):
        result = self.module.validate_note_text(self.note(bv=""))
        self.assertIn("C1 source requires a BV mapping", result["errors"])

    def test_cv_only_source_is_allowed(self):
        text = self.note(opus="").replace(
            'source_url: "https://www.bilibili.com/opus/"',
            'source_url: "https://www.bilibili.com/read/cv51417405/"',
        )
        result = self.module.validate_note_text(text)
        self.assertEqual(result["status"], "complete", result["errors"])

    def test_v2_requires_opus_or_cv_source_url(self):
        text = self.note().replace(
            'source_url: "https://www.bilibili.com/opus/1224198797632995337"',
            'source_url: "https://example.com/not-bilibili"',
        )
        result = self.module.validate_note_text(text)
        self.assertIn("source_url must be a Bilibili opus or cv URL", result["errors"])

    def test_declared_workflow_must_be_v2(self):
        text = self.note().replace("bilibili_opus_ingest_v2", "bilibili_opus_ingest_v9")
        result = self.module.validate_note_text(text)
        self.assertIn("ingest_workflow must be bilibili_opus_ingest_v2 when declared", result["errors"])

    def test_c2_without_bv_cannot_be_verified(self):
        result = self.module.validate_note_text(self.note(source_tier="C2", bv=""))
        self.assertIn("C2 source without BV mapping cannot be verified", result["errors"])

    def test_source_lecture_is_detected_independently_from_presentation(self):
        body = "## 主题演讲\n机制说明\n## 现场问答\n观众提问：如何落地？"
        self.assertEqual(self.module.classify_form(body), "lecture")

    def test_dialogue_and_roundtable_classification(self):
        self.assertEqual(self.module.classify_form("主持人：为什么？\n嘉宾：因为机制。\n主持人：限制呢？\n嘉宾：边界。"), "dialogue")
        self.assertEqual(self.module.classify_form("甲：观点一\n乙：回应\n丙：另一种限制\n乙：补充"), "roundtable")

    def test_unknown_question_is_normalized(self):
        self.assertNotIn("unknown：", self.module.normalize_column_text("unknown：如何评估？"))
        self.assertIn("现场提问：", self.module.normalize_column_text("unknown：如何评估？"))

    def test_noise_and_images_are_removed(self):
        text = "摘要\n核心结论\n重点速览\n核心结论\n关注UP主\n![图](x.png)\n机制"
        cleaned = self.module.normalize_column_text(text)
        self.assertEqual(cleaned.count("核心结论"), 1)
        self.assertNotIn("关注UP主", cleaned)
        self.assertNotIn("![图]", cleaned)

    def test_v2_column_note_needs_no_transcript_or_spot_check(self):
        result = self.module.validate_note_text(self.note())
        self.assertEqual(result["status"], "complete")
        self.assertFalse(any("transcript" in e.lower() or "spot_check" in e for e in result["errors"]))
        self.assertEqual(result["workflow"], "bilibili_opus_ingest_v2")
        self.assertEqual(result["sources_skipped"], ["images", "transcript", "recastory"])

    def test_s_source_dialogue_uses_source_column(self):
        result = self.module.validate_note_text(self.note(
            source_form="dialogue", form="dialogue", fidelity="source",
            question_source="column", voice_basis="direct_speech",
        ))
        self.assertEqual(result["status"], "complete", result["errors"])

    def test_s_source_lecture_requires_reconstructed_editorial(self):
        result = self.module.validate_note_text(self.note(form="lecture", fidelity="none", question_source="none"))
        self.assertIn("S source lecture must publish as reconstructed/editorial dialogue", result["errors"])

    def test_s_roundtable_uses_source_column(self):
        result = self.module.validate_note_text(self.note(
            source_form="roundtable", form="roundtable", fidelity="source",
            question_source="column", voice_basis="direct_speech",
        ))
        self.assertEqual(result["status"], "complete", result["errors"])

    def test_a_lecture_may_remain_lecture(self):
        result = self.module.validate_note_text(self.note(
            material_tier="A", source_form="lecture", form="lecture",
            fidelity="none", question_source="none", voice_basis="attributed_paraphrase",
        ))
        self.assertEqual(result["status"], "complete", result["errors"])

    def test_b_material_cannot_use_reconstructed_persona(self):
        result = self.module.validate_note_text(self.note(material_tier="B"))
        self.assertIn("B material must not use reconstructed dialogue", result["errors"])

    def test_v2_source_dialogue_rejects_transcript_question_source(self):
        result = self.module.validate_note_text(self.note(
            source_form="dialogue", fidelity="source", question_source="transcript"
        ))
        self.assertIn("source dialogue/roundtable must use question_source: column", result["errors"])

    def test_verified_rejects_unresolved(self):
        result = self.module.validate_note_text(self.note(extra="unresolved_facts:\n  - 人名待核\n"))
        self.assertIn("verified notes cannot contain unresolved_facts", result["errors"])

    def test_basis_is_limited_to_sources_read(self):
        text = self.note().replace("  - column", "  - column\n  - transcript")
        result = self.module.validate_note_text(text, sources_read={"column"})
        self.assertIn("verification_basis contains unread source: transcript", result["errors"])

    def test_column_only_scope_rejects_non_column_basis(self):
        text = self.note().replace("  - column", "  - column\n  - original_page")
        result = self.module.validate_note_text(text, sources_read={"column", "original_page"})
        self.assertIn("column_only verification_basis may only contain column", result["errors"])

    def test_s_note_requires_typed_relation_or_orphan(self):
        result = self.module.validate_note_text(self.note().replace(
            "- **支持** [[相关笔记]]：为同一机制提供了新的案例。", "- [[相关笔记]]"
        ))
        self.assertIn("S notes require a typed knowledge relation or status: orphan", result["errors"])

    def test_s_note_requires_limits_and_knowledge_sections(self):
        text = self.note().replace("## 限制与边界", "## 适用情况").replace("## 知识连接", "## 相关阅读")
        result = self.module.validate_note_text(text)
        self.assertIn("S notes require section: 限制与边界", result["errors"])
        self.assertIn("S notes require section: 知识连接", result["errors"])

    def test_invalid_relation_label_fails(self):
        text = self.note().replace("**支持**", "**相似**")
        result = self.module.validate_note_text(text)
        self.assertIn("knowledge links must use an allowed typed relation", result["errors"])

    def test_locked_gate_requires_chapter_core_judgment(self):
        text = self.note().replace("**核心判断：机制决定结论的适用边界，先看机制再看结论。**\n\n", "")
        result = self.module.validate_note_text(text)
        self.assertIn(
            "S notes require 核心判断 at the start of chapter: 01 为什么机制比结论重要？",
            result["errors"],
        )

    def test_locked_gate_requires_leading_claim(self):
        text = self.note().replace(">\n> **核心主张：机制理解先于结论复述，专栏的价值在于讲清机制。**\n", "")
        result = self.module.validate_note_text(text)
        self.assertIn("S notes require a 核心主张 line in the leading blockquote", result["errors"])

    def test_locked_gate_requires_pull_quote(self):
        text = self.note().replace("> 金句样板一句，供锁定模板校验。\n> ——讲者\n", "")
        result = self.module.validate_note_text(text)
        self.assertIn("S notes require a pull-quote attribution line (> ——姓名)", result["errors"])

    def test_locked_gate_duplicate_pull_quote_only_warns(self):
        text = self.note() + "\n> 又一金句。\n> ——另一位\n"
        result = self.module.validate_note_text(text)
        self.assertEqual(result["status"], "complete", result["errors"])
        self.assertTrue(any("pull-quote should be unique" in w for w in result["warnings"]))

    def test_locked_gate_container_judges_children_not_container(self):
        container = (
            "## 对话实录\n\n"
            "### 合规子节\n\n**核心判断：子节已前置判断。**\n\n问答。\n\n"
            "### 缺标记子节\n\n**讲者：** 没有前置判断。\n\n"
        )
        text = self.note().replace("## 限制与边界", container + "## 限制与边界")
        result = self.module.validate_note_text(text)
        self.assertIn("S notes require 核心判断 at the start of chapter: 缺标记子节", result["errors"])
        self.assertFalse(any("对话实录" in e for e in result["errors"]))

    def test_locked_gate_flat_section_cannot_pass_vacuously(self):
        flat = "## 核心对话\n\n**讲者：** 没有任何前置判断。\n\n"
        text = self.note().replace("## 限制与边界", flat + "## 限制与边界")
        result = self.module.validate_note_text(text)
        self.assertIn("S notes require 核心判断 at the start of chapter: 核心对话", result["errors"])

    def test_locked_gate_meta_sections_are_exempt(self):
        result = self.module.validate_note_text(self.note())
        self.assertTrue(result["checks"]["locked_layout"])
        self.assertFalse(any("开场" in e or "来源说明" in e for e in result["errors"]))

    def test_locked_gate_skips_non_s_material(self):
        text = self.note(
            material_tier="A", source_form="lecture", form="lecture",
            fidelity="none", question_source="none", voice_basis="attributed_paraphrase",
        ).replace(
            "**核心判断：机制决定结论的适用边界，先看机制再看结论。**\n\n", ""
        ).replace(
            "> 金句样板一句，供锁定模板校验。\n> ——讲者\n", ""
        )
        result = self.module.validate_note_text(text)
        self.assertEqual(result["status"], "complete", result["errors"])
        self.assertIsNone(result["checks"]["locked_layout"])

    def test_rejects_moderator_and_unknown_labels(self):
        result = self.module.validate_note_text(self.note() + "\nModerator：问题\nunknown：追问\n")
        self.assertIn("column notes must not contain Moderator or unknown speaker labels", result["errors"])

    def test_reconstructed_dialogue_requires_editor_label(self):
        text = self.note().replace("**编者问：**", "**主持人：**")
        result = self.module.validate_note_text(text)
        self.assertIn("reconstructed dialogue must label editorial questions as 编者问", result["errors"])

    def test_editorial_summary_must_use_column_summary_role(self):
        text = self.note(voice_basis="editorial_summary").replace("**讲者：**", "**某位嘉宾：**")
        result = self.module.validate_note_text(text)
        self.assertIn("editorial_summary answers must use 专栏整理", result["errors"])

    def test_v2_rejects_legacy_source_fields(self):
        result = self.module.validate_note_text(self.note(extra="transcript_source: legacy/article.md\n"))
        self.assertIn("v2 opus notes must not declare legacy field: transcript_source", result["errors"])

    def test_duplicate_bv_opus_or_column_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            area = root / "02-Resources"
            area.mkdir()
            first = area / "first.md"
            second = area / "second.md"
            first.write_text(self.note(), encoding="utf-8")
            second.write_text(self.note(title="重复"), encoding="utf-8")
            result = self.module.validate_note_file(second, root)
            self.assertTrue(any("duplicate" in e for e in result["errors"]))

    def test_duplicate_source_url_is_rejected_even_when_ids_differ(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            area = root / "02-Resources"
            area.mkdir()
            first = area / "first.md"
            second = area / "second.md"
            first.write_text(self.note(), encoding="utf-8")
            duplicate_url = self.note(
                title="相同来源", opus="1224198797632995999", column="cv51417999", bv="BV1U4Tz6ZZZZ"
            ).replace(
                "source_url: \"https://www.bilibili.com/opus/1224198797632995999\"",
                "source_url: \"https://www.bilibili.com/opus/1224198797632995337\"",
            )
            second.write_text(duplicate_url, encoding="utf-8")
            result = self.module.validate_note_file(second, root)
            self.assertTrue(any("duplicate source_url" in e for e in result["errors"]))

    def test_system_and_fixture_files_do_not_create_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            area = root / "02-Resources"
            fixtures = root / "tests" / "fixtures"
            area.mkdir()
            fixtures.mkdir(parents=True)
            note = area / "note.md"
            note.write_text(self.note(), encoding="utf-8")
            (fixtures / "sample.md").write_text(self.note(), encoding="utf-8")
            result = self.module.validate_note_file(note, root)
            self.assertFalse(any("duplicate" in e for e in result["errors"]))

    def test_v1_note_remains_compatible_with_warning(self):
        legacy = self.note().replace("ingest_workflow: bilibili_opus_ingest_v2\n", "")
        for line in (
            "source_form: lecture\n", "voice_basis: direct_speech\n",
            "verification_scope: column_only\n",
        ):
            legacy = legacy.replace(line, "")
        legacy = legacy.replace("content_form: dialogue", "content_form: lecture")
        legacy = legacy.replace("dialogue_fidelity: reconstructed", "dialogue_fidelity: none")
        legacy = legacy.replace("question_source: editorial", "question_source: none")
        result = self.module.validate_note_text(legacy)
        self.assertEqual(result["workflow"], "bilibili_opus_ingest_v1")
        self.assertEqual(result["status"], "complete", result["errors"])
        self.assertIn("legacy v1 opus note; migrate only when touched", result["warnings"])

    def test_real_shape_fixtures_validate(self):
        fixture_root = ROOT / "tests" / "fixtures" / "bilibili_opus"
        for path in fixture_root.glob("*.fixture"):
            with self.subTest(path=path.name):
                result = self.module.validate_note_text(path.read_text(encoding="utf-8"), sources_read={"column"})
                self.assertEqual(result["status"], "complete", result["errors"])

    def test_technical_fixture_keeps_steps_inside_dialogue(self):
        path = ROOT / "tests" / "fixtures" / "bilibili_opus" / "technical.fixture"
        text = path.read_text(encoding="utf-8")
        self.assertIn("**编者问：**", text)
        self.assertIn("1. 读取项目契约。", text)
        self.assertEqual(self.module.validate_note_text(text, {"column"})["status"], "complete")

    def test_editorial_summary_fixture_uses_safe_role_and_partial_status(self):
        path = ROOT / "tests" / "fixtures" / "bilibili_opus" / "editorial-summary.fixture"
        text = path.read_text(encoding="utf-8")
        self.assertIn("**专栏整理：**", text)
        self.assertIn("factual_status: partial", text)
        self.assertEqual(self.module.validate_note_text(text, {"column"})["status"], "complete")


if __name__ == "__main__":
    unittest.main()
