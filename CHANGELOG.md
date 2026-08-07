# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- changelog-insert-here -->























## [0.23.0] - 2026-08-07

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).

### Added

- Added the issue #37 case-study package under `docs/case-studies/issue-37`,
  analyzing how to adopt the best experience from ProxyPal
  (`heyhuynhgiabuu/proxypal`) to fully support Claude, Codex, Gemini, and Qwen
  subscriptions. Includes a requirement trace (process + functional), file-level
  solution plans per requirement, an existing-components survey (CLIProxyAPI,
  ProxyPal, LiteLLM, the `oauth2`/`openidconnect` crates), online research with
  primary sources for each provider's OAuth endpoints/tokens/quotas, a deep
  inventory of ProxyPal and its CLIProxyAPI engine, and raw research snapshots.

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

### Fixed

- Codex subscription proxy now shapes `/v1/responses` (and projected
  `/v1/chat/completions`) request bodies for the ChatGPT Codex backend: the
  unsupported `max_output_tokens` parameter is stripped and a default
  `instructions` field is injected when the client omits one. Standard OpenAI
  Responses clients (e.g. OpenClaw) previously received HTTP 400
  "Unsupported parameter: max_output_tokens" / "Instructions are required".

### Added
- Codex subscriptions now send a `version` header (default `0.144.1`, overridable via
  `CODEX_CLIENT_VERSION`) when proxying to the ChatGPT backend. The backend gates newer
  models (e.g. `gpt-5.6-luna`) behind a recent client version; without the header
  `POST /responses` returns `Model not found`. This mirrors the Codex CLI so newer models
  are usable through the router.

### Added

- Provider-neutral multi-subscription pools for Claude, Codex, Gemini, and Qwen
  with strict token pins, session affinity, round-robin/fill-first/least-used
  selection, configurable per-account request caps, and `Retry-After`-aware
  quota cooldowns.
- Formal AI-style namespaced protocol routes for Anthropic, OpenAI, Codex,
  Qwen, native Gemini `generateContent`, and Vertex publisher-model requests.
- Issue #42 research and requirement trace under
  `docs/case-studies/issue-42`.

### Fixed

- Subscription requests now enforce router-token request budgets, keep
  refreshed credentials isolated per account, and preserve original request
  metadata when selecting an account before protocol translation.

- Serve the Anthropic Messages API on top of non-Anthropic upstreams. Claude Code (and any other Anthropic-dialect client) can now run against the Codex, Qwen, Gemini, and OpenAI-compatible providers: requests are translated to the provider's own dialect, delegated to that provider's existing forwarder, and the reply is translated back — including streaming, tool calls, and images.
- Add `--bridge-model` / `ANTHROPIC_BRIDGE_MODEL` to pick the upstream model used for bridged Anthropic requests (per-provider default otherwise).
- Answer `POST /v1/messages/count_tokens` locally for bridged upstreams with a documented estimate.

- Added `docs/use-cases/`: one document per supported scenario — per-task tokens, audit/monitoring, Claude MAX inside Codex CLI, ChatGPT/Qwen/Gemini/LiteLLM inside Claude Code — plus per-CLI configuration guides for Claude Code, Codex CLI, Qwen Code, Gemini CLI, opencode and Grok CLI, and an explicit non-support note for Cursor CLI. Linked from `README.md`, which now also documents `--bridge-model` and `--audit-log`.

- Require a valid router token for `POST /v1/messages/count_tokens` when the request is served locally by the Anthropic bridge; expired or revoked tokens no longer receive an estimate (the per-token request budget is still not consumed, since nothing is spent upstream).

- Prepend the Claude Code identity system block to Anthropic upstream requests backed by a Claude subscription OAuth credential. Without it `api.anthropic.com` rejects non-Claude-Code clients with a misleading `429 rate_limit_error`, which broke the documented "Claude MAX inside Codex" use case (`/v1/responses`) and any Anthropic SDK or `curl` client on `/v1/messages`. The change is idempotent for Claude Code's own requests, keeps the caller's system prompt, and never alters API-key traffic.

