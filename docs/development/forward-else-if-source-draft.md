# Complete native else-if inverse source draft

All implementation and independent cases are SOURCE only and UNRUN. No local
parser, translator/preparer, tests, compilation, experiments or CI feedback were
executed or inspected. Full source drafting and complete translation are unfinished.

A shared native target syntax reader selects either an actual complete block or
an actual else-if statement. Every original condition remains in its original
branch order, and existing lowerers recurse through the existing block machinery
with their original fresh branch scope, loop depth, termination summaries and
resource bounds. It changes no AST, executes no condition, and does not infer
source binding, type, ownership, side effect or execution permission.

The original control, imperative, range, floating, standard-floating,
standard-numeric and owned-format whole body paths all use the shared branch
reader, including the actual body support used by mixed owned synchronization.
Only else branches gain direct if statements; unbraced then/ordinary else bodies
remain refused. The source comparison removes exactly a singleton-if wrapper in
an otherwise branch, matching the equivalent canonical nested block emitted from
Rust. It never strips a wrapper containing a declaration or another statement,
or removes an arbitrary lexical block. Conditions, then blocks and all remaining
source syntax stay in the complete native comparison. Existing malformed source,
outside-body edits, unknown calls and whole-project reproduction refusals remain.

Eleven complete immutable source equations retain full original modules, native
whole source owners, language then repository sequences, serialized/reparsed CST,
full physical inverses and every earlier source-history join. No new cache, ABI,
resource limit, phase, workflow or eight-stage same-SHA JS prerequisite changes.
Independent unrun source covers both target languages across eight inverse APIs,
actual guard retention, complete source inverses, independent Boolean truth
vectors, normalized and declaration-preserving native comparisons, malformed/
unbraced/outside-body/unknown-call refusals, native branch behavior and exports.

Wider source constructs, namespace/producer closure, production coverage, complete
forward/reverse/sync/freshness/parity, receiving/performance qualification and
delivery remain OPEN. No verified behavior or executable coverage gain is claimed.
