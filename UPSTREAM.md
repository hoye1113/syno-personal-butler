# Upstream provenance

Syno 使用全新 Git 历史，不合并任何上游提交历史，也不自动跟踪上游。

## Afu

- Source: <https://github.com/LearnPrompt/afu-llm-todo>
- Imported commit: `1e73697592800a16f719fc984a5e3dd2b0380488`
- License: MIT
- Import form: source snapshot under `apps/syno/`
- Excluded: upstream `.git`, sample vault, demo video and local configuration

## Knowledge vault

- Source snapshot: `hoye1113/longterm-ai-vault`
- Imported commit: `883fbf5c457156805b9e9b53358175ce84940b59`
- Import form: tracked files copied under `vault/`, without Git history or Obsidian state

## Weixin iLink references

- Tencent reference: <https://github.com/Tencent/openclaw-weixin> (MIT)
- Claude channel study sample: <https://github.com/Johnixr/claude-code-wechat-channel> (MIT)
- Syno implements an independent `WeixinIlinkAdapter`; neither package is a runtime dependency.

## Hermes Agent candidate

- Source: <https://github.com/nousresearch/hermes-agent>
- Spike commit: `0f102fa4dc04b7dfdab048169aaaa640d09d7523`
- Observed version: `0.18.2`
- License: MIT
- Integration form: read-only, pinned-source Python sidecar candidate behind Syno's `CognitiveRuntime`; no Hermes files are copied or modified.
- Status: credential-free capability spike passed, but Hermes is not an active product runtime. Real Provider, process recovery, cancellation and injection gates remain.

