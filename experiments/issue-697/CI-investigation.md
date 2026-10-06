# Current-commit CI investigation

The first implementation run used commit
`da15862d019207e02ccbc71e70c43172258ff942`, created on 2026-10-06 at
01:14 UTC. Runs were compared with the commit SHA and timestamps before reading
their preserved logs in the locally ignored `ci-logs/` directory.

| Run / job | Exact evidence | Cause and regression coverage |
| --- | --- | --- |
| 37398181137 / upgrade from v1.16.0 | `upgrade-matrix-37398181137.log:1212`: `error: provider candidate is invalid` during old-binary seeding | The fixture's `127.0.0.1:9` provider requires explicit loopback permission since v1.16.0. The isolated fixture commands now supply it. Reproduced with the checksum-verified released binary before fixing; `test_upgrade_seed.py` and the Rust upgrade fixture test verify seeding and encrypted-key preservation. |
| 37398181513 / macOS Node 20 and 24 | `bindings-macos20-37398181513.log:1761`: expected `0.158.0`, observed null | Router correctly refuses native macOS vendor probes because an isolated HOME does not isolate Keychain. JS/Python tests now assert that documented refusal on macOS and actual discovered fixture versions on Linux. The existing Keychain workflow passed. |
| 37398181513 / generated HTTP clients | `generated-http-37398181513.log:2277`: `No OAuth2 authentication configured!` | The Java smoke probe used the OAuth setter on an HTTP bearer client. It now sets the named `AdminBearer` and `RouterBearer` authentication objects, exercising management and model routes separately. All generated methods remain compiled. |
| 37398181199 / mutation baseline, also 37398181133 / Linux, macOS, Windows and coverage | `mutants0-37398181199.log:8980`: `HTTP contract POST /api/services/openai/v1/chat/completions: Additional properties are not allowed ('request_id' was unexpected)` | Anthropic upstream errors are preserved on this compatibility route. Its strict OpenAI error schema now includes the known request ID. The inventory regression validates the same recorded error on both Anthropic and OpenAI routes; vendor replay retains status/charge assertions. Windows shows the same error at `test-windows-37398181133.log:48577`. All 2,140 unit tests passed on Linux, macOS and Windows before that integration failure. |
| 37398181133 / dependency audit | `dependency-audit-37398181133.log:885`: vulnerable `source-map-js` 1.2.1 | Updated the UI's existing transitive lockfile entry to patched 1.2.2. `npm audit --audit-level=high` reports zero vulnerabilities. [Primary advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). |

The earlier placeholder run failed its changelog-fragment check; the minor
release fragment addresses that separately. Docker, real-client capture, fuzz,
soak, benchmarks and Rust semver checks passed on the first implementation run.

The next run used `0a5a80b8d955c3471f6bfe52663d9c2643c40d7b` at 01:54 UTC.
Its complete Linux, macOS and Windows suites passed, as did downstream packages,
generated clients, upgrade fixtures, Keychain, Docker, capture, fuzz, soak and
benchmarks. Coverage job 112070698764 in run 37401553037 failed only its gate:
`coverage-37401553037.log:7521` reports 85.65% against the unchanged 86.03%
committed/default-branch baseline. All coverage test assertions passed.

The retained `rust-lcov` artifact reports 72,763 covered of 84,952 lines.
`analyze_coverage.py` identifies 104 unexercised lines in public deployment
facades and 215 in verifier execution. Direct library tests now exercise pure
plans, all deployment facades, snapshots, typed refusals, monitoring, auth import,
administrator recovery, the verification catalog and evidence/parity failures.
These tests use injected dependencies and isolated roots; the coverage baseline
and CI gate remain unchanged.

The verifier-root regression first failed in
`logs/verification-roots-before.log`: an injected manifest version `9.8.7`
returned the process-directory version `1.16.1`. Relative evidence also went to
the process directory. The verifier now resolves both against the injected
working directory, with a failing-before/passing-after test in
`tests/verification_api_test.rs`.

The same facade tests reproduce a panic when `clients.json` cannot be written.
Client evidence now returns the typed I/O failure before Cargo runs. Review also
found that refused vendor areas produce explanatory objects while the initial
schema incorrectly declared strings and omitted the refusal fields. The failing
contract fixture preserves those objects and a missing manifest; regenerated
Rust, OpenAPI, JS/TS and Python contracts/types now match the actual verifier.

Mutation shard 2 in run 37401553073 reports two surviving mutants at
`mutants2-37401553073.log:988,990`: changing the sliding-expiry comparison from
`>` to `>=`, and returning no expiry facts. The existing suite asserted only
generic expiry errors. `tests/token_clock_test.rs` now checks the exact injected
expiry boundary, the live one-second boundary, revocation and original signed
expiry facts/elapsed time. It uses finite 2020 JWT timestamps and a fixed operation
clock, without wall-clock waits.
Shard 1 reports two more survivors at `mutants1-37401553073.log:988,990`:
weakening either conjunction in the same sliding-expiry predicate. The exact-time
rejection test also detects both, while the live-boundary case proves the valid
sliding path remains accepted.

Shard 0 completed at 02:53 UTC with four timeouts, not surviving assertions:
`mutants0-37401553073.log:988–991` replaces token issuance with bogus success
values. The downloaded report's `log/src__token.rs_line_434_col_9.log:4797–4800`
names four model-routing evidence tests waiting indefinitely for mock-upstream
barriers or a server join. Invalid client credentials prevent dispatch from ever
reaching those upstreams. The same report contains many failed assertions, but
the four waits prevent the unit process from returning its failure status.
Both shared model-routing token fixtures now validate the issued token before
upstream synchronization, so invalid fixture issuance fails immediately. Neither
the mutation timeout multiplier nor the security gate is relaxed.
The same audit found a later subscription-usage fixture waiting for a provider
notification after issuing an unchecked token; its shared issuer now validates
before synchronization too. Other token-dependent synchronization fixtures reuse
the checked model-routing helper.

The signed-expiry clock regression subsequently failed at
`logs/token-signed-clock-before.log:16`: a token valid at injected time was
rejected against the wall clock. The JWT decoder does not provide an injectable
clock. Signature and claim validation remain enabled; scoped expiry checks now
use the same inclusive default leeway with injected time. The regression checks
validity, the precise leeway boundary, expiry immediately afterward and rejection
under a different issuer secret.

The native-method regression fails in `logs/native-methods-before.log:19`
because the implicit HEAD contract is absent. The full inventory now contains
349 standard HTTP operations and referenced catch-all contracts for CONNECT and
custom methods. Native Axum fixtures check empty HEAD/CONNECT success bodies,
TRACE/custom JSON, dialect errors and method classification. All generated SDK
methods are rebuilt and compared with the complete inventory.

Local builds use one Cargo job and omit debug information to fit the workspace's
3 GiB memory limit. The combined 2,140-test library compiler exceeded that limit,
including with 1,024 code generation units and serialized LLVM work. This is a
compiler resource failure, not a failed assertion. Integration targets and quality checks are run
sequentially. Final PR validation distinguishes local results from complete CI
unit-suite execution.
