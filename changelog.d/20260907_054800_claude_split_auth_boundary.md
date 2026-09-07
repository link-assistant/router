---
bump: patch
---

### Fixed

- Detect Claude Code's process-wide authentication boundary before launch, reject explicit Claude.ai-only operations before Router access or token minting, fail closed on unreviewed client releases, preserve the stored login byte-for-byte, and keep Router inference and model discovery available with a precise native-service diagnostic ([#520](https://github.com/link-assistant/router/issues/520)).
