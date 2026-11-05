# Shared borrowed-predicate operation source draft

R04 remains OPEN. The initial cohort at5b8186d7 drafted a shared description
implementation and a complete adoption proposal for the two existing borrowed
predicate families. The follow-up below installs that source into the actual
compiler parents and records their complete successor graph. Runtime/source
qualification has not been executed; all new cases are UNRUN.

The original contracts are the operation-description inputs:

- Borrowed canonical `serde_json::Value` input, one native operand, boolean
  result, no returned loan, no container, byte or tree-depth restriction.
- Borrowed standard text map, borrowed key and at most 64 static string
  literals, three native operands, boolean result and no returned loan.
  The map and its values retain their original unrestricted size domain.

`tools/translation/borrowed-predicate-operation-descriptions-20261103.mjs`
maps each original parameter role to the actual reverse analyzer's role and
the strict TypeScript declaration role. The same description derives native
arity, flattened checked-IR arity and the reverse operation DATA. Flattening
the standard-map literal slice yields two nonliteral operands and zero through
64 independently checked literal operands: a range of 2 through 66. The JSON
predicate retains exactly one checked operand.

Declaration emission preserves the complete existing `.d.mts` source bytes,
including the literal-limit declaration, comments, parameter names and layout.
The original private ABI declaration pins therefore need no replacement.
The shared descriptions are frozen DATA; fresh reverse descriptions preserve
the original ordinary mutable return shape and cannot contaminate another call.
No source, namespace, ownership, native invocation or parity authority is issued.

## Complete source proposal and actual adoption boundary

`proposeBorrowedPredicateDescriptionSources`, exported by the bulk proposal
entrypoint, retains six complete originals: both forward adapters, both reverse
adapters and both target declarations. The immutable packet is
`tools/translation/source-profiles/borrowed-predicate-descriptions-20261103/complete-source.json.gz`,
SHA256 `79745b1e3228aba61e90afcf8f26084d7cab2f9f63ac9e96b5e773d7679393ca`.
It also retains the complete shared-description implementation's creation image.

The proposal uses the actual concrete source rule registry. Its language rule
substitutes repeated operation roles and arity constants with shared-description
calls. Its repository rule adds the corresponding imports to the original
compiler adapters. Both operate on the original full source spans, with exact
occurrence counts and no overlapping overwrite. Full intermediate and final
CST serialization/reparse histories, original inverses and both whole-cohort
replay directions are retained. Declaration files participate unchanged.

The private native source ABI issuers, namespace/source frames, argument type
issuers, whole-body checks, literal validation, source closing fences and
once-only emission/interpretation order remain in their original parents.
The proposal does not replace any of these checks with a public description.
Independent source cases retain the original 1/3 native arities, 2–66 flattened
map arity, exact reverse type roles, unpaired-surrogate refusal and 64/65
literal boundary. Expected values are not generated from the new descriptions.

At the initial checkpoint, source installation and a complete guarded-parent
successor graph were still separate remaining tasks. The follow-up below drafts
both. Full receiving must still use the original whole compiler and both reverse
readers. Do not replace their source guards with a descriptor or run a copied
unguarded adapter and call that semantic receiving.

## Actual source installation and complete successor graph

Both actual forward adapters now derive native arity from the shared operation
descriptions. The standard-map emitter and interpreter derive the same 2–66
flattened operand range. Both actual reverse adapters obtain their original
role/ownership DATA from the shared descriptions, while retaining the original
argument/root/literal guards and private analyzer/checker paths. Original strict
declaration source remains byte-for-byte unchanged.

Each original private native ABI operation also obtains an invocation-local
description source restriction. It compares the complete implementation and
both original contract sources, repeats those reads during private receipt
checks and closes them after callback completion. A caught change poisons that
restriction even if the source is restored; expiry and cleanup preserve primary
failures. The restriction cannot grant native/type/body ownership, change public
project APIs or persist a verdict/source cache between operations. The fixed
three-input packet SHA256 is
`83a6a5fd0a9bb8bcc7c73c348485247e8ab4dc82bf1759edf3d444b0790fc031`.

The complete nine-parent installation packet SHA256 is
`a19f0ab5ff50ede659000d1ac42cdad9f430b2a23ba193e4528ab799eff20ef5`.
It retains the actual adapter/ABI edits, the original standard-map ABI history
consumer and source cases, plus the complete new restriction implementation.
The ABI history consumer preserves its original afterimage and accepts only a
complete known terminal successor; it separately reports the current source.

The hot source graph now drafts **361 equations across 256 paths**, preserving
all original347 equations. Fourteen appended complete source equations retain
all nine installation parents and five original case continuations, with 28
full source images totaling164939bytes. The original347 index is losslessly
archived. The separate347→361 engine history preserves the older engine images
and copied-root domains without introducing an index/hash self-reference.

New cases cover complete CST/inverse ancestry, original-index preservation,
source replay, all seven control images, the old347 receiving-root domain,
whole-input mutation/restoration poisoning, expiry, foreign private receipt
refusal and preservation of falsy/frozen primary failures. Existing complete
Router forward/reverse receiving cases now target the actual changed adapters,
including both original reverse compilers. No such case has been run for this
cohort; source graph size is not executable coverage or semantic qualification.

## Remaining R04 scope

This removes explicit source-draft duplication across two real families;
it does not close R04. Remaining work includes executed receiving qualification,
all other applicable inventory families, shared production caller proposal
generation, source-derived declaration/adaptor consistency, and independent
full receiving cases for the installed cohort. L01/L02's complete production
inventory and assignments remain open, so neither the complete operation
denominator nor an executable coverage percentage follows from this cohort.
The acceptance count remains 12/70 DRAFTED and 58 OPEN. Actual source writing
and SCM were the only implementation operations. No local tests, compilation,
translator trials, dependency installation or CI feedback inspection were run.
