# Scoped native String-vector adoption draft

The additive scoped proposer, complete-module batch and automatic discovery APIs
copy their complete straight-line parents. Original APIs and refusals remain
unchanged. Selected constructors may now occur in an ordinary lexical block;
selected operations can remain inside nested branches, for/while/loop bodies
and unit match arms. Original control-flow tokens are retained. Discarded pushes
become unit blocks: evaluate one operand into a fresh local, move the receiver
into the actual paired push core, then assign its result to the original local.
Nested selected length edits stay in the operand's original-span reference.

The delimiter census records the selected declaration's enclosing complete
block. Occurrences before its declaration or outside that block refuse. Duplicate
selected declarations, aliases, borrowing, indexing, consumed push results and
selected identifiers in closure/loop patterns remain unsupported. These lexical
checks do not establish Rust binding resolution or capture/loop ownership.
Original namespace, type, macro owner, effect, loop fixed-point and whole-body
semantic reissue remain mandatory. The public results are source proposal DATA;
control-flow, original two-phase borrow and body equivalence flags stay false.
Runtime capacity, source literal, depth, module/source/metadata limits remain
unchanged. String clone, u64 length and bounded resource changes remain explicit.

Two ordered substitution sequences retain language transformations separately
from repository-qualified paired-core calls. Complete original/current sources,
serialized/reparsed lossless CST and whole-module inverses are retained at each
step. Automatic discovery invokes only the fixed scoped proposer, retains its
chronology and exact structural refusals, and treats parser, source-host, census,
resource and inverse errors as fatal. Candidate/proposal counts are not executable
coverage. There are no new across-operation caches or generated-output edits.

Independent branch/loop/match/tail, lexical lifetime, shadow/capture/alias refusal,
unit result, once-only evaluation, nested edit, automatic discovery, chronology
and source-equation cases plus independent CI-only Rust oracles are drafted.
All remain UNRUN. No parser, translator, preparer, compiler, test, benchmark or
trial regeneration was executed locally; CI feedback remains uninspected.

The scoped sequence also drafts ordinary `is_empty()` through an actual bounded
length comparison to `0u64`, and discarded `clear()` through functional truncate
at zero. Empty predicates retain boolean representation; ordinary length reads
still change usize to u64. Clearing retains the value-domain result but makes
no allocator/capacity equivalence claim. Core export census accounts for every
constructor, push, length/emptiness and truncate call independently. Selected
block lookup uses a separate nesting stack for linear token visits rather than
rescanning delimiter ancestors. Matching source and Rust oracle cases are UNRUN.
