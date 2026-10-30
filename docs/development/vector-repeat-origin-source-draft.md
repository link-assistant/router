# Fresh repeated-vector origins for the reverse candidate

SOURCE ONLY; implementation, source preparation, parser, translator, tests and
compilation remain UNRUN. CI feedback remains uninspected.

The explicit primitive-vector reverse candidate previously required its fresh
actual original checked Rust body to be an array immediately. Repetition lowers
to a scalar seed binding followed by that array, so the original body selector
also needs to follow those bindings. A small shared reader now follows at most
64 immutable scalar let nodes, checks each genuine seed type with the existing
primitive-domain selector, checks every result type against the actual native
return, and requires the original owned-array tail. Existing complete same-call
source capture, source signature, module view, scalar width/signedness, owned Vec
storage and lowerer checks remain. The helper itself issues no authority.

Three complete compiler equations retain originals and language/repository CST
inverses. Independent unrun source covers actual repeated and nested scalar-let
Rust origins through the complete reverse API/strict TS/evaluator, fixed-array,
borrowed and bool/integer mismatches, bounded traversal and mutation refusals.
This completes only the current source-family join; parameterized, effectful,
match/async and general reverse source output still require further rules.
Every full translation, synchronization, receiving and delivery row remains OPEN.
