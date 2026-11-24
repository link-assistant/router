---
major: []
minor: []
patch:
  - router
---

Draft actual pinned Rust marker_impls Copy invocation expansion through the existing generic source token-tree matcher/transcriber and private recursive input forwarding. Original empty impl syntax, opaque ty captures, attributes, recursion lineage and source digests are retained; primitive impl bodies/types are not manually generated or resolved by spelling. Existing compressed original input and licenses are reused without duplication. Raw-pointer type grammar and multi-token transparent ident/tt type forwarding retain opaque ty capture ASTs; no pointer operations or ownership behavior is added.

Add a conservative planned-matcher FIRST/nullability type follow-set check: every nonempty prefix, repetition re-entry/separator and nullable exit suffix must belong to the actual follow set. Unknown capture FIRST sets and illegal nested/nullable suffixes remain rejected; fragment opacity and matching ambiguity checks are unchanged. Three meaningful cases are authored UNRUN, covering original20 impl syntax/21 steps, private clone refusal, and legal optional-follow versus nested/nullable illegal-follow fixtures. Relevant generic declarative regressions also remain pending; no engines, parser/projection probes, Rust or producer ran.

This proves neither Copy/Clone/lang/primitive ownership nor actual caller macro/builtin-attribute phases. Shared-reference Copy selection, mutable exclusion, allocation/default/platform/effect and whole-reader/native/parser authority remain unresolved/false. Existing arithmetic bounds and float_roundtrip denial are unchanged.
