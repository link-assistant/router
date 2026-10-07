# Issue #709 investigation and verification

The complete [requirement inventory and solution choices](../../docs/case-studies/issue-709/README.md)
cover #707 and #708 in [PR #710](https://github.com/link-assistant/router/pull/710).

## Work plan

1. Read parent, both child issues, all comments, PR discussion and reviews.
2. Read contributing/release policies and trace every shared caller.
3. Preserve failing release logs with timestamp and source SHA.
4. Research structured release lookup, existing release actions and fixture isolation tools.
5. Reproduce the release failure using the real script and no credentials.
6. Force the fixture's pre-lock deletion ordering using the actual sweep.
7. Add failing regressions before changing production behavior.
8. Implement duplicate confirmation and isolated sibling sweeps.
9. Run default-parallel repeats, simultaneous processes and affected verifier tests.
10. Run all local suites and contributing checks; record environment limits.
11. Commit atomic fixes, push only the prepared branch and update PR #710.
12. Review the complete PR diff, main ancestry, clean tree and final CI SHA.
13. Mark PR #710 ready after applicable checks pass.
14. Verify actual post-merge release artifacts using the existing delivery audit.

Validation results and final review status are recorded in
[PR #710](https://github.com/link-assistant/router/pull/710). Actual artifact delivery
requires the subsequent release containing the merged fixes.

## Reproduction

```sh
python3 experiments/issue-709/release-preparation.py
rust-script experiments/issue-709/sweep-fixture-race.rs
rust-script --test experiments/issue-709/sweep-regression.rs
```

Before the fix, the release suite reports 13 failed assertions across five tests.
The normal repeated preparation fails with HTTP 422; the English substring also
incorrectly accepts all eight unrelated failure cases. Three sweep regressions
fail against the original global-root implementation. The ordering probe shows
that an ordinary competing `DisposableRunDirectory` deletes the original style
of fixture before its lease is acquired. It continues to demonstrate why fixtures
must be isolated; production should clean a genuinely unleased dead-PID run.

The fixture gh accepts only the expected POST and exact-tag GET arguments. Its
directory is first on PATH and GitHub token variables are removed. No GitHub
write is performed. Successful retries must leave the entire release state,
including assets and prerelease/latest flags, byte-for-byte unchanged.

## Validation commands

```sh
rust-script --test scripts/create-github-release.rs
python3 experiments/issue-709/release-preparation.py
rust-script --test experiments/issue-709/sweep-regression.rs
cargo test --locked --lib with_command -- --nocapture
cargo test --locked --test with_router_test --test release_gate_test \
  --test tagged_release_test --test release_workflow_test
cargo fmt --all -- --check
cargo clippy --locked --all-targets --all-features -- -D warnings
rust-script scripts/check-file-size.rs
rust-script scripts/check-terminology.rs
rust-script scripts/check-release-workflow.rs
rust-script scripts/check-workflow-tools.rs
```

Full output and downloaded logs are retained under ignored `ci-logs/`. Experiments
are finite; none intentionally allocates unbounded memory or recurses without a
limit. An ordinary full-library build was killed at this workspace's approximately
3 GiB compiler memory limit. Run the retained bounded checks with:

```sh
python3 experiments/issue-709/run-unit-checks.py
```

This reuses the existing AST unit-test sharder in `experiments/issue-703`, runs
every shard with default parallelism, and checks that the wrapper-only executable
contains every `with_command` test in the combined inventory. It then runs the
whole wrapper suite 20 times sequentially and 20 times across four simultaneous
processes sharing one temporary root, followed by the affected native verifier.
Only ignored compiler inputs are generated; repository production sources and
test assertions are preserved. CI retains ordinary unsharded suites and repeats
the default-parallel wrapper tests 20 times on both Linux and macOS.

After the bounded runner has generated its wrapper, the remaining Cargo targets
can use the same compiler settings:

```sh
CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0 \
  CARGO_PROFILE_TEST_CODEGEN_UNITS=1024 \
  RUSTC_WRAPPER="$PWD/experiments/issue-703/rustc_memory_wrapper.py" \
  RUSTC_WORKSPACE_WRAPPER="$PWD/target/issue-709-with-command/with-command.py" \
  cargo test --locked --all-features --no-fail-fast
```

The bounded runner covers every library unit test; the final command covers the
binary, integration, example and documentation targets as well.

## Delivery verification

The audit is read-only and fails unless artifacts and provenance are verified:

```sh
rust-script scripts/check-delivery.rs --repository link-assistant/router \
  --source-sha 68c7a1b7c619a58c3812bc8058b2d41531811731 \
  --verify-artifacts --output ci-logs/delivery-before.json
```

After merge, fetch main/tags and rerun with the PR's merge SHA. The release must
contain that SHA. If the containing release needs recovery, the existing workflow
command is:

```sh
gh workflow run release.yml --repo link-assistant/router --ref main \
  -f release_mode=recover -f bump_type=patch
```

Do not run old immutable tags expecting them to contain the changed script.
Inspect the exact-tag publication run and all binary, image, integration,
attestation, npm, Python and stable-promotion jobs before claiming delivery.
