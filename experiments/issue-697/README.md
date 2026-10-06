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
python3 experiments/issue-697/test_upgrade_seed.py
cargo test --locked --test operations_api_test --test contract_inventory_test --test tagged_release_test
cargo test --locked --test deployment_api_test --test verification_api_test
cargo test --locked --test token_clock_test
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

The upgrade-seed reproduction uses the actual Router binary with no inherited
private-network permission. CI initially failed when released v1.16.0 refused
the fixture's loopback provider. The fixture now explicitly allows loopback for
its isolated commands; `upgrade_seed_explicitly_allows_its_loopback_provider`
checks the persisted provider and encrypted key in the normal Rust suite. The
experiment also accepts `--router` to replay seeding with a released binary.

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

# Structured deployment status

`python3 experiments/issue-697/test_deploy_status.py` exercises isolated host,
container and inconsistent-state status. All three failed before the structured
report because data contained only human output lines. The real-host integration
also checks the serving PID, port, convergence and absence of secret values.

# Public operation facades and verification evidence

`tests/deployment_api_test.rs` calls each deployment facade directly, verifies
pure planning and read-only host status, and preserves project data, OAuth
exclusion and existing client-token metadata during checkpoints and recovery.
Docker and vendor dependencies are injected; no Router binary is spawned.

`tests/verification_api_test.rs` injects bounded Cargo/vendor results to check
saved evidence, compile failures, incomplete parity, preparation-only runs and
I/O refusals. These fixtures test verifier semantics without claiming live
vendor compatibility. Its relative-root case failed before the fix: the verifier
read the process manifest instead of the caller's manifest and saved relative
evidence outside the injected directory.
Two further regressions reproduce a panic on blocked client-evidence writes and
contract rejection of refused vendor areas. The fixes return typed I/O errors
and preserve explanatory objects, including an absent manifest, across the
published schemas and generated language types.

The mutation gate also exposed missing expiry-boundary/fact assertions.
`tests/token_clock_test.rs` validates equality rejection, one-second live sliding
expiry, revocation and precise expiry diagnostics using an injected clock and
already-aged signed fixtures. No sleeps or expensive stress inputs are needed.

`python3 experiments/issue-697/analyze_coverage.py` analyzes the retained
`target/issue-697-coverage/` CI artifact. See `CI-investigation.md` for the exact
coverage-gate failure and the added facade coverage; no baseline was lowered.

The native-method inventory fixture also fails before the fix because Axum's
implicit HEAD route is absent from OpenAPI. All 349 standard HTTP operations
now include HEAD and catch-all TRACE; a published reference extension covers
CONNECT and arbitrary native methods. The fixture exercises HEAD's empty body,
TRACE/CONNECT/custom success and authentication errors, with all generated
HTTP-client methods compiled and checked for parity.

The signed-expiry test first failed because the JWT decoder read wall-clock time
even inside an injected operation context. It now verifies the same inclusive
leeway with injected time while preserving signature validation. The before log
is `logs/token-signed-clock-before.log`; wrong-issuer rejection is also tested.
