#!/usr/bin/env python3
"""Generate Easonlee opus vs vault ingest audit (2026-07-08)."""
from __future__ import annotations

import json
import os
import re
from datetime import date
from pathlib import Path

VAULT = Path(__file__).resolve().parents[2]
RECASTORY = Path(r"D:/workSpace/git_clone_test/hoye-git/Recastory")
MANIFEST = RECASTORY / "workspace/bilibili/manifest.json"
BV_LIST = RECASTORY / "workspace/bilibili/_easonlee_bv_list.txt"
OPUS_DOM = RECASTORY / "workspace/bilibili/easonlee_opus_dom.json"
PROBE = RECASTORY / "workspace/bilibili/easonlee_column_probe.json"
AUDIT_OUT = VAULT / "99-System/audit/easonlee-opus-ingest-audit-2026-07-08.md"

EASONLEE_BATCHES = {"easonlee_channel_2026", "easonlee_channel_2026_new"}
BV_RE = re.compile(r"BV[0-9A-Za-z]{10}")
OPUS_RE = re.compile(r"/opus/(\d+)")
CV_RE = re.compile(r"/(?:read/)?cv(\d+)")


def title_from_ws(root: Path, workspace_dir: str) -> str:
    meta = root / workspace_dir.replace("/", os.sep) / "ingest" / "metadata.json"
    if not meta.is_file():
        return ""
    md = json.loads(meta.read_text(encoding="utf-8"))
    return md.get("source", {}).get("title") or md.get("title") or ""


def col_key(url: str | None) -> str | None:
    if not url:
        return None
    m = OPUS_RE.search(url)
    if m:
        return f"opus:{m.group(1)}"
    m = CV_RE.search(url)
    if m:
        return f"cv:{m.group(1)}"
    return url.split("?")[0]


