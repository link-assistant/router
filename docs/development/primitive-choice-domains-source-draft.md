# Primitive literal choice domain source draft

All implementation and cases UNRUN. Full drafting, full translation and every
verification obligation remain OPEN. No tests, compilers or trial translation
were executed; CI feedback was not inspected.

An additive complete copy of the existing scalar operand join handles finite
literal-only choice trees. An actual checked fixed-width value supplies the
domain; only fitting generic integer literal leaves are refined. Existing typed
variables, operation outputs and differing nonliteral widths are never recast.
The original binary operand API remains unchanged. All seven receiving source
families select the new join only while their explicit native scalar operation
profile is active. Complete source/type/ownership checks still own admission.
No context, namespace or executable authority comes from this DATA operation.
Its observed traversal cost is charged to the existing complete function budget,
including repeated prior-return joins; nested trees cannot reset that budget.

New primitive definitions additionally join literal return paths with actual
typed return values in either source order. Original JSON loan/i64 rules remain
independent. New-vector definitions accept default signed literals in a choice;
zero under unary minus remains the same default unqualified zero value.

The function-local vector solver observes complete literal-only integer choices
as unanchored constraints, including their exact branch values. This prevents an
intermediate default scalar representation from inventing a Vec width. A later
actual typed item or written return can anchor the complete array; literal-only
vectors remain refused. Finalization narrows literal leaves to that actual
resolved domain, preserving every original condition, selected branch and eager
failure. The collector uses one function-local list and bounded traversal rather
than repeatedly copying descendant arrays. No cross-operation cache is added.

Ten complete source equations preserve original bytes, lossless serialized and
reparsed CST/meta, inverse and language then repository phases. Draft cases cover
all ten widths, both branch/return orders, nested positive literal choices,
literal arrays with a later typed anchor, signed literals, negative zero, strict
nonliteral/range refusals, ambiguous literal-only vectors and ordered checked
condition failures. Independent Rust source uses native exact types and panic
oracles in gated CI only. Every case remains unrun.

Unannotated literal spellings beyond default scalar bounds inside nested choices,
nested mixed-sign choices without a contextual domain, scalar immutable-literal
alias inference, Vec inputs/mutation/iteration, cross-module calls, native owner
producer closure and broader Router families remain OPEN. Receiving export,
strict parity, freshness, platform, performance and CI evidence remain OPEN.
