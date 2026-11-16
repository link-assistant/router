# Common asynchronous caller family: source draft, 2026-11-01

All implementation, receiving cases and Rust oracle source here are **UNRUN**.
No parser, translator, compiler, preparer, tests, CI or review feedback was
executed or inspected while authoring this batch. This addition closes no broad
checklist row and establishes no executable production coverage.

The additive `tools/translation/async-control-bulk-20261101.mjs` describes five
complete callers once and derives paired JavaScript and TypeScript source
proposals from those same parameter and body descriptions:

- Exchange one canonical Base64 chunk through a one-slot channel, close before
  receiving, and dispose the owned receiver on every explicit error/success path.
- Receive through a deadline with the genuine child cancellation and exclusive
  receiver capture, retaining both outer and inner Result layers.
- Close and drain a borrowed receiver, preserving queued data and termination.
- Await cancellation before attempting sleep, keeping the native cold future.
- Signal and observe one borrowed cancellation handle.

Selections can name each complete caller independently; duplicate operations,
competing names, unknown selections, accessors, holes and extra authority fields
refuse. This is deliberately a source proposal operation, without filesystem
writes, runtime invocation or new ABI. The source descriptions cannot authorize
an application call by spelling. A complete proposal passes the existing actual
source-bound caller checker for both languages, reissues serialized semantic meta,
then enters the original canonical Rust inverse and rechecks both reverse target
bodies. Complete source/CST histories and whole source equations are retained.
The actual rule pipeline remains `language`, then `repository`.

Every proposal supplies complete actual runtime, native facade and native root
source to the original private checks. The existing original runtime/declaration/
cold-flow and native module checks remain in force. Borrow/move checks, Result
propagation, disposal, no post-await deadline effects, actual child cancellation
and canonical whole Rust reproduction remain the original checker obligations.
Packaging ends with fresh complete checks of both original paired caller bodies.
There is no cache or result reuse across invocations.

The independent JavaScript case source covers generated and reverse-generated
JS plus strict TS execution, empty/ASCII/Unicode bytes, malformed Base64, close/
drain/order/closed send, cancellation, lazy waiting, nested Results, complete
inverses, stale native/runtime inputs and original refusal preservation. The
independent native oracle covers matching direct facade behavior. Rust remains
CI-only after all eight JavaScript stages pass for the same immutable SHA.

## Integration and remaining scope

These additive files do not modify translator dispatch, source-unit manifests,
production callers, rule preparer archives, CI partitions or gate inventories.
The module can be imported directly for a reviewable, complete proposal; that is
its entire current admission domain. It does not broaden the existing control
checker or prove that arbitrary production async bodies are expressible here.

Coordinator integration should first map actual whole production functions to
these five explicit contracts, retain their complete original source and private
binding proofs, and add source-bound migration rules only for genuinely matching
callers. Preserve the current checked source-unit profile rather than introducing
a spelling-based profile. If the focused gate uses explicit source file lists,
add `tools/translation/test/async-control-bulk-20261101.test.mjs` to the existing
appropriate full-command partition without changing its deadline or weakening
any reviewed fixed partition; regenerate its source audit only after separately
authorized execution. Rust auto-discovery uses the new integration-test source;
no local Rust invocation is authorized.

This family covers channel/cancellation control, not the separate JSON state or
network/HTTP policy domains. Their real checked contracts were reviewed; none of
their types or effects are inferred from these resource wrappers. Production
migration, throughput measurements, platform and hostile scheduling behavior,
all dependency/configuration closure, full corpus forward/reverse freshness,
receiving qualification and complete same-SHA gates remain outstanding. Thus
O04, F03, V03 and T04 remain OPEN; this provides additional concrete source
receipts toward their channel/cancellation portions only.

## Source review follow-up

The additive complete receiving harness is
`tools/translation/js-to-rust/test/async-control-bulk-20261101.mjs`. It preserves
the original full strict TypeScript command, 20-second process bounds, both
runtime targets and temporary-directory cleanup. Before compiling, it invokes
the repository lockfile compiler with `--version` and requires exactly 5.9.3.
An optional recorder retains version, complete process arguments, original
compiler stdout/stderr, process failures and target runtime pass/failure records.
The original receiving fixture is unchanged. Additional independent case source
covers wrong-version refusal, recorded strict type diagnostics, and both paired
source path mismatch forms. All remain UNRUN.

The proposal API now explicitly requires JavaScript `.mjs` and TypeScript `.mts`
paths to share their directory and stem. Its reverse TypeScript body is checked
at that exact requested TypeScript path. Cross-directory or different-stem pairs
refuse before parsing or translation; relocation remains outside this profile.
