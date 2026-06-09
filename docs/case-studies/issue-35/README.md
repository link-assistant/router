# Issue 35 Case Study: Test it locally

## Summary

Issue 35 asked us to use the newly available local Docker and Claude access to
**actually run the router end-to-end**, confirm that everything the
documentation claims really works, and fix the root cause of anything that does
not — in both code and docs. The central functional requirement was to prove
that the proxy can **issue a token that hides the real Claude MAX OAuth access
token**, so that separate tasks can be given a scoped credential that grants
access to the subscription while limiting how much each task can consume.

The work in PR #36 did three things:

1. **Verified the documented credential flow against a real Claude MAX session**
   and found that the router only read a *flat* credential layout, while real
   Claude Code writes a *nested* `claudeAiOauth` object to
   `~/.claude/.credentials.json`. This was the one genuine code bug — fixed in
   `src/oauth.rs`.
2. **Confirmed transparent passthrough and token hiding end-to-end** against
   `api.anthropic.com` using the live subscription, with the real OAuth token
   never appearing in logs or client-visible output.
3. **Added the "limit how much each task can use" capability** the issue asks
   for: a per-token request budget (`max_requests`) enforced with HTTP 429,
   persisted across restarts, and surfaced in the CLI, the admin API, and
   `tokens list`.

## Requirements

The full requirement-by-requirement trace is in
[`requirements.md`](./requirements.md). At a glance, the issue contains five
explicit requirements:

1. Test everything documented locally (Claude + Docker) and fix root causes in
   code **and** docs.
2. Make it possible to issue a token that hides the real access token, copying
   local configuration as needed **without deleting it**.
3. Produce an API token that grants subscription access to separate tasks and
   **limits how much each task can use**.
4. Collect issue data into `docs/case-studies/issue-35/`, do a deep case-study
   analysis, and search online for additional facts.
5. List every requirement, propose solutions/plans per requirement, and survey
   existing components/libraries that solve a similar problem.

## Root Cause: nested credential layout

Real Claude Code stores its OAuth session like this (token bytes redacted):

```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-…",
    "refreshToken": "sk-ant-ort01-…",
    "expiresAt": 1781050618000,
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max"
  }
}
```

The pre-fix reader looked only for a top-level `accessToken`/`access_token`
field, so against a real session it found **no token** and could not substitute
the upstream credential. `src/oauth.rs` now accepts both the nested
`claudeAiOauth` object and the flat layout via `extract_token()` /
`expires_at_ms()`, covered by unit tests. `run_doctor` additionally probes the
credential file and reports `found, token OK` / `found, NO TOKEN` / `MISSING`.

## Feature: per-token request budget

To satisfy "limit how much each task can use tokens", a token now carries an
optional `max_requests` cap and a persisted `used_requests` counter:

- `src/storage.rs`: `TokenRecord` gained `max_requests: Option<u64>` and
  `used_requests: u64` (both `#[serde(default)]` for backward compatibility),
  the Lino text codec round-trips `(max_requests N)` / `(used_requests N)`, and
  `TokenStore::try_consume_request` atomically-enough checks-and-increments.
- `src/token.rs`: `issue_token_full(ttl, label, account, max_requests)` writes
  the cap; `enforce_request_budget(token_id)` returns
  `TokenError::LimitExceeded` once the cap is hit.
- `src/proxy.rs`: every forwarding path (`/v1/messages`, OpenAI, Gonka) calls
  `enforce_request_budget` after token validation and returns
  `429 rate_limit_error` when exhausted.
- `src/token_admin.rs`, `src/cli.rs`, `src/main.rs`: the admin endpoint accepts
  `max_requests`, the CLI accepts `--max-requests`, and `tokens list` shows a
  `used/max` column.

## Evidence

Archived under [`raw/`](./raw/):

- `issue-35.json`, `issue-35-comments.json` — issue body and (zero) comments.
- `server.log.redacted` — router startup log from the live run (no OAuth token
  present; verified with `grep`).
- `count_tokens-200.json` — `/v1/messages/count_tokens` returned
  `{"input_tokens":14}` (HTTP 200) when the client sent **only** a `la_sk_`
  token and no `anthropic-version`/beta headers, proving transparent header
  injection and token substitution work.
- `budget-exhausted-429.json` — the router's own
  `{"error":{"message":"Token has reached its request limit",...}}` body.
- `tokens-list.txt` — `tokens list` showing the `e2e-budget` token at `2/2`
  (exhausted) alongside unlimited `…/-` tokens.

## End-to-end verification

Performed live against `https://api.anthropic.com` with a copy of the real
Claude MAX credentials (the original file at `~/.claude/.credentials.json` was
**only read/copied, never modified or deleted** — confirmed unchanged at 471
bytes afterward):

| Check | Result |
| --- | --- |
| Client sends only `la_sk_` token to `count_tokens` | HTTP 200, `{"input_tokens":14}` |
| Real OAuth token appears in server logs | 0 occurrences (`grep`) |
| Missing token | 401 |
| Invalid token | 401 |
| Revoked token | 403 |
| Capped token (`max_requests=2`) after 2 requests | 3rd request → our 429 `Token has reached its request limit` (no upstream `request_id`) |
| Unlimited token | unaffected |
| Usage persistence | text store shows `(max_requests 2) (used_requests 2)`; `tokens list` shows `2/2` |

Note: live `/v1/messages` inference returned an upstream `429` with a genuine
Anthropic `request_id` during testing. That is a real account-level inference
rate limit on the shared MAX account, **not** a router bug — proven by
`count_tokens` (which is not inference-metered) returning 200 through the same
path.

### Docker

The same flow was re-verified through the container image. `link-assistant/router`
was built from the repo `Dockerfile` and run with a **copy** of the real Claude
MAX credentials mounted read-only at `/data/claude` (the Dockerfile default
`CLAUDE_CODE_HOME`); the original `~/.claude/.credentials.json` was never touched.
The container read the nested credential, started cleanly, issued a token with
`max_requests`, returned HTTP 200 from `count_tokens` for a client sending only a
`la_sk_` token, enforced the budget with 429, returned 401 for missing/invalid
tokens, and never logged the real OAuth token. Evidence is in
[`raw/docker/`](./raw/docker/).

## Online research and component survey

See [`online-research.md`](./online-research.md) for primary-source facts on the
Claude Code credential format, the `anthropic-beta: oauth-2025-04-20` flag, and
the `anthropic-version` header, and [`components-survey.md`](./components-survey.md)
for how existing gateways (LiteLLM virtual keys/budgets, Portkey, Kong AI
Gateway, community Claude proxies) solve the same scoped-credential / budget
problem and why a small native counter was the right fit here.

## Local Verification

The standard local CI gate was run before finalizing (see PR #36 for the
authoritative status):

- `cargo fmt --all -- --check`
- `cargo clippy --all-targets --all-features`
- `rust-script scripts/check-file-size.rs`
- `cargo test --all-features`
- `cargo test --doc`
- `cargo build --release`
