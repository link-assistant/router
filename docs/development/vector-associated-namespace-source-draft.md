# Qualified vector and primitive associated namespace source draft

Source only; all cases UNRUN. Source review found a shared refusal in the
primitive vector drafts: the conservative associated-call guard rejected every
macro anywhere in a function, including Router's existing source-qualified
owned vector allocation abstraction. Thus checked argument/prefix emission
could not re-enter even though each operation had its own rule.

The additive parsePrimitiveAssociatedVectorCall source parser copies the
complete existing associated-call parser. It uses the same private call
lineage, independent semantic checker, real operand/contract checks and current
Option source proof. Only this entry can select the private vector-aware lane.
The earlier parser retains its conservative behavior and no public node field
or copied metadata can enable the new lane.

Every actual macro in the complete original enclosing function is inspected.
Only the exact crate::translation_core::vec bracket allocation path is eligible,
including separated bang tokens. Its actual original parser/module association
and the existing full source-qualified Router facade proof are reissued at
parse and semantic fences. Allocation may occur after a checked scalar prefix;
proof does not depend on having already parsed the macro. Logical negation is
classified separately from macro invocation. Foreign/std/bare macro names and
local type/module/import/trait/macro declarations remain refused.

This is composition within the existing explicitly modeled Router allocation
abstraction. Native standard-library allocation internals remain untranslated;
this does not qualify arbitrary std macro expansion, generated syntax contexts,
macro-owner hygiene, attribute owners or a global namespace closure.
The host-contracts import selects the additive parser without adding a line to
the 999-line file. No type, ownership or generated-runtime check is bypassed.

Three complete source equations retain full originals, language/repository
substitution phases, complete CST and inverse evidence. Independent all-width
paired/native, checked-before-allocation, whitespace, unused containers,
logical/guarded behavior, foreign macro/type/source-byte/copy refusals and
CI-only Rust oracle sources are drafted. No translator, parser, preparer,
compiler or case has run locally.

All performance, actual application coverage, source-owner closure, generated
Span/visitor/export/type-prefix qualification, canonical/platform/reverse
freshness, receiving qualification and full Router parity remain OPEN.
This removes a drafted rule interaction; it is not verified full translation.
