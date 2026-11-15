# Reviewed current compiler registration

The documented [registration producer](../../development/isolated-project-bulk.md)
captures `1db0256735abcb625e646de1564a3dc448f5ee20`: 1779 complete
compiler/TypeScript files, 57194658 source bytes. Independent reproduction
compares every proposal byte, every current physical source and mode, native
TypeScript 5.9.3 parsing, both serialized/reparsed bootstrap CST phases and
their full inverses before installation. All original size limits remain.

The registry and both complete bootstrap sources are installed together. The
existing portable producer then captures 462 genuine Git objects. Its reader
checks every complete object and joins the complete compiler registry. The
original four-source concrete profile remains identical. The old registry,
bootstrap sources and complete portable fixture are retained together in
`tools/translation/source-profiles/isolated-project-compiler/history-e63974237e21c35c51e5005d2b09a2ceb5d2be91.json.gz`.
Historical receiving sources and pins are unchanged.

The bounded refresh passes in 12.50 seconds with 1625464832 bytes peak sampled
cgroup use. Full before/after sources, generated proposals, CST equations and
readback evidence are retained in the task evidence. This repairs the stale
registration prerequisite. Both complete receiving files now pass under Node
20.20.2 and Bun 1.4.4: 17 cases per engine, including the exported compiler's
real round trip and both CST directions. Node's independent source/deadline
audit passes; every Bun case also completes within the unchanged source limit.
The complete isolated file takes 110.90 seconds in Node and 88.88 in Bun;
the export file takes 55.25 and 49.16 seconds respectively. All four resource
observations finish without a stop (largest sampled cgroup use 2275155968 bytes).
Independent review rehashes every registered source and verifies all six full
historical preimages against the published `f3ba507dd` tree.

The mandatory complete local gate is attempted at clean source
`17aea691976747ef8d8318ab1aa7994789b023ee`. Lint and its 61 controls, both
259-case native suites, nine independently audited deadline controls, public
and native type checks, native TypeScript freshness and strict compilation of
all 165 files pass with installed TypeScript 5.9.3. All nine native behavior TAP
cases finish, including source/compiled Node and compiled Bun runtime fixtures;
the independent audit **fails** regeneration at **133321.867865 ms** against
its unchanged **60000 ms** deadline (complete log line 2131).

The gate continues to parity: all 121 acceptance cases pass, then strict
inventory fails on the stale account-policy hash, 441 feature gaps and 12345
carried items (lines 2749–2753). Forward translation starts at line 2755 but
the task memory observer stops its startup before any TAP or complete case
audit. Remaining TypeScript and forward commands, and reverse translation, are
unrun. The complete attempt takes 971.06 seconds and exits 143. Peak sampled
cgroup use is 2876076032 bytes; the distinct final stop sample is 2873933824
against the original 2866933760-byte task threshold and 3135369216-byte container
limit. Initial fingerprint cache advice changes no file contents. All owned
processes are reaped. Complete raw streams, original source snapshots and all
three terminal Node receipts, including the failed and interrupted attempts,
are retained in the [published resolver evidence packet](https://github.com/link-assistant/router/blob/4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2/docs/case-studies/issue-784/evidence/resolver-complete.tar.xz?raw=true).

The packet verifies all 251 selected originals (57005170 logical bytes), including
the entire preceding CI cycle, current receiving evidence and failed local gate.
It occupies 25575912 bytes and takes 42.02 seconds with peak sampled cgroup use
2401726464 bytes. A memory-stopped initial capture is retained separately as a
complete [failed artifact at its published commit](https://github.com/link-assistant/router/blob/b63dd5a337c4e17f9df51f9ce866cb73fdea7662/docs/case-studies/issue-784/evidence/resolver-failed-partial.tar.xz?raw=true),
with no successful-packet claim. Its 24588813 local bytes were subsequently
retired only after checking the complete published Git blob against the original
SHA-256, the authenticated published blob metadata and inactive references. The
[retirement receipt](evidence/resolver-failed-partial-retirement.json.gz)
records that unchanged permanent original. The successful packet remains local.
After full archive
readback and inactive-reference checks, retiring only archived raw Node and CI
duplicates removes 30109696 allocated bytes; their complete bytes remain in
the unchanged archives. The latest complete CI cycle remains available locally.

This adds no measured executable application coverage, does not regenerate the
missing owned matrix, and establishes neither strict parity nor a green local
or CI gate. No Rust tool has run locally.
