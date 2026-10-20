# Detached source-backed formatting proposal draft

`iterateSourceBackedCoreFormattingCorpusPackets` in
`tools/translation/source-backed-formatting-packets.mjs` accepts the same data as
`proposeSourceBackedCoreFormattingCorpus`. The original materialized API and its
complete source equation remain unchanged. The new iterator retains one actual
complete module graph and private producer context. Each file's complete row is
serialized within a completed function scope before its primitive packet is
yielded. Inspection rows are serialized within their own completed scopes;
only normalized primitive source strings remain associated with inspected files.
No completed per-file CST object accumulates in a corpus array or cache.
Exact original items proven inactive by the actual selected configuration are
also retained in inspection packets and masked only for binding inspection.
Unknown conditions and active producers keep their original refusals; emitted
disabled source is preserved and contributes no selected function.

`next()` returns `{done, value}`. Unfinished values have exactly
`{section, ordinal, text}`, where `text` is one complete JSON value plus newline.
Sections are `binding-inspections`, `rows`, `inputs`, `module-edges`,
`module-diagnostics` and `metadata`. Ordinals are contiguous per section.
Inspection and row events are yielded as physical files are processed. Input
hashes and the original metadata are emitted at the original producer's final
stage. Metadata supplies the complete original ordered `keys` and scalar
`values`; reconstruct its omitted arrays from their corresponding sections.
Edges and diagnostics each have one packet containing their original whole
array. This reconstructs the formatting corpus schema, including every status,
refusal, scope, origin, source, digest, inspection CST, mapping and inverse.
It does not use the literal or JSON proposal schema.

Completion returns the original summary plus detached section counts. Call
`verify()` only after complete iteration; unfinished and returned streams fail
verification. Own data descriptors for all options, original source fields and
supplied Cargo fields are captured before producer work and freshly checked
before final metadata, after its yield and on every completed `verify()`.
Physical source identity and final filesystem checks still belong to a receiving
writer; this in-memory API does not claim a filesystem snapshot or publish an
index. No quota, deadline, writer default or existing CLI route is changed.

`prepare-source-backed-formatting-packets.mjs --write` generates this separate
module using TypeScript 5.9.3 native spans for complete original declarations,
the whole actual physical-file corpus loop, the original inspection producer,
and the existing JSON packet and own-data record helpers. The materialized
producer equation is freshly checked first. Separate language and repository
CST sequences serialize/reparse complete source and retain its inverse.
`--emit` returns all source evidence; `--check` rejects stale generated source.

The new complete receiving file checks exact materialized/packet equality,
retained producer/helper evidence, ordinary and hash-observer source/Cargo
mutations, unfinished streams, and all 256 functions across 32 physical source
files. Its optional resource receipt observes heap/RSS between packets and OS
process resource use without forced GC. A passing small case would establish
neither a complete 564-file fit nor executable application gains. Complete new
receiving tests and actual corpus/resource qualification remain unrun in this
source-only worker draft. Rust remains unrun locally.
