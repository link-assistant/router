## Summary

Fixes #35.

This PR uses the local Docker + Claude MAX access to run the router end-to-end,
verifies that everything the docs claim actually works, fixes the one genuine
code bug found, and adds the "limit how much each task can use" capability the
issue asks for.

Three outcomes:

1. **Fixed the real root-cause bug.** Real Claude Code writes its OAuth session
   to `~/.claude/.credentials.json` nested under a `claudeAiOauth` object. The
   router only read a *flat* `accessToken`, so against an actual login it found
   no token. `src/oauth.rs` now reads both the nested and flat layouts.
2. **Proved token hiding + transparent passthrough** end-to-end against
   `api.anthropic.com`, both natively and through the Docker image. A client
   sending only a `la_sk_` token (no `anthropic-version`, no OAuth beta header)
   gets a working upstream response; the real OAuth token never appears in logs
   or client-visible output.
3. **Added a per-token request budget** so a scoped token can be handed to a
   separate task with a hard cap on how many upstream requests it may make.

## Changes

### Fixed — nested Claude MAX credential layout (`src/oauth.rs`)
- `extract_token()` / `expires_at_ms()` accept both the nested `claudeAiOauth`
  object (real Claude Code) and the flat `{"accessToken": ...}` layout.
- `doctor` probes the credential file and reports `found, token OK` /
  `found, NO TOKEN` / `MISSING`.

### Added — per-token request budget (`max_requests`)
- `src/storage.rs`: `TokenRecord` gains `max_requests: Option<u64>` and
  `used_requests: u64` (both `#[serde(default)]`, backward compatible); the Lino
  text codec round-trips `(max_requests N)` / `(used_requests N)`;
  `TokenStore::try_consume_request` checks-and-increments.
- `src/token.rs`: `issue_token_full(...)` writes the cap;
  `enforce_request_budget(...)` returns `TokenError::LimitExceeded` once hit.
- `src/proxy.rs`: every forwarding path (Anthropic, OpenAI, Gonka) enforces the
  budget after token validation and returns `429 rate_limit_error` when
  exhausted. Admin token endpoints were extracted to a new `src/token_admin.rs`
  to stay under the 1000-line per-file CI limit.
- `src/cli.rs` / `src/main.rs` / `src/token_admin.rs`: `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.

### Docs
- README: documented the nested credential layout, transparent header injection
  (`anthropic-version` default + `anthropic-beta: oauth-2025-04-20`), and the
  per-token budget; corrected the stale note claiming revocations are lost on
  restart (records are persisted).
- `docs/case-studies/issue-35/`: full case study — requirement-by-requirement
  trace, online research (primary sources), existing-components survey (LiteLLM
  virtual keys/budgets, Portkey, Kong AI Gateway, community Claude proxies), and
  redacted live + Docker evidence.
- `changelog.d/20260609_233000_issue_35_local_testing.md` (`bump: minor`).

## How it was verified (live + Docker)

Performed against `https://api.anthropic.com` with a **copy** of the real Claude
MAX credentials. The original `~/.claude/.credentials.json` was only read/copied
— never modified or deleted (confirmed unchanged at 471 bytes).

| Check | Result |
| --- | --- |
| Client sends only `la_sk_` token to `count_tokens` | HTTP 200 `{"input_tokens":13}` |
| Real OAuth token in server / container logs | 0 occurrences |
| Missing token | 401 |
| Invalid token | 401 |
| Revoked token | 403 |
| Capped token after its budget | our 429 `Token has reached its request limit` (no upstream `request_id`) |
| Usage persistence | text store `(max_requests 2) (used_requests 2)`; `tokens list` → `2/2` |
| Docker image (`Dockerfile`) with copied creds mounted `:ro` | identical results; nested creds read; no token leak |

Evidence: `docs/case-studies/issue-35/raw/` (native) and
`docs/case-studies/issue-35/raw/docker/` (container).

> Note: live `/v1/messages` inference returned an upstream `429` with a genuine
> Anthropic `request_id` — a real account-level inference rate limit on the
> shared MAX account, not a router bug. `count_tokens` (not inference-metered)
> returning 200 through the same path proves the proxy path itself is healthy.

## Tests

- New unit tests in `src/token.rs`: `test_unlimited_token_never_hits_budget`,
  `test_request_budget_enforced` (caps at 3, 4th = `LimitExceeded`, usage
  persisted), `test_budget_for_unknown_token_is_permitted`.
- `src/storage.rs` round-trip literals updated for the new fields.
- `src/oauth.rs` tests cover nested + flat layouts.

## Local CI gate (all green)

`cargo fmt --check` · `cargo clippy --all-targets --all-features` ·
file-size check (all `src/*.rs` < 1000 lines) · `cargo test --all-features`
(141 tests pass) · `cargo test --doc` · `cargo build --release`.

Version bump is intentionally **not** hand-edited in `Cargo.toml` — the repo
derives it from the `changelog.d` fragment (`bump: minor`), enforced by the
`prevent_manual_version_modification` policy.
