---
bump: minor
---

### Added

- Multi-provider subscription support for Codex (ChatGPT), Gemini (Code Assist),
  and Qwen (DashScope), alongside the existing Claude support, adopting the best
  practices from ProxyPal. The router now reads each vendor CLI's OAuth
  credential file read-only (`~/.codex/auth.json`, `~/.gemini/oauth_creds.json`,
  `~/.qwen/oauth_creds.json`) via a unified `subscription` module and routes
  `/v1/chat/completions`, `/v1/responses`, and `/v1/models` to the correct
  upstream.
- `UpstreamProvider::{Codex, Gemini, Qwen}` selectable upstreams with provider
  aliases (e.g. `chatgpt`, `google`, `dashscope`).
- Dialect translation between OpenAI Chat Completions, the OpenAI Responses API
  (Codex/ChatGPT backend), and the Gemini Code Assist `generateContent` envelope,
  including SSE synthesis when a client requests streaming from Gemini.
- In-memory OAuth token refresh: expired Codex/Gemini/Qwen tokens are refreshed
  using each vendor's public OAuth client and cached in memory, keeping the proxy
  working even when the vendor CLI is not running. Vendor credential files remain
  read-only and secrets are never logged.
- `router doctor` now probes the Codex/Gemini/Qwen subscription credential files
  and reports whether each is present, valid, or expired.
- Rate-limit headers (`Retry-After`, `x-ratelimit-*`) from subscription upstreams
  are relayed to clients so they can back off intelligently.

### Changed

- Updated dependencies to their latest versions and built on the latest stable
  Rust (edition 2024).
