import json
from path_config import RECASTORY_WORKSPACE

with (RECASTORY_WORKSPACE / "bilibili/manifest.json").open('r', encoding='utf-8') as f:
    data = json.load(f)

entries = data['entries']
pending = [e for e in entries if e.get('vault_status') == 'pending']
collected = [e for e in entries if e.get('vault_status') in ('collected', 'vault_v2_done')]

print(f'Total entries: {len(entries)}')
print(f'Pending: {len(pending)}')
print(f'Collected/done: {len(collected)}')

has_col = [e for e in pending if e.get('column_url')]
no_col = [e for e in pending if not e.get('column_url')]

print(f'\nPending WITH column_url: {len(has_col)}')
for e in has_col:
    bv = e.get('bv', '?')
    vp = e.get('vault_path', e.get('workspace_dir', '?'))
    print(f'  {bv} | {vp}')

print(f'\nPending WITHOUT column_url: {len(no_col)}')
for e in no_col:
    bv = e.get('bv', '?')
    vp = e.get('vault_path', e.get('workspace_dir', '?'))
    print(f'  {bv} | {vp}')
