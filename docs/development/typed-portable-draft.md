# TypeScript scalar frontend draft

The additive `translateTypeScript` and `translateTypeScriptConcreteSyntaxMeta`
APIs retain the original TypeScript CST before native AST selection. The source
rules accept explicit string, number and boolean annotations, their closed
unions with either null or undefined, closed scalar alias chains, ordinary
scalar function signatures, scalar constants and
unambiguous initialized scalar locals. They retain each written constraint.

Language rules replace only selected native annotation spans, express parameter
and return constraints as JSDoc for the existing JavaScript frontend, and retain
complete serialized/reparsed CST inverses. The ordinary JavaScript source
parser, semantic checker, meta serializer/reparser and Rust/TypeScript emitters
still process the complete resulting module. Each retained parameter, return,
constant and local constraint must match that independently checked program.
Repository rules package the complete original source history and targets.
Null and undefined retain their distinct existing semantic contracts. Existing
numeric and string ABI domains remain unchanged; this adds no wider UTF16 or
opaque-value permission.

Assertions, non-null assertions, `satisfies`, generic types, unresolved/recursive
aliases, classes, interfaces, enums, optional/rest/default parameters and
arbitrary nested typed scopes remain explicit refusals. This draft adds actual
typed source handling; it does not claim complete TypeScript support. The
filesystem reverse lane separately handles its source-bound typed effect
wrappers and explicit lazy polling contract.

Independent regression source covers constraint mismatches, aliases, complete
CST/source associations, signed zero, infinities, NaN, Unicode strings and
refusal boundaries. No tests, compiler checks or experiments have been run for
this draft. Receiving qualification, all other TypeScript constructs and the
remaining bulk requirement ledger stay open.
