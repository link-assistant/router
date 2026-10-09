# Thinking pipeline investigation

Baseline: `b714587` (prepared PR branch, based on Router 1.18.6).
Reference: CLIProxyAPI v8.0.20, commit
`0f96f568e4dbf6f84ad7399a74b78344c5eac7e6`, MIT, router-for-me.

The first three tests in `tests/thinking_pipeline_test.rs` were run before
implementation. All three failed: Chat-to-Anthropic kept `(16384)` in the model
and did not apply the budget; Chat-to-Gemini rejected `reasoning_effort`;
Gemini-to-Chat rejected a thinking budget. Their original output is preserved
locally in `ci-logs/reproduction.log`.

Additional tests reproduced a rejected manual Anthropic budget, malformed
control containers being ignored, and Gemini budget evidence constraining an
Anthropic target. Local failing logs are
`ci-logs/anthropic-budget-reproduction.log` and
`ci-logs/additional-reproduction.log`. The HTTP regression also exposed the
served-model comparison still using the suffixed selector; the identity check
now compares the exact base and still rejects sibling substitutions.

The complete integration run also caught an unrequested `reasoning.summary`
being added by Chat-to-Responses amount conversion. A minimal standalone
reproduction is `summary-reproduction.rs`; its failing output is preserved in
`ci-logs/summary-reproduction.log`. The adapter now retains its historical
summary behavior, with absence and explicit choices covered by an automated
regression.

A final comparison with upstream `strconv.Atoi` exposed signed-zero budgets:
`-0` and `-000` are nonnegative zero and must disable thinking. The standalone
`signed-zero-reproduction.rs` compiles the actual parser source; it failed
before the fix and now passes. The parser regression also rejects multiple
signs and still bounds budgets to `u32`.

The Codex WebSocket regression compared HTTP and two WebSocket turns against
the same authenticated catalog declaring thinking unsupported. HTTP removed
the effort, but the first WebSocket request still forwarded `low`; the failing
output is in `ci-logs/websocket-evidence-reproduction.log`. WebSocket ingress
normalized suffixes without checking the selected account's capability facts.
The connection now retains its account and inference endpoint and applies the
same catalog validator before forwarding the first and each subsequent turn.

The published catalog contract initially omitted the new optional `thinking`
metadata. `catalog-contract-reproduction.rs` and the new contract-inventory
regression both failed with `Additional properties are not allowed ('thinking'
was unexpected)`. The generator now declares that optional property, and the
OpenAPI document and JavaScript/Python types are regenerated. The regression
also checks that an unrelated undocumented model property is still rejected.

CI's first complete merged run passed all platform tests but measured
86.702128% line coverage against the 86.756772% baseline. The downloaded
LCOV report identified missed native-control removal, legacy reasoning-level
facts, snake-case Gemini controls, native URL selectors and Anthropic output
limits. Additional request-based regressions cover these paths.
Inspect a report from the matching source revision with:

```console
python3 experiments/issue-725/coverage-gaps.py /path/to/lcov.info
```

Run the reproductions and conformance cases with:

```console
cargo test --locked --test thinking_pipeline_test --test thinking_parser_test \
  --test thinking_matrix_test --test thinking_evidence_test --test router_e2e_test \
  --test contract_inventory_test
```

To regenerate the five upstream fixtures from the pinned checkout:

```console
python3 experiments/issue-725/extract_upstream.py \
  /path/to/CLIProxyAPI/test/thinking_conversion_test.go
```

The vectors remain unchanged; the Rust harness records intentional body
precedence and no-default differences. Its exact synthetic capabilities are
test evidence, not production provider metadata. Parser property tests use
128 finite cases per property, model names of at most 160 Unicode characters
and `u32` budgets.

Compatibility choices: explicit body controls keep precedence; invalid
suffixes stay literal IDs; legacy Anthropic body-effort budgets and adapter
defaults remain; no thinking/signature replay handling is replaced. Scoped
catalog constraints are checked after account selection for every attempt,
and unknown evidence preserves controls. The minor changelog fragment is the
release trigger; the release workflow owns the version bump.

The workspace has a 3 GB memory limit. A normal full test build exceeded it;
the debug-free, single-job retry was stopped at a finite 2350 MiB child RSS
bound. Complete local validation therefore runs the integration targets and
all unit entry points separately:

```console
python3 experiments/issue-725/run-integrations.py
python3 experiments/issue-725/run-unit-shards.py
cargo test --locked --all-features --example host_library_consumer
cargo test --locked --all-features --doc
```

The unit helper parses Rust syntax and partitions complete test files across
four shards. Each test function or property macro is enabled in one shard.
Inactive private test modules are omitted only in a temporary source copy;
production code, exported fixture helpers and parents of external/included
test files are retained.
All shards reuse dependencies and run under the same finite memory bound.
The helper removes `CODEX_HOME` only from child processes because the existing
credential-home fallback test requires that override to be absent. The Codex
workspace environment is unchanged. Use `--shard 1` to repeat just the second
partition after investigating a failure.
Use `--test-file responses_websocket_tests.rs` to rerun one affected test file;
this mode keeps all production code and shared fixtures in the temporary copy.
If a partition reaches the finite memory bound, `--shards 8 --shard 3` and
`--shards 8 --shard 7` together cover the original four-way partition 3.
`run-integrations.py --prebuilt` is an investigation mode, not final validation.
Use `--library-only` when binary targets are verified separately with
`cargo test --locked --all-features --bins`. This avoids rebuilding the
production library for each partition solely to link binary test targets.
