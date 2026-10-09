# Issue #724 regression investigation

Before changing the implementation, `accounts_routing_policy_test` reproduced three failures: an ordinary quota disabled a sibling model, a terminal quota mentioning a model left sibling models available, and authentication rejection did not cool the account. The six quota/disconnect pool scenarios reproduced four failures; only the pre-output transport error and no-replay assertions already passed. Strengthening the partial-output case then demonstrated a missing incomplete-stream error event.

Run the permanent regression suites with:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 CARGO_PROFILE_TEST_DEBUG=0 \
  cargo test --locked --test accounts_routing_policy_test \
  --test pool_failover_test --test network_security_audit_test
```

The account tests inject `OperationContext.now` rather than sleeping to prove cooldown expiration, and property-test arbitrary `u64` Retry-After/reset hints against configured cooldown bounds. The pool tests assert upstream account sequences, explicit errors on incomplete streams, strict pins, bounded retries and audit records. Production listener tests verify the controls are protected and remain available with metrics disabled.

Local logs are deliberately ignored by Git. Investigation logs include `routing-reproduction.log`, `stream-reproduction.log`, `disconnect-completion-reproduction.log`, `already-cooling-reproduction.log`, `binding-boolean-reproduction.log`, `targeted-tests.log`, and `clippy-final.log`. The latter two regression cases demonstrated an immediate 503 for an already-cooling pool and a binding silently dropping explicit `false` for default-enabled subagent affinity. Initial CI log `ci-logs/pipeline-37862094392.log:3153` reported the missing changelog fragment on the prepared placeholder commit; the feature's changelog fragment supplies the release trigger.

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