def vault_bvs() -> set[str]:
    out: set[str] = set()
    root = VAULT / "02-Resources/AI and Agents/B站视频知识库"
    for md in root.rglob("*.md"):
        out.update(BV_RE.findall(md.read_text(encoding="utf-8", errors="ignore")))
    return out


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ws_root = RECASTORY / "workspace"
    vdone = vault_bvs()

    easonlee = [e for e in manifest["entries"] if e.get("batch") in EASONLEE_BATCHES]
    bv_all = []
    if BV_LIST.is_file():
        bv_all = [
            l.strip()
            for l in BV_LIST.read_text(encoding="utf-8-sig").splitlines()
            if l.strip().startswith("BV")
        ]

    probe = json.loads(PROBE.read_text(encoding="utf-8")) if PROBE.is_file() else {}

    # Enrich rows
    rows = []
    col_to_bv: dict[str, list[str]] = {}
    for e in easonlee:
        bv = e["bv"]
        title = e.get("title") or title_from_ws(ws_root, e.get("workspace_dir", ""))
        ck = col_key(e.get("column_url"))
        if ck:
            col_to_bv.setdefault(ck, []).append(bv)
        rows.append(
            {
                "bv": bv,
                "title": title,
                "column_url": e.get("column_url"),
                "col_key": ck,
                "asr_status": e.get("asr_status"),
                "vault_status": e.get("vault_status"),
                "enrich_status": e.get("enrich_status"),
                "in_vault": bv in vdone,
            }
        )

    ingested = [r for r in rows if r["in_vault"]]
    pending_asr = [r for r in rows if r["asr_status"] == "asr_ready" and not r["in_vault"]]
    pending_col = [r for r in pending_asr if r["column_url"]]
    pending_no_col = [r for r in pending_asr if not r["column_url"]]
    skipped = [r for r in rows if r["asr_status"] == "skipped_no_link"]
    no_asr = [r for r in rows if r["asr_status"] not in ("asr_ready", "skipped_no_link")]

    manifest_bvs = {e["bv"] for e in easonlee}
    not_in_manifest = [b for b in bv_all if b not in manifest_bvs]
    probe_no_col = sum(
        1 for bv, v in probe.items() if bv not in manifest_bvs and v.get("status") == "no_column_skip"
    )
    probe_has_col_not_man = sum(
        1
        for bv, v in probe.items()
        if bv not in manifest_bvs and v.get("status") == "todo_full_pipeline"
    )

    opus_items: list[dict] = []
    if OPUS_DOM.is_file():
        opus_items = json.loads(OPUS_DOM.read_text(encoding="utf-8")).get("items") or []

    opus_ids = {it["id"] for it in opus_items if it.get("id")}
    manifest_opus_ids = {k.split(":", 1)[1] for k in col_to_bv if k.startswith("opus:")}

    opus_on_page_not_manifest = sorted(opus_ids - manifest_opus_ids) if opus_ids else []
    manifest_col_not_vault = [r for r in rows if r["col_key"] and not r["in_vault"] and r["asr_status"] == "asr_ready"]

    lines = [
        f"# Easonlee 专栏/视频收录筛查（{date.today().isoformat()}）",
        "",
        "> **UP**：[Easonlee的AI笔记](https://space.bilibili.com/3546559488723681)（mid `3546559488723681`）",
        "> **专栏**：[upload/opus](https://space.bilibili.com/3546559488723681/upload/opus) · **视频**：[upload/video](https://space.bilibili.com/3546559488723681/upload/video)",
        "> **方法**：kimi-webbridge 抓专栏页 DOM + Recastory manifest / vault BV 交叉比对（B站 list API 当日限流，视频全量用 2026-07-03 缓存 + manifest 增量）",
        "",
        "## 总览",
        "",
        "| 维度 | 数量 | 说明 |",
        "|------|------|------|",
        f"| UP 视频（缓存列表） | {len(bv_all)} | `_easonlee_bv_list.txt` |",
        f"| Recastory manifest（Easonlee 批次） | {len(easonlee)} | `easonlee_channel_2026` + `_new` |",
        f"| **vault 已收录** | **{len(ingested)}** | BV 命中 `B站视频知识库` |",
        f"| manifest 有 ASR、vault 未收录 | **{len(pending_asr)}** | Recastory 已有 `article.md`，差 vault 写作 |",
        f"| 其中含专栏 URL（S 轨候选） | **{len(pending_col)}** | 可直接走 v3 / 对谈稿 |",
        f"| 有 ASR 无 column_url | {len(pending_no_col)} | A-dialogue / A-lecture 看形态 |",
        f"| 无 UP 评论专栏链接（跳过 ASR） | {len(skipped)} | `skipped_no_link` |",
        f"| UP 视频未进 manifest | {len(not_in_manifest)} | 多数无专栏链（见下） |",
        f"| 专栏 opus（DOM 已抓页） | {len(opus_items)} | 分页抓取；API 404 限流 |",
        f"| manifest 中唯一专栏链 | {len(col_to_bv)} | opus + cv |",
        "",
        "### 结论（一句话）",
        "",
        f"**{len(pending_col)} 篇「视频+专栏+ASR」已在 Recastory，尚未写入 vault；另有 {len(not_in_manifest)} 条 UP 视频未进 manifest（其中约 {probe_no_col} 条无专栏链可跳过，{probe_has_col_not_man} 条有专栏待拉 ASR）。**",
        "",
        "---",
        "",
        "## 一、已收录（vault 有 BV）",
        "",
        f"共 **{len(ingested)}** 篇（manifest Easonlee 批次内）。",
        "",
        "## 二、优先待收录：Recastory 已有 ASR + 专栏，vault 未写",
        "",
        "下列条目 **无需重下视频/ASR**，可直接按 S / A-dialogue 轨写 vault 笔记：",
        "",
        "| # | BV | 标题 | 专栏 |",
        "|---|-----|------|------|",
    ]
    for i, r in enumerate(sorted(pending_col, key=lambda x: x["bv"]), 1):
        title = (r["title"] or "—").replace("|", "｜")[:52]
        cu = "✓" if r["column_url"] else "—"
        lines.append(
            f"| {i} | [{r['bv']}](https://www.bilibili.com/video/{r['bv']}/) | {title} | {cu} |"
        )

    lines += [
        "",
        "## 三、有 ASR 但无 column_url（vault 未收录）",
        "",
    ]
    if pending_no_col:
        lines.append("| BV | 标题 | enrich |")
        lines.append("|----|------|--------|")
        for r in sorted(pending_no_col, key=lambda x: x["bv"]):
            title = (r["title"] or "—").replace("|", "｜")[:50]
            lines.append(
                f"| [{r['bv']}](https://www.bilibili.com/video/{r['bv']}/) | {title} | {r['enrich_status'] or '—'} |"
            )
    else:
        lines.append("*无*")

    lines += [
        "",
        "## 四、manifest 内跳过（无专栏链接）",
        "",
        f"共 **{len(skipped)}** 条：`asr_status=skipped_no_link`，不符合「专栏主源」收录条件。",
        "",
        "## 五、UP 全量视频 vs manifest",
        "",
        f"- 缓存 UP 列表 **{len(bv_all)}** 条，其中 **{len(not_in_manifest)}** 条不在 manifest。",
        f"- 2026-07-03 专栏探测（468 条当时未入库）：`no_column_skip` **299** · `todo_full_pipeline` **169**（后者已批量进 manifest）。",
        f"- 当前仍不在 manifest 的 **{len(not_in_manifest)}** 条中，探测状态：`no_column_skip` **{probe_no_col}** · 仍有专栏待流水线 **{probe_has_col_not_man}**。",
        "",
        "**未进 manifest 且有专栏的条目**需：`python -m tools.ingest \"https://www.bilibili.com/video/<BV>/\" -o workspace/bilibili-retranscribe/<BV>`（enrich → 下载 → ASR）。",
        "",
        "## 六、专栏 opus 页（`/upload/opus`）",
        "",
    ]
    if opus_items:
        lines.append(f"WebBridge DOM 抓取 **{len(opus_items)}** 个 opus id（分页；标题 DOM 噪声大，以 manifest 标题为准）。")
        if opus_on_page_not_manifest:
            lines.append("")
            lines.append(f"**opus 页有、manifest 未登记 column 链**：{len(opus_on_page_not_manifest)} 个（可能对应尚未 enrich 的视频）。")
        lines.append("")
        lines.append("| opus id | 链接 |")
        lines.append("|---------|------|")
        for it in opus_items[:40]:
            oid = it.get("id", "")
            lines.append(f"| `{oid}` | [opus](https://www.bilibili.com/opus/{oid}) |")
        if len(opus_items) > 40:
            lines.append(f"\n*…共 {len(opus_items)} 篇，完整 id 见 Recastory `easonlee_opus_dom.json`*")
    else:
        lines.append("*专栏 API 限流（404 HTML）；请稍后重跑 `python -m tools.ingest._run_opus_dom_pages`*")

    lines += [
        "",
        "## 七、建议执行顺序",
        "",
        "1. **§二 {0} 篇** → vault v3 / 对谈稿（Recastory ASR+专栏已齐）".format(len(pending_col)),
        "2. **§三 {0} 篇** → 按形态 A-dialogue / A-lecture 收录（ASR 已有）".format(len(pending_no_col)),
        "3. **未 manifest + 有专栏** → Recastory 完整 ingest 流水线",
        "4. **无专栏链接** → 跳过（除非人工升优）",
        "",
        "## 数据源",
        "",
        f"- `{MANIFEST}`",
        f"- `{OPUS_DOM}`",
        f"- `{PROBE}`",
        f"- vault BV 扫描：`02-Resources/AI and Agents/B站视频知识库/`",
    ]

    AUDIT_OUT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "out": str(AUDIT_OUT),
                "vault_done": len(ingested),
                "pending_col": len(pending_col),
                "pending_no_col": len(pending_no_col),
                "skipped": len(skipped),
                "not_in_manifest": len(not_in_manifest),
                "opus_dom": len(opus_items),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
