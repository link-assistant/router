---
bump: patch
---

### Fixed
- Configure OpenCode, Qwen Code, and Agent with models from the router's authenticated live catalog instead of a hardcoded Claude model, while preserving user model choices.
- Make client diagnostics probe an advertised model owned by the expected subscription and report unavailable catalog models clearly.
- Keep Grok CLI usable with Codex subscriptions by dropping its unavoidable Chat Completions output cap before forwarding.

### Security
- Stop printing router tokens during client setup; write shell exports to a mode-`0600` environment file instead.
