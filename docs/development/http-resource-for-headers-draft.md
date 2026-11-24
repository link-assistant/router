# Original scalar for-header draft

Actual JS/TS `for` statements now have source rules for an optional single
inferred scalar `let`/`const` initializer or scalar assignment/effect, optional
strict Boolean condition, and optional scalar assignment/effect update. The
whole body must retain the original loop state and cleanup obligations. The
emitter keeps the header local in a real Rust scope and lowers the loop to a
checked `while`. It repeats the update on every nearest-loop `continue` and
fallthrough, skipping it on `break`, function return and propagated exit. Nested
loops establish their own continuation rules. Native inversion uses the existing
whole-source block/while/assignment reader and exact checked reproduction.

Prefix/postfix `++` and `--` are accepted only as discarded header updates with
an actual strict `counter < bound` or `counter > bound` condition. The counter
must be a live mutable native integer local, the bound a matching immutable
integer or original bounded literal, and the complete checked body must leave
that counter unassigned. Thus every reached update is in range; the rule maps it
to the original source-qualified integer core operation. A spelling, unbounded
BigInt annotation or guessed loop termination grants no such mapping. General
updates, nonstrict bounds, mutable limits and raw arithmetic remain refused.

Source review also connected the existing invocation-local numeric constraint
map to actual scalar declaration initializers. It chooses a literal domain;
every complete operation and body must still check that domain independently.
No source, hash, verdict or inference cache crosses an invocation.

Complete prior sources, ordered language/repository substitutions and full CST
inverses are retained. Independent JS, strict TS, native inverse, signed/unsigned
boundary, nested-control, forged-meta, refusal and native oracle cases are
source drafts and unrun. No implementation, compiler, preparer, translator,
experiment, local Rust tool or CI run was executed for validation. General
Number/range loops, header destructuring, typed locals, shadowing and every
unfinished bulk requirement remain open.
