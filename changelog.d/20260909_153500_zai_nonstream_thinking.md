---
bump: patch
---

### Fixed

- Adapt Claude Code's non-streaming thinking requests to z.ai's streaming-only Anthropic endpoint, then return one native Anthropic message without changing streaming relays ([#554](https://github.com/link-assistant/router/issues/554)).
