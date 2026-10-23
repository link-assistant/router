# TypeScript scalar frontend draft

The additive `translateTypeScript` and `translateTypeScriptConcreteSyntaxMeta`
APIs retain the original TypeScript CST before native AST selection. The source
rules accept explicit string, number and boolean annotations, their closed
unions with either null or undefined, closed scalar alias chains, ordinary
scalar function signatures, scalar constants and
unambiguous initialized scalar locals. They retain each written constraint.

Nullable parameter support uses the separately copied
[scalar absence profile](typed-scalar-absence-draft.md). The legacy JavaScript
checker originally refused those signatures; an annotation substitution alone
does not implement them. The new checked profile and all its regressions remain
unrun alongside the rest of this draft.

The generic scalar alias draft also accepts transparent scalar type parameters,
nested alias applications, defaults and constraints over the same finite scalar
domain. It checks the complete alias graph, argument counts, defaults,
constraints, recursive aliases and actual instantiated domains. Parameter
substitution has explicit node, depth and history bounds. Uninstantiated generic
templates are checked over their admitted domain; they do not create an opaque
value type. Actual annotation domains still have to match checked value IR.

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

Assertions, non-null assertions, `satisfies`, generic runtime functions,
non-scalar generic types, unresolved/recursive
aliases, classes, interfaces, enums, rest parameters and
arbitrary nested typed scopes remain explicit refusals. This draft adds actual
typed source handling; it does not claim complete TypeScript support. The
filesystem reverse lane separately handles its source-bound typed effect
wrappers and explicit lazy polling contract.

Independent regression source covers constraint mismatches, aliases, complete
CST/source associations, signed zero, infinities, NaN, Unicode strings and
refusal boundaries. No tests, compiler checks or experiments have been run for
this draft. Receiving qualification, all other TypeScript constructs and the
remaining bulk requirement ledger stay open.

`prepare-generic-scalar-aliases.mjs` retains the complete original frontend and
native-selected substitution recipes. Language rules introduce the resolver;
repository rules preserve actual alias instantiation history alongside all
original annotation/CST evidence. Both full source inverses remain required.
The new positive, constraint/refusal, module linking and numeric boundary
regression sources have not been executed during bulk drafting.

Closed scalar parameter defaults now keep their complete original initializer
source while native annotation rules remove only the declared type spans. The
existing JavaScript parser, checker, meta serializer and emitters check the
actual default expression. Parameter history records its source/span and the
checked signature must retain the same presence of a default. Missing arguments
and explicit undefined use that existing default contract; zero, false and
empty strings keep their actual values. Defaults with parameter dependencies,
calls, untyped parameters or absence unions remain outside this draft.

`prepare-typed-scalar-defaults.mjs` retains the preceding complete frontend and
its language/repository substitutions. Alias and absence preparers compose the
complete fresh successor histories rather than overwriting the later source.
Independent default behavior, source inverse and refusal regressions are
drafted and unrun.

Optional scalar parameters now select the same explicit scalar/undefined domain
and retain their original `?` source span. A fresh native TypeScript Program
resolves actual local call symbols before substitutions append missing optional
operands as explicit undefined. Required arguments and parameter ordering remain
checked. Existing arguments retain order, comments and trailing comma handling.
The emitted TypeScript signature receives native-selected optional markers so
external consumers can still omit the argument; that target source also retains
its full CST equation and inverse. Rust keeps explicit absence envelopes.

Return annotation removal now selects the native colon token rather than
scanning for a parenthesis in source trivia. The optional family includes the
whole prior frontend/refusal source and fresh adjacent default history through
`prepare-typed-scalar-optional.mjs`. Its implementation, strict external-consumer
regressions, native-binding refusals and source/trivia cases are drafted and
unrun. Optional object or triple-absence domains and general callable classes
still require separate rules.
