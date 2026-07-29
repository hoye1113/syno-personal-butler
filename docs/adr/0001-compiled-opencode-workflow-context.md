---
status: accepted
---

# Compile canonical workflow context for OpenCode

Syno keeps thin project-level OpenCode Skills for intent and interaction, while Syno itself selects and compiles bounded, versioned context from the canonical rules under `vault/99-System`. OpenCode must not scan the rule directory or own workflow state: this avoids a second rule source, limits private context exposure, and lets proposals remain bound to the exact rules that produced them.
