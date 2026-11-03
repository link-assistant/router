# Shared borrowed-predicate operation source draft

R04 remains OPEN. This cohort drafts a shared description implementation and a
complete adoption proposal for the two existing borrowed predicate families.
It does not install the proposed compiler parents, qualify a compiler source
successor or establish executable translation. All new cases are UNRUN.

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

Installation is deliberately a separate remaining task: append complete source
successor equations for the actual guarded parent graph, preserve every old
image and route staged sources through the original whole compiler and both
reverse readers. Do not replace their source guards with a descriptor or run a
copied unguarded adapter and call that semantic receiving. The existing hot
source graph remains 347 equations over 247 paths; this uninstalled proposal
does not increase that graph or its qualified coverage.

## Remaining R04 scope

This removes one explicit source-draft duplication across two real families;
it does not close R04. Remaining work includes actual qualified installation,
all other applicable inventory families, shared production caller proposal
generation, source-derived declaration/adaptor consistency, and independent
full receiving cases for the installed cohort. L01/L02's complete production
inventory and assignments remain open, so neither the complete operation
denominator nor an executable coverage percentage follows from this cohort.
The acceptance count remains 12/70 DRAFTED and 58 OPEN. No local tests,
compilation, translator trials, installs or CI feedback inspection were run.
