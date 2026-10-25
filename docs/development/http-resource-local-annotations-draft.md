# Original local annotation and type-wrapper draft

Actual identifier declarations now accept a written type as an obligation over
the independently checked initializer. Closed native domains and genuine current
operation-derived aliases remain required. Local types may select an integer
literal representation, which still requires its exact native bounds and all
later operation/ownership checks. Type annotations never turn one value domain
into another. Channel destructuring annotations remain refused.

The source rules retain a canonical expanded JSDoc assertion around a typed
initializer when removing TypeScript syntax. This preserves a real signed native
domain even for an otherwise unconstrained positive literal. Original JSDoc
locals and parenthesized assertions are checked too; aliases in emitted comments
expand before their declarations are erased. Both compiler AST sources were
reviewed at official TypeScript v5.9.3: [public JSDoc type lookup](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/compiler/utilitiesPublic.ts)
and [JSDoc ownership and host traversal](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/compiler/utilities.ts).
No parser or translator was run to infer that behavior during drafting.

`as`, prefix assertions and `satisfies` use the same original native type reader
and complete value checker. The target keeps a checked JSDoc assertion and the
original full CST inverse. Non-null wrappers retain the original value domain;
nullable value domains remain refused. Unknown/any casts and unsupported types
cannot supply permission. Ordinary borrowed-argument conversions through more
complex wrappers retain their conservative refusals.

At coincident native boundaries, the original erasure writer applies a consuming
replacement before an insertion at that same start, preserving wrapper nesting.
Positive-width overlapping edits still fail. Nested type wrappers, local
annotation insertions and unchanged source bytes therefore compose without
bypassing the original source transport or independently checked semantic meta.

Complete prior sources and both language/repository rule sequences are retained.
Independent JS, strict TS, native inverse, alias, nested-wrapper, range, forged
meta and refusal sources are drafted and unrun. No compiler diagnostics, tests,
experiments, preparers, translation, regeneration, local Rust tools or CI ran.
General structural types, casts that change native domains, shadowing, producer
closure, production parity and every unfinished bulk requirement remain open.
