# Pure module translation draft

`translatePortableModuleProject` links an explicit ES module source
universe before using the existing JavaScript or typed TypeScript semantic
frontend. Each module first crosses the complete serialized/reparsed CST
boundary. The pinned native TypeScript compiler creates fresh source files,
resolves actual import aliases and supplies the symbols used for source edits.
Source metadata never substitutes for that native binding step.

Language rules retain dependency initialization order, remove only selected
module declarations, rename private dependency bindings without colliding with
any original identifier, and substitute actual references by symbol identity.
Namespace member selections and shorthand keys have distinct native rules.
Module hashbang and redundant strict/empty statement trivia have separate
source substitutions; module path strings are kept as metadata, not injected
into executable source comments.
Every complete original/edited module retains its CST and full inverse. The
linked program then passes the ordinary semantic checker and meta round trip;
repository rules retain module/source mappings alongside Rust and TypeScript.

Native classification now separates initialization components. A cycle with
only hoisted named functions and type declarations can use the existing direct
source binding substitutions. A cycle containing any runtime variable
declaration still refuses: live binding and temporal dead zone semantics need
their own lowering. The graph scheduler returns data; its public boolean inputs
cannot replace native source classification or the complete semantic checker.
Component order and original membership remain in module source history.

Cycles with runtime initialization, dynamic imports, module identity/receivers, escaping module callables,
callable reflection, unreachable
supplied modules, missing or ambiguous dependencies, classes
and other unsupported declarations remain explicit refusals. This is a pure
module profile, not a blanket native module bundler or complete class/async
translator. Existing semantic refusals still apply to every linked body.

The `portable-project` source-unit profile captures each declared physical
dependency and its Git baseline. An edit to a dependency selects its owning
language even when the entry source is unchanged. The metadata retains all
original module histories. Rust project inputs use the existing complete
project translator and refuse unresolved body obligations. A generated target
cannot overwrite another unit's authoritative source/dependency snapshot.
Shared dependency state must remain in a single unit scope; separate units
cannot independently duplicate the same dependency module or another unit's
entry. Propagation between units with shared state remains a separate feature.

Regression source covers actual named/namespace imports, native TypeScript
aliases, complete inverses, shared runtime vectors, changed dependencies and
the refusal boundaries. None has been executed during bulk drafting. Mixed
library profiles, cyclic live binding behavior, native classes/async modules,
additional namespace obligations and full Router coverage remain open.

`prepare-hoisted-module-cycles.mjs` retains the complete original linker and its
original cycle refusal regression. Native-selected language substitutions add
component scheduling; repository substitutions retain initialization history
and keep the runtime-constant cycle refused. Both complete CST sequences and
inverses are required. The new graph, JS/TS cycle, identity/refusal and source
copy regression sources are drafted and unrun. No performance or production
coverage result follows from this source extension.

The [public module API draft](module-public-api-draft.md) adds native-selected
named and star reexports, exact public runtime aliases and scalar type exports.
Private implementation names stay private. Its complete source equations and
independent regression sources are unrun; general module synchronization,
generic public type constraints and the other open module forms remain open.
