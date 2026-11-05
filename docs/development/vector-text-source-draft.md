# Actual owned String vector reverse source draft

SOURCE ONLY. Implementation, source preparation, parsing, translation, tests,
compilation and experiments remain UNRUN. CI feedback remains uninspected.

The explicit vector reverse candidate now admits actual native owned String
return elements and by-value String arguments. It requires source-qualified
String ownership and only the known native String qualifier forms from the
fresh forward capture. Borrowed str/String, erased/generic/custom text and
implicit numeric/text conversion remain refused. Forward owned String comma
lists already exist; non-Copy String repetitions remain a separate OPEN rule.

Native JS/TS string literals must contain Unicode scalars. Literal escaping
uses explicit native String From<str>; repeated input positions use fully
qualified String Clone in Rust, so no input is moved twice or aliased as borrowed
storage. Standard String allocation/cloning internals remain intentionally native.
Primitive JavaScript strings carry the same value domain without coercion.

Emitted reverse TypeScript and the independent evaluator validate every owned
String argument, including unused arguments in empty/unselected branches. A
small runtime reexport uses the existing Unicode-scalar validator; boxed strings,
objects and unpaired surrogates refuse. There is no new text-size policy, value
cache or observer callback. The candidate runtime source closure now retains
this runtime, declaration and its original complete iterator/whitespace dependencies.
Candidate consumers use the candidate runtime collector; the original generic
owned-core runtime collector is unchanged.

Nine complete compiler equations preserve originals, two ordered rule sequences
and complete CST inverses. Independent unrun source covers Unicode/empty/control
escaping, native literal ownership, repeated input clones, conditional/unused
input guards, strict TypeScript/evaluator/meta, invalid source/borrow/numeric/
coercion refusals and native independent-storage oracle source. Current private
copy producer integration, complete generated module packaging, borrowed text,
String Clone repetition, all production callers, full synchronization/freshness,
receiving qualification and every delivery row remain OPEN. No executable gain
or completion percentage is claimed. Rust stays CI-only after eight same-SHA JS gates.
