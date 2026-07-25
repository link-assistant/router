---
bump: minor
---

### Added

- Provider-neutral multi-subscription pools for Claude, Codex, Gemini, and Qwen
  with strict token pins, session affinity, round-robin/fill-first/least-used
  selection, configurable per-account request caps, and `Retry-After`-aware
  quota cooldowns.
- Formal AI-style namespaced protocol routes for Anthropic, OpenAI, Codex,
  Qwen, native Gemini `generateContent`, and Vertex publisher-model requests.
- Issue #42 research and requirement trace under
  `docs/case-studies/issue-42`.

### Fixed

- Subscription requests now enforce router-token request budgets, keep
  refreshed credentials isolated per account, and preserve original request
  metadata when selecting an account before protocol translation.
