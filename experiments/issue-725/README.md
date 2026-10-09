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

Run the reproductions and conformance cases with:

```console
cargo test --locked --test thinking_pipeline_test --test thinking_parser_test \
  --test thinking_matrix_test --test thinking_evidence_test --test router_e2e_test
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
