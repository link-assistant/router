Add the owned compatibility core's `Str` alias for Rust's primitive UTF-8
string slice and bind complete qualified shared references to the translator's
existing checked borrowed-text representation. The source-bound facade and full
primitive leaf pass through serialized/reparsed lossless CST before the type
binding; retained token spans and elided or static lifetimes continue through
independent checked semantic serialization and the existing borrow checker.

The coordinated facade, Host hook and affected-signature CST migration are owned
by batch 311. This batch adds the primitive leaf, borrowed-reference adapter,
eight whole integration cases (60 seconds each, strict TypeScript children at
20 seconds), and independent native oracle source. Named lifetime integration,
mutable references, unsized values and unknown or altered source bindings remain
unsupported. The library implementation of `str` is intentionally untranslated;
this is an explicitly owned API adoption, not an implicit standard-prelude proof.

Source draft only: JavaScript, Bun, strict TypeScript and the Rust oracle are
UNRUN here. Rust is CI-only after the full JavaScript gate for the same revision.
The unchanged static error-classifier body was already a bounded legacy positive;
its core-path fixture does not establish a new application coverage gain. Broad
application signature migration and coverage measurement remain separate work.
