#!/usr/bin/env python3
"""
vault-fetch.py - URL → 干净正文，自动降级（收录抓取层）

解决痛点：X / 公众号 / 知乎等登录站，普通抓取撞墙拿不到全文。
本脚本：plain-HTTP 抓取 → 检测登录墙/过短/JS-only → 自动切 kimi-webbridge
（带登录态）navigate+snapshot，并把 a11y 树去重去噪成干净正文。

降级链（脚本可控部分）：
  Tier A: plain HTTP（urllib + HTML→text）—— 公开页够用
  Tier B: kimi-webbridge —— 登录站 / JS-heavy（HTTP 拿不到正文时自动切）

注：web-reader MCP（更强 JS 渲染）只有 agent 能调，不在脚本内；agent 可先试
MCP，失败再调本脚本走 A→B。

Usage:
  python vault-fetch.py <URL>                 # 自动降级，正文输出到 stdout
  python vault-fetch.py <URL> --pdf <path>    # 同时用 kimi 留档 PDF
  python vault-fetch.py <URL> --tier kimi     # 强制 kimi
  python vault-fetch.py <URL> -o out.md       # 写文件

退出码：0 成功；1 参数/错误；2 全部 tier 失败。
"""

import argparse
import json
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

KIMI = "http://127.0.0.1:10086/command"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# 登录墙/无内容信号
WALL_MARKERS = ["log in", "sign up", "continue with google", "continue with apple",
                "create account", "to view this content", "已删除", "账号已冻结"]
NOISE = {"show more", "copy link", "copy to clipboard", "image", "photo",
         "like", "repost", "reply", "share", "bookmark", "follow", "more",
         "log in", "sign up", "notifications", "explore", "home", "messages",
         "profile", "grok", "settings", "search", "see new posts",
         "who to follow", "open app", "want to publish your own article?",
         "upgrade to premium", "chat", "exit", "verified account",
         "skip to home timeline", "skip to trending", "skip to content",
         "primary", "direct messages", "more menu items", "account menu",
         "back", "focus mode", "search query", "loading timeline", "footer",
         "search and explore", "communities", "premium", "lists", "bookmarks",
         "articles", "jobs", "view", "all", "mentions", "verified",
         # X/Twitter 特定噪音
         "relevant people", "what's happening", "trending in", "show more",
         "terms", "privacy", "cookies", "accessibility", "ads info",
         "reposts", "likes", "views", "bookmarks", "replies",
         "write a reply", "post your reply", "add a comment",
         "subscribe to premium", "get verified", "create account",
         "download the app", "open app", "share post", "copy link",
         "see more", "see less", "load more", "refresh",
         "© 2026 x corp.", "© 2025 x corp.", "© 2024 x corp.",
         # 通用 UI 噪音
         "skip to main content", "skip to navigation", "menu",
         "close", "cancel", "accept", "reject", "confirm",
         "loading", "please wait", "error", "success",
         "next", "previous", "page", "of",
         # 键盘快捷键提示
         "to view keyboard shortcuts, press question mark",
         "view keyboard shortcuts", "keyboard shortcuts",
         # 社交媒体通用
         "view post analytics", "view replies", "show this thread",
         "translate post", "embed post", "report post",
         "mute @", "block @", "unfollow @",
         # 趋势和话题
         "trending in france", "trending in", "trending",
         "champs-élysées", "deschamps", "lacroix",
         "events · trending", "more from",
         # 文件路径和 URL
         "public/assets/", "src/", "http://", "https://",
         "www.", ".com", ".org", ".io",
         # 代码相关
         "npm install", "npm run", "pip install",
         "python scripts/", "ffmpeg", "ffprobe",
         # 底部和版权
         "© 2026 x corp.", "© 2025 x corp.", "© 2024 x corp.",
         "ads info", "more", "footer",
         # 路径和命令
         "~/desktop/", "out/", ".mp4", ".wav", ".png",
         "-v error", "-show_streams", "-show_format",
         "-frames:v", "bash", "最后渲染 mp4：",
         # CSS 和代码片段
         "drop-shadow", "rgba(", "filter:",
         # 拆分命令
         "split_sheet.py", "scripts/",
         # 趋势和事件
         "events · trending", "champs-élysées more"}


