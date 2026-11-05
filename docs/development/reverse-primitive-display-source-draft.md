# Reverse primitive display source draft

All implementation and independent JS/strict TS/native oracle SOURCE remains
UNRUN. No tests, compilation, compiler/preparer/translator execution or CI feedback
review occurred. Complete translation and synchronization remain unfinished.

The existing full resource source checker now recognizes actual unshadowed
String(value) calls and zero-argument primitive value.toString() calls. Only its
already supported bool/u64/i64/borrowed-str/owned-String domains qualify. Actual
original native AST/file association, arity, nonoptional shape, no spread/type
arguments and complete argument flow checks remain mandatory. Coercing objects,
resources, null, arbitrary callbacks or radix methods is refused. Global String
cannot be replaced by an imported, module or local source binding.

Argument checking borrows original owned text instead of consuming it. Results
are fresh owned text with no borrowed root; side-effecting nested checked calls
keep the existing once-only source order and all resource obligations. A separate
primitive-display semantic node emits exact core format!("{}", value), reusing the
already required complete original native facade/primitives association. No new
runtime ABI or owner certificate is introduced.

The canonical Rust reader/projection accepts only that exact single-slot core
macro. It proposes String(...) with original scalar types; signed literal hints
retain i64 identity. The original complete fresh checked JS/meta/Rust reproduction,
source CST phases/inverses and current native/runtime input joins remain unchanged.
Metadata or native syntax observations alone grant no executable authority.

Five compiler equations and independent unrun nine-caller JS/strict TS, canonical
native inverses, ownership reuse, boundary/callback/source/meta mutation refusals,
native oracle and export source are drafted. Numeric input cases retain literal
independent original entry guards. Wider fixed-width reverse public domains,
format options/templates, source IIFEs and remaining production/reverse/sync/
namespace/parity/freshness/receiving/delivery requirements remain OPEN.
