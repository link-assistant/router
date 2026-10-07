# Persistent operational logging verification

The pre-fix compiled launcher regression failed because stderr contained
`router_model_launch` before `FAKE_CLAUDE_LAUNCHED`. The early-configuration
failure returned nonzero but had no `data/logs/operational.log`; explicit JSON
results likewise produced no persistent lifecycle record.

Run the automated tests without vendor accounts or a credential store:

```sh
CARGO_BUILD_JOBS=1 cargo test --lib operational_log
CARGO_BUILD_JOBS=1 cargo test --test operational_logging_test
CARGO_BUILD_JOBS=1 cargo test --test with_router_test
```

The real-process experiment inherits its terminal stdout/stderr, uses a temporary
home and data directory, exercises a denied local request, and sends SIGTERM.
It then reads the persistent startup/request/shutdown/exit records and checks
permissions and synthetic-secret redaction. Its finite readiness and shutdown
limits reap the process on failure:

```sh
cargo build --bin router
python3 experiments/issue-718/verify.py target/debug/router
```

Initial parallel compilation exceeded this environment's 3 GB container memory
limit. Serial compilation (`CARGO_BUILD_JOBS=1`) reduces concurrent compiler and
linker peaks. If needed, set `CARGO_PROFILE_DEV_DEBUG=0` and
`CARGO_PROFILE_TEST_DEBUG=0` to reduce compiler memory without changing process
stack or test inputs.

The full library unit-test compilation still exceeded this shared container's
memory limit with those settings. This bounded fallback compiles the actual
operational-log and URL-redaction modules, including their unchanged unit tests,
against the already built dependencies:

```sh
python3 experiments/issue-718/test_sink.py
```

It limits compiler/test data memory to 1 GiB and virtual address space to 4 GiB
(Rust dependencies need room for memory-mapped artifacts). The normal library
test suite remains part of CI; this fallback verifies the new sink locally
without duplicating its implementation.

For existing process binaries, `python3 experiments/issue-718/test_processes.py`
compiles the current integration tests without rebuilding the library. It prints
binary build timestamps, resolves dependencies from Cargo fingerprints, and uses
a bounded, serial linker. This can check draft binaries; use normal Cargo/CI
builds to validate the final source revision.
