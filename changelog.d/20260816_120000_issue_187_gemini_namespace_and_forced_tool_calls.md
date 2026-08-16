---
bump: minor
---

### Added

- The native Gemini namespace (`/api/gemini/v1beta/...`) now serves every connected subscription. `GET /api/gemini/v1beta/models` returns the same live union as `/v1/models`, and `generateContent` / `streamGenerateContent` route each model to its owning vendor, so Gemini CLI can run on a Codex or Claude subscription with one router JWT and no Gemini credential. Previously these routes required `UPSTREAM_PROVIDER=gemini` and returned `{"models":[]}` or `no healthy gemini credential is available` otherwise.
- `UPSTREAM_READ_TIMEOUT_SECS` (default `120`, `0` disables) bounds how long the router waits for the next byte from an upstream.

### Fixed

- Requests offering only server-side tools (`web_search`, `web_fetch`) together with a forced tool choice (`tool_choice: {"type":"any"}` or `"required"`) are now refused with a fast `400` on the Anthropic, Chat Completions and Responses surfaces. Such a request cannot be satisfied — the backend executes those tools itself and never emits a function call — and previously left the client waiting indefinitely.
- `generationConfig.maxOutputTokens` now works on every model reachable through the native Gemini namespace: Gemini and Claude enforce it upstream, and Codex-owned models inherit the router's local emulation, so the answer arrives truncated with `finishReason: "MAX_TOKENS"` instead of being refused.
- The shared upstream HTTP client had no timeout at all, so a silent backend stalled a request forever; reads are now bounded.
