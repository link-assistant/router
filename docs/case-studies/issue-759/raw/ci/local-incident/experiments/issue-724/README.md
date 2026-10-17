# Issue #724 regression investigation

Before changing the implementation, `accounts_routing_policy_test` reproduced three failures: an ordinary quota disabled a sibling model, a terminal quota mentioning a model left sibling models available, and authentication rejection did not cool the account. The six quota/disconnect pool scenarios reproduced four failures; only the pre-output transport error and no-replay assertions already passed. Strengthening the partial-output case then demonstrated a missing incomplete-stream error event.

Run the permanent regression suites with:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --test accounts_routing_policy_test \
  --test pool_failover_test --test network_security_audit_test
```

The account tests inject `OperationContext.now` rather than sleeping to prove cooldown expiration, and property-test arbitrary `u64` Retry-After/reset hints against configured cooldown bounds. The pool tests assert upstream account sequences, explicit errors on incomplete streams, strict pins, bounded retries and audit records. Production listener tests verify the controls are protected and remain available with metrics disabled.

Programmatic CLI construction also needs the new defaults: deriving `Default` for `PoolArgs` set the cooldown ceiling to zero and disabled parent affinity. Two minimal account tests first failed with the quota-limited account still selected and the child assigned to a different account (`programmatic-defaults-reproduction.log`). An explicit initializer supplies the new defaults while preserving the older fields' existing `Default` values.

Local logs are deliberately ignored by Git. Investigation logs include `routing-reproduction.log`, `stream-reproduction.log`, `disconnect-completion-reproduction.log`, `already-cooling-reproduction.log`, `binding-boolean-reproduction.log`, `targeted-tests.log`, and `clippy-final.log`. The latter two regression cases demonstrated an immediate 503 for an already-cooling pool and a binding silently dropping explicit `false` for default-enabled subagent affinity. Initial CI log `ci-logs/pipeline-37862094392.log:3153` reported the missing changelog fragment on the prepared placeholder commit; the feature's changelog fragment supplies the release trigger.

CI coverage run `37869397631` at commit `057da6c` passed its instrumented tests and measured 75,428 of 87,200 lines covered (86.50%). Its baseline-review gate then failed (`ci-logs/coverage-37869397631.log:8432`) because the committed baseline was 86.323847%. The `rust-lcov` artifact supplied the measured report, and the existing `scripts/check-coverage.rs` advanced `coverage-baseline.txt` to 86.500000%. Re-running the checker against that report leaves the committed baseline unchanged.

While the next run was queued, the management-hardening change reached `main` and advanced its baseline to 86.756772%. Run `37873145649` still tested the earlier source and reported that its 86.50% coverage was below the new default-branch baseline (`ci-logs/coverage-37873145649.log:8395`). The branch merges that change and preserves its baseline before measuring the combined source. The `management_security_test` suite also checks that both new routing controls honor remote-access restrictions and shared authentication lockouts.

CI run `37882175433` at commit `5fba6ae` passed all 2,176 library unit tests in both the Linux and instrumented suites. Its downloaded `rust-lcov` artifact measured 76,150 of 87,641 lines covered (86.888557%). The coverage floor passed; only the requirement to commit the increased baseline failed (`ci-logs/coverage-37882175433.log:8468`). The existing checker advances the baseline to that measured value, and a second invocation leaves it unchanged. The later `main` release commit changes version metadata to 1.19.0 without changing the tested routing source; its merge passes the build, generated contracts/bindings, compatibility checks and all 14 focused CLI/contract tests.

Run `37886197015` passed the Linux and coverage jobs, but macOS reproduced a wall-clock assumption in `a_session_returns_to_its_account_after_the_cooldown` (`ci-logs/macos-37886197015.log:7801`). A one-second Unix reset can expire across a timestamp boundary between two immediate requests, so the second detour assertion sometimes already saw the recovered primary account. The bounded local repeat probe reproduced the same assertion on iteration 29 (`cooldown-clock-reproduction.log:201`). The fixture now supports an injected clock: the test freezes it for both detours and advances exactly one second to verify recovery, preserving every assertion and removing the real sleep. Compile `pool_failover_test` and pass the executable printed by Cargo to this Linux probe (at most 128 iterations, 1.5 GB address space and 64 MB stack per process):

```sh
python3 experiments/issue-724/repeat-pool-cooldown.py /path/to/pool_failover_test --repetitions 64
```

After the clock change, all 38 pool tests and all 64 repeat iterations pass (`cooldown-clock-pool-tests.log` and `cooldown-clock-repeat-tests.log`). The complete local integration/bin rerun also passes all 865 tests across 118 suites, with one ignored soak test (`cooldown-clock-full-integration-tests.log`).

Merging provider onboarding from `main` (`ccc9d8d`, PR #751) reproduced four failures in its shared conformance fixture (`provider-merge-reproduction.log`): it still expected a whole-account cooldown for an ordinary quota with a requested model. The fixture now verifies that model's cooldown duration/count and exclusion while its sibling remains eligible, then verifies the original credential cooldown duration/count for terminal quota with a model specified. All nine connector conformance cases pass (`provider-merge-conformance-tests.log`); login, refresh, catalog, network and rollback assertions remain in place. The combined source passes all 874 integration/bin tests across 119 suites (one ignored soak), all 15 doctests, strict Clippy and strict documentation (`provider-merge-*.log`). Generated contracts/bindings, published-contract compatibility, formatting, file size, terminology, changelog and vendor fixture checks also pass.

CI run `37895529084` at commit `df69402` passes the Linux, macOS and Windows test jobs, including all 2,176 enabled library tests on Linux/macOS and 2,123 on Windows. Its downloaded `rust-lcov` report measures 76,285 of 87,779 lines covered (86.905752%). The coverage floor passes; the baseline-review gate requests this measured increase (`ci-logs/coverage-37895529084.log:7882`). The existing coverage checker advances the baseline from that report, a second invocation leaves it unchanged, and all eight checker tests pass. The subsequent `main` release changes version metadata to 1.20.0 without changing routing source. Its merge passes the build, generated contracts/bindings, compatibility checks, all 14 focused CLI/contract tests and every example target (`final-release-*.log`).

CI's Rust API compatibility job at commit `d0e4666` reported changed `RouteId` discriminants (`ci-logs/semver-37873145548.log:1352`) and derived ordering. The new contract inventory regression first failed because `CredentialStatus as usize` was 21 instead of its published value 19 (`route-id-reproduction.log`). Appending the two new route variants preserves existing casts and ordering. Check against the default branch with the same pinned tool as CI:

```sh
cargo install cargo-semver-checks --version 0.51.0 --locked
cargo semver-checks check-release --baseline-rev origin/main --release-type minor
```

The workspace has a 3 GB process-group memory limit. One Cargo build job and disabled debug information keep integration builds within that bound. Default library unit-test codegen exceeded the limit. `low-memory-rustc.py` is a local-only experiment that partitions library test codegen, reduces LLVM name retention and serializes the backend; it leaves dependencies, production builds and checked-in Cargo profiles unchanged. That unsharded experiment was also OOM-killed. The attempted command was:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  RUSTC_WRAPPER="$PWD/experiments/issue-724/low-memory-rustc.py" \
  cargo test --locked --all-features
```

