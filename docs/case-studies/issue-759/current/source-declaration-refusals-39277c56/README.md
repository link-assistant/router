# Original declaration type-refusal batching

The 18-file focused batch at
`39277c5611dd98fadb69a0fd7d1e949bdaac6b8b` passes all 155 cases in
Node 20.19.4 and Bun 1.4.3, with no skips. Node took 32.588 seconds;
Bun took 19.114 seconds. Both engines checked the same 1,380 hashed inputs
on the unchanged clean tracked head. No repair or repeat was needed.

The project checker collects independent type errors in original data-layout
and function-signature phases. It discards the failed checker before body or
program-wide checking can produce semantic IR, removes the exact attributed
owners and checks every survivor and caller again with a fresh checker.
Body, recursion, constant, ownership, lifetime and source-link checks remain
mandatory. Generated declarations, missing attribution and internal errors
keep ordinary first-failure behavior. Private batch identity cannot be forged.
Seven exact adapter anchors expose the phase hooks; pinned vendor files retain
their original bytes.

The eight new cases verify independent signatures and layout fields, exact
error spans, transitive caller refusal, single body errors, identical successful
semantic serialization, generated-layout and forged-batch rejection, retained
constant/lifetime obligations and a bulk set of 128 missing source types.
Surviving functions execute through emitted JavaScript and independently
strict-compiled TypeScript. Existing project, namespace, module, source-proof,
generic, ownership and conditional-attribute regressions also pass.

The [receipt](router-759-current-declaration-refusals-39277c56-receipt.json)
records both complete runs, commands, input hashes and resource scope. The
[92,523-byte archive](router-759-current-declaration-refusals-39277c56.tar.gz)
preserves complete raw logs, receipts, input manifests and both exact helpers.
SHA-256: `b5f2ebb968fdad093a3fa29f39e76cb4d499f8c389bf8da9462cfa2847d192a8`.
All eight members were reopened and hashed. One exact duplicate input manifest
uses a tar hardlink whose extracted bytes were independently verified.

This batch ran no canonical or profile producer, complete JavaScript gate or
Rust build. Whole-corpus translation gain, performance improvement and complete
native runtime parity remain unproved. Owned terminated-child maximum RSS is
neither aggregate process-tree peak nor physical footprint.
