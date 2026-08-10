---
bump: patch
---

### Fixed

- Assemble non-streaming ChatGPT subscription responses from their streamed output events, always send `store: false` to that backend, and omit deprecated `temperature` values from Claude 5 requests.
