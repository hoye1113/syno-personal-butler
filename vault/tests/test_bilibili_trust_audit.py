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


BASE_NOTE = """---
title: "{title}"
tags: [ai_agent, video_transcript, bilibili]
created: 2026-07-13
source: https://www.bilibili.com/video/{bv}/
source_url: https://www.bilibili.com/video/{bv}/
description: "测试"
duration: "{duration}"
material_tier: A
{extra}
---
# {title}

正文包含 42%、2026 年和 $100 万三个数字。

## 相关阅读
- [[相关笔记]]
"""


class TrustScoringTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_script("bilibili-trust-audit.py")

    def test_missing_declared_transcript_is_p0(self):
        text = BASE_NOTE.format(
            title="Missing ASR",
            bv="BVMISS001",
            duration="30:00",
            extra='genre: "Host-Guest canonical (ASR primary)"\ntranscript_source: "missing/article.md"',
        )
        result = self.module.score_note(
            Path("Missing.md"), text, inventory_entry={"files": {"transcript_markdown": None}}, backlinks=0
        )
        self.assertEqual(result["risk_level"], "P0")
        self.assertGreaterEqual(result["risk_score"], 100)
        self.assertIn("declared ASR/transcript source is missing", result["risk_reasons"])

    def test_unmarked_synthetic_moderator_is_p0(self):
        text = BASE_NOTE.format(
            title="Synthetic",
            bv="BVSYN001",
            duration="20:00",
            extra='host_name: "Moderator（现场）"\nspeaker_inference: "monologue → synthetic Host Q&A"',
        )
        result = self.module.score_note(Path("Synthetic.md"), text, {"files": {}}, 0)
        self.assertEqual(result["risk_level"], "P0")
        self.assertIn("synthetic/editorial dialogue is not labelled reconstructed", result["risk_reasons"])

    def test_long_video_without_spot_check_is_at_least_p1(self):
        text = BASE_NOTE.format(
            title="Long",
            bv="BVLONG001",
            duration="58:54",
            extra="content_form: lecture\ndialogue_fidelity: none\nquestion_source: none",
        )
        result = self.module.score_note(Path("Long.md"), text, {"files": {"transcript_markdown": "x/article.md"}}, 0)
        self.assertGreaterEqual(result["risk_score"], 60)
        self.assertIn("long video lacks spot_check", result["risk_reasons"])

    def test_path_drift_is_p2_without_higher_risk(self):
        text = BASE_NOTE.format(
            title="Drift",
            bv="BVDRIFT1",
            duration="10:00",
            extra="content_form: lecture\ndialogue_fidelity: none\nquestion_source: none\ningest_dir: legacy/A1/ingest\nspot_check: 2026-07-13\nfactual_status: partial",
        )
        result = self.module.score_note(
            Path("Drift.md"),
            text,
            {"workspace_dir": "bilibili-retranscribe/BVDRIFT1", "files": {"transcript_markdown": "new/article.md", "column": None}},
            0,
        )
        self.assertEqual(result["risk_level"], "P2")
        self.assertIn("declared ingest path differs from discovered workspace", result["risk_reasons"])

    def test_numeric_density_adds_risk(self):
        text = BASE_NOTE.format(
            title="Numbers",
            bv="BVNUM001",
            duration="10:00",
            extra="content_form: lecture\ndialogue_fidelity: none\nquestion_source: none",
        )
        result = self.module.score_note(Path("Numbers.md"), text, {"files": {"transcript_markdown": "x/article.md"}}, 0)
        self.assertGreaterEqual(result["signals"]["numeric_claim_count"], 3)
        self.assertIn("numeric claims lack factual review", result["risk_reasons"])

    def test_selection_is_stable_and_prioritizes_p0_then_topic(self):
        entries = [
            {"note_path": "general.md", "risk_score": 60, "risk_level": "P1", "signals": {"backlinks": 10}, "title": "普通"},
            {"note_path": "harness.md", "risk_score": 60, "risk_level": "P1", "signals": {"backlinks": 1}, "title": "Harness 工程"},
            {"note_path": "p0.md", "risk_score": 100, "risk_level": "P0", "signals": {"backlinks": 0}, "title": "缺源"},
        ]
        selected = self.module.select_first_batch(entries, target=2)
        self.assertEqual([item["note_path"] for item in selected], ["p0.md", "harness.md"])


class FactualValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.validator = load_script("bilibili-note-validate.py")

    def _validate(self, factual: str, duration: str = "20:00"):
        text = BASE_NOTE.format(
            title="Factual",
            bv="BVFACT001",
            duration=duration,
            extra=(
                "content_form: lecture\ndialogue_fidelity: none\nquestion_source: none\n"
                "transcript_source: source/article.md\n" + factual
            ),
        )
        return self.validator.validate_note_text(text, known_paths={"source/article.md"})

    def test_verified_requires_date_and_basis(self):
        result = self._validate("factual_status: verified")
        self.assertIn("verified notes require factual_reviewed", result["errors"])
        self.assertIn("verified notes require verification_basis", result["errors"])

    def test_verified_rejects_unresolved_facts(self):
        result = self._validate(
            "factual_status: verified\nfactual_reviewed: 2026-07-13\nverification_basis:\n  - transcript\nunresolved_facts:\n  - 人名待核"
        )
        self.assertIn("verified notes cannot contain unresolved_facts", result["errors"])

    def test_verified_long_video_requires_spot_check(self):
        result = self._validate(
            "factual_status: verified\nfactual_reviewed: 2026-07-13\nverification_basis:\n  - transcript",
            duration="58:54",
        )
        self.assertIn("videos >=45 minutes require spot_check", result["errors"])

    def test_partial_allows_unresolved_facts(self):
        result = self._validate(
            "factual_status: partial\nfactual_reviewed: 2026-07-13\nverification_basis:\n  - column\nunresolved_facts:\n  - 原始节目待核"
        )
        self.assertNotIn("verified notes cannot contain unresolved_facts", result["errors"])

    def test_unverified_missing_transcript_is_warning_not_error(self):
        text = BASE_NOTE.format(
            title="Unverified",
            bv="BVUNVER1",
            duration="20:00",
            extra="content_form: lecture\ndialogue_fidelity: none\nquestion_source: none\nfactual_status: unverified",
        )
        result = self.validator.validate_note_text(text, known_paths=set())
        self.assertNotIn("missing transcript_source", result["errors"])
        self.assertIn("unverified note is a discovery lead, not a citable fact source", result["warnings"])


if __name__ == "__main__":
    unittest.main()
