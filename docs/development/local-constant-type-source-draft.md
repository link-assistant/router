# Closed local constant type source draft

SOURCE ONLY; all code, cases, source constructors, translators and compilers
remain UNRUN. No local verification, experiments or CI feedback inspected.
Full bulk drafting and whole production translation remain unfinished.

A reusable language reader selects only complete initialized nongeneric local
const declarations and their actual type-token ranges. It preserves original
initializer bytes and token identities, handles compound type/initializer groups
with bounded delimiters, and issues detached DATA. Anonymous const items do not
introduce value bindings. Repository rules feed original type tokens into the
existing closed scalar type grammar, retaining both ordered phases and full
serialized/reparsed CST/source inverses. Existing bound constant references,
local annotations and cast targets compose in the same whole-function proposal.

The complete original body is still inspected for types, imports, macros,
attributes, closures and other declaration producers, including within const
initializers. Only precisely selected const keywords are removed from that
producer refusal. Named constants cannot compete with selected primitives,
parameters, other selected constants or any chronological local binding;
whole-function hoisting uncertainty is refused conservatively. Initializers
are never hidden from the original local census or rewritten as let bindings.
Unsupported declarations retain the complete original body, while separately
safe signature substitutions remain their own explicit source proposal.

Three complete compiler source equations plus independent unrun both-API source,
anonymous/named/compound/carrier/annotation/cast composition, hoisting/boundary
JS/strict TS, malformed/producer/shadow refusal, UTF16/trivia, idempotence/full
inverse, native oracle and export cases are drafted. Fresh full semantic checking
must independently admit all actual local-constant execution; these source
positions do not replace constant evaluation or count as executable coverage.

Generic/conditional/local-static and broader declaration semantics, full source
namespace/macro closure, production/reverse/sync/freshness/parity/target matrix,
performance, receiving and delivery requirements remain OPEN. No current
completion percentage or fully drafted/verified claim is made.
