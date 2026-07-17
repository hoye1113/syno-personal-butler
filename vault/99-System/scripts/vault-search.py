#!/usr/bin/env python3
"""
vault-search.py - Vault 混合检索（baseline：BM25 关键词轴 + tag 分面过滤）

设计目标
--------
1. 「不靠人维护的索引」：直接读 markdown 文件实时算，无预建索引、无外部依赖。
2. 混合检索的第一轴（关键词 + tag）。向量轴为预留扩展点（见 score_vector stub），
   未来塞进来只改 fuse()，架构不返工。
3. 章节级命中（对齐 vskill-vault-discuss 的「章节级检索」），返回 file:section。
4. 中文友好：CJK unigram+bigram + ASCII word 混合分词，零依赖。

Usage
-----
  # 关键词检索（默认只搜内容区 01-Areas/02-Resources）
  python vault-search.py "agent 记忆 不遗忘"
  python vault-search.py "harness 权限 分层"

  # tag 分面过滤（多个 --tag 为 AND；逗号内为 OR）
  python vault-search.py "loop" --tag loop_engineering
  python vault-search.py "agent" --tag ai_agent --tag memory

  # 列出全库 tag 分布（分面总览）
  python vault-search.py --tags

  # agent 消费：JSON 输出 + top N
  python vault-search.py "上下文 压缩" --json --top 5

  # 命中得分解释
  python vault-search.py "prompt 减法" --explain

退出码：0 正常；1 参数错误；2 无命中。
"""

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

# Windows GBK 控制台兼容
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# === 配置 ===
IGNORED_DIRS = {".obsidian", ".agents", ".claude", ".git", ".pytest_cache",
                "__pycache__", ".idea", "node_modules"}
# 默认内容检索根（排除系统/收件箱/归档）
CONTENT_ROOTS = ("01-Areas", "02-Resources")
SYSTEM_HINTS = ("99-System", "00-Inbox", "03-Archive")

CJK_RE = re.compile(r"[一-鿿]+")
ASCII_WORD_RE = re.compile(r"[a-z0-9_]+")
FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$", re.M)
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
HTML_TAG_RE = re.compile(r"<[^>]+>")


def clean_heading(s: str) -> str:
    """剥 markdown 锚点链接、HTML 标签、转义反斜杠。"""
    s = MD_LINK_RE.sub(r"\1", s)
    s = HTML_TAG_RE.sub("", s)
    s = s.replace("\\", "")
    return s.strip()
ASCII_STOP = {"the", "a", "an", "of", "to", "in", "on", "and", "or", "for",
              "is", "are", "with", "by", "as", "at", "be", "this", "that"}


def is_ignored(p: Path) -> bool:
    return any(part in IGNORED_DIRS for part in p.parts)


# === 分词（中文友好，零依赖） ===
def tokenize(text: str):
    """CJK: unigram + bigram；ASCII: 词。小写化。去停用词。"""
    text = text.lower()
    toks = []
    for m in ASCII_WORD_RE.finditer(text):
        w = m.group()
        if w not in ASCII_STOP and len(w) > 1:
            toks.append(w)
        elif re.search(r"\d", w) or len(w) > 1:
            toks.append(w)
    for run in CJK_RE.findall(text):
        toks.extend(list(run))              # unigram（保召回）
        for i in range(len(run) - 1):
            toks.append(run[i:i + 2])       # bigram（保精度）
    return toks


# === frontmatter 解析（只取 tags / title / description） ===
def parse_frontmatter(content: str):
    fm = {}
    m = FM_RE.match(content)
    if not m:
        return fm, content
    block = m.group(1)
    body = content[m.end():]
    key = None
    for line in block.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if line.startswith(("  - ", "- ", "    - ")) and key:
            item = s.lstrip("- ").strip().strip('"').strip("'")
            fm.setdefault(key, []).append(item)
            continue
        if ":" in line:
            k, _, v = line.partition(":")
            k, v = k.strip(), v.strip()
            if v == "":
                key = k
                fm.setdefault(k, [])
            elif v.startswith("[") and v.endswith("]"):
                fm[k] = [x.strip().strip('"').strip("'") for x in v[1:-1].split(",") if x.strip()]
                key = None
            else:
                fm[k] = v.strip('"').strip("'")
                key = None
    # tags 归一成 list
    t = fm.get("tags", [])
    if isinstance(t, str):
        t = [x.strip() for x in t.split(",")]
    fm["tags"] = [x for x in t if x]
    return fm, body