The wrapper requires a compiler supporting `-Zfewer-names` and `-Zno-parallel-backend` (Rust 1.98.1 here). CI uses the normal stable build without this local memory experiment. Logs include `all-tests.log` and `all-tests-serial-codegen.log`.

The repository's existing syntax-tree sharder subsequently allows the entire enabled library suite to run locally within the limit. All eight groups pass, and their 2,176 distinct test names exactly match the passing unsharded CI inventory from run `37895529084`. Each compiler/test child is bounded to 2,400 MiB; the largest recorded child RSS is 2,363,804 KiB. This changes only generated copies under `target/local-unit-shards`, leaving production sources and CI unchanged. On Linux, reproduce the bounded run with:

```sh
ROUTER_BUILD_RSS_LIMIT_MIB=1600 python3 experiments/issue-719/bounded-build.py \
  rust-script experiments/issue-703/shard-unit-tests.rs
env -u CODEX_HOME ROUTER_BUILD_RSS_LIMIT_MIB=2400 CARGO_PROFILE_TEST_DEBUG=0 \
  python3 experiments/issue-726/verify-unit-shards.py
```

Removing `CODEX_HOME` only from the test child's environment matches the default-home fixture's normal CI environment. Results are in `provider-merge-local-unit-shards.log`, `ci-logs/connector-unit-shard-*.log` and `ci-logs/connector-unit-test-inventory.txt`.

