---
bump: patch
---

### Fixed

- Rejected Anthropic Messages requests missing `model`, `max_tokens`, or
  `messages` before model routing, catalog discovery, or provider calls.
