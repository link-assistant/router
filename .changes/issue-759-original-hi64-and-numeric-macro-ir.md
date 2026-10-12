---
major: []
minor: []
patch:
  - router
---

Prepare source-only generic arithmetic IR for the original `Hi64` default method, both primitive-slice implementations, and `nonzero` iterator/copy path. The selected source inventory now contains 27 unchanged pinned lexical functions/methods. Receiver tokens, generic bounds, and enclosing trait/impl source spans remain in serialized/reparsed private IR; no numeric function body is manually replaced.

Add syntax inventory for eight actual numeric macro invocations (42 methods and four associated constants) from the existing locked serde_json source archive. A reusable private associated-constant binder reads actual expanded literal tokens, retains definition/input lineage, matches source-data identities, and denies public clones or ambiguous constants. New root helpers participate in implementation freshness pins.

Six new focused cases are authored and UNRUN: two numeric-expansion inventories, two generic associated-source cases, and two original hi64/source-provenance cases. The complete arithmetic fragment family now has 24 authored UNRUN cases. No Node, Bun, compiler, numeric projection, Rust, or producer was executed. Trait/type/macro owners, primitive Copy/AsRef and iterator semantics, overflow configuration, platform selection, general Karatsuba, allocation/OOM/Drop, whole-reader equivalence, parser admission and runtime/native parity remain uncertified. The current actual float_roundtrip parser guard is unchanged.
