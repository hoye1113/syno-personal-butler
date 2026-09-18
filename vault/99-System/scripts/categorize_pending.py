import json, os
from path_config import RECASTORY_WORKSPACE

with (RECASTORY_WORKSPACE / "bilibili/manifest.json").open('r', encoding='utf-8') as f:
    data = json.load(f)

entries = data['entries']
pending = [e for e in entries if e.get('vault_status') == 'pending' and e.get('column_url')]
root = str(RECASTORY_WORKSPACE / "bilibili-retranscribe")

ai_keywords = ['agent', 'ai', 'claude', 'gpt', 'codex', 'openai', 'anthropic', 'llm', 'model', 'prompt',
               'harness', 'cursor', 'copilot', 'devin', 'mcp', 'rag', 'embedding', 'fine-tun',
               '智能', '大模型', '语言模型', '机器学习', '深度学习', '神经网络', '训练', '推理',
               'chatbot', 'copilot', 'assistant', '智能体', '代理', '自动化']

results = []
for e in pending:
    bv = e.get('bv', '')
    col = e.get('column_url', '')
    meta_path = os.path.join(root, bv, 'ingest', 'metadata.json')
    title = '?'
    desc = ''
    if os.path.exists(meta_path):
        with open(meta_path, 'r', encoding='utf-8') as mf:
            md = json.load(mf)
            src = md.get('source', {})
            title = src.get('title', '?')
            desc = src.get('description', '')[:200]
    
    combined = (title + ' ' + desc).lower()
    is_ai = any(kw in combined for kw in ai_keywords)
    
    # Get column_article size
    col_path = os.path.join(root, bv, 'ingest', 'column_article.md')
    sz = os.path.getsize(col_path) // 1024 if os.path.exists(col_path) else 0
    
    results.append({
        'bv': bv,
        'title': title,
        'sz': sz,
        'is_ai': is_ai,
        'col': col
    })

# Sort by is_ai (True first), then by size
results.sort(key=lambda x: (-x['is_ai'], -x['sz']))

print(f'Total pending with column_url: {len(results)}')
print(f'AI-themed: {len([r for r in results if r["is_ai"]])}')
print(f'Non-AI: {len([r for r in results if not r["is_ai"]])}')

print('\n=== AI-THEMED (recommend collect) ===')
for r in results:
    if r['is_ai']:
        print(f'  {r["bv"]} | {r["sz"]}KB | {r["title"][:70]}')

print('\n=== NON-AI (don\'t recommend) ===')
for r in results:
    if not r['is_ai']:
        print(f'  {r["bv"]} | {r["sz"]}KB | {r["title"][:70]}')