- Added `docs/use-cases/self-hosting.md` for running the router as an internal component of personal or corporate infrastructure: deployment shapes (local process, Docker, corporate host), what lives on disk and what to back up, and — stated up front — the fact that `POST /api/tokens` is open to any caller that can reach the port unless `TOKEN_ADMIN_KEY` is set, while the default bind address is `0.0.0.0`. Backed by `experiments/issue-45/test-deployment-hardening.sh`, which asserts the admin surface's behaviour in Docker without a subscription or upstream egress.

## [0.22.0] - 2026-07-25

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).

### Added

- Added the issue #37 case-study package under `docs/case-studies/issue-37`,
  analyzing how to adopt the best experience from ProxyPal
  (`heyhuynhgiabuu/proxypal`) to fully support Claude, Codex, Gemini, and Qwen
  subscriptions. Includes a requirement trace (process + functional), file-level
  solution plans per requirement, an existing-components survey (CLIProxyAPI,
  ProxyPal, LiteLLM, the `oauth2`/`openidconnect` crates), online research with
  primary sources for each provider's OAuth endpoints/tokens/quotas, a deep
  inventory of ProxyPal and its CLIProxyAPI engine, and raw research snapshots.

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

### Fixed

- Codex subscription proxy now shapes `/v1/responses` (and projected
  `/v1/chat/completions`) request bodies for the ChatGPT Codex backend: the
  unsupported `max_output_tokens` parameter is stripped and a default
  `instructions` field is injected when the client omits one. Standard OpenAI
  Responses clients (e.g. OpenClaw) previously received HTTP 400
  "Unsupported parameter: max_output_tokens" / "Instructions are required".

### Added
- Codex subscriptions now send a `version` header (default `0.144.1`, overridable via
  `CODEX_CLIENT_VERSION`) when proxying to the ChatGPT backend. The backend gates newer
  models (e.g. `gpt-5.6-luna`) behind a recent client version; without the header
  `POST /responses` returns `Model not found`. This mirrors the Codex CLI so newer models
  are usable through the router.

### Added

- Provider-neutral multi-subscription pools for Claude, Codex, Gemini, and Qwen
  with strict token pins, session affinity, round-robin/fill-first/least-used
  selection, configurable per-account request caps, and `Retry-After`-aware
  quota cooldowns.
- Formal AI-style namespaced protocol routes for Anthropic, OpenAI, Codex,
  Qwen, native Gemini `generateContent`, and Vertex publisher-model requests.
- Issue #42 research and requirement trace under
  `docs/case-studies/issue-42`.

### Fixed

- Subscription requests now enforce router-token request budgets, keep
  refreshed credentials isolated per account, and preserve original request
  metadata when selecting an account before protocol translation.

## [0.21.0] - 2026-07-18

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).

### Added

- Added the issue #37 case-study package under `docs/case-studies/issue-37`,
  analyzing how to adopt the best experience from ProxyPal
  (`heyhuynhgiabuu/proxypal`) to fully support Claude, Codex, Gemini, and Qwen
  subscriptions. Includes a requirement trace (process + functional), file-level
  solution plans per requirement, an existing-components survey (CLIProxyAPI,
  ProxyPal, LiteLLM, the `oauth2`/`openidconnect` crates), online research with
  primary sources for each provider's OAuth endpoints/tokens/quotas, a deep
  inventory of ProxyPal and its CLIProxyAPI engine, and raw research snapshots.

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

### Fixed

- Codex subscription proxy now shapes `/v1/responses` (and projected
  `/v1/chat/completions`) request bodies for the ChatGPT Codex backend: the
  unsupported `max_output_tokens` parameter is stripped and a default
  `instructions` field is injected when the client omits one. Standard OpenAI
  Responses clients (e.g. OpenClaw) previously received HTTP 400
  "Unsupported parameter: max_output_tokens" / "Instructions are required".

### Added
- Codex subscriptions now send a `version` header (default `0.144.1`, overridable via
  `CODEX_CLIENT_VERSION`) when proxying to the ChatGPT backend. The backend gates newer
  models (e.g. `gpt-5.6-luna`) behind a recent client version; without the header
  `POST /responses` returns `Model not found`. This mirrors the Codex CLI so newer models
  are usable through the router.

