# Primitive Option compatibility draft

Thirty-four explicit interfaces now have matching native and JavaScript source
drafts over `bool`, `u64`, `i64` and bounded scalar text. They cover Some/None,
presence predicates, eager fallback, unwrap, expect and primitive eager and/or.
Text unwrap/fallback operations intentionally produce owned text. These closed
interfaces are data for later source/type/loan qualification, not public permits.

Runtime inputs require exact own-data variant fields and primitive payloads.
No input getter or Proxy trap is needed to reject malformed values. Constructors
return fresh frozen values; false, zero and empty Some payloads keep their actual
discriminants. The text bound is the existing one-MiB UTF-8 core envelope.
The matching native standard Option implementations remain library internals.

Native root preparation now preserves the entire prior root, original text
preparer implementation and adjacent CST histories through a separate complete
source copy. Independent Rust oracle source covers primitive extrema, false and
empty Some values, owned text after the source is dropped, and panic/boundaries.

The [translation integration draft](primitive-option-translation-draft.md) now
adds actual internal callers in both directions, interpreters, emission and bulk
assets and closed primitive public inputs. General optional operands,
callback/mapping and Result families,
automatic method adoption and production synchronization remain open.
All independent runtime,
declaration, source-history and native oracle cases remain unrun. No coverage,
translation, parity, compiler or receiving qualification is claimed.
