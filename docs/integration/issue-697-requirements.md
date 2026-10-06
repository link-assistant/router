# Requirements and implementation choices for issues 691–697

All six issues and their comments were read on 2026-10-05. None is already resolved. The original issue snapshots are in `experiments/issue-697/research/`.

| Issue | Requirement | Solution and verification plan |
| --- | --- | --- |
| 697 | Read all six issues and comments | Preserve complete API snapshots and map each requirement here. |
| 697 | One PR, no deferred issue | Implement on `issue-697-deffbafb3bb4`, update PR 698. |
| 697 | Close parent and all six children with full syntax | Seven separate `Fixes #…` lines in the PR description. |
| 697 | Report already-resolved/nonreproducible issues explicitly | None identified; document reproductions and limitations. |
| 691 | Official ESM JS/TS package, Node 20+ and Bun | `packages/javascript`, runtime tests plus TypeScript declarations. |
| 691 | Deploy local/container/host/remote/config/service and status | Expose the same operation catalog and options as Rust/CLI. |
| 691 | Tunnel up/status/down | Named namespace operations backed by the JSON contract. |
| 691 | Tokens issue/list/revoke/import, providers add/list, accounts pause/resume | Namespace operations generated from the canonical catalog. |
| 691 | Usage, doctor, logs, with | Include these operations in export/parity tests. |
| 691 | No duplicated business logic or handwritten output parsing | Rust dispatch is authoritative; bindings consume schema-validated JSON. |
| 691 | Secrets in env/stdin, never argv | Reject secret options and support explicit environment/stdin transport. Test recorded process arguments. |
| 691 | Deadline, typed results and typed errors with exit code/stderr | Bound subprocess trees, limit output, validate results; errors retain diagnostics and exit status. |
| 691 | Stable versioned schemas, loud validation failures | Ship schemas with packages and releases; validate every binding response. |
| 691 | Binary resolution through ROUTER_BIN/PATH or verified matching assets | Match package version by default; explicit mismatch opt-in; downloads verify checksum and tag-bound attestation before extraction. |
| 691 | Mock upstream, vendor stub, temporary-home helpers | Reusable fixtures from the same protocol behavior as Router test tiers. |
| 691 | verifyContracts areas/native/Linux and result.json | Importable verification operation and binding helper returning the verification document. |
| 691 | Complete thin host-maintenance example | `docs/integration/downstream.md` and an executable example. |
| 691 | Real-binary Linux/macOS tests | Dedicated integration workflow uses actual built Router, isolated HOME and mock upstream. |
| 691 | Every-release, same-version publishing under #687 gate | Prepare and verify packages before stable promotion; publish packages and crate together. |
| 692 | Move all binary-only operational modules to library | Library owns dispatch, deployment, auth import, doctor, logs, recovery and shutdown. Binary adapters only parse/render/choose exit status. |
| 692 | Public local plan/apply/status, remote, host, staging, checkpoint capture/restore | Document operation facades and typed requests using existing implementations. |
| 692 | Public auth import, logs read, doctor report, admin recover, verification run | Reuse shared implementation; tests import the library directly. |
| 692 | Typed errors/results identical to CLI JSON | One structured response contract; no router-binary subprocess from Rust. |
| 692 | No print/exit in library operations | Capture diagnostic output through an injected operation output sink and return it to caller; exits belong to adapters. |
| 692 | Injectable environment, clock, processes, filesystem roots | Operation context scopes overrides without mutating process-global environment. Native defaults and test runners are explicit. |
| 692 | docs.rs and an example per operation | Public rustdoc plus generic catalog examples and representative executable workflows. |
| 692 | cargo-semver-checks on every PR | Dedicated job compares against PR base; any explicit exception must be documented. |
| 692 | Every CLI operation importable, no operational mod in main | Exhaustive dispatch in library; source ownership and operation parity regression tests. |
| 693 | OpenAPI 3.1 for every served HTTP route | Publish `openapi/router.yaml` and compare route/method coverage with actual routers, including dynamic routes. |
| 693 | Auth schemes, dialect errors, streaming events | Explicit security definitions and response content schemas for JSON, SSE and WebSocket protocols. |
| 693 | All commands/subcommands support --json | Shared command output adapter; include errors and noninteractive client execution. |
| 693 | Every output has a versioned schema, files in schemas/ and release assets | Generate operation catalog and schemas from one source; ship all contracts with binaries/packages. |
| 693 | Validate CLI outputs from tests, HTTP e2e responses, reject undocumented fields/routes | Runtime schema validation in binding tests and common e2e harness; route coverage/diff checks in CI. |
| 693 | Additions minor, removals/renames new schema version | Compatibility checker compares base contracts; retain old schema files for at least one minor release. |
| 693 | Generated clients call all management/model routes | Generate secondary-language clients in CI and exercise against a Router/mock fixture. |
| 694 | Declare supported languages in README/docs | Official Rust, JS/TS (Node/Bun), Python; describe generated HTTP clients separately and explicitly. |
| 694 | Include PHP, Go, Java via generated/tested clients | Generate these HTTP clients from published OpenAPI in CI. |
| 694 | Same operation names/full set across official packages | Generated CLI catalog covers deploy/status/staging/checkpoints/tunnel/tokens/providers/accounts/usage/doctor/logs/with/client lifecycle/verification. |
| 694 | Thin library/JSON layers | Share business logic in Rust; bind schema-validated results. |
| 694 | CI compares catalog against exports and result schemas | Export and schema parity script plus real-binary cross-language fixtures. |
| 694 | Helpers in each package including verify_contracts | Mirror fixtures and verification semantics in Python and JS. |
| 694 | Same-version, gated packages every release | Release packaging and complete-delivery checks include all official distribution artifacts. |
| 694 | Operation × language matrix kept accurate | Generate matrix from catalog, check generated files in CI. |
| 695 | Default reads host vendor versions before container launch | Bounded host --version discovery; regression host Claude 2.1.289. |
| 695 | Fall back to CI pins only for missing clients, announce fallback | Per-client detection, discovery failures fail closed. |
| 695 | --client-versions ci/installed/latest | Consume policy arguments before forwarding verifier arguments. |
| 695 | client_preparation source installed/ci-pin/latest | Carry source/host version into verifier JSON. |
| 695 | Summary warns when proven version differs from installed host | Compare observed container version with recorded host version, show both. |
| 695 | Optional newest-published-version proof | `latest` policy installs npm latest and records exact observed version. |
| 696 | Exact tag ref and commit in provenance for all assets/images | Dispatch publishing workflow on immutable tag ref; checkout alone cannot change Actions attestation context. |
| 696 | README verification command with --source-ref | Document tag/digest constrained verification commands. |
| 696 | CI verifies every asset and both image architectures before promotion | Strict `--source-ref` and `--source-digest` checks; reject previous-parent allowance. |
| 696 | Embed source commit in version output | Build metadata plus `router version --json`; pass source SHA into Docker builds. |
| 696 | Enforce next release rather than rewrite old releases | Forward-only workflow changes and regression tests; no old tag replacement. |

