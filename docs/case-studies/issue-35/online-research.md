# Online Research

Primary and authoritative sources consulted while verifying the documented
behaviour and designing the fix/feature.

## Claude Code OAuth credential format and headers

Sources:
- [Claude Code Authentication docs](https://code.claude.com/docs/en/authentication)
- Real on-disk `~/.claude/.credentials.json` from the local Claude MAX session
  (inspected directly; token bytes redacted).

Relevant facts:

- Claude Code authenticates to a Claude subscription (Pro/Max/Team/Enterprise)
  with an OAuth token, not an API key. The session credential is written to
  `~/.claude/.credentials.json`.
- The real file nests the token under a `claudeAiOauth` object with
  `accessToken`, `refreshToken`, `expiresAt` (epoch **milliseconds**),
  `scopes`, and `subscriptionType` — not a flat top-level `accessToken`.
- `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_BASE_URL` are the documented way to point
  Claude Code at an LLM gateway that authenticates with a bearer token, which is
  exactly the integration shape this router targets.

Impact on this issue:

- The router's flat-only reader was the genuine root-cause bug: against a real
  session it found no token. `src/oauth.rs` now handles both layouts and reads
  `expiresAt` from inside `claudeAiOauth`.
- Because the gateway pattern expects the client to send only a bearer token,
  the router must inject `anthropic-version` and the OAuth beta flag itself
  (below) so a `la_sk_` client needs nothing else.

## OAuth beta flag and anthropic-version header

Sources:
- [Anthropic Messages API versioning](https://docs.anthropic.com/en/api/versioning)
- Community reports of OAuth/Claude-Max proxying requiring the
  `anthropic-beta: oauth-2025-04-20` header
  ([example](https://github.com/NousResearch/hermes-agent/issues/15080)).

Relevant facts:

- The Anthropic Messages API requires an `anthropic-version` header; `2023-06-01`
  is the current stable value.
- Requests authenticated with a Claude subscription OAuth token (rather than an
  API key) are accepted on the `oauth-2025-04-20` beta; the
  `anthropic-beta: oauth-2025-04-20` header must be present.
- Anthropic's Consumer Terms restrict subscription OAuth tokens to Claude Code /
  claude.ai. This router is a self-hosted gateway in front of the user's *own*
  subscription for the user's *own* tasks, which is the intended local-testing
  scenario of this issue.

Impact on this issue:

- The router defaults `anthropic-version` to `2023-06-01` when the client omits
  it and merges `oauth-2025-04-20` into any `anthropic-beta` the client sent, so
  the documented "client only needs the `la_sk_` token" claim is now true and
  was verified live (`count_tokens` → HTTP 200 with no client-side version/beta
  headers).

## Per-key budget / rate-limit prior art

Source: [LiteLLM Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys),
[LiteLLM Budgets & Rate Limits](https://docs.litellm.ai/docs/proxy/users).

Relevant facts:

- LiteLLM issues virtual keys with `max_budget`, `budget_duration`,
  `rpm_limit`/`tpm_limit`, and `max_parallel_requests`, and rejects requests with
  a clear error once a key's budget is exceeded.
- This confirms the "scoped key with a usage cap, enforced at the gateway" shape
  is the established pattern for exactly the problem the issue describes.

Impact on this issue:

- A full spend/time/parallel system would be over-scoped for "limit how much each
  task can use". A persisted per-token **request count** cap with a 429 on
  exhaustion delivers the requested behaviour with no new dependency. See
  `components-survey.md` for the full comparison.
