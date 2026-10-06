# Reproducing issues 691–697

The complete requirement and component-research matrix is in
[`docs/integration/issue-697-requirements.md`](../../docs/integration/issue-697-requirements.md).
Issue/comment snapshots are retained in `research/`; large command logs are kept
locally in the ignored `logs/` directory.

Before implementation, `test_library_ownership.py` failed because `main.rs`
owned operational modules, and `test_client_versions.py` produced three failures
and one error because Linux verification never discovered installed host versions.
`tests/tagged_release_test.rs` rejected the main-context publishing workflow.
The contract compatibility regression initially exposed eight missing rejection
cases. A library deployment-isolation regression subsequently reproduced the
second context inheriting the first context's instance name.

Re-run the finite reproductions and parity checks:

```sh
python3 experiments/issue-697/test_library_ownership.py
python3 experiments/issue-697/test_client_versions.py
python3 experiments/issue-697/test_contract_compatibility.py
python3 experiments/issue-697/test_remote_json_consumers.py
cargo test --locked --test operations_api_test --test contract_inventory_test --test tagged_release_test
python3 scripts/generate-contracts.py --check
python3 scripts/generate-bindings.py --check
python3 scripts/check-contract-compatibility.py --base origin/main
```

The client-version experiment uses fake vendor commands and a fake Docker
boundary. It proves installed/default, missing-client fallback, explicit
CI/latest selection, override preservation and host-version drift without
installing clients, contacting paid providers or accessing login credentials.

The operation tests exercise actual Rust dispatch with isolated roots,
injected clocks, independently scoped instances, foreground/background dependency
runners and the same validated envelopes used by the CLI. Existing integration
tests and vendor fixture replay validate HTTP responses against published schemas.
They cover native model-list envelopes and authentication/upstream error fields
as well as successful management responses and streaming behavior.

The embedded remote-deployment token inventory consumers are tested against
legacy arrays and versioned envelopes, plus failed/unrelated operation results.
All three new-envelope cases fail against the original scripts (`--baseline`
reads `origin/main`). This prevents duplicate deploy-token creation and preserves
issued-token catalogs and checkpoint exports during upgrades.

```sh
(cd packages/javascript && npm ci && npm test && npm run typecheck && bun test test/router.test.js)
python3 -m pip install -e packages/python
python3 -m unittest discover -s packages/python/tests -v
bash scripts/generate-http-clients.sh
bash scripts/test-http-clients.sh
cargo test --locked --all-features --no-fail-fast
cargo clippy --locked --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
bash experiments/issue-697/check-quality.sh
cargo semver-checks check-release --baseline-rev origin/main --release-type minor
```

The HTTP client probes compile all generated PHP, Go and Java methods, compare
all OpenAPI operation IDs with their exports, and call health, providers and model
catalogs against an actual Router connected to a bounded mock upstream. All
fixture subprocesses and temporary homes are cleaned up. Local memory-constrained
builds can use `CARGO_BUILD_JOBS=1 CARGO_PROFILE_DEV_DEBUG=0`; run heavyweight Rust
builds sequentially.

Actual registry publication and tag-bound attestations are exercised by the
release workflow when a release is created. This PR does not publish a release or
rewrite previous tags. Live vendor tests retain the repository's credential-based
opt-in; fixture and native tests do not claim paid-provider proof.
