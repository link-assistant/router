---
bump: patch
---

### Fixed

- Codex subscription requests with `max_output_tokens`, `max_tokens`, or
  `max_completion_tokens` are now rejected clearly before reaching the
  ChatGPT backend, instead of silently discarding the caller's output and
  spend limit.
