A proposal-only CLI composes the unchanged formatting-corpus adoption API and
then the unchanged primitive-corpus adoption API on its proposed source map:

    node tools/translation/propose-core-adoption-corpus.mjs --root SOURCE_ROOT --output FRESH_OUTSIDE_DIRECTORY

Each pass executes language rules before repository packet writing, with a fresh
complete graph and explicit production profile. Its complete returned evidence
is recoverable from per-file input/row/source packets, complete graph modules,
CST documents, edges, diagnostics, skips and key-order metadata. A small hashed
index references every packet; no whole-corpus JSON serialization is built.
The first proposal's row/CST objects can be released before the second pass.
Only source strings and packet references cross the pass boundary.

The new POSIX CLI permits at most 1,024 source files, 32 Mi UTF-16 source units,
64 MiB per packet and 1 GiB total output. It preserves full source identities and
fresh census/content checks after each pass and before completed-index writing.
It never installs sources or grants semantic admission. Review the completed
index and all evidence before applying proposed Rust source changes. Failures
after packet writing preserve bounded incomplete evidence and a failure receipt;
without a completed index those packets must not be installed. Input validation
failures before the first write create no proposal output.

These are stock-host proposal operations, not an arbitrary hostile-intrinsic or
concurrent same-UID writer theorem. Source checks are non-atomic snapshots and
the output directory requires exclusive ownership. Live graph/CST allocation
and whole-corpus resource qualification still require receiving measurements;
packetization alone establishes no heap or translation-coverage gain. Existing
single APIs, source/type/owner checks, limits and runtime refusal behavior stay
unchanged. Eight receiving cases cover complete API reconstruction, source/CST
inverses, actual production sources, real hash-time source mutations, incomplete
packets, input/path bounds and real same-engine CLI plus checked JS/strict TS.
No engines or Rust ran in the source worker.

The final index is first written as `index.pending.json`, then published by a
stock atomic rename to `index.json` only after its write succeeds. An injected
source-paired pre-rename failure retains complete pending bytes and an incomplete
receipt, with no installable index. This does not make source snapshots atomic
or qualify arbitrary hostile filesystem wrappers.
