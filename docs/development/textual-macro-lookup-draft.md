# Original textual macro lookup source draft

All implementation and regression source in this batch is unverified and unrun.
No tests, experiments, diagnostics, translators, regeneration, local Rust tools,
push or CI ran. Every unfinished requirement in
[the ledger](bulk-draft-requirements.md) remains open.

The complete existing pinned native resolver inputs now retain eleven whole
callbacks from `ident.rs`, `macros.rs`, `build_reduced_graph.rs` and `lib.rs`.
They include textual and module lookup, macro-use scope restoration, macro
definition collection and the actual
`disambiguate_macro_rules_vs_modularized` callback together with
`nearest_parent_mod` and `is_ancestor_of`. The disambiguation branch requires
both binding-parent records, the same nearest parent module and the modularized
binding's module to be an ancestor of the textual binding's module. A missing
record returns false. Textual lookup order alone does not resolve ambiguity.
The complete smart/delegation resolver callbacks also retain the local-inner-
macros `$crate` rewrite and delegation routes. An ordinary unqualified lookup
requires those alternate routes to be excluded through the actual caller.

Each source-fact request reopens the complete pinned profile, every full source
archive, original source inventories and licenses; checks full bytes and hashes;
serializes/reparses complete Rust CSTs; and reselects every entire original
callback through the existing token-tree function inventory. Final input rejoins
and the original eight-MiB limit remain mandatory. Private requests contain
identity only. No source/hash/owner/verdict/result cache is added across calls.

The inventory DATA API reuses the complete existing function reader with own
primitive source fields and explicit false source/namespace/runtime authority.
A matching public source digest does not establish a source owner. The native
source-fact API separately pins its entire original source closure; copied
request objects cannot select it. Its language sequence retains full original
callback/source premises, while repository rules retain the exact conditional
conclusions and open owner, hygiene, configuration and export obligations.

This draft does not resolve the architecture `types!` caller, close modularized
candidates or global exports, or prove type-prefix absence. Those require actual
caller and binding/module identities, enclosing attribute/derive behavior and
the remaining producer closure. No conditional lookup premise is a caller fact.

Three complete compiler source equations retain full original implementations,
native JS source owners, ordered language/repository rules and complete CST
inverses, joined after the production PKCE source-history leaf. Independent unrun
cases cover all complete native callbacks/CSTs, both disambiguation conditions,
fresh reads, private request/reflection refusal and public source DATA. Native
oracle source covers textual macro-use propagation and ordinary child scope
restoration; Rust remains CI-only after every same-SHA JavaScript stage passes.

Actual architecture owner/export/attribute/derive closure, all broader language
and production work, current coverage/parity, source-history and CI repairs,
receiving-export qualification and all original verification gates remain open.
