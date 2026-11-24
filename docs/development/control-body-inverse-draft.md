# Scalar control-body synchronization source draft

`proposeForwardControlBodySynchronization` adds an explicit whole-body inverse
format for checked ordinary scalar functions. Its complete original copy retains
all earlier expression/local APIs. The project manifest selects it through
`"inverse": "control-bodies"`; the facade and committed export retain the source.

Language rules reparse complete JS/TS after lossless serialized/reparsed CST
transport and select actual function bodies through the original compiler's
source/target/signature associations. Full function membership and all bytes
outside those bodies stay exact. Each changed function requires its actual
checked original native source, safe nongeneric nonasync header, complete body
delimiters and original parameter names. The native proposal replaces only that
body's interior and retains complete original source and inverse.

The structured scalar grammar supports immutable single-name locals followed by
a terminal return or terminal `if/else`, recursively with complete value-returning
branches. Parameters and earlier lexical locals are available; branch locals
stay inside their branch. Self/future/shadowed bindings, mutable/compound locals,
fallthrough, nonterminal early returns, missing values, loops, effects and
arbitrary/property/optional calls require separate rules. Expressions reuse the
actual scalar callee and pinned arithmetic-helper candidate associations.

Only unchanged actual original leading parameter-range guards may be omitted
from native source construction, where the original compiler regenerates them.
Their complete source must match before normalization, and full target
reproduction keeps every bound and error message. No guard can be removed,
modified or replaced by a matching name. Original checked program closures are
released before recompiling the entire modified project through the existing
flat semantic DATA storage path.

Every original executable/refusal census must remain exact. The complete fresh
target must match outside function bodies and inside each changed body's native
syntax, with only the existing harmless grouping/literal/trivia normalization in
this restricted grammar. Unchanged function bodies retain exact byte equality,
including any unsupported statement shapes. Repository rules retain complete
native/paired CST histories and source inverses, and reuse fresh all-or-nothing
project installation. Original count/byte/node/depth/memory limits and all eight
JavaScript-first CI stages remain unchanged. No persistent source/owner/verdict
cache or caller-selected checker is introduced.

Independent authored source covers JS/strict TS branch truth tables, nested
scopes, whole-body batches, actual numeric callees and overflow, preserved input
guards, older API refusals, missing values, mutable/fallthrough/effect/loop/
shadow/call/source/checker forgeries and complete source histories. Native Rust
oracle source is for gated CI only. All implementation, planners, preparers,
targets, tests, experiments and Rust tools remain unrun. General loop/early-return/
owned/generic/recursive/async bodies, namespace bootstrap, production parity and
all other unfinished requirements remain open.

The new control-body comparison additionally retains every numeric literal and
immutable declaration kind, and compares complete native TypeScript type syntax
exactly. A changed annotation or type-query operand cannot disappear inside a
runtime-expression normalization, including when combined with a valid body
change. Independent annotation-forgery source is drafted and unrun.
