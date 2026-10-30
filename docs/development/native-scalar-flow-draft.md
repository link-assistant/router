# Native scalar comparison and mutable-local source draft

All seven reverse source profiles now draft equality and ordered comparison for
actual fixed native integer operands. Each function reads the explicit primitive
profile from its genuine private context. The complete original binding, typed
annotation, runtime-source and body checks remain. Operators preserve source
operand order, require identical domains and do not permit coercive equality,
boolean ordering or automatic conversions between different native widths.

A shared bounded scalar-flow helper may join an already parsed bare integer
literal to its other operand's authenticated fixed native domain when the entire
canonical decimal value fits. It uses the existing ten-width literal catalogue,
never evaluates source, preserves loan/root checks and does not extend the
original literal parser bounds. Larger constants can already enter through
explicit checked primitive helper operands. The helper is DATA only and carries
no source, ownership or runtime permission.

The state, outcome and cancellation profiles already implement mutable locals
and assignments. Their draft now also accepts root-free native Copy scalars
under the explicit primitive profile, preserving exact assignment domains,
actual binding symbols, const protection and all existing affine/loan rules.
The other four profiles preserve their immutable-local contract. Existing
emission, checked meta reissuance and interpreters carry these assignments;
complete canonical Rust inverse paths still require independent full-source
reproduction. The vector candidate interpreter now spells out every allowed
comparison instead of treating an unknown operator as inequality.

Ten whole compiler source equations, independent seven-profile/ten-width
comparison cases, three-profile native mutation/restoration cases, refusal and
bounded-literal cases and a CI-only all-width Rust oracle are drafted. All new
cases are **unrun**. No complete source application coverage, full translation,
freshness, receiving qualification, performance or parity is established.
Remaining native/type/owner/global closure, application operations and every
unfinished ledger requirement remain open.
