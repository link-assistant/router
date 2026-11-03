# Mutable scalar locals through immutable statement substitution

SOURCE DRAFT ONLY / UNRUN. Full translation is unfinished; accounting stays
12/70 DRAFTED,58 OPEN and executable production coverage UNKNOWN. Both actual
native reader successors are complete source proposals, not installed source.
Original readers, existing source guards, old APIs and archives remain intact.

## Shared behavior

The additive `lowerOrderedMutableScalarStatements20261104` copies the complete
original early-return normalizer. A bounded invocation-local scan selects only
bodies containing mutable declarations or assignments. Every other original
body delegates directly to the unchanged early-return rule, retaining its exact
result and caller charge sequence. Existing100000-work/160-depth limits remain.
No source, native body, ownership fact or result is cached across operations.

Language substitutions represent each actual mutable scalar binding by the
latest fresh immutable variable. Assignment evaluates its right-hand expression
in the current environment, emits an eager fresh `let`, then updates only that
binding's invocation-local environment entry. Even discarded or later replaced
assignments retain checked arithmetic failures at their original positions.
Helper arguments stay eager/once-only and helper locals cannot mutate caller
state. Complete native helper body/import/type checks remain prerequisites.

A conditional continuation carries updated outer mutable bindings from its own
arm. It projects only the enclosing mutable names, retaining their exact types;
branch-local declarations stay in that branch. Nested partial branches and early
returns retain their original continuation behavior. Each branching initializer
or assignment receives independent environments. Empty branch fallthrough
establishes its environment before calling the continuation. No phi, assignment,
mutable variable or helper-call opcode reaches the existing semantic IR.

Internal mutability markers are removed from emitted variable/statement DATA.
The repository phase emits only the existing immutable `let`, `if`, `return`
representation with collision-free fresh names. Existing validators, semantic
serialization/reparse, target emitters, interpreters and Rust inverse must still
independently accept the complete result; this rule issues no native permission.

## Actual native reader proposals

Both `owned-core-source.mjs` and `owned-vector-candidate-source.mjs` proposals
extend only the existing private ordered scalar mode. Other source modes keep
the original immutable declaration domain. New mutable declarations must be
block-scoped `let`, initialized, ordinary bound identifiers and actual root-free
Boolean or fixed-width integer values. Original declaration/type/paired-source
checks remain. `var`, unsupported annotations/initializers, ownership aliases,
vector state and unknown effects remain explicit refusals.

An assignment must be an ordinary expression statement with simple `=` and an
identifier left side. The original checker must resolve that occurrence to the
exact existing mutable declaration symbol in the actual lexical environment.
The right-hand expression runs through the original reader and must retain the
same scalar type and null ownership root. Constants, parameters, undeclared,
branch-local-outside-scope, property and compound assignments refuse. The vector
reader must not retain an immutable constant-folding fact for a reassignable
local; inferred vector/choice state remains outside this scalar contract.

Transient source descriptors select immutable substitution before the original
validators and private item issue. Complete current source/native reissuance
and whole Rust reproduction still apply. Canonical Rust can express the same
behavior through fresh immutable names; unchanged inverse restoration retains
the complete original JavaScript helper network, including its mutable spelling.
General edited helper-network decomposition and wider mutation are still gaps.

The proposed ordered source guard retains all original eight inputs and appends
the copied mutable normalizer as the ninth. Original failure poisoning, closing
fences, exact primitive/frozen primaries and cleanup remain. Complete historical
source adoption must precede installing these reader proposals. No public mode
flag, source label or saved hash can replace that original private context.

## Complete source and independent cases

Packet `source-profiles/ordered-mutable-scalars-20261104/complete-source.json.gz`
SHA `b1e1e2c83ec432d3072b0d410e08a42689c9e103875c47f0db2a9694521097a9`,
198602 compressed bytes, retains both complete reader originals/successors,
one complete original normalizer/copy and three creation/case sources. Language
then repository substitutions retain every intermediate whole source, serialized
and reparsed CST, full inverse and counted occurrence. The separate nine-input
archive SHA is
`8d6d8c4912bad515f11694a9443221fa276ea048b26e707ac50dcf8326810055`.
All prior eight-input sources and archives remain unchanged. The native hot
source-history index remains482 equations/276 paths; no cap has been raised.

Independent DATA cases draft assignment ordering/failure, both branch tails,
nested branch state, local isolation, early return, helper scope, branching right
hand sides, Boolean values, all ten integer width boundaries, unchanged original
charge/result behavior, long flat blocks, fresh-name collision prevention,
malformed writes, exact caller primaries and recursive-helper refusal. Native
receiving source drafts both actual readers, paired and unpaired source, checked
runtime evaluation, source network restoration and invalid syntax/domain writes.
Source cases retain all complete proposals and intermediate CST inverses.

All cases, compiler/parser/translator operations and CI feedback remain UNRUN /
NOT_INSPECTED. Native receiving cases require actual reader/fence/history source
adoption; they are intentionally not evidence that current installed APIs accept
mutable code. No small mutable helper qualifies complete Router translation.
Loops, references/owned mutation, general writes, recursive function emission,
full application adoption and every other open requirement remain unfinished.
