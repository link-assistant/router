---
bump: patch
---

### Fixed

- Codex subscription proxy now shapes `/v1/responses` (and projected
  `/v1/chat/completions`) request bodies for the ChatGPT Codex backend: the
  unsupported `max_output_tokens` parameter is stripped and a default
  `instructions` field is injected when the client omits one. Standard OpenAI
  Responses clients (e.g. OpenClaw) previously received HTTP 400
  "Unsupported parameter: max_output_tokens" / "Instructions are required".
