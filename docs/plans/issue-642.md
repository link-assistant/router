# Verification, preservation and delivery: issue 642

This is the requirement inventory and implementation/acceptance plan for [642](https://github.com/link-assistant/router/issues/642) and all eight subissues. One PR, [643](https://github.com/link-assistant/router/pull/643), carries the changes. A green mocked test never establishes a live subscription, macOS credential-store preservation, workstation non-interference or release delivery. Those properties need the evidence specified below.

## 634: dynamic fresh Claude default

Requirements:

1. Prefer currently authorized GLM-5.3 only for a fresh Router-owned, z.ai-only Claude profile without explicit or saved selection.
2. Preserve explicit CLI models, `/model`, saved settings and user environment overrides, including saved GLM-5.3-FlashX, across upgrades.
3. Keep native Anthropic default discovery for mixed-provider catalogs.
4. Select from the live token-authorized catalog; never invent an unavailable model or use a stale global model list.
5. Define fallback for an absent/unhealthy flagship and distinguish initial selection from a subsequent inference failure.
6. Test fresh, mixed, saved FlashX, explicit selection, changed catalogs and failed preferred-model requests with real Claude Code.
7. Assert exact outbound model and successful response, beyond picker text; an explicit-model smoke test does not prove the default.
8. Preserve active sessions and apply selection rules to setup, doctor, wrappers, Default and subagents.

Options: retain provider creation-time ranking, introduce a fixed CLI pin, or add a catalog-conditioned preference to the existing selector. The third is used: `claude_gateway_model` prefers the exact advertised z.ai flagship, then uses the existing deterministic provider recency/id ranking. Catalog generation filters unhealthy source subscriptions; when the preferred row is absent the selection uses the remaining authorized rows. All-empty catalogs refuse. Mixed Anthropic discovery and explicit choices retain precedence. A saved model withdrawn from the catalog refuses without rewriting settings. User-owned environment values are preserved; obsolete Router-owned pins yield to a saved selection.

An inference failure after discovery is surfaced for that exact model; Router does not silently change an explicit/saved selection or retry a possibly billable request under another model. The operator can refresh discovery after the provider becomes unhealthy or explicitly select another advertised row. This is the defined fallback boundary, not evidence that every model-level outage is already reflected in source health.

Verification: selector reproduction in `experiments/issue-642/catalog-default.py`, setup regressions in `claude_default_test`, existing saved/explicit/changed-catalog/default/subagent real-client scenarios and exact flagship assertion in `real_clients/claude_selector`. The real-client regression also covers saved FlashX, an explicit flagship, an injected preferred-model HTTP failure and catalog-withdrawal fallback, requiring exact outbound IDs and successful native results. Paid live response behavior and a real preferred-model outage still require protected live credentials; the report must not mark those proven by offline fixtures.

## 635: independent staging and bounded control

Requirements:

1. Give staging a unique identity and separate containers, network, listener, data root, signing secret, client tokens, logs and client profile selection.
2. Never stop, rename, update or mutate the primary, change global selected server, or infer isolation from only root/port.
3. Never duplicate rotating OAuth credentials or introduce concurrent refresh writers; report unavailable Keychain-only verification as not proven.
4. Start a long primary GLM stream, stage another port, verify both endpoints/catalogs, real Claude GLM-5.3 and Flash requests, model picker and isolated logs, then remove staging alone.
5. Compare primary stream, tokens, sessions, provider authorization and selected-server setting before/after.
6. Cover port collision, setup interruption, failed candidate, stale cleanup and concurrent `deploy --status`.
7. Supply one Router-owned command and a machine-readable report for downstream reuse.
8. Check serving health, management health and port ownership separately; bound every diagnostic/subprocess. HTTP 200 does not establish workflow completion.
9. Distinguish stopped containers' saved bindings from active listeners; never start a legacy conflict or assign the primary listener to staging.
10. Preserve all pre-existing resources/data, including stopped legacy resources. Restrict cleanup to the staging owner; no implicit global prune, reset or Desktop restart.
11. Check pending lifecycle/cleanup work before recovery, identify affected resources, and require authority for interruption. Do not unblock another task's pending global cleanup.
12. Account for shared CPU, memory and disk; separate names do not establish non-interference.
13. Test a stalled control socket with healthy serving backend, bounded abort/cleanup, primary continuity, saved binding conflicts and ownership restrictions. Keep incident cause and preservation claims explicitly unproven without evidence.

Options: Docker Compose project namespaces, a disposable VM, or extend Router's existing Docker coordinator. Compose offers project-level names/labels but would duplicate deployment orchestration. The coordinator now supports `deploy --staging NAME`, `--verify --json`, `--status` and namespace-only `--down`. A private canonical-root journal stores a UUID owner, immutable image and port; exact labels plus names are checked before removal. A new/empty root is required. Docker's running listener map plus host bind checks reject collisions. Mutations use a nonblocking namespace lock; read-only status can report a failed management probe independently of serving HTTP. No recovery against unrelated resources is attempted.

Staging uses isolated state/secret and a newly issued bound Claude token; it can use an explicitly supplied static z.ai key, never the primary OAuth home. CPU, memory, swap, process count, request logs and Docker logs are capped; free disk must exceed 1 GiB. Shared spare CPU/memory capacity and primary continuity are not established by those caps. The JSON keeps `parity:false`, with unavailable live/primary preservation claims explicit. Use a disposable host for a complete non-interference experiment. The staged verification command currently proves bounded control, owned topology and token-authorized catalogs; it does not manufacture live provider responses.

Verification: `deploy_local/staging_tests` covers create/status/cleanup, port collision, failed candidate, pending mutation and healthy serving with failed control. Tests use an injected Docker runner and never inspect or change a workstation's daemon. Real Docker namespace/resource-budget, primary-stream and live-picker acceptance remains distinct from mocked ownership coverage.

## 636: portable active-profile fixture

Requirements:

1. Replace copied/ad-hoc-signed Apple `/bin/sleep` with a portable executable whose process name and environment are visible on supported macOS.
2. Detect early exit immediately with child status and `ps` evidence, instead of spending ten seconds waiting for `pgrep`.
3. On affected macOS arm64 and CI, verify a live matching writer blocks backup/reset/restore.
4. Verify an unrelated profile/process does not block another profile.
5. Complete the full all-feature suite without skipped coverage; do not describe the copied-binary failure as a production lifecycle defect.

Options: a script interpreter, shipping a fixture binary, or compile a tiny Rust executable under the vendor name. Compiling the small fixture avoids Apple binary signing and script-name ambiguity. `clients_active_profile_test` compiles `tests/fixtures/process/idle.rs`, clears inherited credentials, sets the disposable profile environment, checks both liveness and actual `ps` name/HOME, and kills/waits its child on drop. An exit-17 regression checks the diagnostic. The finite copied-Apple reproduction is retained for a disposable macOS environment in `experiments/issue-642/copied-apple-fixture.sh`.

Linux process visibility and lifecycle assertions are tested locally. Actual affected macOS arm64 completion is an acceptance requirement still awaiting a macOS runner; Linux success must not stand in for it.

## 637: honest mock/live entitlement proof

Requirements:

1. Split mocked Anthropic contract proof from live entitlement proof or add the credentialed suite to the claimed area.
2. Missing `ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON` must produce explicit not-proven/skipped live status.
3. With healthy personal Claude and z.ai, prove authorized catalog union and `/model` entries.
4. Prove exact selected model and one successful response from each provider with real Claude Code.
5. Keep credentials, bearer tokens and response secrets out of output.
6. Keep top-level parity false until every required live claim is proven; mocked 125-pass evidence cannot prove a subscription or lost-provider repair.

Options: rename the existing mocked area, make that area wholly paid/live, or expose separate required areas. Separate `anthropic-mock-contracts` and `anthropic-entitlements` avoid collapsing protocol coverage into subscription availability. The live area runs the existing subscription-usage suite and `mixed_entitlements_live_test`. The latter requires an explicitly provisioned safe endpoint, protected bound token and explicit inference opt-in, checks union/picker, and validates exact native response model plus successful marker for each provider. It does not copy OAuth or configure a primary. Missing prerequisites emit an explicit skip. Filtered/preparation-only reports also cannot establish complete parity.

Protected prerequisites: `ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON`, `ROUTER_LIVE_MIXED_URL`, `ROUTER_LIVE_MIXED_TOKEN`, `ROUTER_LIVE_MIXED_INFERENCE=1`, and an isolated supported Claude executable. No healthy personal subscription was available for this implementation's local run; live proof remains not proven.

## 638: credential-store boundary and cancellation

Requirements:

1. Do not infer macOS Keychain isolation from HOME, config directories, proxies, namespaces or ports.
2. Identify the actual dialog-opening call using one fixture at a time in a fresh disposable macOS account/VM and a Keychain-only login; correlate dialog time and process tree.
3. Never prompt for, create, reset or mutate the user's Keychain, or disturb an active client.
4. Enforce safety before every vendor version, doctor, inference, TUI and failure/cleanup call, including separately gated host/live tests.
5. Assert no GUI prompt and unchanged default/search-list keychains in a valid before/after experiment.
6. If a safe boundary is unavailable, refuse before launch and report not proven.
7. Abort/cleanup must leave no owned test children or grandchildren.
8. Keep observed default/search-list names and file presence separate from credential validity/byte preservation; identify no vendor and infer no deletion from the dialog alone.

Options: OS-level disposable accounts/VMs, stubbing Keychain APIs, or prevent unsafe native runs. OS isolation is the sound acceptance environment; HOME-only mocks cannot establish it. Shared safety gating now refuses native macOS probes before launching any actual vendor. No environment opt-out is provided. Disposable Linux CI remains enabled with inherited environment cleared, private config/cache homes and offline loopback proxy restrictions. A future macOS verifier must establish its account/VM boundary before relaxing this refusal, then capture GUI/default/search-list and process evidence. The responsible CLI from the original incident remains unidentified.

Bounded diagnostics drain both pipes concurrently with byte caps and kill owned Unix process groups on exit/timeout. PTY cancellation now terminates the entire dedicated group, including a hangup-ignoring grandchild. A finite automated regression failed before and passes after that change. Windows child-tree cancellation is not established by the Unix regression; it must not be reported as such.

## 639: observable and retryable delivery

Requirements:

1. Investigate exact merge SHA/main timestamps and distinguish PR success from release-capable main execution; do not invent a missing-trigger cause.
2. Report merged source, validated candidate, partial publication and fully delivered release separately.
3. Treat absent/disabled triggers and failed main checks as actionable delivery failure.
4. Provide explicit idempotent recovery that preserves version, tag, artifact bytes and consistency.
5. Cover supported human and automation merge credentials, missing/disabled trigger, failed checks, interrupted publication, tag without release, missing platform binaries/images and retry after partial publication.
6. Verify delivered artifacts contain merged changes: source ancestry, version, immutable image digest/platforms, binaries/checksums and source revision agree.
7. Do not manually publish unreviewed main merely to make a report green.

The exact #633 merge remains `dd1315527999a0fbfb1a30d39b826d3870892a40`, merged 2026-09-29 18:36:42 UTC. Read-only API research found zero main release-workflow runs for that SHA and the pre-merge v1.14.3 release. GitHub documents event suppression for its `GITHUB_TOKEN` with dispatch exceptions; that is a possible mechanism, not evidence of the actor or cause here.

Options: require a GitHub App/PAT for automatic handoff, chain workflows, or independent scheduled/manual delivery observation plus explicit dispatch recovery. The last is implemented without credential or repository setting changes. `scripts/check-delivery.rs` checks exact SHA ancestry, main run timestamps, workflow state, current tag/release, complete four-platform archives/SBOM/checksums, attestation/source revision, native binary versions and immutable multi-platform image provenance. Without artifact verification it cannot say delivered. A read-only scheduled/manual workflow publishes its JSON and fails until delivery is verified.

Explicit `release_mode=recover` reruns main checks and either reuses an existing HEAD tag/version or prepares the unconsumed changelog version. Changed source with no release trigger refuses. Upload adds only missing asset names; immutable existing image manifests are verified and retained, and `latest` follows their digest. Uncertain inspection errors fail instead of overwriting. Existing conflicting partial bytes cannot be silently repaired by overwrite; they need an explicit reviewed resolution. No release was dispatched by this implementation.

Verification: state/asset requirements, recovery identity, missing-only uploads and existing workflow/provenance tests. Real merges by all credential classes and interruption at every registry/GitHub boundary require an isolated acceptance repository and are not established by unit tests.

## 640: authorization and persisted-state preservation

Requirements:

1. Cover OS-store and file OAuth, single refresh ownership, static keys, client tokens, signing secrets, provider configuration/policy, normal/managed profiles, projects/sessions, request logs, selected server and saved model choices.
2. Before mutation compare old/candidate credential sources and every usable token-authorized catalog, not only HTTP health or one provider's answer.
3. Refuse unverifiable/lossy data/provider transitions with a machine-readable reason unless access loss is explicitly authorized.
4. Validate issued-token continuity and the per-token provider union; another token or provider cannot hide a missing source.
5. Never snapshot rotating OAuth or create competing writers; back up recoverable noncredential state separately and state exactly what restore proves.
6. Failed validation/interrupted cutover must leave the old deployment usable with recoverable data.
7. Preserve additive restore by default and explicit replacement.
8. Cover local managed/legacy, local-host and remote upgrade/migration paths.
9. Cover missing/empty mounts, changed roots/paths, symlinks, permissions and ownership, OS/file OAuth and static keys, expired/revoked credentials, mixed providers, signing-secret changes, legacy schemas, active/idle sessions, saved models and interruption around cutover/rollback.
10. Assert session/project integrity, provider access, token validity, secret redaction, single refresh ownership and idempotent no-op updates in disposable fixtures.

Options: copy all homes/state, use live original authority with guarded cutover, or build an isolated snapshot after stopping all writers. Copying OAuth is rejected; original single-authority homes and durable state are retained. Local preflight compares actual mounted data/auth sources before image preparation and records bounded usable token inventory. Old/candidate probes reconstruct each original signed token with the retained secret, compare owner/id catalog subsets and refuse before cutover on loss. An empty old credential directory can add authority without inventing lost access. `--accept-access-loss` is distinct from connection/stream `--force` and produces explicit loss-accepted JSON.

Host migration retains an existing file OAuth home or the original host credential-store context and checks signatures/catalogs before terminating the old serving path. Returning to an existing container checks catalogs before host termination. Replacing a live host without a retained container refuses by default; the explicit loss override acknowledges this destructive authority transition.

Remote updates retain original provider directories and one durable data source, including provider locks/atomic file replacement. Legacy copied OAuth holdings are refused; previously signed source identities must match before candidate preparation. Original token catalogs and signatures are checked before cutover, all Docker diagnostics have GNU `timeout` bounds, and rollback retains old pointer/container. The existing additive/replacement client restore implementation is kept.

Verification: new local mixed-provider loss/source-change/force-versus-access-loss tests, existing secret, sharing, host, no-op, failure and crash-recovery tests, and client active-profile/saved-choice tests. Health/catalog subset does not establish a full historical database snapshot or OS credential byte preservation. JSON explicitly leaves data restore unproven. Complete schema/symlink/permission/OS-store/refresh/concurrent-writer/session-content and real remote interruption matrix is an acceptance obligation; mock success cannot close these evidence gaps.

## 641: one pre-compilation version preparation entry point

Requirements:

1. Within a validated isolated environment, discover selected installed vendor versions before Cargo compiles fixtures.
2. Preserve caller/CI version expectations, reject contradictory overrides and report expected/observed values; never downgrade installed clients silently.
3. Apply the same preparation to Claude, Codex and OpenCode in standalone verification and CI.
4. Distinguish discovery/preparation errors from protocol failures; missing CLI and unsafe boundary remain not proven; neither failure class is proven.
5. Cover newer supported releases, explicit matching/mismatched expectations, malformed/empty/missing version output and cached fixtures from another version.
6. Keep behavioral assertions and reproducible pinned CI jobs.
7. Apply 638 before any version/doctor call; discovery cannot access user credentials or disturb clients.
8. Document one entry point plus manual compile-time fallback.

Options: require manual exported versions, generate a Cargo build script, or have the Router verifier prepare Cargo's environment. The verifier now calls shared `verification_client::prepare` before Cargo, preserves caller pins, discovers observed versions in a private environment and sets the three `ROUTER_REAL_CLIENT_*_VERSION` variables only after agreement. Claude-only/Codex-only CI uses the same entry point; newer CI expectations come from package metadata without independent vendor probes. OpenCode also consumes `option_env!` and has a documented baseline fallback. Failed discovery and missing/safety refusal appear as preparation status before compatibility can run.

Verification: `experiments/issue-642/prepare-clients.py` exercises installed-newer, matching/mismatched overrides, malformed/empty/missing output and Cargo's environment-sensitive cache rebuild with a tiny compiled fixture. Existing pinned/newer real-client CI retains behavioral protocol tests. The synthetic cache experiment proves the compile-time handoff mechanism, not paid provider availability.

## Components researched and chosen boundaries

- [z.ai GLM-5.3 documentation](https://docs.z.ai/guides/llm/glm-5.3): confirms current flagship and always-enabled reasoning. Disabling reasoning is not a valid generic outage fallback; this PR does not replace provider protocol contracts on that assumption.
- [Docker Compose application model](https://docs.docker.com/compose/intro/compose-application-model): project names/labels can isolate names. Existing Rust coordination plus owner labels avoids adding a second lifecycle engine.
- [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/): memory/CPU require explicit limits. Limits do not reserve spare host capacity or prove stream continuity.
- [Apple App Sandbox](https://developer.apple.com/documentation/security/protecting-user-data-with-app-sandbox): an OS boundary is distinct from changing HOME. A container/account claim must be validated against credential access; native Mac probes currently fail closed.
- [wait-timeout](https://docs.rs/wait-timeout/latest/wait_timeout/): useful child waiting, insufficient by itself for concurrent pipe draining or descendant cleanup. The shared Unix process-group owner supplies both.
- [process-wrap](https://github.com/watchexec/process-wrap): maintained successor to command-group; offers Unix groups/sessions and Windows job objects. It is a suitable option for future complete Windows process-tree ownership, rather than claiming the current Unix proof is cross-platform.
- [Cargo build-script environment tracking](https://doc.rust-lang.org/cargo/reference/build-scripts.html): `env!`/`option_env!` inputs cause recompilation; discovery must happen before Cargo, not after test binary creation.
- [GitHub triggering workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow): documents token-trigger suppression/dispatch exceptions. Credential choice is relevant to an acceptance matrix, but does not identify #633's missing trigger.
- [GitHub workflows API](https://docs.github.com/en/rest/actions/workflows): workflow state and exact-source runs support observable failure without publishing.
- [Buildx manifest inspection](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/): inspect `{{json .Manifest}}` and use its `digest`; do not assume an undocumented `.Manifest.Digest` field or verify mutable tags after recording a digest.

No new lifecycle library is required for this implementation. Existing `reqwest`, `serde_json`, `tempfile`, Rust process groups, `portable-pty`, Docker CLI and GitHub CLI are reused. Research supports component selection and defined proof limits, not claims that an upstream library automatically satisfies every acceptance requirement.

## Validation and outstanding evidence

Local finite reproductions include the default selector before/after, immediate fixture exit and a PTY grandchild that survived cancellation before the fix. The verification plan runs focused integrations, all router binary unit tests, script tests, formatting, strict Clippy, documentation and workflow/file-size checks, then all available CI on the exact pushed revision. Full local library test compilation exceeded the workspace's 3 GiB memory limit even with one job and stripped debug; that is recorded separately from a passing test result.

No serving workstation, real OAuth source, default/search-list Keychain, registry publication or primary stream was changed to acquire evidence. Live subscriptions, affected macOS arm64, disposable cross-credential delivery repository and a real resource-constrained Docker primary/candidate pair are required for the outstanding acceptance runs above. The production gates and verifier report these limits instead of upgrading mock, skipped or unhealthy control-path results to proven.
