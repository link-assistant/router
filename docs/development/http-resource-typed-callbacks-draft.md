# Original TypeScript callback annotations: source draft

All implementation and independent cases remain unrun. This family extends the
capture-free callback draft with original explicit TypeScript arrow parameter
and return annotations. The actual selected operation still supplies the native
callback contract, and the complete body must independently satisfy it. Written
types never transfer ownership or select an operation owner.

The closed annotation reader resolves real imported operation type queries,
`Parameters`, `ReturnType`, nested callback parameter queries and actual JSON
list element queries. It distinguishes owning JSON accumulators from shared
JSON elements and asynchronous return wrappers from their inner domain. Every
written parameter and return must agree with its complete original contextual
ABI. Unknown aliases, generic arrows, captures, incompatible types and invalid
indices remain explicit refusals. The general type checker is not replaced.

The original TypeScript source file owns every annotation and span. Its private
annotation sink follows nested callback, branch, Option fallback and loop flow;
neither that source file nor the sink enters the checked semantic program.
Native-selected parameter and return annotation spans produce the JavaScript
target, while the TypeScript target retains its complete original source.
Both targets retain serialized/reparsed CST and complete source inverses.

The complete original flow and caller-source copies retain ordered language
then repository substitutions and original owner boundaries. Independent unrun
cases cover typed map/filter/fold bodies, nested and loop contexts, JavaScript
erasure, strict TypeScript receiving, native token equivalence, wrong domains,
asynchronous ReturnType, invalid indices and forged meta. Existing independent
native callback oracles remain required. Broader type aliases, generic/owned
signatures, captures, namespace/bootstrap, production parity and every unfinished
requirement remain open.
