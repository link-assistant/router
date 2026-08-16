---
bump: minor
---

### Fixed

- Codex subscriptions now honor `max_output_tokens`, `max_tokens`, and
  `max_completion_tokens` instead of answering HTTP 400. The field is still
  stripped from the ChatGPT request (the backend rejects it), and the router
  enforces the cap locally: visible output is truncated and the exchange ends
  with `finish_reason: "length"` (Chat Completions) or
  `status: "incomplete"` with `incomplete_details.reason: "max_output_tokens"`
  (Responses). This unblocks OpenCode, Grok CLI and `@link-assistant/agent`,
  which all send an output cap on every request. The budget is estimated at
  ~4 characters per token and hidden reasoning tokens are not observable, so
  the cap bounds visible output rather than billed tokens.
- Responses and Chat Completions keep the requested model id — including
  catalog aliases such as `codex-auto-review` — in `model` for buffered and
  streamed replies on every OpenAI surface. The concrete model the provider
  served is reported separately in the `x_router_upstream_model` body field
  and the `x-router-upstream-model` response header, instead of replacing the
  identity the caller selected.
