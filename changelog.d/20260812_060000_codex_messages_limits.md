---
bump: patch
---

### Fixed

- Anthropic Messages requests can use Codex subscription models again: the
  protocol-required `max_tokens` field no longer triggers the rejection kept
  for optional Responses and Chat Completions output limits.
