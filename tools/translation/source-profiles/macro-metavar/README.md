# Original macro metavariable grammar

The complete licensed members in this profile come from Rust 1.89 revision
`29483883eed69d5fb4db01964cdf2af4d86e9cb2`. Existing token and license members
are reused without changing their archives or original-source hashes.

`macro-metavar-source.mjs` retains the actual parser, transcriber, token-equality,
and lifetime-selection functions as original token trees with exact source
spans and a lossless semantic roundtrip. Its privately issued source proof
supports a bounded `${ignore($bound_name)}` transcriber and one ASCII lifetime
token. Ignore requires the original dollar, bound identifier, and exact EOF;
it emits no token but participates in repetition arity. Actual lifetime and
forwarded NtLifetime tokens match by their original name/rawness rule.
Character literals, raw or Unicode lifetimes, other metavariable expressions,
unbound names, and incompatible repetition lengths remain refused.

The full original `common_visitor_and_walkers!(Visitor<'a>)` invocation now
expands within the unchanged declarative budgets. Every original documentation
projection and emitted literal token retains its original definition provenance.
The expansion is privately branded; copying a definition, source input,
expansion, or proof cannot establish its lineage.

This is source-token expansion evidence. It does not grant compiler feature,
owner/hygiene, enclosing namespace, visitor callback, or runtime authority.
Visitor callback selection and a complete Default derive namespace route are
separate obligations. The existing Default execution checker is unchanged.
