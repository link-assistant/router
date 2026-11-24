# Original call grouping and entry no-op draft

The caller path now selects actual parenthesized imported and checked local
names consistently across cold-body selection, operation resolution, numeric
constraints and helper ordering. Generic forwarding checks the original callee,
actual lexical type slot and one live input. Deferred wrappers and callbacks
also accept bounded original grouping. The original syntax nodes, type argument
boundaries and complete source are retained for semantic checking and CST
inversion; grouping alone cannot supply a binding or signature.

The raw entry statement limit is checked before dropping actual empty statements
from guard selection. Leading and intervening no-ops cannot hide a required
numeric guard or prevent an otherwise complete cold wrapper from being selected.
Effects remain statements and all complete native range/constructor checks stay.
Value parentheses keep their existing actual written-type checks. Callable and
callback grouping with a written type conservatively refuses until its complete
function/future signature has a separate rule. Property calls, unbound names,
cycles, excessive grouping and excessive original statement lists still refuse.

Seven complete originals, ordered language/repository substitutions and full
inverses are retained in the source chain. Independent direct JS, strict TS,
generic/numeric/cold/deadline/native inverse and refusal cases plus native
behavioral oracle source are drafted and unrun. No implementation, test,
translator, compiler, preparer, generation, local Rust tool, push or CI ran.
Namespace/producer closure, wider language/effect domains, production adoption,
full parity and every unfinished requirement remain open.
