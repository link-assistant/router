# Bulk primitive vector literal adoption source draft

Status: SOURCE DRAFT ONLY. All receiving, emitted JS/strict TS, interpreters,
CST/meta, native inverse, freshness and performance checks remain UNRUN. No CI
feedback was inspected. Full translation and synchronization remain OPEN.

The additive proposeOwnedPrimitiveVectorLiteralCalls API batches selected dense
local array literals containing zero through 64 elements. It reuses the existing
complete syntax/CST/private-module closing discipline of the empty-local
proposer. The original API retains its existing empty-only domain and refusals.
Language substitutions construct a qualified new result and ordered push calls;
repository substitutions add collision-free imports. Literal elements evaluate
left to right. Push/length statements on the same selected locals keep their
existing substitutions. Original whole source/trivia and exact inverses remain
in the complete CST/source history.

The explicit candidate function/local/domain records grant no type or owner
authority. Every proposed complete module must pass fresh private paired-source
checking. Holes, spreads, more than 64 literal elements, shadows, wrong domains,
receiver-dependent pushes and overlapping source edits remain refusals. The
static limit bounds source/IR nesting and the immutable intermediate-copy cost;
the core's independent 4,096-value runtime bound is unchanged.

This remains a source contract migration: ordinary mutable arrays become frozen
owned core carriers and adopted length reads become fixed u64 bigint values.
The proposal records these changes and keeps original equivalence, production
selection, installation, parity and whole synchronization false. A checked
proposed module is not evidence that original arbitrary JavaScript array code
has equivalent public runtime behavior. Native standard Vec source adoption
and its full original-owner qualification remain separate unfinished work.

Independent case source covers zero/one/two/64 values across eleven domains,
both owned caller families, JS and typed input, emitted JS/strict TS, both
interpreters and native canonical inverse. Three complete source equations
preserve the old API, frozen originals and both ordered substitution phases.
All execution evidence remains UNRUN.
