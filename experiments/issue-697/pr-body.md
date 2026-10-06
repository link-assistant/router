Downstream automation can now import Router's operational implementation in Rust or call the same versioned JSON contracts from official JavaScript/TypeScript and Python packages. Deployment, host mode, staging, checkpoints, auth import, doctor, logs, recovery and verification share library dispatch with the CLI; both Router binaries are thin adapters.

The complete [requirement-by-requirement analysis and implementation choices](https://github.com/link-assistant/router/blob/issue-697-deffbafb3bb4/docs/integration/issue-697-requirements.md) covers all six child issues, their comments, related work and researched components. None was already resolved; all six are implemented here.

- **Rust APIs (#692):** typed operation results/errors; scoped environment, roots, clock and dependency runner; public operation facades, rustdoc/examples and PR-base semver checking.
- **Contracts (#693):** a canonical 61-operation catalog, `--json` envelopes for all commands, published versioned JSON Schemas and OpenAPI 3.1 covering all 248 HTTP operations. Local deployment status exposes PID, port, serving state, convergence, connections and blockers as structured fields. CLI and HTTP fixtures validate actual responses; compatibility checks retain existing schema versions and reject incompatible edits.
- **Official packages (#691, #694):** ESM Node 20+/Bun with TypeScript declarations and Python 3.10+ with type information, generated export/schema parity, typed failures, env/stdin secrets, bounded execution and verified matching binary downloads. Each package includes temporary homes, mock upstreams, vendor stubs and verification helpers. PHP, Go and Java HTTP clients are generated, compiled and probed from the entire OpenAPI document. See the [operation/language matrix](https://github.com/link-assistant/router/blob/issue-697-deffbafb3bb4/docs/integration/operations.md) and [host maintenance example](https://github.com/link-assistant/router/blob/issue-697-deffbafb3bb4/examples/maintain-host.mjs).
- **Host version proof (#695):** Linux verification discovers installed vendor versions by default, announces CI fallback only for missing clients, implements explicit `installed`/`ci`/`latest` policies and records source, host version and drift in results and summaries.
- **Release provenance (#696):** release builds run in the exact immutable tag context, embed the source commit and strictly verify every asset and both image architectures against that tag/SHA. Official packages and contract archives share same-version packaging, attestation and complete-delivery gates before stable promotion. A minor changelog fragment triggers release preparation.

## Reproduction and validation

[Reproduction commands and retained experiments](https://github.com/link-assistant/router/blob/issue-697-deffbafb3bb4/experiments/issue-697/README.md) document the original failing ownership, client-version, provenance, compatibility and context-isolation cases. Regression tests exercise injected dependencies and independent library contexts; existing lifecycle/deployment/vendor fixtures validate the new contracts without removing their behavioral assertions.

Local checks cover the status regression, strict contracts, real released-binary upgrades, Node/Bun/Python packages, full generated HTTP clients and UI dependency auditing. The first CI run passed all 2,140 library unit tests on Linux, macOS and Windows; its integration, fixture and dependency failures are reproduced and corrected here. Final current-commit CI results will be recorded after the new run completes.

Registry publication and exact-tag attestations execute on the next release; no prior release/tag is rewritten. Live paid-provider tests retain the repository's explicit credential opt-in. The initial public CLI enum expansion has a documented `enum_variant_added` semver exception; all other semver lints remain enabled. Registry trusted publishers must be configured for this repository's release workflow; missing authorization fails the delivery gate.

Fixes #691
Fixes #692
Fixes #693
Fixes #694
Fixes #695
Fixes #696
Fixes #697
