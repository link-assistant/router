# Native JSON constructor synchronization source draft

SOURCE ONLY. All implementation, independent cases and source equations remain
UNRUN. CI feedback stays uninspected; full drafting and delivery remain OPEN.

The private native JSON vector mode emits scalar constructors through the shared
bounded library. Arrays move an explicitly checked canonical Vec into the array
builder. Nonempty objects first evaluate every child once into a hygienic owned
local, then construct canonical literal keys and call the bulk fields builder.
Empty objects use the zero-argument builder directly. Generated constructors no
longer expand nonempty JSON macros or repeatedly update a growing object.

Actual source-bound builder arguments receive their registered canonical Vec
element type before checking empty literals. This is contextual typing from the
actual complete native library signature, not a public metadata or layout flag.
The existing private original parser/operation issuer, canonical layout, owned
linear-flow proof, complete source/census checks and closing freshness remain
necessary. The body comparison retains ordered scalar/array/key/object operations,
including unused constructions and all branch/input checks. It uses a bounded
100000-node traversal and 16384 effects; no invocation result is cached.

Signed JSON literals preserve their checked i64 spelling. Known nonnegative
unsigned literal arguments that fit i64 receive an explicit i64 literal spelling.
Dynamic unsigned-to-signed conversion remains refused until its checked shared
conversion boundary is drafted; no unchecked cast or panic erasure is used.
Native JSON reader normalization and full generated-module re-entry remain OPEN.

Four complete source equations preserve all original bytes, CST inverses and
language then repository substitutions. Independent cases draft both authorities,
all constructors, nested values, Unicode, integer bounds, empty contextual arrays,
child order, unused effects and source inverses. No test or compiler ran. Full
Router synchronization, ownership/namespace/trait/effect completeness and all
receiving/race/platform/performance/CI obligations remain OPEN. Eight same-SHA
JavaScript gates still precede fatal CI-only Rust.