# === 章节级分块 ===
def chunk_note(rel: str, content: str, tags):
    """返回 [{file, section, text, tags}]。chunk0=概要(title+desc+首段)。"""
    fm, body = parse_frontmatter(content)
    title = fm.get("title", Path(rel).stem)
    desc = fm.get("description", "")
    # body 里去掉 frontmatter 已剥；取正文
    # 按 ## / ### 切
    pieces = []
    # 概要块：标题 + 描述 + 第一个标题前的文本
    first_heading = HEADING_RE.search(body)
    head_text = body[:first_heading.start()] if first_heading else body
    summary = "\n".join([title, desc, head_text]).strip()
    pieces.append({"file": rel, "section": "(概要)", "text": summary, "tags": tags})

    # 各章节
    splits = list(HEADING_RE.finditer(body))
    for i, m in enumerate(splits):
        start = m.start()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(body)
        sec_body = body[start:end]
        sec_title = clean_heading(m.group(2))
        pieces.append({"file": rel, "section": sec_title, "text": sec_body, "tags": tags})
    return pieces


def collect_chunks(scope: str):
    """扫描 vault，返回所有 chunk 列表。scope=content 只检索内容根。"""
    vault = Path(__file__).resolve().parent.parent.parent
    all_md = [p for p in vault.rglob("*.md") if not is_ignored(p) and p.name != "audit-report.md"]
    chunks = []
    for p in all_md:
        rel = p.relative_to(vault).as_posix()
        if scope == "content":
            if not rel.startswith(CONTENT_ROOTS):
                continue
            # 跳过内容区里的系统性文件
            if any(h in rel for h in ("/README.md",)):
                pass  # README 也检索，保留
        try:
            content = p.read_text(encoding="utf-8")
        except Exception:
            continue
        fm, _ = parse_frontmatter(content)
        tags = fm.get("tags", []) if isinstance(fm.get("tags", []), list) else []
        chunks.extend(chunk_note(rel, content, tags))
    return chunks


