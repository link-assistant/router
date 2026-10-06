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

Local builds use one Cargo job and omit debug information to fit the workspace's
3 GiB memory limit. The combined 2,140-test library compiler exceeded that limit,
including with 1,024 code generation units and serialized LLVM work. This is a
compiler resource failure, not a failed assertion. Integration targets and quality checks are run
sequentially. Final PR validation distinguishes local results from complete CI
unit-suite execution.
