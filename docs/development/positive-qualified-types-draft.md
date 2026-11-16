# Positive qualified type and path source draft

All implementation and independent regression source is UNRUN. The private
positive grammar now retains qualified associated paths in input/return types,
expression callees and constant patterns, including nested trait arguments and
suffix turbofish. Qualified self/trait/suffix components have distinct source
nodes and complete original spans. A second absolute/qualified suffix and
qualified or generic macro paths refuse.

Higher-ranked lifetime binders retain complete generic/lifetime children;
non-lifetime parameters refuse. Parenthesized Fn-trait arguments/results remain
attached to the actual type-path segment, and angle/parenthesized argument forms
cannot be mixed on one segment. Associated type bound constraints retain their
own bound children. Bare function pointer types retain unsafe/extern qualifiers,
ABI strings, named/attributed parameters and terminal external variadics. The
ordinary unnamed unqualified function-type representation remains available.

These are private source-syntax observations only. Type/binder/ABI/namespace
owners and runtime authority remain unresolved. Every actual source/native/
identity check, complete CST serialization/reparsing and source association,
full AST inspection and node/depth/token/TT bound remains required. No native
legality, lifetime/feature/edition availability, trait selection, call ABI,
semantic admission or executable authority follows from a new positive node.

Two whole compiler equations retain complete originals, native owners, language
then repository stages and complete source/CST inverses. Independent unrun cases
cover qualified inputs/outputs/callees/patterns, higher-ranked Fn bounds,
function-pointer details, associated bounds, literal source spans and malformed/
macro/binder/variadic/copied-frame refusals. A separate native associated-type and
higher-ranked callback oracle remains CI-only after all eight same-SHA JS gates.

No implementation, parser, model, translator, preparer, compiler, runtime, test,
experiment, generation, Rust tool or CI-triggering push ran. All actual native
AST/visitor/scope/owner/global/effect closure, remaining source, production
forward/reverse, synchronization, source-bank/export materialization/freshness,
native parity, receiving qualification and complete delivery remain open.
