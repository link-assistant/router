# Original function-body refusal collection

At frozen source `ed3ab766967053d9436e58dfd46ba4608197a77c`, all 21 focused
files passed: **182/182 in Node 20.19.4 (39.122 seconds)** and **182/182 in
Bun 1.4.3 (25.941 seconds)**, with no failures, skips or timeouts. The eight new
cases cover independent original errors, exact nested spans, ordinary-checker
output/refusal agreement, fresh transitive caller checks, signature ordering,
constant/lifetime proofs, generated/internal failures and 128 invalid bodies
without callable stubs. Emitted JavaScript and independently strict-compiled
TypeScript execute the shared behavioral assertions.

The unchanged original-library/Cargo/profile regression additionally passed
**9/9 in each engine**: Node 291.733 seconds; Bun 131.114 seconds. It captured
all **804 Rust files plus Cargo.toml/Cargo.lock, 9,952,429 bytes**, including
42 exact-commit reads for sparse files. Seven cases execute source-derived
function/method targets; parse_usize_csv retains its no-Drop refusal and
StreamDialect.from_path checks classification. These nine cases do not claim
nine new translated functions or complete runtime parity.

All four attempts kept the same clean source and 1,421 compiler-input hashes
(`43d773472a5c6b8d063e6b2c9327885549602eb09022e846e622ad8e3977f262`).
The original Node harness receipt reports a metadata failure because its reader
expected one JSON console line. Node TAP split that line into 16 diagnostics.
The complete original raw log and failed receipt remain unchanged in the pack.
A separate normalized receipt joins only those consecutive diagnostic fragments,
verifies the original digest and all 806 records against the frozen input manifest,
and agrees with Bun. This correction ran no engine and repeated no graph.

The [combined receipt](router-759-current-body-combined-ed3ab766-receipt.json)
references the [complete archive](router-759-current-body-combined-ed3ab766.tar.gz):
274,376 bytes, SHA256
`f5d5584ad468e844b3d6f72a207af5d24751c459f6394d1224365ddf6be83899`.
All 19 members were reopened and matched; three exact-content hardlinks avoid
repeating the identical compiler-input manifests. The pack includes all commands,
helpers, raw logs, original receipts, normalization receipts and input hashes.

The archive also compares the existing CSV baseline at `4bc5de345` with this run.
All 806 original file contents and the profile match: content digest
`4da078145948bce72d776d17e61f1086a0102e69174be28aceb46649c9624862`.
The earlier Node/Bun times were 340.365/159.508 seconds. These are descriptive
runs with uncontrolled host load and caches; no controlled speedup is established.
Owned-child maximum RSS was 2,588,131,328 bytes in Node and 2,512,568,320 in Bun;
these measurements include terminated helper children and are not aggregate
process-tree peaks or physical footprints.

Ordinary checking still reports the first body error. Bulk projects enable the
bounded collection; callers can select `collectIndependentBodies: false` for
comparison. Only attributed original free-function semantic errors are batched.
The failed checker is discarded, survivors and callers are checked again, and
post-check proofs remain mandatory. Methods, generated declarations, constants,
unattributed failures and internal errors keep ordinary handling.

No canonical/profile producer, full JavaScript gate or Rust build ran for this
batch. Corpus gains, full native parity and JavaScript-to-Rust completion remain
unproved. Strict parity remains mandatory before Rust CI/CD can start.
