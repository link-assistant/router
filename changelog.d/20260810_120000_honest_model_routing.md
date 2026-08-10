---
bump: patch
---

### Fixed
- Reject unknown model IDs on Anthropic-backed OpenAI endpoints with `404 not_found_error`, keep aliases explicit, and report the model that actually served successful buffered and streaming responses.
