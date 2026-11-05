# Local helper signature query draft

The owned frontend now has source rules for `ReturnType<typeof helper>` and
`Parameters<typeof helper>[index]` over actual local helper declarations. The
native symbol must identify a helper whose entire body has freshly passed the
private source checker. An annotation or callable signature alone never issues
a domain. Owned JSON/list/text results supply their existing borrowed written
input domains; actual result ownership and loans still come from body checking.

The native dependency walk includes ordinary calls, written annotations and
JSDoc parameter/return types. Its invocation-local symbol table also joins
actual paired TypeScript declarations through the existing complete executable
token/topology and source-span proof. Callees check before their dependent
queries, even when a function appears later or is referenced only as a type.
Unsupported helpers and recursive call/signature components refuse. Original
function order and every per-function ownership/effect check remain intact.

Parameter indices use bounded canonical literals and must exist on the actual
freshly checked function. Known imported runtime families can use their
registered higher-arity parameters; unknown source operations still refuse.
Local aliases of the built-in utilities do not grant utility semantics.
The existing node, depth and full-program bounds remain unchanged; the
per-invocation maps introduce no persisted source/owner/verdict cache.

Complete previous implementations, native source substitutions and both
language/repository CST inverses are retained by the successor source family.
Independent original JS, paired TS, cross-module alias, type-only dependency,
bad-index, shadowing, unsupported body and cycle regressions are drafted and
unrun. Generic helpers, recursive bodies, remaining effects, production
coverage, receiving qualification and full issue completion remain open.