The later `main` account-policy change (PR #748) introduced a separate dispatch loop. Cross-feature tests first reproduced bypassed credential caps and retry rounds, missing pre-output stream retries and terminal quota body inspection (`combined-policy-http-reproduction.log`). A direct selection test also demonstrated that a model alias could bypass its native model's cooldown (`combined-policy-selection-reproduction.log`). The policy path now uses the shared retry budget and byte-preserving response inspection; selection checks the actual upstream model while retaining prefix, exclusion, grant and weighted-selection rules.

Further regressions reproduced an immediate error for an already-cooling policy pool, additional rounds exceeding an explicit account retry limit, and stream cooling after a `relay` rule's task-local scope ended (`combined-policy-fixed-tests.log`). The observer retains the rule verdict for the response lifetime, and the policy retry loop respects the explicit total attempt cap. An initial cooldown wait also used to restart the round counter, producing two upstream calls instead of one (`combined-initial-round-reproduction.log`); dispatch now resumes with the already-consumed rounds and the same deadline. `tests/pool_failover/account_policies.rs` exercises all these cases through the production router and bounded three-account fixture. The weighted selection regression additionally verifies that live strategy changes preserve parent and child bindings.

The combined source passes all 910 integration/bin tests across 121 suites (one ignored soak), including all 46 pool tests, all 15 doctests, strict documentation and strict all-target/all-feature Clippy (`combined-canonical-integration-tests.log`, `combined-policy-final-pool.log`, `combined-doctests.log`, `combined-docs.log`, `combined-clippy.log`). Regenerating the merged catalog from the built CLI resolves the catalog consistency check; the checked output contains 62 operations and 227 routes and retains published contracts. Node, TypeScript and Python checks pass. A concurrent client run hit Bun's existing five-second native-verifier test limit; its isolated rerun passes all ten tests, with that verifier taking 3.31 seconds (`combined-bun-serial-tests.log`). No timeout increase is needed.

The subsequent `main` v1.21.0 release merge changes only version/changelog metadata; its production, test and script delta is empty. The new binary builds successfully, generated contracts/bindings and published compatibility remain current, all 21 focused CLI/contract/operation tests pass, and every example target passes (`combined-release-*.log`).

The combined account-policy source at `ad01d708159c669984f42bf2a7cde39b7ef42103` also passes all eight bounded library groups in an immutable checkout. Its 2,177 distinct enabled test names retain every previously enabled test and add main's SSE rewriting regression. The largest child RSS is 2,404,772 KiB, below the 2,400 MiB limit (`combined-local-unit-shards.log`, `combined-unit-inventory-summary.log`, and `ci-logs/connector-unit-shard-*.log`). The runner above reproduces this suite; production sources and normal CI remain unchanged by its generated test groups.

Main's subsequent PR #754 updates seven pinned Node/Python setup-action lines in two workflows. Its merge changes no production, test, Cargo, generated-contract or script files. The workflow tool check passes all 42 jobs in 13 workflows, and release-workflow invariants, formatting, whitespace and file-size checks pass (`main-actions-*.log`). The existing source-test results therefore remain applicable; final CI also verifies the updated actions.

Run `37918422497` at `ad01d70` passes Linux, macOS and Windows tests, and all six other workflows pass. Its unsharded Linux library inventory exactly matches the 2,177 distinct locally enabled tests (`resume-linux-inventory.log`). The instrumented suite passes and measures 77,818 of 89,502 lines covered (86.945543%). Only the baseline-review gate fails (`ci-logs/coverage-37918422497.log:8538`): the existing checker requests that measured increase. The downloaded `rust-lcov` report supplies the committed baseline; a second checker invocation leaves it unchanged, and its eight tests pass.

Main's subsequent admin-observability merge (PR #753) adds seven management routes. The combined catalog retains all 62 operations and publishes 234 routes; the previously published observability route IDs retain their values, with routing controls appended afterward. The first merged build reproduces duplicate `record_management` helpers (`resume-admin-build.log`); observability now adds its timestamp through a separate helper and uses the existing shared audit writer.

`tests/pool_failover/observability.rs` verifies that pre-output failover attributes a pending stream to the selected account, clears its active count on cancellation, and retains a complete opt-in capture of the failed account's quota response. Both tests pass with ordinary dispatch and account-policy dispatch (`resume-admin-observability-tests.log`), using the existing three-account fixture and bounded local HTTP requests. Run them with `cargo test --locked --all-features --test pool_failover_test observability::`.

Run all integration tests, binary tests and doctests within the local limit with:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --test '*' --bins
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --doc
```

The complete admin-observability merge passes all 922 integration/bin tests across 122 suites (one ignored soak), including all 48 pool tests, all 15 doctests, every example target, and strict documentation. Results are in `resume-admin-all-integration-tests.log`, `resume-admin-doctests.log`, `resume-admin-examples.log`, and `resume-admin-strict-docs.log`. Fresh CI also passes strict all-target/all-feature Clippy (`ci-logs/lint-37966233582.log`).

Run `37966233582` at `54965b5` passes the instrumented tests and coverage floor, measuring 78,542 of 90,291 lines covered (86.987629%). The reviewable-baseline gate alone fails (`ci-logs/coverage-37966233582.log:7968`), requesting that measured increase. The downloaded `rust-lcov` report supplies the baseline through the existing checker; a second invocation leaves it unchanged, and all eight checker tests pass (`resume-admin-coverage-*.log`).

The fresh unsharded Linux inventory contains 2,180 enabled library tests: all 2,177 previous tests plus main's latest-version, debug-lease and native-error-capture regressions. The current local run uses sixteen generated groups and records every enabled test name. Reproduce it with the same fixed 2,400 MiB child limit:

```sh
ROUTER_LOCAL_UNIT_SHARDS=16 ROUTER_BUILD_RSS_LIMIT_MIB=1600 \
  python3 experiments/issue-719/bounded-build.py \
  rust-script experiments/issue-703/shard-unit-tests.rs
python3 experiments/issue-724/run-unit-groups.py
```

The runner preserves per-group listings, test results and peak RSS in `ci-logs/admin-unit-group-*.log`, and writes their distinct enabled names to `ci-logs/admin-unit-test-inventory.txt`. It uses the same commands as the fixed-checkout validation and does not alter production sources or the normal CI compiler. The later main v1.22.0 release changes only package/catalog versions and changelog metadata; its production, test and script delta is empty, and the merged versions and generated bindings agree.

Merging canonical thinking controls (main PR #750) exposed two interactions before their fixes. `thinking_suffixes_share_base_cooldowns_and_survive_failover` returned to the cooled primary for both a different suffix and the bare model (`resume-thinking-pool-red.log`): the stable routing context had retained the suffix while the upstream received the base model. The context now uses the interpreted base model, retaining invalid suffixes as literal identifiers. The test runs with ordinary and account-policy dispatch and verifies control preservation, sibling eligibility and the stored base-model cooldown. `routing_context_uses_the_base_model_for_valid_thinking_suffixes` covers effort, budget, auto, off and invalid selectors.

`a_same_account_retry_round_keeps_encrypted_history_and_thinking` also failed before the fix (`resume-thinking-history-red.log`): the policy dispatcher treated every retry as a credential switch and removed the same account's encrypted history. Replay now compares the selected account with the original account before stripping history, while independently revalidating thinking controls on every retry. The regression verifies both upstream bodies, the account sequence, encrypted history and reasoning effort. Run these permanent coexistence cases with:

```sh
cargo test --locked --all-features --test pool_failover_test thinking_suffixes_share
cargo test --locked --all-features --test pool_failover_test a_same_account_retry_round
cargo test --locked --all-features --test thinking_account_policy_test
```

The combined thinking/routing source passes all 968 integration/bin tests across 127 suites (one existing ignored soak), all 15 doctests, strict documentation and 2,183 distinct library tests. The enabled library inventory retains all 2,180 previously enabled tests and adds the exact-base routing, endpoint/generation capability scope and thinking-suffix grant regressions. No library tests fail or are ignored (`resume-thinking-local-unit-inventory-summary.log` and `ci-logs/thinking-local-unit-inventory.txt`).

Eight initial file partitions completed six groups. Two compilers reached the existing 2,350 MiB guard before their tests started; the runner safely stopped them with exit 125. Splitting only those file partitions into four 16-way groups completes every remaining test without raising the bound. Successful groups peak at 2,383,772 KiB; the guarded attempts stop at no more than 2,424,720 KiB, below the enclosing fixed 2,400 MiB limit. The original and replacement logs are `resume-thinking-all-unit-shards.log` and `resume-thinking-unit-split-{5,6,13,14}.log`. On a small Linux worker, run all sixteen partitions directly:

```sh
env -u CARGO_TARGET_DIR CARGO_PROFILE_TEST_DEBUG=0 \
  python3 experiments/issue-725/run-unit-shards.py --shards 16 --library-only
```

Main's subsequent v1.23.0 release changes only version/catalog metadata and changelog files; its production, test, script and example delta is empty. The rebuilt v1.23.0 binary passes all 41 focused CLI/contract/administration tests, all examples, strict production/integration/example/benchmark Clippy, exact CLI-generated contracts and bindings, published-contract compatibility, Node/Bun/Python (ten tests each) and TypeScript (`resume-thinking-release-*.log`). The catalog retains 62 operations and 234 HTTP routes. Formatting, file-size, terminology, workflow tools, release/changelog rules and recorded-fixture checks also pass.

Run `37981694647` at `a978d43` passes Linux, macOS and Windows tests, including normal Linux's 2,183 enabled library tests. The complete local inventory exactly matches those names and retains all 2,180 previous tests (`resume-thinking-unit-inventory-summary.log`). All six other workflows pass. The instrumented suite measures 79,965 of 91,865 lines covered (87.046209%); its floor and ratchet pass, and only the baseline-review gate requests the measured increase (`ci-logs/coverage-37981694647.log:7305`). The downloaded `rust-lcov` report supplies the baseline through the unchanged checker; a second invocation leaves it unchanged, and all eight checker tests pass (`resume-thinking-coverage-*.log`).

Run `37990162689` at `0f79a7d` passes all Linux, macOS and Windows tests, strict lint/format/documentation checks, dependency audit, changelog/version checks and instrumented coverage. The fresh normal Linux inventory again exactly matches all 2,183 locally executed library tests (`resume-thinking-final-unit-inventory-summary.log`). Its report measures 79,966 of 91,865 lines covered (87.047298%); the unchanged checker accepts that result without modifying the committed 87.046209% baseline (`resume-thinking-final-coverage-check.log`). All five non-image secondary workflows pass. These checks cover the same application and test source as the CI-only cache fix.

At `0f79a7d`, three runtime-image attempts fail before compilation when Docker Hub returns 429 for the pinned Rust, Debian or Bun manifest (`ci-logs/docker-37990162700*.log`). The tunnel smoke test likewise reaches Docker Hub's unauthenticated pull limit for Alpine (`ci-logs/tunnel-37990162689-attempt-1.log:153`). Retrying on fresh runners does not resolve it. A bounded probe confirms that Google's public cache serves all four manifest bodies with SHA-256 hashes exactly equal to the existing Dockerfile pins:

```sh
python3 experiments/issue-724/probe-pinned-image-cache.py
```

The two CI builders use [Docker's documented registry-mirror configuration](https://docs.docker.com/build/ci/github-actions/configure-builder/#registry-mirror) to consult `mirror.gcr.io`. Dockerfile tags/digests and smoke assertions remain intact. A cache miss still falls back to Docker Hub; [Google documents this behavior](https://docs.cloud.google.com/artifact-registry/docs/pull-cached-dockerhub-images). The probe requests only four manifests, reads at most 1 MiB each and limits process address space to 256 MiB; it does not download image layers.

The final-head Windows run exposed a setup race in `an_initial_policy_cooldown_wait_consumes_the_retry_round`: its one-second Unix cooldown could expire before selection, legitimately permitting both rounds (`ci-logs/windows-37996592937.log:38996`; full pipeline log line 64834). The revised fixture uses the existing injected clock, waits for the existing retry-wait debug event, then explicitly resets the model cooldown. The upstream one-call assertion and original five-second deadline remain intact. An expired-clock counterpart verifies that expiration leaves both rounds available.

Validate this fixture and its ability to detect the original round-handoff bug with:

```sh
python3 experiments/issue-724/probe-initial-round-test.py
```

The bounded experiment first passes the synchronized test, temporarily removes the exact initial-round handoff, reproduces the extra `primary` call, restores production source in `finally`, and passes all 51 pool tests. Each compiler stays below the unchanged 2,400 MiB limit; the largest observed child RSS is 2,030,100 KiB (`initial-round-clock-{green,red,full-pool}.log`). The new expired-clock case brings locally verified integration/bin coverage to 969 tests across the same 127 suites; application source and the 2,183-library-test inventory are unchanged.

Main's catalog-source merge (PR #752) retains authenticated live inventory, exact token grants, account-policy aliases/prefixes/exclusions and scoped thinking controls. The combined route enum preserves published `ModelDefinitions = 102` and appends `Routing = 103` / `CooldownReset = 104`; the ordinary compatibility regression checks both values and ordering. Regenerated contracts retain all 62 operations and contain 235 HTTP routes, including all three management endpoints. The merge exposed a 1,002-line route inventory; extracting the catalog-inspection entry into the existing routing catalog keeps the parent at 998 lines while retaining the entry at its published inventory position. The higher previously measured coverage baseline is retained until a combined instrumented report is available.

After building the current binary and regenerating contracts, repeat complete combined validation with:

```sh
python3 experiments/issue-724/validate-catalog-merge.py
python3 experiments/issue-724/verify-catalog-inventory.py ci-logs/latest-linux.log
```

The first driver runs every integration/bin test, doctest, strict documentation, example, all sixteen library partitions, exact contract/binding checks and all official binding clients serially. It preserves complete `resume-catalog-all-*.log` files and accepts `--from` to resume a reviewed successful prefix. The library parser keeps test bodies and production code intact, uses the existing 2,350 MiB guard, and leaves normal CI unmodified. The inventory verifier requires all sixteen passing groups, zero failed/ignored/duplicated tests, every previously enabled library name, and an exact match with a complete normal Linux CI result.

The focused merged catalog run passes all 15 catalog, 21 CLI and seven OAuth tests, including the successful-response contract assertion and all four callback cleanup cases. Its first generated copy inherited an `openapi` symlink to the previous workspace, reproducing an undocumented-response failure; removing only that generated source directory and regenerating it points every fixture link to the current tree. The complete focused rerun and real CLI flag probe pass, with a peak child RSS of 2,115,712 KiB (`resume-catalog-source-focus-driver.log`). Normal production contracts and the catalog endpoint did not need a change. Full-suite file partitions use fresh temporary directories with current-tree links.

An additional unsharded local `cargo clippy --locked --all-targets --all-features -- -D warnings` attempt encountered sustained workspace cache pressure: the compiler reread more than 158 GB while the cgroup stayed at its memory ceiling. No lint error or OOM was reported. The attempt was stopped by terminating only its process group, at a recorded peak of 2,284,744 KiB, to release that pressure (`resume-catalog-canonical-clippy.log`, `resume-catalog-clippy-resource-pressure.log`). Strict production, integration, example and benchmark checks pass locally; canonical all-target/all-feature Clippy remains an unchanged required normal-CI gate. The full local test driver uses finite library partitions rather than this unsharded target.

Main's v1.24.0 release (`d0a695b`) changes only package/catalog versions and changelog metadata; the merged source, tests, scripts, examples and workflow delta is empty. Its binary rebuild passes in 2m 16s with a peak of 2,039,856 KiB. Exact current-binary contracts retain 62 operations and 235 routes, binding parity and published compatibility pass, and Node/Bun/Python each pass ten tests with TypeScript also passing. Formatting, file-size, terminology, all 42 workflow jobs and release invariants pass (`resume-catalog-release-*.log`).

The complete combined validator at `112aaff` passes all 971 integration/bin tests across 128 suites, all 15 doctests, strict documentation, examples, current-binary contracts, bindings, compatibility and all three official clients (ten tests each), plus TypeScript. Its sixteen library partitions pass all 2,199 distinct tests with zero failures, ignored tests, duplicates or memory stops. All 2,183 previously enabled names remain present. The largest library child RSS is 2,281,552 KiB, below the unchanged 2,350 MiB guard (`resume-catalog-all-*.log`).

The exact-head instrumented report from run `38007252770`, artifact `11653886152`, measures 80,586 of 92,490 lines covered (87.129419%). It passes the unchanged coverage floor and ratchet; only the reviewable-baseline gate fails (`ci-logs/coverage-38007252770.log:8075`). The unchanged checker supplies the measured baseline, a second invocation leaves it unchanged, and all eight checker tests pass (`resume-catalog-coverage-*.log`). Canonical all-target/all-feature Clippy and the complete lint, documentation, policy and automation gates pass in the same run.

The complete normal Linux job at the same head passes; its unsharded inventory exactly matches all 2,199 locally executed library names (`resume-catalog-unit-inventory-summary.log`). Both pinned image builders also pass their shipped-command, DNS/relay and tunnel assertions. The real-client workflow passes all enabled captures; its existing live-credentialed host setup/doctor/launch/remove case is explicitly skipped because `ROUTER_HOST_CLI_TESTS=1` is not set (`ci-logs/real-clients-38007252772-baseline/real-clients.skips`). Both platform soak checks pass, exercising the single soak ignored in the ordinary integration suite.

The macOS job fails the initial cooldown-wait fixture at `ci-logs/macos-38007252770.log:7941`. A finite 32-thread pool probe reproduces the skipped-wait response. The fixture froze its clock and relied on a tracing callback to release the cooldown. Diagnostic runs reproduce zero delivered events with both a thread-scoped subscriber and a subscriber attached to each server-request poll; the former fails three of twenty cooldown repetitions and the latter also fails. The full formatter receives the accepted-wait event only in passing runs (`initial-round-refusal-diagnostics-{00,01,02,03,04}.log`). Neither a scheduled wake nor synchronous clearing inside that callback supplies a reliable test dependency.

Clock advancement is opt-in for this fixture; other fixtures keep their injected clocks frozen. The corrected test request starts at its injected Unix timestamp and advances that scoped timestamp on every poll using elapsed Tokio time. The retry sleep can therefore expire the initial cooldown without a subscriber or a wall-clock second boundary. The original one-upstream-call assertion and five-second deadline remain in place, and the expired-cooldown counterpart still requires two upstream calls. Default-off production debug events now identify exhausted rounds, absent eligible recovery and a wait rejected by its interval or deadline bounds. The advancing-clock mutation probe passes before mutation, fails with two calls to `primary` when the initial round handoff is removed, and passes all 51 pool tests after exact production restoration (`initial-round-advancing-clock-mutation-driver.log`). The largest child RSS is 2,023,332 KiB, below the existing 2,400 MiB build guard. The regression also explicitly requires at least one second of elapsed request time, keeping an observable assertion for the initial wait. Twenty full-suite repetitions with four test threads of the advancing-clock implementation pass all 1,020 test executions with zero failures (`initial-round-advancing-clock-normal-driver.log`), at 58,696 KiB peak child RSS under the 512 MiB probe guard. Frozen and advancing test clocks are represented explicitly so the existing session-recovery fixture retains its frozen clock.

`probe-initial-round-parallel.py` reuses the executable printed by `cargo test --locked --all-features --test pool_failover_test --no-run`. It executes twenty finite repetitions by default, collects every failing iteration without discarding its log, permits 1–100 repetitions and 1–32 concurrent tests, and accepts a filter and distinct log prefix. Run it through the existing memory guard:

```sh
ROUTER_BUILD_RSS_LIMIT_MIB=512 python3 experiments/issue-719/bounded-build.py \
  python3 experiments/issue-724/probe-initial-round-parallel.py \
  "$pool_test_binary" --threads 4 --log-prefix initial-round-final-clock-normal
ROUTER_BUILD_RSS_LIMIT_MIB=512 python3 experiments/issue-719/bounded-build.py \
  python3 experiments/issue-724/probe-initial-round-parallel.py \
  "$pool_test_binary" --runs 5 --threads 32 --log-prefix initial-round-final-clock-stress
```

Set `pool_test_binary` to that freshly built executable. The original 32-thread diagnostic on one CPU also exposes the pre-existing cancellation fixture's 200 ms client deadline (`initial-round-before-request-subscriber-11.log:11`), which can expire before the upstream receives the request. That stress result is kept separate from the cooldown regression and normal full-suite validation; the existing cancellation assertion and CI test inventory are unchanged.

The final explicit `Clock::Frozen`/`Clock::Advancing` fixture passes strict production, binary, integration, example and benchmark Clippy (`initial-round-final-clock-clippy-fixed.log`), then rebuilds successfully. Five complete runs with 32 concurrent tests all pass 51 tests, including the cooldown and cancellation fixtures: 255 executions, zero failures or ignored tests, at 103,464 KiB peak child RSS under the 512 MiB guard (`initial-round-final-clock-stress-driver.log`). Earlier cancellation failures remain recorded as stress evidence rather than being removed from the test suite.
