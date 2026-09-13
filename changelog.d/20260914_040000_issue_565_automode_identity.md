---
bump: minor
---

### Fixed
- Auto mode is available again for models reached through a z.ai Coding Plan provider. Claude Code decides this from the capability identity Router advertises and never reads Router's capability metadata, so the previously advertised identity — one the client's auto-mode gate refuses outright — reported `auto mode unavailable for this model` for every model of the provider, however capable it was (issue #565).
- The same identity also told Claude Code to assume a 200K context window with a 32K output ceiling. The vendor documents its current generation at a 1M-token context with a 128K maximum output, so Router was understating the window by five times and making the client auto-compact sessions that still had ample room. The advertised identity now describes the generation the adapter actually serves.
- The offline real-client mock refused Claude Code's `adaptive` thinking mode with a 400, encoding a belief about the z.ai adapter that the live endpoint disproves. Measured directly against the provider: both `adaptive` with `output_config.effort` and `enabled` with `budget_tokens` answer 200 with a signed thinking block. The offline tier now accepts both and still refuses a mode the provider does not implement, so an accepted capability identity can no longer look broken offline while working in production.

### Changed
- The advertised identity turns on the client's effort and adaptive-thinking handling, so Claude Code now forwards effort-style thinking parameters it did not send before. Verified against a live provider before shipping: a real Claude Code 2.1.265 session through Router answered normally with `effort` and the matching beta header forwarded upstream, genuine signed thinking intact, and no upstream rejection. The provider model id sent on the wire is unchanged, and the thinking and tool-use contract from #546 and #554 is preserved.