## [0.20.0] - 2026-06-17

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).

### Added

- Added the issue #37 case-study package under `docs/case-studies/issue-37`,
  analyzing how to adopt the best experience from ProxyPal
  (`heyhuynhgiabuu/proxypal`) to fully support Claude, Codex, Gemini, and Qwen
  subscriptions. Includes a requirement trace (process + functional), file-level
  solution plans per requirement, an existing-components survey (CLIProxyAPI,
  ProxyPal, LiteLLM, the `oauth2`/`openidconnect` crates), online research with
  primary sources for each provider's OAuth endpoints/tokens/quotas, a deep
  inventory of ProxyPal and its CLIProxyAPI engine, and raw research snapshots.

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

## [0.19.0] - 2026-06-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

### Added

- Added a per-token request budget: tokens can carry an optional `max_requests`
  cap with a persisted `used_requests` counter, enforced on every upstream
  forwarding path (Anthropic, OpenAI-compatible, Gonka) with an HTTP 429
  `rate_limit_error` once exhausted. Exposed via the CLI `tokens issue
  --max-requests`, the `POST /api/tokens` `max_requests` field, and a `used/max`
  column in `tokens list`.
- Added the issue #35 case-study package under `docs/case-studies/issue-35`,
  including a full requirement trace, online research with primary sources, an
  existing-components survey (LiteLLM virtual keys/budgets, Portkey, Kong AI
  Gateway, community Claude proxies), and redacted live end-to-end evidence.

### Fixed

- Fixed Claude MAX credential reading: the router now parses the real Claude Code
  `~/.claude/.credentials.json` layout, where the OAuth token is nested under a
  `claudeAiOauth` object (`accessToken`, `refreshToken`, `expiresAt`, `scopes`,
  `subscriptionType`), in addition to the previously supported flat layout.
  `doctor` now probes the credential file and reports whether a usable token was
  found.

### Changed

- Documented the nested credential layout, transparent header injection
  (`anthropic-version` default plus the `anthropic-beta: oauth-2025-04-20` flag),
  and the per-token request budget in `README.md`, and corrected the stale note
  claiming token revocations are lost on restart (records are persisted).

## [0.18.0] - 2026-05-12

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

### Added
- Add an optional Crater ForgeFed upstream provider for OpenAI chat completions, including `Offer{Ticket}` delivery, `Accept.result` polling, SSE responses, and `TaskProvider` backend abstraction.

## [0.17.0] - 2026-05-10

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

### Added

- Added issue 31 LiteLLM compatibility research and an architecture decision
  record defining the router's LiteLLM-compatible gateway contract.
- Added `UPSTREAM_PROVIDER=openai-compatible` routing for LiteLLM and other
  OpenAI-compatible upstreams.
- Added encrypted provider storage in `<DATA_DIR>/providers.lenv` with
  `providers add|list|show|remove|import` CLI commands and `/api/providers`
  admin endpoints.
- Added `.lenv`, JSON, and indented Links-style provider imports.
- Added OpenAI SSE translation for Anthropic-backed chat and responses streams.

### Fixed

- Accepted router tokens from either `Authorization: Bearer ...` or `x-api-key`
  while stripping client credentials before upstream forwarding.
- Synchronized the root package version in `Cargo.lock` with `Cargo.toml` after
  the v0.16.0 release bump.

## [0.16.0] - 2026-05-10

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

### Fixed
- Fixed GitHub release creation by removing unsupported Rust regex look-ahead from changelog section parsing.

## [0.15.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

### Fixed
- Installed native OpenSSL build dependencies in the Docker builder stage so release image publishing can compile crates that use `openssl-sys`.

## [0.14.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

### Fixed
- Updated the Docker builder image to track a supported Rust 1.x toolchain on Debian bookworm so release image builds can compile dependencies that use Rust 2024 edition metadata.

## [0.13.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Add optional Machine Payments Protocol 402 charge challenges for OpenAI-compatible `/v1/chat/completions` and `/v1/responses` endpoints.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

## [0.12.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

### Added
- Added Docker Hub publishing for `konard/link-assistant-router` during crate releases, with release notes and README badges for the Docker image.

