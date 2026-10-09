# Catalog source reproduction and verification

Run `python3 experiments/issue-727/reproduce.py` to check the new flags without
starting a listener or contacting a provider. Before the implementation, this
failed with exit code 2 and `unexpected argument '--model-catalog-sources'`.
The `cli::tests::configurable_model_catalog_flags_are_accepted` regression test
also failed on the original implementation with the same unsupported argument.

The source tests in `src/model_catalog_sources_tests.rs` exercise schema and
semantic rejection, provider-scoped precedence, an injected monotonic clock,
last-good retention and recovery, warning suppression, bounded files and HTTP
streams, redirects, private-network policy, and instance isolation. Routing
tests in `src/model_catalog_sources_routing_tests.rs` exercise management
authentication/listeners, live account scope, exact token grants, alias
discovery, upstream request mapping, and translated buffered and streaming
served identity.

The account-policy merge adds a regression for exact source metadata surviving
subscription alias projection while excluded models and alias-only grants stay
hidden. Without annotating before projection, the raw catalog's operator
provenance was null. The compatible alias test also uses the full HTTP router in
automatic mode with a subscription policy: it originally returned a Claude
entitlement error for an OpenCode-compatible provider. It now verifies successful
compatible routing, exact selector grants, and continued protection of account
aliases, prefixes and excluded live IDs.

The thinking merge extends that full HTTP regression with effort and numeric
suffixes on local aliases, explicit-body precedence, and streaming responses.
It verifies that the upstream receives the exact configured ID and normalized
reasoning controls while target-ID grants and protected subscription selectors
remain denied, including requests carrying a valid grant for the protected base
selector. These cases pass on the combined implementation without a routing fix.

`tests/model_catalog_compatibility_test.rs` preserves the public catalog cache's
unwind traits and existing route-ID discriminants and ordering. These assertions
reproduced the Rust API compatibility failures found by CI.

After merging the observability endpoints from main, run
`python3 experiments/issue-727/check-route-ordinals.py` for a small reproduction
of the same compatibility assertions. Keeping ModelDefinitions before the
newly published variants changes RequestLog from 95 to 96 and fails. Appending
ModelDefinitions at 102 preserves every observability route's value and order;
the ordinary integration test verifies the combined public crate as well.

The existing generated HTTP-client check also reproduced a Go compilation
failure: the source document's null-only fields became invalid `nil` types.
The strict source schema stays published separately; HTTP models describe
request and response payloads. Verify the generated clients with:

```sh
bash scripts/generate-http-clients.sh
bash scripts/test-http-clients.sh
```

These checks require Java, Go, PHP, Composer and Maven, compile all three clients,
and exercise them against a running Router with HTTP contract validation enabled.

This workspace has a 3 GiB compiler memory limit. The ordinary combined libtest
target exceeded it. The existing issue #703 AST sharder enables disjoint test
functions while preserving production code, test bodies and debug assertions.
CI runs the ordinary suite on its larger runners. For local verification:

```sh
python3 experiments/issue-727/run-focused.py
python3 experiments/issue-727/run-checks.py --units
python3 experiments/issue-727/run-checks.py --integrations
```

For a fresh main merge, `run-merged-checks.py` runs strict repository checks,
archives the previous suite's evidence, executes all unit/integration targets,
and verifies Rust documentation, the host-library example and a finite
60-second soak. First prepare current shards with the focused runner, then run
the merge runner through `experiments/issue-719/bounded-build.py` with a finite
`ROUTER_BUILD_RSS_LIMIT_MIB` appropriate for the workspace. The soak runtime has
its own 768 MiB bound.

The focused runner builds Router and generates contracts before preparing fresh
shards. After changes limited to tests, `--tests-only` reuses the built binary
and published contracts. Full unit verification checks that every shard passes
and collects a distinct test inventory. Two existing property tests inside
macros run in every shard and are counted once; other duplicates are rejected.
Integration verification runs
every Cargo integration target, followed by binary and documentation tests.
Logs are saved to the experiment directory and `ci-logs/issue-727`, respectively,
and are ignored by Git.
`run-checks.py --units --start 8` verifies saved shard results and their inventory
without compiling or running completed tests again.
Compare the saved inventory with a downloaded ordinary Linux CI job using
`experiments/issue-703/compare-unit-test-inventories.py`. The comparison accounts
for interleaved subprocess output and requires a complete passing summary;
`python3 experiments/issue-727/test-unit-inventory-parser.py` verifies that
failures, truncated logs and missing/unexpected names are rejected.

When CI requires committing an increased coverage baseline, download its
`rust-lcov` artifact and reproduce the reviewability failure without modifying
the repository baseline:

```sh
python3 experiments/issue-727/check-measured-coverage.py \
  ci-logs/issue-727/coverage-a4ad404/coverage-summary.json --expect-update
```

After committing the report's measured percentage, run the same command without
`--expect-update` to verify the coverage gate leaves the baseline unchanged.
The failed job on `247aa01` measured 77,623 / 89,329 lines, requiring the baseline
to advance from 86.855579% to 86.895633%. The existing coverage checker unit tests
continue to enforce the floor and prevent unapproved decreases.

The later instrumented test run on `621119d` failed before producing coverage:
`coverage-job-113955481825.log:6225` identifies
`auth::tests::provider_error_closes_listener_immediately` and line 6226 its
immediate port-rebind assertion. A released ephemeral port can already belong
to another parallel test. Run
`python3 experiments/issue-727/reproduce-callback-port-reuse.py` to reproduce
`EADDRINUSE` after the listener-owning task has finished; add `--check-task` to
verify task completion despite the port being reused. Callback tests now retain
their server's abort handle and verify that specific task has finished after
success, provider rejection, timeout or drop. Run the focused runner with
`--auth-tests` to include all seven real OAuth tests and require the four cleanup
cases to execute. Production shutdown logic and
the coverage ratchet stay unchanged.

All instrumented tests then passed on `a4ad404`. Its downloaded report measured
78,332 / 90,108 lines (86.931238%), requiring another reviewable increase from
86.895633%; `coverage-job-113974654490.log:7942` records that gate failure.
The same coverage reproduction script verifies the baseline mutation before
this correction and an unchanged baseline afterward, with no coverage exception.

The issue's compiled inventory was removed by issue #192. Source definitions
therefore overlay authenticated live inventories instead of restoring a static
list with routing authority. Leaving sources unset preserves existing behavior.
