# Bounded native input provenance draft

SOURCE ONLY; implementation and independent regression cases are UNRUN. No
compiler, translator, preparer, parser, test or CI feedback has been executed or
inspected for this batch. Full production translation and delivery remain OPEN.

Six native implementation constructors now share one complete pinned metadata
reader. Each original archive path and SHA remains unchanged. Before reading,
metadata must be a regular file at most 1MiB, input rows are bounded and unique,
and each original must be a regular file with its exact declared size at most
2MiB. Complete UTF-8 bytes and SHA are checked, then the explicit original/current
history is joined and the actual current source crosses the serialized/reparsed
CST boundary. No original pin or original source is silently rewritten.

Each operation-local row retains the original bytes/hash/source separately from
the current bytes/hash/source and carries a receipt for the exact original
metadata bytes. After construction callbacks, final filesystem checks re-read
both complete sources, physical history originals, the pinned history archive
and the metadata receipt. Even JSON whitespace changes refuse. These final byte
checks do not invoke CST reconstruction callbacks again. They introduce no
cross-operation cache, source owner, namespace or semantic admission authority.
Filesystem checks are observations, not an atomic filesystem snapshot; a later
consumer must retain its own full source and private owner checks. Concurrent
filesystem qualification remains OPEN.

Eight full compiler source equations retain both ordered phases, immutable
originals and inverses. Independent receiving fixtures cover unchanged Unicode
source, same-length source changes, metadata changes after construction,
nonregular metadata, original growth and bounded declared sizes without large
fixtures. Existing native-history cases retain their original refusal obligation.
All those cases are source drafts only. Rust remains CI only after all eight
same-SHA JavaScript gates. Broad source/semantic closure, forward/reverse/sync,
parity, platform pressure, receiving qualification and delivery remain OPEN.
