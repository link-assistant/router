Original for patterns, bounded scalar-product Iterator Items and source-pinned
Iterator::enumerate were checked at source commit
`d83c5e5b72429239440cbbec727ff305047b6207` through meta-language, JavaScript
and independently strict-compiled TypeScript. No original tracked Rust or Cargo
source was edited by this batch.

The exact 18-file focused scope contains 18 authored cases and 149 existing
regression cases. Both initial attempts at `814f3df4` passed 160/165, with the
same complete five failures: TypeScript count annotations in two cases,
Option-only tuple callbacks, shared bool dereferencing, and an unmaterialized
tracked artifact fixture. Gate restored all 1,635 artifact files directly from
that exact HEAD, verified every Git blob, and ran no producer. Repairs at
`79e4208c4` passed 167/167 in Node (63.859 seconds) and Bun (42.531 seconds).
Source review then found a constant-name callback binding gap. The final
`d83c5e5b7` pair passed 167/167 in Node (66.942 seconds) and Bun (42.060 seconds),
with no skipped tests or timeouts; Node reports zero cancellations and Bun has
no separate cancellation count. Both final runs retain the same 1,461 source
inputs with digest `b33395949283ad699c7005b2758e2f443e032f09af0513af0906b1fb2a20d5be`.

The receipt indexes all six complete attempts, input snapshots, the immutable
runner and exact artifact materialization proof. The 404,328-byte gzip tar
archive has 20 members with three identical-input hardlinks. Every decoded
member was reopened and checked against its original length and SHA256;
zero discrepancies were found. The archive SHA256 is
`da15e1fef81896b2441ecb1719f9bd827f800314c94fe24db853ac87aa766951`.

Explicit shared scalar Items retain their actual references until a separately
checked copy operation. Ordinary inferred tuple products retain their bounded
by-value checks. Source constant names retain unresolved pattern obligations.
Borrowed aggregates, nominal moves, specialized Enumerate consumers and broader
Rust namespace, trait and ownership closure remain unproved. These focused
receipts include no canonical/profile producer, full JavaScript gate or Rust
build, and do not claim a corpus gain or complete Router runtime parity.
Recorded child RSS is RUSAGE_CHILDREN maximum per terminated owned child,
including setup Git, rather than aggregate sampled process-tree peak.
