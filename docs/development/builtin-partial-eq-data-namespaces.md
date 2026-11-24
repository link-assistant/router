# Original PartialEq data namespace closure

The selected builtin issuer now follows both original Rust 1.89 PartialEq
implementations. The first TraitDef emits the empty StructuralPartialEq Impl;
the second emits one associated `eq` function. Both complete original literal
recipes retain their private source profile, lexical order, field slots and
spans. The plural literal reader does not slice or reissue source fragments.
The existing exactly-one reader still refuses ambiguous recipes.

The pure route accepts bounded nongeneric named/unit records and nonempty unit
enums. It preserves the actual original invocation, source header, field types,
visibility-to-type spans and registered helper ownership. Conditional fields,
unknown helpers, inactive/shadowed owners, generics, unions, field defaults,
type macros, enum payloads/discriminants and repr/packed layouts remain refused.
Raw-pointer field projections remain outside the selected route.

For records, the original compiler's `maybe_scalar` source recipe selects scalar
symbol syntax before compound fields, preserving each subsequence's order.
This flag supplies no primitive-type, Copy or runtime authority. Actual shared
field projections pass through the original immutable reference-peeling
recipe, then source-owned Eq and And binary constructors. Empty fields produce
the original true literal. Nonpacked field expressions contain no Block, so
the source block-parenthesis branch is not selected.

For a one-variant unit enum, the original EnumMatching branch has no fields and
returns true. For multiple unit variants, the original Unify branch generates
two immutable `LocalKind::Init` discriminant locals, followed by their equality
expression. The intrinsic's path comes from the original def-site `std_path`
and `call_intrinsic` recipes. No numerical enum representation or intrinsic
runtime behavior is inferred. Payload and empty-enum branches stay independent.

Every selected expression, local pattern, statement, Block, associated Fn and
Impl wrapper follows the pinned positive AST schema and original builder
recipes. Expr/Local/Block token streams remain absent. Structural output has
zero associated items and Const::No; equality output retains both constness
outcomes. Original builder-meta execution refusals remain explicit. The route
grants no formatting/equality execution, type/value namespace completeness,
Copy, no-Drop, ownership, reference identity or const eligibility.

On this worker's unchanged whole `src/model_contract.rs`, six PartialEq owners
close across the unit enum and five records, including the nine-field truth
descriptor and three genuine Serde helpers. Actual owners remain 46; selected
outputs change from 22 to 28 and residuals from 24 to 18. These counts exclude
the independent Clone and Default successor branches. Bang scope remains
unresolved. Existing original functions, methods and runtime refusals remain
independent. Ordinary source matches execute through emitted JavaScript and
separately strict-compiled TypeScript; generated equality does not execute.

Copied/refrozen/getter/proxy/foreign profiles, source/recipe/header mutations,
helper shadows and inactive inputs cannot issue private namespace proof.
Fresh processes reject serialized proofs and reconstruct from actual sources.
