"""Minimal Hermes-protocol sidecar for the B1 GBK regression test.

Mirrors scripts/sidecars/hermes_runtime.py's UTF-8 byte-layer fix: on a zh-CN host
(ACP=936) the default stdio text layer is GBK, which corrupts Chinese/emoji bytes and
makes the bridge's JSON.parse throw HERMES_PROTOCOL_INVALID_JSON. The Node fake-fixture
tests can't catch this (Node is always UTF-8), so this real Python sidecar exercises the
actual Python<->Node stdio path with a Chinese payload.

ensure_ascii=False intentionally emits raw Chinese bytes to prove the UTF-8 byte layer
(not ASCII escaping) round-trips correctly.
"""

from __future__ import annotations

import io
import json
import sys

PROTOCOL_OUT = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True, write_through=True)
PROTOCOL_IN = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
sys.stdout = sys.stderr  # protocol-only on stdout; sidecar diagnostics go to stderr


def emit(message: dict) -> None:
    PROTOCOL_OUT.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
    PROTOCOL_OUT.flush()


for line in PROTOCOL_IN:
    try:
        message = json.loads(line)
    except json.JSONDecodeError:
        continue
    kind = message.get("type")
    request_id = message.get("requestId")
    if kind == "shutdown":
        break
    if kind == "capabilities":
        emit({"type": "response", "requestId": request_id, "ok": True, "result": {"version": 1, "agentCount": 1, "tools": ["knowledge.search", "知识检索.中文"]}})
    elif kind == "health":
        emit({"type": "response", "requestId": request_id, "ok": True, "result": {"ready": True}})
    elif kind == "run":
        emit({"type": "event", "runId": message.get("runId"), "event": {"type": "provider.started"}})
        model = (message.get("provider") or {}).get("modelId")
        emit({"type": "response", "requestId": request_id, "ok": True, "result": {"text": "结果：中文往返成功 ✦", "model": model}})
    else:
        emit({"type": "response", "requestId": request_id, "ok": True, "result": {}})
