# Primitive vector return inference source draft

All implementation and cases UNRUN. This extends only the explicit new vector
source profile; existing scalar insertion and actual native-origin vector APIs
retain their original domains. Full drafting and full translation remain OPEN.

The independent source checker creates bounded function-local finite Vec element
constraints from actual checked operands. Typed Boolean/fixed-width values,
qualified operation results, checked same-module helper results and genuine
written vector types anchor the domain. Empty arrays and integer literals carry
constraints until branches, immutable aliases and return paths join. Constraints
are intersected, never widened to reconcile conflicting native widths. A literal
alone never selects a width, even if its magnitude fits only one supported row.

Deferred literal operands preserve exact values up to the native 128-bit bounds.
Only after the domain resolves are their original canonical integer constructors
called with that domain. Nonliteral values are never recast. Function-local
private variables and deferred literals must disappear before the original
program checker, meta emission, native insertion, full native ABI/census review
and complete receiving re-entry. Every local domain must resolve, including
unused locals; unresolved empty locals remain refusals. Move tracking includes
pending variables and retains the existing branch merge rules.

The bulk routing DATA reader now detects actual arrays in ordinary function
bodies as eligibility. It excludes nested function/class bodies. Neither that
selection nor a public inference helper grants source/type permission: the full
existing insertion procedure still checks the original source, runtime bytes,
source pairs, complete helper graph, native proposal and all closing fences.

Four complete before/after source equations retain lossless CST transport,
serialized/reparsed meta, inverse and exactly language then repository phases.
There is no cross-operation cache. Existing source/IR limits and case deadlines
are preserved. Cases cover all ten widths in both empty-branch orders, empty
locals and aliases, helper returns, exact extreme literals, checked operations,
JS JSDoc parameter inference, ambiguous/mixed/unsupported domains, move failures,
atomic bulk refusal and CI-only independent Rust oracles. None were executed.

Scalar conditional integer literal inference inside an array, Vec parameters,
mutation/iteration, cross-module helpers, nonempty vector lifecycle operations,
new native module creation and broader application families remain OPEN. Native
flow qualification may still refuse independently inferred source bodies outside
its finite same-element vector profile. All parity, freshness, performance,
platform, export-receiving and CI obligations remain OPEN. CI is not inspected
until every requirement is source drafted; local tests/compilation stay paused.