## Alternatives researched

- **FFI/native addons** (napi-rs/PyO3/UniFFI): direct calls but add platform builds and duplicate packaging complexity. A Rust API plus the explicitly requested CLI JSON transport keeps a single operational implementation and supports Node and Bun without native addons.
- **Handwritten language operation lists**: easy initially but drift. Generate the catalog from Clap and generate binding exports, schemas and documentation from it, with checked-in artifact verification.
- **OpenAPI generation**: utoipa and utoipa-axum can derive routes/types; Router has dynamic namespaces, streaming dialects and several routers. A checked complete specification plus route coverage is the alternative explicitly allowed by #693. [utoipa](https://github.com/juhaku/utoipa).
- **Schema validation**: Ajv supports draft 2020-12 and strict validation; Python jsonschema supports the same draft. Reuse these validators instead of inventing one. [Ajv](https://ajv.js.org/json-schema.html), [jsonschema](https://python-jsonschema.readthedocs.io/en/stable/).
- **Process transport**: Node's spawn has environment, stdin and cancellation support; Python subprocess supports deadlines. Use those primitives with tree cleanup and finite output. [Node child_process](https://nodejs.org/api/child_process.html), [Python subprocess](https://docs.python.org/3/library/subprocess.html).
- **Rust API compatibility**: cargo-semver-checks supports an explicit Git baseline, including unpublished crates. [cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks).
- **Generated HTTP clients**: OpenAPI Generator supplies PHP, Go, Java, Python and TypeScript generators. Pin the generator version and compile/probe generated clients in CI. [OpenAPI Generator](https://openapi-generator.tech/docs/generators/). Go generation uses the documented `enumClassPrefix` option to avoid collisions between enum constants from different models ([Go generator options](https://openapi-generator.tech/docs/generators/go/)).
- **Provenance**: a build-provenance action uses the workflow's source context. Checking out another SHA inside a main-branch run is insufficient. A workflow dispatched with `--ref vX.Y.Z` obtains the tag context; strict GitHub CLI verification enforces it. [GitHub attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations), [gh verification flags](https://cli.github.com/manual/gh_attestation_verify).

## Root causes confirmed

- Linux verification selected hardcoded versions without discovering host clients; four regression probes fail before the fix.
- Binary-only `mod` declarations own the missing operational modules. Several operational commands render only text or return ExitCode, and local deploy explicitly refuses --json.
- No OpenAPI or schema directory exists, and independent JSON flags/outputs vary across command families.
- Release jobs checkout the tag SHA while attestations use a main-ref workflow context. The existing provenance checker explicitly accepts the tag's parent, masking the mismatch.
