---
bump: patch
---

### Fixed
- Return JSON parse and Messages validation errors in the requesting API dialect.
- Preserve terminal usage in translated streams and implement Chat Completions `include_usage` chunks.
- Hide Codex subscription metadata and malformed upstream bodies while retaining safe quota headers.
- Disclose when Codex cannot enforce the required Anthropic `max_tokens` field.
