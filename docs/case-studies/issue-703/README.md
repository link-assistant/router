# Requirements, investigation and solution plan

Scope: [#703](https://github.com/link-assistant/router/issues/703), implemented in
[PR #704](https://github.com/link-assistant/router/pull/704). All four child issues
and all issue/PR conversation, inline review and review endpoints were read;
there were no comments when this investigation started.

## Complete requirement inventory

| Issue | Requirement | Implementation and verification plan |
| --- | --- | --- |
| #703 | Read every child issue and its comments. | Read #699–#702 and paginated comment endpoints, plus all PR comment types. |
| #703 | Complete every issue in one PR; defer none. | Keep every implementation and regression on `issue-703-a399e1e39a55`, PR #704. |
| #703 | Close the parent and every child with one keyword per issue. | Include separate `Fixes #703`, `Fixes #699`, `Fixes #700`, `Fixes #701`, `Fixes #702` lines. |
| #703 | Explicitly document anything already resolved or not reproducible. | Record reproduction evidence and any environment limits in this document and PR. |
| #699 | Doctor exposes checks, provider states, discovered deployments and recommended models. | Record facts at their source with public Rust report types; preserve the human report independently. Test isolated doctor and provider/deployment state. |
| #699 | Tunnel and server status expose domain state. | Publish running/state, endpoint, transport, health and authorization fields without decoding rendered strings. Test state changes. |
| #699 | Model explanations expose structured facts. | Publish the existing model diagnostic payload through the operation schema and generated types; retain exact routing identity and authorization facts. |
| #699 | Auth and client status expose structured facts. | Reuse credential acceptance/source and client ownership types; include the client doctor probe result. Test absent/configured and rejected/usable states. |
| #699 | Logs expose structured records. | Reuse the canonical log decoder and filtering; expose correlation IDs and records beside human rendering. Test actual log facts. |
| #699 | Rust facade and generated JS/TS/Python fields agree. | Generate schemas from public report types, expose typed Rust results, regenerate both language distributions and type declarations. |
| #699 | Tests inspect actual transitions without parsing `data.output`; audit all report paths. | Exercise official bindings and Rust operations, covering successful and unsuccessful report states. Retain published schema compatibility. |
| #700 | Reproduce isolated offline Linux Claude 2.1.291. | Install that exact release in a disposable tool directory; run the existing synthetic-token loopback scenarios repeatedly. |
| #700 | Determine client regression versus harness readiness. | Preserve failed run 37422214707 logs and artifact; inspect terminal redraw behavior and compare terminal screen with stripped transcript. |
| #700 | Fix the responsible layer with readiness evidence, not arbitrary longer sleeps. | Use terminal screen semantics and observed command readiness; retain finite existing deadlines and capture diagnostic tails. |
| #700 | Retain exact model identity and authorization withdrawal coverage. | Keep all existing catalog, selection, default, saved-choice and withdrawal assertions; pin two captures of the affected version in PR CI. |
| #701 | Accept legacy arrays and new token-list envelopes via canonical typed decoding. | Route every deployment token inventory consumer through one typed decoder; reject unexpected operation, unsupported schema and unsuccessful envelopes. |
| #701 | Validate success/schema before accessing data. | Add negative tests for failed, wrong-operation, malformed and unsupported envelopes. |
| #701 | Audit container/host preservation paths. | Update host migration/restore, preservation, secret probing, run inventories and deployment-token detection together. |
| #701 | Preserve refusal and token/access preservation guarantees. | Keep candidate-first validation, catalog comparison, bounded verification and rollback unchanged; test refusal before stopping the host. |
| #701 | Previous released container ↔ new host round trip passes. | Run `deploy_docker_host_test` with image `ghcr.io/link-assistant/router:1.16.1`; retain output. |
| #701 | Ordinary tests catch the new envelope mismatch. | Add always-enabled typed inventory regression tests as well as real Docker coverage. |
| #702 | Explicit injectable daemon launch boundary or library-owned service. | Add an explicit daemon executable to `OperationContext`, honor scoped `ROUTER_BIN`, and keep injected process spawning. |
| #702 | Status describes actual executable and validated daemon version. | Validate the selected executable using its version contract; carry that version through plan, convergence and persisted host/service state. |
| #702 | Independent Rust consumer covers real plan/apply/status/stop. | Add an executable example whose CLI rejects Router arguments, then run it as a separate process with isolated roots, synthetic secret and random loopback port. |
| #702 | Consumer need not implement Router CLI or remap subprocesses. | Resolve only a Router daemon, never assume the importing executable owns `serve`; document explicit selection and failure behavior. |

## Research and alternatives

* Rust documents [`current_exe`](https://doc.rust-lang.org/std/env/fn.current_exe.html)
  as the running process executable. Inference: a linked library cannot use it
  as an implicit Router executable in arbitrary consumers. An explicit path is
  the smallest fix; a library-owned daemon would require replacing deployment
  process ownership and service-manager behavior.
* [`schemars`](https://docs.rs/schemars/latest/schemars/) derives JSON Schema
  from Serde-compatible Rust types, and
  [`jsonschema`](https://docs.rs/jsonschema/latest/jsonschema/) validates those
  contracts. Both already exist here. Reusing them avoids another source of
  hand-maintained domain definitions; writing independent binding schemas
  would recreate the drift under investigation.
* JSON Schema's
  [`additionalProperties`](https://json-schema.org/understanding-json-schema/reference/object)
  controls unknown fields. Keep strict published v1 report alternatives and
  append typed alternatives rather than silently removing old accepted shapes.
* [`portable-pty`](https://docs.rs/portable-pty/latest/portable_pty/) already
  supplies the process terminal. [`vt100`](https://docs.rs/vt100/latest/vt100/)
  supplies a terminal screen parser: it interprets cursor motion and repaint
  operations instead of merely deleting escape sequences. This is preferable
  to stripping ANSI, fuzzy model comparisons, retries that hide lost input, or
  longer sleeps.
* Claude's official
  [model configuration documentation](https://code.claude.com/docs/en/model-config)
  describes `/model` selection and full model IDs. Exact identity assertions
  remain part of the compatibility proof.

| Requirement group | Possible solutions | Selected plan |
| --- | --- | --- |
| #699, every report and language facade | Parse CLI text in each binding; write independent payload definitions; derive shared domain reports from Rust. | Record the facts in each existing operation, derive contracts with Schemars, generate binding types, and test the same transitions through Rust and both official language bindings. Keep the old rendering and accepted schema alternatives for compatibility. |
| #700, selector readiness and identity | Increase sleeps; retry a failing selector; interpret the terminal and wait for visible input/selection state. | Add a `vt100` screen beside the existing transcript, wait for `/model` input and exact visible IDs within existing deadlines, retain outbound identity and withdrawal tests, and repeat pinned 2.1.291 capture in CI. |
| #701, every inventory/preservation consumer | Unwrap `data` without validation; retain separate array/envelope parsers at each site; reuse canonical schema validation with typed inventory decoding. | Accept complete legacy token arrays or successful `tokens.list` envelopes, validate before extracting data, update all six consumers, exercise refusals in ordinary tests, and rerun the real previous-container round trip. |
| #702, launch selection and version ownership | Require consumers to implement Router CLI; remap process calls; implement an in-process managed daemon; select an explicit validated daemon executable. | Add a context path with scoped environment fallback, validate `--version` through the existing injectable runner/deadline, persist that actual version, and exercise plan/apply/status/stop from a distinct importing application. |

## Initial evidence

Main is already merged into the prepared branch. The most recent related work
is PR #698 (operations/contracts), preceded by #690 and #686 (deployment and
host service). The failed Claude artifact `verification-claude-newer-release-1`
has 511 lines. At lines 455–489 it shows the actual model picker, but the
ANSI-stripped transcript contains `uture-claude-native` and truncated custom
model text; line 501 reports 4 passed / 1 failed. This supports investigating
terminal repaint reconstruction before changing product routing.

The token decoder audit found direct array parsing in both host migration
directions, container preservation, and deployment-token detection, in
addition to already-adapted run and signing-secret inventories. The host plan,
persisted host state and convergence compare the linked library version rather
than the selected daemon version.

## Execution checklist

- [x] Read scope, comments, contributing and CI/release workflows.
- [x] Enumerate requirements and research existing components.
- [x] Establish failing regression tests and preserve reproduction logs.
- [x] Implement all inventory consumers and daemon launch boundary.
- [x] Implement typed reports and regenerate all published contracts/bindings.
- [x] Fix terminal reconstruction/readiness and repeat affected client capture.
- [x] Prepare minor release/changelog, review full PR diff, commit and push.

The final local verification results, current-head CI checks and readiness
are recorded in [PR #704](https://github.com/link-assistant/router/pull/704).

## Reproduction and completed verification

| Boundary | Before | After and regression coverage |
| --- | --- | --- |
| Doctor/auth/log domain reports | Isolated Rust tests returned missing doctor/auth fields; log JSON failed the published Output-only schema. | `tests/structured_reports_test.rs` reads actual fields, decoded records, deployment discovery and selected server changes. Official JS and Python tests additionally probe configured client success/rejection, model explanations and API-key registration. |
| Token inventory | An actual Router 1.16.1 container → old host → container round trip failed at the return migration with `host token inventory is invalid`. | The same `deploy_docker_host_test` passed against the unchanged 1.16.1 image. Always-enabled tests reject failed, wrong-operation, unsupported-version, mismatched-exit, malformed and wrong-data envelopes; host tests retain refusal-before-stop coverage. |
| Library daemon ownership | A separate executable rejecting all CLI arguments was selected as the daemon; plan/apply could not launch Router. | `cargo test --example host_library_consumer` runs real plan/apply/status/stop with explicit daemon selection, disposable state and a random loopback port. Unit coverage selects a daemon version different from the importing library and verifies persisted state and convergence. |
| Claude 2.1.291 selector | The isolated selector capture timed out after cursor repaints mangled ANSI-stripped IDs. | A complete offline native capture passed all five Claude scenarios. `tests/terminal_screen_test.rs` independently reproduces a cursor rewrite that the historical transcript cannot represent; the screen parser retains the exact ID. Default display matching is now exact as well as outbound model matching. |
| Existing CI gates | Downstream run 37433845455 failed with `TypeError: 'bool' object is not iterable` in OpenAPI required-field comparison (downloaded log lines 4409–4425). Pipeline run 37433845611 reported a missing changelog fragment (line 5377). | Compatibility comparison distinguishes OpenAPI boolean required flags from JSON Schema required lists and has a reproducing experiment test. The minor changelog fragment activates the existing automatic version/release workflow without a manual version bump. |

No child issue was already resolved or irreproducible. Reproduction logs and
complete local command output are retained in the workspace's ignored
`ci-logs/` directory. Offline client captures prove native protocol, selector
identity and authorization behavior using synthetic tokens and loopback
fixtures; they do not claim paid-provider or live-account acceptance.

### Whole-catalog audit

All 61 operations were inspected. Eight domain reports now have public Rust
types and generated payload alternatives: `doctor`, `auth.status`,
`clients.doctor`, `logs.show`, `models.explain`, `server.status`,
`tunnel.status`, and `clients.backup.verify`. The audit also corrected
`clients.backup.list` to describe its actual array of backup IDs. Existing
structured listings, status and summary operations retain their schemas.

The remaining 26 Output-only operations are mutations, acknowledgements,
process entrypoints or generated text artifacts: `accounts.pause`,
`accounts.resume`, `auth.claude`, `auth.clear`, `auth.codex`, `auth.gh`,
`clients.backup.create`, `clients.backup.restore`, `clients.remove`,
`clients.setup`, `configure`, `providers.import`, `providers.remove`, `serve`,
`server.claim`, `server.reap`, `server.remove`, `server.start`, `server.stop`,
`server.use`, `tls.ca`, `tls.generate`, `tokens.expire`, `tokens.revoke`,
`tunnel.down` and `tunnel.up`. Their output is not used to supply the requested
state/report facts. Compatibility alternatives remain published for old
consumers; current report implementations emit the new domain payloads.

The six token-inventory consumers span both host migration directions,
container preservation, deployment-token detection, run inventories and
signing-secret probing. `experiments/issue-703/test_inventory_consumers.py`
checks that every audited path uses the shared decoder. An explicit operation
context path takes precedence over scoped `ROUTER_BIN`; every selected path,
including a current-process fallback, must pass the Router version contract
before planning or launch. A separate regression preserves valid renamed CLI
installations rather than treating the filename as proof of the executable's
identity.

The first implementation's Linux CI unit run passed 2,141 tests and exposed
one incomplete historical test fixture: `token_issue_failure_does_not_undo_a_verified_deployment`
supplied only `label` and `revoked`, which the typed decoder correctly rejected.
The preserved job log has the assertion at lines 6227–6230. Its replacement
uses a complete token record and checks both legacy and enveloped inventories
without allowing duplicate token issuance; the original deployment-preservation
assertion remains intact.

The subsequent Linux run passed all 2,142 unit tests, then its existing remote
deployment integration test caught a result-adapter regression at log lines
6746–6756: an existing JSON document's `output` had been replaced by the JSON
rendering itself. The adapter now attaches human rendering only to explicitly
published domain reports and preserves pre-existing JSON payload fields. The
same integration test reproduces the failure locally; the doctor regression
also checks that the new domain reports retain their human rendering.

The completed Windows log reached a second outdated fixture in
`tests/deployment_api_test.rs`: its dependency runner rejected the new daemon
version probe (combined workflow log lines 40698–40706). The same assertion
fails on Linux when run independently. The fixture now selects the actual
Router binary explicitly, mocks only that executable's `--version` response
and continues to refuse every other dependency and background launch. Its
status assertions additionally verify the selected path and a daemon version
different from the importing library's version.

Run 37448485801 passed the Linux suite and exposed a macOS path assertion in
the renamed-executable regression (macOS log lines 6586–6590): the daemon
correctly canonicalized `/var/...` to `/private/var/...`, while the assertion
expected the original spelling. A directory-symlink installation reproduces
the same mismatch on Linux. The regression now exercises that symlink and
compares the reported executable with the canonical installed path.

The same run measured 86.104872% coverage against the 86.159874% baseline
(coverage log lines 8281–8296). The downloaded LCOV artifact identified 80
uncovered lines in the new public Rust facade helpers. Direct facade tests now
verify auth/client/log parity, exact and absent model identity, and stopped
tunnel failure facts, including decoding typed payloads from unsuccessful
operations. The coverage floor and default-branch ratchet remain enforced.

Run 37451112629 then covered every line of the public report facade helpers
and measured 86.221863% overall (73,699 / 85,476 lines). The coverage gate
passed and required its increased baseline to be committed for review;
`coverage-baseline.txt` records that exact measured value.

### Local compiler memory boundary

The workspace has a 3 GiB memory limit. Compiling the combined 2,142-test
library target exceeded that limit even with one Cargo job, stripped compiler
debug bookkeeping and a serialized backend. This is a compilation limit;
the ordinary suite still runs unchanged on the larger CI runners.

The reusable local workaround partitions test functions with Rust syntax-tree
parsing in an ignored source copy, then compiles and runs eight shards
sequentially. It preserves test bodies, assertions, production code and
relative include paths. The runner checks the union of listed test names
against all 2,142 tests, so shared macro-generated tests cannot conceal
missing coverage. Integration, binary, example and documentation tests use
the ordinary sources. Run from the repository root:

```sh
rust-script experiments/issue-703/shard-unit-tests.rs
env -u CODEX_HOME python3 experiments/issue-703/run-unit-shards.py
```

Each compiler/test process and its complete output is recorded separately in
`ci-logs/unit-shard-*-list.log` and `ci-logs/unit-shard-*.log`. This workaround
does not alter the CI workflow or reduce its test coverage.

All eight local shards passed. Their 2,142 distinct names exactly match the
ordinary Linux CI unit suite from run 37451112629. The comparison is reusable:

```sh
python3 experiments/issue-703/compare-unit-test-inventories.py ci-logs/pipeline-37451112629-ubuntu.log
```

The existing `resolve_home_uses_subdir` unit test explicitly assumes that the
provider home override is absent. Codex supplies `CODEX_HOME` in this workspace;
remove that inherited override only from the local test subprocess environment
to reproduce the ordinary CI environment. The original failing log is retained,
and the application continues to honor configured provider home overrides.
