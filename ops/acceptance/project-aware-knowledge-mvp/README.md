# Project-aware Knowledge MVP acceptance evidence

This directory stores redacted evidence produced by the opt-in live test:

```powershell
$env:SYNO_RUN_REAL_DSH = "1"
pnpm exec node --test tests/project-aware-dsh-live.test.mjs
```

The test reads `DEEPSEEK_API_KEY` from the host environment only. It must not be passed as an argument or written to a file. Evidence contains metadata, model/runtime status, ranking summaries, stable IDs, tool/context observations and short redacted Agent response previews; it must not contain API keys, Bridge tokens, cookies or full sensitive knowledge content.

Phase 5 is `DONE` only after the evidence also contains Owner confirmation of Project A / no-Project / Project B retrieval improvement and all automated gates pass. Until then, generated evidence is `PARTIAL` and the authoritative status remains in `docs/project-aware-knowledge-execution-plan.md`.

The latest evidence pair is `jsonrpc-20260826T145335Z.json` and `web-search-20260826T145515Z.json`. The live test uses a temporary `.runtime/tests` fixture for Project, Job, Workflow, Proposal and Vault state. It does not modify the external `deepseek-harness` checkout.
