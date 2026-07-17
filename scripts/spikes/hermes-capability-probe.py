"""Reproducible, credential-free probe for a pinned local Hermes checkout."""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    raise SystemExit(1)


source = Path(os.environ.get("HERMES_SOURCE_ROOT", "")).resolve()
if not (source / "run_agent.py").is_file():
    fail("HERMES_SOURCE_ROOT 必须指向 Hermes 源码根目录")

os.environ.setdefault("HERMES_HOME", str(Path(os.environ.get("TEMP", ".")) / "syno-hermes-probe-home"))
os.environ["HERMES_YOLO_MODE"] = "0"
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.path.insert(0, str(source))

from model_tools import get_tool_definitions  # noqa: E402
from run_agent import AIAgent  # noqa: E402
from tools.registry import registry, tool_result  # noqa: E402


TOOL_NAME = "syno_probe_search"
TOOLSET = "syno-probe"
calls: list[dict] = []


def handle_probe(arguments: dict, **_kwargs) -> str:
    calls.append(arguments)
    return tool_result({"items": [{"path": "vault/probe.md"}]})


registry.register(
    name=TOOL_NAME,
    toolset=TOOLSET,
    schema={
        "name": TOOL_NAME,
        "description": "Credential-free Syno proxy probe",
        "parameters": {
            "type": "object",
            "required": ["query"],
            "properties": {"query": {"type": "string"}},
            "additionalProperties": False,
        },
    },
    handler=handle_probe,
)

empty_tools = [item["function"]["name"] for item in get_tool_definitions(enabled_toolsets=[], quiet_mode=True)]
probe_tools = [item["function"]["name"] for item in get_tool_definitions(enabled_toolsets=[TOOLSET], quiet_mode=True)]


class FakeProvider(BaseHTTPRequestHandler):
    request_count = 0
    paths: list[str] = []
    validations: list[dict] = []

    def log_message(self, _format: str, *_args) -> None:
        return

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("content-length", "0"))
        payload = json.loads(self.rfile.read(length) or b"{}")
        FakeProvider.paths.append(self.path)
        if not self.path.endswith("/chat/completions"):
            body = b"{}"
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        FakeProvider.request_count += 1
        advertised = [item.get("function", {}).get("name") for item in payload.get("tools", [])]
        validation = {
            "advertised": advertised,
            "model": payload.get("model"),
            "stream": payload.get("stream", "omitted"),
        }
        FakeProvider.validations.append(validation)
        # OpenAI's SDK omits ``stream`` for its non-streaming default.
        if advertised != [TOOL_NAME] or payload.get("model") != "syno-fixed-model" or payload.get("stream", False) is not False:
            self.send_response(400)
            self.end_headers()
            return
        if FakeProvider.request_count == 1:
            message = {
                "role": "assistant", "content": None,
                "tool_calls": [{"id": "call-probe", "type": "function", "function": {"name": TOOL_NAME, "arguments": "{\"query\":\"agent\"}"}}],
            }
            finish_reason = "tool_calls"
        else:
            message = {"role": "assistant", "content": "probe complete"}
            finish_reason = "stop"
        body = json.dumps({
            "id": f"probe-{FakeProvider.request_count}", "object": "chat.completion", "created": 1,
            "model": "syno-fixed-model", "choices": [{"index": 0, "message": message, "finish_reason": finish_reason}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeProvider)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    agent = AIAgent(
        base_url=f"http://127.0.0.1:{server.server_port}/v1", api_key="fake-probe-token",
        provider="custom", api_mode="chat_completions", model="syno-fixed-model",
        max_iterations=4, tool_delay=0, enabled_toolsets=[TOOLSET], fallback_model=None,
        skip_context_files=True, skip_memory=True, load_soul_identity=False,
        checkpoints_enabled=False, quiet_mode=True,
    )
    # Pinned Hermes 0.18.2 has no public non-streaming constructor option.
    # Its own conversation loop honors this private flag and routes through
    # the normal non-streaming Chat Completions implementation. The spike
    # records this coupling so an upstream bump cannot happen silently.
    agent._disable_streaming = True
    answer = agent.chat("Use the single provided tool and finish.")
finally:
    server.shutdown()
    server.server_close()

report = {
    "ok": empty_tools == [] and probe_tools == [TOOL_NAME] and answer == "probe complete" and calls == [{"query": "agent"}],
    "emptyTools": empty_tools,
    "probeTools": probe_tools,
    "answer": answer,
    "toolCalls": calls,
    "providerRequests": FakeProvider.request_count,
    "providerPaths": FakeProvider.paths,
    "providerValidations": FakeProvider.validations,
    "constraints": {
        "fixedModel": True, "fallback": False, "memory": False, "contextFiles": False,
        "gateway": False, "cli": False, "credentialsUsed": False,
        "usesPinnedPrivateNonStreamingSwitch": True,
    },
}
print(json.dumps(report, ensure_ascii=False))
raise SystemExit(0 if report["ok"] else 1)
