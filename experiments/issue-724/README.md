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

Run all integration tests, binary tests and doctests within the local limit with:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --test '*' --bins
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --doc
```
