# Native receiving memory repair draft

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The native TypeScript runtime test now limits each complete source and compiled
Node fixture invocation to two workers. It still executes every fixture file,
every assertion and every original child and case deadline. This avoids the
previous default worker count while the parent retains TypeScript's compiler.
The observer now records scalar resources for owned processes stopped by its
existing memory guard; it verifies process identity before reading those fields.

The complete original nine-case Node file ran under Node 20.20.2 and installed
TypeScript 5.9.3 with a 512 MiB heap cap. All nine assertions passed, including
both complete source/compiled Node runs and Bun runs. Its independent deadline
audit failed: case eight took 82251.407603 ms against its unchanged 60000 ms
limit. Case nine took 221755.550959 ms against 300000 ms. The command exited
one after 327.785703 seconds, sampled 2755301376 container bytes, and was not
stopped by the 2866933760-byte guard. Its child and process group fully exited.
This is a memory repair draft, not a qualified deadline repair.

Two separate complete CPU-profile attempts stopped at the same memory guard:
35.025401 seconds / 2895659008 sampled bytes and 39.541584 seconds /
2881794048 bytes. Both owned process groups exited. Neither produced a
complete profile or result. The second attempted lossless profile string
interning; its full candidate sources are retained, and the original profiler
and analyzer were restored. No failed probe establishes a speed improvement.

The [complete archive](evidence/native-resource-repair-20261111.tar.gz) contains
the whole test stream, original deadline reports, resource receipts, both failed
profile attempts and source snapshots. Every member was read back and hashed.
Its 500967 bytes have SHA-256
`bb5ad05a4b11a4ec5cf47955c9df58e61d30f2e73441531889db0418c5e9a33d`.
The [receipt](evidence/native-resource-repair-20261111.json.gz) identifies the
published baseline and working draft snapshots. No Rust tool ran. Full-gate,
strict parity, actual output generation and issue acceptance remain unfinished.
