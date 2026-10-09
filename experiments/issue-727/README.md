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

This workspace has a 3 GiB compiler memory limit. The ordinary combined libtest
target exceeded it. The existing issue #703 AST sharder enables disjoint test
functions while preserving production code, test bodies and debug assertions.
CI runs the ordinary suite on its larger runners. For local verification:

```sh
python3 experiments/issue-727/run-focused.py
python3 experiments/issue-727/run-checks.py --units
python3 experiments/issue-727/run-checks.py --integrations
```

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

The issue's compiled inventory was removed by issue #192. Source definitions
therefore overlay authenticated live inventories instead of restoring a static
list with routing authority. Leaving sources unset preserves existing behavior.
