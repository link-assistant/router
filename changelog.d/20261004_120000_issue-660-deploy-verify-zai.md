---
bump: patch
---

### Fixed
- An exhausted z.ai Coding Plan no longer leaves Claude Code retrying silently. z.ai's account-state codes (1113, 1309–1311, 1314–1321), which z.ai sends as a retryable HTTP 429 `rate_limit_error`, now reach the client as a non-retryable 402 (`billing_error` on Messages, `insufficient_quota` on Chat Completions and Responses) naming the reason, the code and z.ai's request id. Genuine short-window limits (1302, 1305, 1308, 1313) are still relayed unchanged (#657).
- The exhausted account is reported everywhere: `/health/subscriptions` and the subscription gauge show z.ai as degraded with `state: "exhausted"`, `router usage` shows it as `exhausted`, and `router doctor` and `deploy --status` print a `provider_exhausted` line (doctor exits 1). The state is kept in `data/provider-exhaustion.json` and clears when z.ai next serves a request (#657).
- `/api/models`, the `router with claude` picker and Messages routing now agree for one token. An exhausted plan's GLM rows stay listed but are marked `router_available: false` with a reason and labelled `(unavailable)` in the picker. `router with claude` warns before launch when the selected model cannot be served and names an alternative. A request that lacks its client's evidence for a listed model gets 403 `permission_error` instead of a contradictory 404 (#657).
- `deploy --mode host` judges whether Claude credentials are shared by checking the shared home's own Keychain entry, which is named per `CLAUDE_CONFIG_DIR`, without reading its secret (#653).
- `scripts/verify-contracts.rs` runs each target with `--no-fail-fast` and names every area and target that did not execute instead of reporting them as passed (#654, #655). New `scripts/verify-contracts-in-linux.sh` proves the vendor areas from macOS in a disposable Linux container that cannot see the Keychain or the developer's home (#654).
- The host-move ownership test follows the ownership the host actually shows, so it passes on Docker Desktop for macOS (#656).
- Request logs are kept out of the bounded deploy checkpoint, every refusal is named, and `--status` predicts it (#658).
- `deploy --status` without `TOKEN_SECRET` reports convergence as unknown and lists no plan steps instead of guessing (#659).
