######## 678
title:	Per-account connection/cookie isolation and optional per-account egress proxy
--
## Summary
All Codex accounts share one static cookie client (`src/upstream_client.rs`, v1.15.3), and no account can egress through its own proxy. Vendor anti-abuse layers (for example Cloudflare cookies) and per-account rate limits work per identity. Shared cookies or keep-alive connections can link accounts or carry one account's state into another's requests.

## Proposal
- Per-account HTTP client: a separate cookie store and connection pool for each account, with a maximum connection age, and idle connections closed.
- An optional per-account egress proxy (HTTP or SOCKS5), configured with the account. Credentials go to the proxy through a secret reference, never argv.
- Test: cookies and connections set for account A are never sent for account B.

## Prior art
ccLoad `internal/app/upstream_connection_age_test.go`; sub2api and CLIProxyAPI per-account proxy settings.

## Compatibility
With no per-account proxy configured, behaviour is unchanged apart from isolation.

######## 679
title:	Deploy configuration for downstreams: env passthrough by name, instance prefix, SSH options, issued-token limits, declarative config file
--
## Summary
Downstream deployments still keep their own orchestration wrappers around `router deploy`, only because a few settings cannot be expressed through it. If these were configuration in Router, a downstream could drop its wrapper and keep only a small config file.

## Needed settings for local and `--server` deploys
- **Runtime environment passthrough by name only** (for example a request-log size cap, or a vendor OAuth client setting). Values are read from the caller's environment or a file and never put in argv. A changed value triggers a reconcile, detected by an HMAC fingerprint in the launch specification.
- **Instance name/label prefix,** so several independent deployments can share a host.
- **SSH:** port, identity file, a pinned `known_hosts` entry (no `accept-new`), keepalive interval, and an overall deadline for the remote session with a documented exit code.
- **Client tokens issued by deploy:** TTL, request/token caps and model policy, so deploy-issued tokens are not effectively unlimited.
- **A declarative file** (for example `router-deploy.lino`/`.toml`) holding all of the above, so the deploy command line stays short and reviewable.

## Acceptance
A downstream that today wraps `router deploy` in its own scripts can express its setup as one config file plus `router deploy --config …` for local, host and remote targets.

######## 680
title:	deploy --server: add or rotate API-key providers in the candidate before cutover
--
## Summary
On `router deploy --server`, the staging candidate only inherits the previous release's provider configuration (`src/deploy/remote_agent.sh` copies `providers.lenv`). A downstream that rotates or adds an API-key provider (for example a GLM Coding Plan key) has to call `providers add` against the live deployment after cutover. That bypasses the candidate-first verification.

## Proposal
- `router deploy --server … --provider-key <name>=<env-var|file>`, repeatable. Values come through the process environment or stdin, never argv.
- The key is added to the candidate before cutover and verified there (catalog and a minimal request), together with the existing per-client checks. Modes: `replace` (only after positive validation), `if-absent`, `keep` (default, current behaviour).
- The deploy JSON reports a fingerprint per provider and the validation result. Values are never printed.

## Compatibility
Without the flag, nothing changes.

######## 681
title:	Supported non-interactive way to give a new remote deployment an existing subscription
--
## Summary
Router deliberately refuses to copy OAuth credentials into a remote deployment (`auth_import.rs::refuse_a_remote_import`), and the documented alternative is `router auth <provider> --server …`. Downstreams still need a non-interactive way to give a fresh remote deployment the subscription that the operator already holds locally. Today they write their own credential-delivery code: file upload, `auth import` on the target, pending/active markers, receipts.

## Proposal (pick one and document it)
1. An opt-in, idempotent `router deploy --server … --seed-credential <provider>`, built on the safe `auth import` contract: the refresh chain is moved, not forked, the source is invalidated or marked as handed over, the transfer survives a lost response, and a receipt fingerprint is kept.
2. Or an official non-interactive handoff for `router auth <provider> --server` (device-code or pre-authorized link) that scripts can drive and verify. Document it as the only supported path, with an example.

## Acceptance
A first remote deployment can be brought to "Anthropic and Codex usable" by a script without bespoke credential-copying code, and no refresh chain is forked.

######## 682
title:	Tunnel companion: forward mode, non-root key handling, pinned host key, router tunnel up|status|down
--
## Summary
The tunnel companion (`docker/tunnel/`) supports only a reverse tunnel (`-R`). Downstreams that reach a remote Router from a workstation need a forward tunnel (`-L`), and so they maintain their own tunnel images and scripts.

## Proposal
- Forward mode (`-L`) in the tunnel image, bound to `127.0.0.1` only, with a test that it is not reachable on other interfaces.
- Run as non-root. When the bind-mounted key has loose permissions, copy it inside the container with mode 0600 instead of failing or running as root.
- A pinned host key is required (no `accept-new`).
- `router tunnel up|status|down --server …`: starts or stops the companion and checks Router `/api/health` and an authorized catalog through the tunnel, with keepalives and reconnect.

## Compatibility
Reverse mode is unchanged.

######## 683
title:	Configurable deploy verification profile, fuller remote checks and timing in --json
--
## Summary
The deploy-time verifier is fixed in code. Downstreams need to state *what must be proven* before cutover, so they keep parallel verification suites of their own. Some useful checks also exist only in unit tests, not at deploy time.

