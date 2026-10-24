# Named public module API draft

The portable module linker now asks the fresh native checker for the complete
entry module export table. Reexport aliases and star exports resolve to their
actual original declarations. Native import/export diagnostics refuse missing
and ambiguous owners. Public metadata grants no independent binding permission.
The complete linked body still passes the existing checked semantic meta path.

Language substitutions set declaration visibility by the selected native
owners. Mixed constant statements split at native declaration boundaries in
their original order. Target packaging removes intermediate export modifiers;
repository substitutions publish exactly the selected runtime names. Multiple
aliases refer to the same JavaScript/TypeScript binding, preserving function
identity without wrapper functions or new application bodies.

TypeScript retains accepted scalar aliases and publishes actual type-only
exports. Closed nongeneric public aliases also produce Rust scalar aliases.
The existing scalar resolver validates their full native declarations, including
references to accepted generic aliases. Needed absence helper declarations come
from the actual complete emitter constant; an existing helper family must match
that complete syntax. Public generic aliases still refuse because Rust type
aliases alone do not enforce the written TypeScript generic constraints.

Rust implementation functions stay in a private module. Explicit public uses
expose selected runtime aliases and needed public support types. Colliding
names refuse. Namespace objects, default exports, callable reflection, escaping
callables, cycles with runtime initializers and general class/async modules
remain open. The canonical single-file Rust inverse does not yet decode this
module packaging; complete module round-trip synchronization remains open.

Every complete target retains separate language and repository CST equations,
serialized/reparsed source and full inverses. The linker copy retains its
complete original and exact native-selected recipes in the compressed archive
used by `prepare-module-public-api.mjs`. The hoisted-cycle preparation composes
this successor without rewinding its newer source. Independent behavior,
identity, strict consumer, scalar alias, source inverse and refusal regressions
are drafted and unrun. No translator, test, native diagnostic or Rust tool was
executed to qualify this draft.