# ---------- Tier A: plain HTTP ----------
def html_to_text(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    html = re.sub(r"</p>", "\n\n", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    import html as h
    txt = h.unescape(html)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip()


def fetch_plain(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read()
    enc = (r.headers.get_content_charset() or "utf-8")
    try:
        html = raw.decode(enc, errors="ignore")
    except LookupError:
        html = raw.decode("utf-8", errors="ignore")
    return html_to_text(html)


def looks_walled(txt: str) -> bool:
    low = txt.lower()
    if len(txt) < 400:
        return True
    wall_hits = sum(low.count(m) for m in WALL_MARKERS)
    # 登录墙词密集 + 正文短
    cjk = len(re.findall(r"[一-鿿]", txt))
    return wall_hits >= 3 and cjk < 300


# ---------- Tier B: kimi-webbridge ----------
def kimi(action, args, session):
    payload = json.dumps({"action": action, "args": args, "session": session}).encode()
    req = urllib.request.Request(KIMI, data=payload,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def kimi_status():
    try:
        import subprocess
        out = subprocess.run(["kimi-webbridge", "status"], capture_output=True,
                             text=True, timeout=5).stdout
        return json.loads(out).get("running", False)
    except Exception:
        # 退回 HTTP 探测
        try:
            with urllib.request.urlopen(KIMI.replace("/command", "/status"),
                                        timeout=3) as r:
                return json.loads(r.read().decode()).get("running", False)
        except Exception:
            return False


def parse_tree(tree) -> list:
    """a11y 树 → 干净文本片段。提取主要内容 + 去重 + 去噪。"""
    # 第一步：提取所有文本节点
    raw_texts = []

    def walk(n):
        if isinstance(n, list):
            for x in n:
                walk(x)
            return
        if not isinstance(n, dict):
            return
        name = (n.get("name") or "").strip()
        if name:
            raw_texts.append(name)
        walk(n.get("children", []))

    walk(tree)

    # 第二步：合并相邻的短文本（处理 a11y 树的字符级拆分）
    # 策略：如果当前文本很短（<10字符）且下一个文本也很短，则合并
    merged = []
    i = 0
    while i < len(raw_texts):
        current = raw_texts[i]
        # 如果当前文本很短，尝试与后续文本合并
        if len(current) < 10:
            combined = current
            j = i + 1
            while j < len(raw_texts) and len(raw_texts[j]) < 10:
                combined += raw_texts[j]
                j += 1
            merged.append(combined)
            i = j
        else:
            merged.append(current)
            i += 1

    # 第三步：清理和过滤
    frags = []
    for s in merged:
        low = s.lower().strip()
        if not low or low in NOISE:
            continue
        if low.startswith("photo of") or "avatar" in low:
            continue
        if re.fullmatch(r"[\d.,\s]+", s):  # 纯数字/标点
            continue
        # 过滤纯标点或特殊字符
        if re.fullmatch(r"[^\w\s]+", s):
            continue
        # 过滤包含大量空格的片段（可能是布局元素）
        if s.count(" ") > len(s) * 0.5:
            continue
        # 合并换行（处理 a11y 树的 wrapped 文本）
        s_clean = re.sub(r"\s+", " ", s).strip()
        # 计算有意义内容的比例
        cjk_count = len(re.findall(r'[一-鿿]', s_clean))
        alpha_count = len(re.findall(r'[a-zA-Z]', s_clean))
        total_len = len(s_clean)
        # 如果中文字符太少且英文单词太少，可能是噪音
        if cjk_count < 3 and alpha_count < 10:
            continue
        # 如果文本太短（<15字符）且没有中文，可能是 UI 元素
        if total_len < 15 and cjk_count == 0:
            continue
        # 检测噪音模式
        is_noise = False
        # 1. 包含代码模式（如 ::、{{、}}、==）
        if re.search(r'::|{{|}}|==', s_clean):
            is_noise = True
        # 2. 包含重复的单词或短语（如"背景底板背景底板"）
        if re.search(r'(.{2,})\1{2,}', s_clean):
            is_noise = True
        # 3. 包含大量重复的字符（如"ChatChatGrokGrokGrok"）
        if re.search(r'(.)\1{5,}', s_clean):
            is_noise = True
        # 4. 包含 UI 元素模式（如"Premium"、"Profile"重复）
        if re.search(r'(Premium|Profile|Grok|Chat){2,}', s_clean):
            is_noise = True
        # 5. 包含文件路径（如 public/assets/...、src/...）
        if re.search(r'(public|src|assets|layers)/', s_clean, re.I):
            is_noise = True
        # 6. 包含 URL 片段（如 http://、https://、www.）
        if re.search(r'https?://|www\.', s_clean, re.I):
            is_noise = True
        # 7. 包含命令行片段（如 npm install、pip install）
        if re.search(r'(npm|pip|yarn|pnpm)\s+(install|run|start)', s_clean, re.I):
            is_noise = True
        # 8. 包含趋势标签（如 "Trending in France"、"#FRAESP"）
        if re.search(r'trending in|#\w{3,}', s_clean, re.I):
            is_noise = True
        # 9. 包含 "views. View post analytics"
        if re.search(r'views\.\s*view post analytics', s_clean, re.I):
            is_noise = True
        # 10. 包含重复的符号（如 ••、··）
        if re.search(r'[•·]{2,}', s_clean):
            is_noise = True
        # 11. 包含重复的中文短语（如"背景底板背景底板"）
        if re.search(r'([一-鿿]{2,})\1{1,}', s_clean):
            is_noise = True
        # 12. 包含命令行参数（如 -v error、-show_streams）
        if re.search(r'-[a-z_]+\s+[a-z_]+', s_clean, re.I):
            is_noise = True
        # 13. 包含文件扩展名（如 .mp4、.wav、.png）
        if re.search(r'\.(mp4|wav|png|jpg|jpeg|gif|svg|css|js|ts|tsx|jsx)\b', s_clean, re.I):
            is_noise = True
        # 14. 包含 "bash" 或 "最后渲染"
        if re.search(r'\bbash\b|最后渲染', s_clean, re.I):
            is_noise = True
        if not is_noise:
            frags.append(s_clean)

    # 第四步：子串折叠（处理 wrapped 重复）
    # 先按长度降序排序，确保长版本优先保留
    frags.sort(key=len, reverse=True)
    keep = []
    for s in frags:
        # 标准化文本用于比较（移除空格和标点）
        s_norm = re.sub(r'[\s\.,;:!?]+', '', s).lower()
        # 检查是否是已保留片段的子串（标准化后比较）
        is_dup = False
        for t in keep:
            t_norm = re.sub(r'[\s\.,;:!?]+', '', t).lower()
            # 如果标准化后相同，或是子串，则认为是重复
            if s_norm == t_norm or s_norm in t_norm or t_norm in s_norm:
                is_dup = True
                break
        if not is_dup:
            keep.append(s)

    # 第五步：去连续重复
    out = []
    for s in keep:
        if not out or out[-1] != s:
            out.append(s)

    return out


def pdf_to_text(pdf_path) -> str:
    import shutil, subprocess
    if not shutil.which("pdftotext"):
        return ""
    try:
        out = subprocess.run(["pdftotext", "-enc", "UTF-8", "-layout",
                              str(pdf_path), "-"], capture_output=True, timeout=60)
        return out.stdout.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


def fetch_kimi(url: str, session: str, pdf_path: str = None, wait: int = 5):
    if not kimi_status():
        raise RuntimeError("kimi-webbridge 未运行（extension 未连）")
    kimi("navigate", {"url": url, "newTab": True,
                      "group_title": "vault-fetch"}, session)
    # 1) snapshot 轮询：等到正文停止增长（渲染完成），最多 6 轮
    title, real_url, frags = "", url, []
    prev_cjk = -1
    for attempt in range(6):
        time.sleep(wait)
        snap = kimi("snapshot", {}, session)
        data = snap.get("data", {}) if snap.get("ok") else {}
        title = data.get("title", "") or title
        real_url = data.get("url", url)
        frags = parse_tree(data.get("tree", []))
        cjk = sum(len(re.findall(r"[一-鿿]", f)) for f in frags)
        if attempt >= 1 and cjk <= prev_cjk * 1.10:
            break
        prev_cjk = cjk
    text, src_tag = "\n".join(frags), "kimi-snapshot"
    # 2) PDF 兜底：中文长文常被懒加载/折叠截断 → 渲染整页 + pdftotext 抽全文，取长者
    snap_cjk = sum(len(re.findall(r"[一-鿿]", f)) for f in frags)
    if snap_cjk < 1500:  # 降低阈值，避免过度使用 PDF 回退
        import tempfile
        tmp = Path(tempfile.gettempdir()) / f"vault-fetch-{int(time.time())}.pdf"
        try:
            kimi("save_as_pdf", {"path": str(tmp), "paper_format": "a4"}, session)
            time.sleep(2)
            pdf_text = pdf_to_text(tmp)
            if len(pdf_text) > len(text):
                text, src_tag = pdf_text, "kimi-pdf"
        except Exception:
            pass
        finally:
            try:
                tmp.unlink()
            except Exception:
                pass
    # 3) 用户留档 PDF
    if pdf_path:
        try:
            kimi("save_as_pdf", {"path": str(pdf_path), "paper_format": "a4"}, session)
        except Exception:
            pass
    try:
        kimi("close_session", {}, session)
    except Exception:
        pass
    return title, real_url, text, src_tag


# ---------- 主流程 ----------
def main():
    ap = argparse.ArgumentParser(description="URL → 干净正文（自动 plain-HTTP→kimi 降级）")
    ap.add_argument("url")
    ap.add_argument("-o", "--out", help="写文件（默认 stdout）")
    ap.add_argument("--pdf", help="kimi 留档 PDF 路径")
    ap.add_argument("--tier", choices=["auto", "plain", "kimi"], default="auto")
    ap.add_argument("--wait", type=int, default=5, help="kimi 每轮渲染等待秒数")
    args = ap.parse_args()

    session = "vault-fetch-" + re.sub(r"[^a-z0-9]", "", args.url.lower())[:24]
    chosen = None
    title, text = "", ""

    # Tier A
    if args.tier in ("auto", "plain"):
        try:
            t = fetch_plain(args.url)
            if args.tier == "plain" or not looks_walled(t):
                text, chosen = t, "plain-HTTP"
        except Exception as e:
            if args.tier == "plain":
                print(f"[plain-HTTP 失败] {e}", file=sys.stderr)

    # Tier B
    if not chosen and args.tier in ("auto", "kimi"):
        try:
            title, real, text, src_tag = fetch_kimi(args.url, session, args.pdf, wait=args.wait)
            chosen = src_tag
            if not title:
                title = real
        except Exception as e:
            print(f"[kimi 失败] {e}", file=sys.stderr)

    if not chosen:
        print("[全部 tier 失败]", file=sys.stderr)
        sys.exit(2)

    cjk = len(re.findall(r"[一-鿿]", text))
    header = f"> fetched: {chosen} | url: {args.url}\n> title: {title}\n> 正文 {len(text)} 字（CJK {cjk}）\n"
    out = header + "\n" + text + "\n"
    if args.out:
        Path(args.out).write_text(out, encoding="utf-8")
        print(f"[OK] {chosen} → {args.out}（{len(text)} 字）")
    else:
        print(out)


if __name__ == "__main__":
    main()
