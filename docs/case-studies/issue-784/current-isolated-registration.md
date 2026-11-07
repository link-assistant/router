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

This adds no measured executable application coverage, does not regenerate the
missing owned matrix, and establishes neither strict parity nor a green local
or CI gate. No Rust tool has run locally.