## Proposal
1. **Verification profile** (config): which client kinds and providers must be proven; one exact verification model per provider and client; whether a real `router with <client>` launch against a stub client is required on remote deploys; and whether "quota exhausted" is accepted as proven only with upstream-request evidence (correlation id in the request log). Results go to the deploy JSON.
2. **Fuller remote checks:** probe the whole removed-routes list at deploy time (today only `/v1/models`). On the public inference-only listener, check the anonymized usage view and that inference refuses the admin token.
3. **Observability:** per-step and per-subprocess timings in `--json`.
4. **Opt-in live check** that a Claude response with thinking is displayed as configured (the generated `--settings`).

## Acceptance
A downstream's own deploy verification tests can be replaced by `verify-contracts.rs` plus a verification-profile file.

######## 684
title:	Host mode: doctor misses custom deploy roots, no service install for reboot survival, weak alternative-model suggestion
--
## Summary
Small gaps found while running v1.15.3 in local host mode:

1. `router doctor --local` inspects the default data dir and the *default* deploy root (`~/.link-assistant-router/deploy/data`). A host deployment created with `--root <custom>` serves the selected server, but doctor reports `provider exhaustion: none recorded` while that deployment has an exhausted provider. Doctor should discover active deployments — for example a registry of roots written by `router deploy`, or by asking the serving host Router's management API for the selected server — or name the deployment it could not see.
2. A host-mode Router does not survive a reboot or logout. The docs say to rerun deploy or write a launchd agent yourself. Please add `router deploy --mode host --install-service` (launchd on macOS, a systemd user unit on Linux) that restarts the same binary, data dir and port. `TOKEN_SECRET` should come from the OS secret store or a 0600 file, never from the plist or argv.
3. The pre-launch warning suggests the alphabetically first model (`claude-fable-5`). It should suggest the provider's flagship, or the user's last working selection.

######## 685
title:	Address all 17 open issues in link-assistant/router
--
<!-- hive-mind-solve-repository-mode -->

## Objective

Address every open issue listed below in [link-assistant/router](https://github.com/link-assistant/router) with a **single pull request**.

This issue was generated automatically by `/solve https://github.com/link-assistant/router` (repository mode). Native sub-issues and the complete closing-reference block below jointly define the required scope.

## Scope

- Open issues found in the repository: 17
- Issues requested in this single pull request: 17
- Issues selected for native sub-issue attachment: 17
- GitHub sub-issue limit per parent issue: 100

## Issues to address

- [ ] #668 Tests: stream termination correctness on every surface (client disconnect, upstream reset, stall, partial-output billing) — opened 2026-10-04
- [ ] #669 Upstream client: default connect/first-byte/idle timeouts, asserted no-redirect policy, SSRF guard for provider base URLs — opened 2026-10-04
- [ ] #670 Tests: fuzzing and property tests for SSE parsing and protocol translators — opened 2026-10-04
- [ ] #671 Tests: recorded vendor fixtures (record/replay), cache-token budget accounting, prompt-cache prefix stability — opened 2026-10-04
- [ ] #672 Tests: soak/memory-growth, benchmarks with CI regression gate, mutation testing for security-critical modules — opened 2026-10-04
- [ ] #673 Tests: N-k upgrade matrix for data, tokens, profiles and deploy state — opened 2026-10-04
- [ ] #674 Tests: macOS CI with a throwaway keychain for Keychain-dependent paths and real Claude Code — opened 2026-10-04
- [ ] #675 Tests: Claude Code feature matrix through Router (vision, PDF, thinking+tools, tool_search, citations, count_tokens, server tools) — opened 2026-10-04
- [ ] #676 Opt-in pre-first-byte failover across pool accounts (429/529/5xx/401) with session affinity and reasoning-state handling — opened 2026-10-04
- [ ] #677 Use vendor rate-limit state: unified 5h/7d headers, per-model cooldown, optional usage-threshold pause and warmup interception — opened 2026-10-04
- [ ] #678 Per-account connection/cookie isolation and optional per-account egress proxy — opened 2026-10-04
- [ ] #679 Deploy configuration for downstreams: env passthrough by name, instance prefix, SSH options, issued-token limits, declarative config file — opened 2026-10-04
- [ ] #680 deploy --server: add or rotate API-key providers in the candidate before cutover — opened 2026-10-04
- [ ] #681 Supported non-interactive way to give a new remote deployment an existing subscription — opened 2026-10-04
- [ ] #682 Tunnel companion: forward mode, non-root key handling, pinned host key, router tunnel up|status|down — opened 2026-10-04
- [ ] #683 Configurable deploy verification profile, fuller remote checks and timing in --json — opened 2026-10-04
- [ ] #684 Host mode: doctor misses custom deploy roots, no service install for reboot survival, weak alternative-model suggestion — opened 2026-10-04

## Requirements

1. Read every issue listed above (including its comments) and fully implement what it asks for.
2. Do all of the work in this single pull request. Do not defer any listed issue to a follow-up pull request.
3. The pull request description **must** close this issue and **every** issue listed above, so that merging the pull request closes all of them at once.
4. GitHub requires the full closing syntax for each issue: one keyword per issue. `Fixes #1, #2` only closes `#1`. Use the block below verbatim (plus `Fixes #<this issue>` for this issue).
5. If an issue turns out to be already resolved or not reproducible, say so explicitly in the pull request description — but still keep its closing reference so it is closed on merge.

## Required closing references in the pull request description

```
Fixes #668
Fixes #669
Fixes #670
Fixes #671
Fixes #672
Fixes #673
Fixes #674
Fixes #675
Fixes #676
Fixes #677
Fixes #678
Fixes #679
Fixes #680
Fixes #681
Fixes #682
Fixes #683
Fixes #684
```

