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

CI's Rust API compatibility job at commit `d0e4666` reported changed `RouteId` discriminants (`ci-logs/semver-37873145548.log:1352`) and derived ordering. The new contract inventory regression first failed because `CredentialStatus as usize` was 21 instead of its published value 19 (`route-id-reproduction.log`). Appending the two new route variants preserves existing casts and ordering. Check against the default branch with the same pinned tool as CI:

```sh
cargo install cargo-semver-checks --version 0.51.0 --locked
cargo semver-checks check-release --baseline-rev origin/main --release-type minor
```

The workspace has a 3 GB process-group memory limit. One Cargo build job and disabled debug information keep integration builds within that bound. Default library unit-test codegen exceeded the limit. `low-memory-rustc.py` is a local-only experiment that partitions library test codegen, reduces LLVM name retention and serializes the backend; it leaves dependencies, production builds and checked-in Cargo profiles unchanged. Even this experiment was OOM-killed here, so it does not establish a passing unit-suite result. The full unit suite must run on the normal CI runners. The attempted command was:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  RUSTC_WRAPPER="$PWD/experiments/issue-724/low-memory-rustc.py" \
  cargo test --locked --all-features
```

The wrapper requires a compiler supporting `-Zfewer-names` and `-Zno-parallel-backend` (Rust 1.98.1 here). CI uses the normal stable build without this local memory experiment. Logs include `all-tests.log` and `all-tests-serial-codegen.log`.

Run all integration tests, binary tests and doctests within the local limit with:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --test '*' --bins
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --all-features --doc
```
