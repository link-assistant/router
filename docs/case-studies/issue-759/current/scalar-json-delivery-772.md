# Scalar and production JSON delivery for #772

This batch implements translator behavior for [#772](https://github.com/link-assistant/router/issues/772)
and the original [#759](https://github.com/link-assistant/router/issues/759).
The [operation documentation](../../../development/scalar-json-translation.md)
describes the actual producers and API. Ordered language/repository sequences,
serialized/reparsed CST, independent semantic checks and complete source inverses
remain required.

## Delivered behavior

The reverse owned-core path accepts Unicode scalar counts and ordering between
identical checked integer domains. The real corpus producer emits seven complete
ASCII/scalar witness functions, their meta and Rust, JavaScript and TypeScript.
Focused tests independently execute the emitted JavaScript and strict TypeScript
after the Rust forward path. The existing reverse ABI maps semantic `usize` to
Rust `u64`; this is not exact original Rust signature synchronization.

The JSON source producer lowers two actual optional-JSON variant matches into
checked accessors. Every complete function in `rust/src/safety_identifier.rs`
now compiles and executes in the focused forward fixtures: five functions versus
three before. Original match bodies are retained as native Rust reference tests.
Rust tests and formatting were not run locally and require gated CI.

An explicit bounded batch API copies the complete existing independent evaluator
through the source rules. It admits once per batch, retains source fences around
every call and releases its proof at return. No across-invocation verdict cache
was introduced. The original exhaustive ASCII workload retains all 128 bytes:
its failed 108.34-second observation becomes 26.24 seconds under the same
60-second case deadline. This single-case measurement does not establish a
whole-translator speed gain.

The common compiler-alias reader now composes known later source equations while
preserving all six original alias pins and substitutions. Bun source-plan DATA
is produced under Node without granting Bun compiler identity. Actual Bun fs
module observers retain the original read/corruption controls.

## Complete focused results

Final complete-file results cover 72 distinct cases in 13 files in both Node and
Bun. Each engine uses the original source-declared deadlines. The Bun mixed
string/assets attempt remains red; the two string/runtime files passed there,
and the complete assets file passed subsequently with its actual native observer
repair. Whole native/CST source review and all six affected producer freshness
checks also pass. Failed earlier attempts are retained separately.

The [portable evidence packet](../raw/ci/link-assistant--router/continuation-772/20261023-scalar-json-delivery.tar.gz)
contains complete selected monitor streams, deadline audits, resource receipts,
source review and intermediate failures, excluding task JS compile caches.
Its [receipt](../raw/ci/link-assistant--router/continuation-772/20261023-scalar-json-delivery-receipt.json)
and [complete member vector](../raw/ci/link-assistant--router/continuation-772/20261023-scalar-json-delivery-members.json.gz)
record all 427 independently read-back members. The packet occupies 5,133,844
bytes; SHA-256 is
`91ad48454a70cbbcde176980e8938da0e3f5ee199da2eed25fa7e496c6191298`.
Open captured scripts and archives as data; executing them is unnecessary.

## Published-head CI and remaining requirements

The packet also retains the entire completed CI cycle for
`f54a999da6f9b7c5dbf3870b38d8ab70779d7fb2`: three runs, 34 terminal primary
jobs, all nine ran primary job logs and all three downloadable artifacts.
The primary run is `39831031457`; its three basic lint/Node/Bun jobs passed,
while translation, matrix, reverse, TypeScript, parity and the final JavaScript
gate did not pass. All Rust jobs stayed gated. Downloaded artifact names retain
their original checkout identity, distinct from the run head.

Local repairs do not certify these CI failures resolved. Full canonical and
neutral/Unix/Windows generation, current executable census, strict TypeScript,
complete forward/reverse suites, exported compiler qualification, all 441 native
parity gaps and whole-source synchronization remain required. The old global
155/2,567 result is historical; do not infer a new percentage from the isolated
module gain. No Rust tool ran locally. No Rust CI may begin until all eight
JavaScript stages pass for the same immutable SHA.
