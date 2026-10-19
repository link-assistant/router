# Original ClientKind method source admission

With the source-owned Schemars and Clap derive contexts, the unchanged complete
`src/clients.rs` module now checks `ClientKind::legacy_name` and
`ClientKind::from_str_opt`. Both original bodies generate JavaScript and
independently strict compiled TypeScript; the fixtures exercise all eight
variants, canonical/legacy spellings, trimming, ASCII case handling and invalid
input domains. No Rust body or Cargo input is rewritten.

The Copy receiver route already existed. Its original `impl fmt::Display`
blocked Copy because the non-Copy-affecting trait profile accepted only the
literal `std::fmt::Display` path. The profile now re-resolves direct original
standard module/trait imports against the pinned standard declarations before
accepting their aliases. It retains closed source-scope, shadowing, conditional
and Drop checks, and grants no Display implementation or trait dispatch.

The parser's `value` parameter also collided with the unclassified imported
`toml_edit::value`. The new 68,207-byte unchanged locked package source profile
checks the original public function declaration and root reexport, selecting
that identity only through the genuine current Cargo dependency proof. It
permits lexical function-name shadowing without TOML calls, data layouts,
constructors, globs, changed locks or public-cloned proof admission.

The combined four-original-module probe retains 21 executable constants and
adds two checked methods; its refusal count changes from the derive-only 119
to 116. This is bounded original-source coverage, not complete runtime parity.
`integration` still refuses the enum-to-usize conversion; dependent command,
display, dialect and canonical-name methods remain refused. The three optional
integration-field helpers retain their reference-depth obligations. Complete
corpus regeneration, native parity and the full gate belong to integration.
