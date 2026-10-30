# Generic native aliases and source-bound bigint constraints

This source-only extension resolves closed native integer specializations such
as `type Identity<T>=T; type Word=Identity<import("./runtime/primitive-operator-runtime.mjs").RustU8>`.
Actual TypeScript type-parameter symbols bind arguments and ordered defaults;
constraints may use earlier parameters. Nested applications evaluate supplied
arguments in their caller's environment before entering the constructor body.
Only concrete nongeneric aliases become public Rust aliases. Generic
constructors themselves remain outside the scalar Rust public API.

Every fixed native leaf must resolve to its actual canonical runtime declaration
or a complete identical declaration mirror. A bigint-shaped local alias,
unresolved import or similarly named declaration cannot select a native width.
The provider never memoizes a generic declaration independently of its actual
arguments. All sharing is bounded to one synchronous invocation.

The private aliased TypeScript path opts into native constraint handling only
with a genuine source context and an explicit primitive-operator profile.
Existing closed syntax constraint matches run first. Failed atomic `bigint`
constraints record fully expanded argument obligations; one hygienic augmented
complete-source proposal resolves all those arguments against fresh native
runtime declaration symbols before declaration erasure or private body checking.
Unknown and union constraints are not granted this fallback. The source-only
proposal records complete CST, the original and augmented sources, both fixed
language/repository phases and every whole-source inverse. It issues no IR,
source, owner, semantic or runtime authority.

Public packaging normalizes authenticated concrete native aliases to explicit
runtime import types. Only helpers required by remaining legacy scalar exports
enter the legacy resolver and target formatting; helpers referenced solely by
normalized native exports are omitted from that target declaration fragment.
All original helpers remain in the complete source histories and inverses.
Default legacy inputs preserve their previous shape and checks.

Six compiler source equations, independent all-ten-width body/public restoration
cases, strict TypeScript consumer source, constraint/hygiene/refusal cases and a
CI-only Rust oracle are drafted. Every new check is **unrun**. This does not
qualify complete translation, application coverage, regeneration freshness,
performance or synchronization. Optional native aliases, broader native/type/
owner/global closure, production parity and all remaining ledger requirements
remain open. No Rust tool, parser, translator or test ran during this draft.