### Changed
- Release checks now verify crates.io, Docker Hub, and GitHub release artifacts before deciding that a version is fully published.

## [0.11.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

### Fixed

- Map both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` secrets into Cargo's native `CARGO_REGISTRY_TOKEN` environment variable in release jobs, keeping the crates.io publish fallback explicit and consistent.

### Added

- Add crates.io and docs.rs badges to the README, and include a crates.io badge/link in generated GitHub release notes.
- Extend the release workflow invariant check to verify crates.io secret fallback, GHCR publishing, and release-note crates.io links.

## [0.10.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

### Added
- Publish release Docker images to GitHub Container Registry alongside crates.io releases.

## [0.9.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Document ForgeFed integration endpoints and deployment verification steps.
- Add Akash SDL and Kubernetes deployment templates for the router.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

### Added
- Optional Gonka upstream provider selection with Gonka config, forwarding, model listing, and request signing for OpenAI-compatible routes.

## [0.8.0] - 2026-05-09

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

### Added
- Expose a minimal ActivityPub and ForgeFed actor surface for the code task actor, including inbox, outbox, followers, public key metadata, and a problemsets Follow activity document.

## [0.7.0] - 2026-05-03

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

### Added

- Added the issue #9 case-study package under `docs/case-studies/issue-9`, including a 28-item requirement inventory, current-router gap analysis vs. OmniRoute, competitor comparison (OmniRoute / 9router / CLIProxyAPI / musistudio/claude-code-router / LiteLLM / Caveman), per-source online research notes, and raw README + metadata snapshots for each compared project.

### Fixed

- Synchronised `Cargo.lock` with the v0.6.0 version in `Cargo.toml`. The previous release commit (`chore: release v0.6.0`) bumped `Cargo.toml` but did not regenerate `Cargo.lock`, leaving the lockfile pinned to `0.5.0`. This caused `cargo package --list` in the `Build Package` CI job to fail with "files in the working directory contain changes that were not yet committed into git: Cargo.lock" because the first build re-locks the file.

## [0.6.0] - 2026-05-03

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

### Added

- Added the issue #7 case-study package under `docs/case-studies/issue-7`, including a requirement inventory, current-router gap analysis, competitor comparison, official-docs research notes, and raw research snapshots.

### Added

- **Persistent token store** with dual text (Lino) + binary backends. The
  selected backend(s) are controlled via `--storage-policy` /
  `STORAGE_POLICY` (`memory`, `text`, `binary`, or the default `both`).
  Tokens, labels, expiries, and revocations now survive process restarts.
- **Multi-account routing**. `--additional-account-dirs` registers extra
  Claude MAX credential directories alongside the primary one. The router
  distributes requests across healthy accounts and parks an account on
  cooldown when upstream returns 429.
- **OpenAI-compatible API surface**: `/v1/chat/completions`, `/v1/responses`,
  and `/v1/models`. Translates OpenAI request/response shapes to and from
  Anthropic Messages, mapping `gpt-4o`, `gpt-4o-mini`, and the `o*`
  reasoning families to the equivalent Claude tiers. Native `claude-*` IDs
  pass through untouched.
- **Live observability**: Prometheus `/metrics`, JSON `/v1/usage`, and
  per-account health at `/v1/accounts`.
- **First-class CLI** built on `lino-arguments` (clap drop-in with `.lenv`
  support): `serve`, `tokens issue|list|revoke|expire|show`,
  `accounts list`, and `doctor` subcommands. Token operations bypass the
  HTTP layer and operate directly on the configured store.
- **Admin endpoints** (`/api/tokens/list`, `/api/tokens/revoke`) plus the
  optional `--admin-key` / `TOKEN_ADMIN_KEY` Bearer gate.
- **Feature toggles** for every API surface — `--disable-openai-api`,
  `--disable-anthropic-api`, `--disable-metrics`,
  `--experimental-compatibility`.

### Changed

- `Config` is now built via `BuildArgs` and loaded from CLI flags + env +
  `.lenv` (still supports `Config::from_env()` for backwards
  compatibility).
- The HTTP server now mounts `/v1/messages*`, OpenAI endpoints, and the
  ops endpoints conditionally based on the feature toggles above.
- `proxy_handler` consults the multi-account router (when configured) and
  reports 429s as cooldowns.

### Notes

- `RoutingMode::Cli` and `RoutingMode::Hybrid` are accepted by the parser
  but currently log a warning and fall back to direct routing — the local
  Claude CLI subprocess driver is the next slice.
- Closes the `lino-objects-codec` dependency gap by hand-rolling a minimal
  Lino-style codec inside `src/storage.rs` until the upstream crate is
  published.

## [0.5.0] - 2026-04-17

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

### Added
- Full Claude Code LLM Gateway compliance with all three API formats:
  - Anthropic Messages API (`/v1/messages`, `/v1/messages/count_tokens`)
  - Amazon Bedrock InvokeModel API (`/invoke`, `/invoke-with-response-stream`)
  - Google Vertex AI rawPredict API (`:rawPredict`, `:streamRawPredict`)
- Explicit forwarding of required headers (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
- Verbose logging via `log-lazy` crate with `--verbose` flag and `VERBOSE` env var
- `UPSTREAM_API_FORMAT` environment variable to restrict accepted API format
- Case study documentation for issue #5

### Changed
- Proxy handler refactored to support multiple API format routing
- Configuration expanded with `verbose` and `api_format` fields

## [0.4.0] - 2026-03-19

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

### Added
- Comprehensive README.md with full usage documentation, configuration reference, Docker/VPS deployment guides, and manual testing instructions
- Manual end-to-end testing script (`scripts/test-manual.sh`) that validates health check, token issuance, proxy authentication, and error handling

## [0.3.0] - 2026-03-19

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

### Added
- Link.Assistant.Router prototype: Rust-based API gateway for Anthropic (Claude) APIs
- Claude MAX OAuth proxy: reads Claude Code session credentials and injects OAuth token into upstream requests
- Custom token system (`la_sk_...` prefixed JWT tokens) with issuance, validation, expiration, and revocation
- Transparent API proxying with SSE/streaming pass-through at `/api/latest/anthropic/{...}`
- Health check endpoint at `/health`
- Token issuance endpoint at `/api/tokens`
- Configuration via environment variables (ROUTER_PORT, TOKEN_SECRET, CLAUDE_CODE_HOME, UPSTREAM_BASE_URL)
- Dockerfile for single-container deployment

## [0.2.0] - 2026-03-11

### Added
- Changeset-style fragment format with frontmatter for specifying version bump type
- New `get-bump-type.mjs` script to automatically determine version bump from fragments
- Automatic version bumping on merge to main based on changelog fragments
- Detailed documentation for the changelog fragment system in `changelog.d/README.md`

### Changed
- Updated `collect-changelog.mjs` to strip frontmatter when collecting fragments
- Updated `version-and-commit.mjs` to handle frontmatter in fragments
- Enhanced release workflow to automatically determine bump type from changesets

### Changed
- Add `detect-changes` job with cross-platform `detect-code-changes.mjs` script
- Make lint job independent of changelog check (runs based on file changes only)
- Allow docs-only PRs without changelog fragment requirement
- Handle changelog check 'skipped' state in dependent jobs
- Exclude `changelog.d/`, `docs/`, `experiments/`, `examples/` folders and markdown files from code changes detection

### Fixed
- Fixed README.md to correctly reference Node.js scripts (`.mjs`) instead of Python scripts (`.py`)
- Updated project structure in README.md to match actual script files in `scripts/` directory
- Fixed example code in README.md that had invalid Rust with two `main` functions

### Added

- Added crates.io publishing support to CI/CD workflow
- Added `release_mode` input with "instant" and "changelog-pr" options for manual releases
- Added `--tag-prefix` and `--crates-io-url` options to create-github-release.mjs script
- Added comprehensive case study documentation for Issue #11 in docs/case-studies/issue-11/

### Changed

- Changed changelog fragment check from warning to error (exit 1) to enforce changelog requirements
- Updated job conditions with `always() && !cancelled()` to fix workflow_dispatch job skipping issue
- Renamed manual-release job to "Instant Release" for clarity

### Fixed

- Fixed deprecated `::set-output` GitHub Actions command in version-and-commit.mjs
- Fixed workflow_dispatch triggering issues where lint/build/release jobs were incorrectly skipped

### Fixed

- Fixed changelog fragment check to validate that a fragment is **added in the PR diff** rather than just checking if any fragments exist in the directory. This prevents the check from incorrectly passing when there are leftover fragments from previous PRs that haven't been released yet.

### Changed

- Converted shell scripts in `release.yml` to cross-platform `.mjs` scripts for improved portability and performance:
  - `check-changelog-fragment.mjs` - validates changelog fragment is added in PR diff
  - `git-config.mjs` - configures git user for CI/CD
  - `check-release-needed.mjs` - checks if release is needed
  - `publish-crate.mjs` - publishes package to crates.io
  - `create-changelog-fragment.mjs` - creates changelog fragments for manual releases
  - `get-version.mjs` - gets current version from Cargo.toml

### Added

- Added `check-version-modification.mjs` script to detect manual version changes in Cargo.toml
- Added `version-check` job to CI/CD workflow that runs on pull requests
- Added skip logic for automated release branches (changelog-manual-release-*, changeset-release/*, release/*, automated-release/*)

### Changed

- Version modifications in Cargo.toml are now blocked in pull requests to enforce automated release pipeline

### Added

- Added support for `CARGO_REGISTRY_TOKEN` as alternative to `CARGO_TOKEN` for crates.io publishing
- Added case study documentation for Issue #17 (yargs reserved word and dual token support)

### Changed

- Updated workflow to use fallback logic: `${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}`
- Improved publish-crate.mjs to check both `CARGO_REGISTRY_TOKEN` and `CARGO_TOKEN` environment variables
- Added warning message when neither token is set

### Added
- New `scripts/rust-paths.mjs` utility for automatic Rust package root detection
- Support for both single-language and multi-language repository structures in all CI/CD scripts
- Configuration options via `--rust-root` CLI argument and `RUST_ROOT` environment variable
- Comprehensive case study documentation in `docs/case-studies/issue-19/`

### Changed
- Updated all release scripts to use the new path detection utility:
  - `scripts/bump-version.mjs`
  - `scripts/check-release-needed.mjs`
  - `scripts/collect-changelog.mjs`
  - `scripts/get-bump-type.mjs`
  - `scripts/get-version.mjs`
  - `scripts/publish-crate.mjs`
  - `scripts/version-and-commit.mjs`

### Changed

- **check-release-needed.mjs**: Now checks crates.io API directly instead of git tags to determine if a version is already released. This prevents false positives where git tags exist but the package was never actually published to crates.io.

### Added

- **CI/CD Troubleshooting Guide**: New documentation at `docs/ci-cd/troubleshooting.md` covering common issues like skipped jobs, false positive version checks, publishing failures, and secret configuration.

- **Enhanced Error Handling in publish-crate.mjs**: Added specific detection and helpful error messages for authentication failures, including guidance on secret configuration and workflow setup.

- **Case Study Documentation**: Added comprehensive case study at `docs/case-studies/issue-21/` analyzing CI/CD failures from browser-commander repository (issues #27, #29, #31, #33) with timeline, root causes, and lessons learned.

### Fixed

- **Prevent False Positive Version Checks**: The release workflow now correctly identifies unpublished versions by checking crates.io instead of relying on git tags, which can exist without the package being published.

### Changed

- Translated all CI/CD scripts from JavaScript (.mjs) to Rust (.rs) using rust-script
- Scripts now use native Rust with rust-script for execution in shell
- Removed Node.js dependency from CI/CD pipeline
- Updated GitHub Actions workflow to use rust-script instead of node
- Updated README and CONTRIBUTING documentation with new script references

## [0.1.0] - 2025-01-XX

### Added

- Initial project structure
- Basic example functions (add, multiply, delay)
- Comprehensive test suite
- Code quality tools (rustfmt, clippy)
- Pre-commit hooks configuration
- GitHub Actions CI/CD pipeline
- Changelog fragment system (similar to Changesets/Scriv)
- Release automation (GitHub releases)
- Template structure for AI-driven Rust development