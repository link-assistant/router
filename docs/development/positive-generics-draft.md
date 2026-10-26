# Positive generic paths and const argument source draft

All new implementation and independent cases are UNRUN. The private positive
parser now retains expression path turbofish arguments on free functions and
associated paths, including absolute paths and nested type closers. Method
turbofish keeps its existing distinct Field representation. Argument groups stay
attached to their actual path segment with original spans and source children.
Generic macro paths remain refused because macro path syntax has no type arguments.

A finite const-argument parser retains literal numbers, negative numeric
literals, booleans, validated characters, complete blocks and default constant
paths. Numeric arguments and const generic defaults stop at their enclosing
angle instead of consuming it as a comparison. Compound unbraced expressions
remain refused; complete block expressions keep their ordinary parser and opaque
macro obligations. Lifetimes remain distinct from character constants. Source,
token, node, depth and TT budgets and all private parser guards remain unchanged.

Two whole compiler equations retain original module/class/function owners,
separate language/repository phases, complete CST/meta and full inverses.
Independent unrun source cases cover free/associated/method calls, nested types,
literal/block/default const forms, source boundaries and refusals. CI-only Rust
oracle source independently covers nested types and scalar generic values.

No parser, compiler, model, translator, preparer, test, experiment, generation,
Rust tool or CI-triggering push ran. Actual const evaluation, lifetime/type/owner
resolution, monomorphization, native AST/visitor closure, production translation,
reverse/sync, source banks/exports, freshness, parity and all delivery gates stay open.
