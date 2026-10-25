# Original native Result extraction match draft

The explicit native source path now recognizes original Ok/Err extraction
matches that return the exact successful binder or return Err with the exact
captured error. Both arm orders and otherwise empty value/return blocks retain
their scopes. Exact source substitutions preserve the original initializer and
compose it with the existing checked propagation path, including written local
payload type obligations.

Ok and Err must remain unshadowed. Modified or discarded errors, an outer-scope
value in place of the captured error, mutable/nested/wildcard patterns, extra
effects and incompatible error families retain refusals. The original whole
source/meta/native checker still establishes every value, error, move, root and
cleanup obligation. A public source record or matched spelling grants none of
that authority, and no new cross-invocation cache is introduced.

Two complete original sources, both substitution phases and full source/comment
inverses are retained. Independent JS/strict TS/native, successful Boolean,
Unicode error/control-error identity, actual native operation, local types,
scope/source/refusal and native oracle cases are drafted and unrun. No tests,
experiments, compilers, translators, preparers, generation, local Rust tools,
pushes or CI ran. Wider Result fallbacks/conversions, namespace/producer closure,
production adoption/parity and every unfinished requirement remain open.