# === BM25 关键词轴 ===
class BM25:
    def __init__(self, docs_tokens, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.N = len(docs_tokens)
        self.dl = [len(d) for d in docs_tokens]
        self.avgdl = (sum(self.dl) / self.N) if self.N else 0
        df = Counter()
        for d in docs_tokens:
            for t in set(d):
                df[t] += 1
        self.df = df
        # idf（BM25+ 形式，恒正）
        self.idf = {t: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for t, n in df.items()}
        self.docs_tokens = docs_tokens
        self.tf = [Counter(d) for d in docs_tokens]

    def score(self, q_tokens, idx):
        s = 0.0
        contrib = {}
        dl = self.dl[idx]
        denom_base = self.k1 * (1 - self.b + self.b * (dl / self.avgdl if self.avgdl else 0))
        doc_tf = self.tf[idx]
        for t in q_tokens:
            if t not in self.idf:
                continue
            f = doc_tf.get(t, 0)
            if f == 0:
                continue
            idf = self.idf[t]
            score_t = idf * (f * (self.k1 + 1)) / (f + denom_base)
            s += score_t
            contrib[t] = contrib.get(t, 0.0) + score_t
        return s, contrib


# === 向量轴（预留 stub，未来实现） ===
def score_vector(query, chunks):
    """预留：返回 [score_per_chunk]。未来接 bge-m3 + sqlite-vec/LanceDB。
    实现后 fuse() 把它和 BM25 加权融合即可，其余代码不变。"""
    return [0.0] * len(chunks)


def fuse(bm25_scores, vec_scores, w_bm25=1.0, w_vec=0.0):
    """融合两轴。baseline 只有 BM25（w_vec=0）。"""
    if not bm25_scores:
        return []
    mx = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
    out = []
    for b, v in zip(bm25_scores, vec_scores):
        nb = b / mx  # 归一到 [0,1] 便于和向量轴融合
        out.append(w_bm25 * nb + w_vec * v)
    return out


# === tag 分面过滤 ===
def passes_tag_filter(chunk_tags, include_groups):
    """include_groups = [[t1,t2],[t3]]：组内 OR，组间 AND。空=不过滤。"""
    if not include_groups:
        return True
    ct = set(chunk_tags)
    for group in include_groups:
        if not any(t in ct for t in group):
            return False
    return True


def tag_facets(chunks):
    cnt = Counter()
    for c in chunks:
        for t in set(c["tags"]):
            cnt[t] += 1
    return cnt


# === 主流程 ===
def main():
    ap = argparse.ArgumentParser(description="Vault 混合检索 baseline（BM25 + tag）")
    ap.add_argument("query", nargs="?", help="检索词")
    ap.add_argument("--tag", action="append", default=[], help="tag 过滤；可重复(AND)，逗号分隔(OR)")
    ap.add_argument("--top", type=int, default=10, help="返回条数（默认 10）")
    ap.add_argument("--json", action="store_true", help="JSON 输出（供 agent）")
    ap.add_argument("--explain", action="store_true", help="显示命中 token 贡献")
    ap.add_argument("--scope", choices=["content", "all"], default="content", help="检索范围")
    ap.add_argument("--tags", action="store_true", help="列出全库 tag 分布")
    args = ap.parse_args()

    chunks = collect_chunks(args.scope)

    if args.tags:
        cnt = tag_facets(chunks)
        rows = [{"tag": t, "chunks": n} for t, n in cnt.most_common()]
        print(json.dumps(rows, ensure_ascii=False, indent=2) if args.json
              else "\n".join(f"{n:>4}  {t}" for t, n in cnt.most_common()))
        return

    if not args.query:
        ap.error("需要提供 query，或用 --tags 列出 tag 分布")

    include_groups = []
    for t in args.tag:
        include_groups.append([x.strip() for x in t.split(",") if x.strip()])

    # tag 预过滤（按 chunk 所属 note 的 tags）
    cand = [(i, c) for i, c in enumerate(chunks) if passes_tag_filter(c["tags"], include_groups)]
    if not cand:
        print("[]\n无命中（tag 过滤后无候选）", file=sys.stderr)
        sys.exit(2)

    idx_map = [i for i, _ in cand]
    docs_tokens = [tokenize(chunks[i]["text"]) for i in idx_map]
    bm25 = BM25(docs_tokens)

    q_tokens = tokenize(args.query)
    if not q_tokens:
        print("[]\nquery 无有效 token", file=sys.stderr)
        sys.exit(2)

    scored = []
    for li, gi in enumerate(idx_map):
        s, contrib = bm25.score(q_tokens, li)
        if s > 0:
            scored.append((gi, s, contrib))
    if not scored:
        print("[]\n无命中", file=sys.stderr)
        sys.exit(2)

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:args.top]

    if args.json:
        out = []
        for gi, s, contrib in top:
            c = chunks[gi]
            out.append({
                "file": c["file"], "section": c["section"], "score": round(s, 3),
                "tags": c["tags"],
                "matched": sorted(contrib, key=contrib.get, reverse=True)[:5],
            })
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return

    # 人类可读
    print(f"检索: {args.query}  | 候选 chunk {len(cand)} | 命中 {len(scored)} | top {len(top)}\n")
    for rank, (gi, s, contrib) in enumerate(top, 1):
        c = chunks[gi]
        tags = " ".join(f"#{t}" for t in c["tags"][:4])
        print(f"[#{rank}] {s:.3f}  {c['file']} § {c['section']}  {tags}")
        if args.explain:
            parts = " ".join(f"{t}({v:.2f})" for t, v in sorted(contrib.items(), key=lambda x: -x[1])[:5])
            print(f"      命中: {parts}")
        # 片段：取该 chunk 含命中 token 的一行
        snippet = first_matching_line(c["text"], q_tokens)
        if snippet:
            print(f"      {snippet[:90]}")
        print()


def first_matching_line(text, q_tokens):
    ql = [t for t in q_tokens if not t.isascii() or len(t) > 1]
    for line in text.splitlines():
        low = line.lower()
        if any(t in low for t in ql):
            return line.strip()
    return ""


if __name__ == "__main__":
    main()
