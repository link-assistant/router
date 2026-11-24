# Unrestricted borrowed standard-map predicate core

This source-only core supplies the behavior needed by the existing
`openai::query_stream_requested(&BTreeMap<String,String>)` without collecting or
converting that map into the separate bounded opaque carrier. The native leaf
borrows the standard map, looks up one key and compares its value with at most64
literal alternatives. The matching JavaScript leaf uses genuine Map internal
slots and captured get/has operations. It never iterates the map, traverses an
unused value, copies entries or limits collection cardinality/value bytes.

Both implementations return only bool. No borrowed text escapes, so this
predicate does not need to assert that an unobserved JavaScript container is a
fully validated Rust string map. Key/literal strings must be scalar UTF8 text;
the literal array is bounded dense own DATA. Present nontext selected values
refuse. Nonmatching text is compared directly, including very long values;
the leaf does not scan a value merely to return false. Successful matches are
against independently checked scalar literals. Rust's typed standard-string
map input domain and the larger safe JavaScript observation domain remain
distinct; this lookup is not a whole-container conformance certificate.

The library internals are intentionally untranslated matching abstractions.
The JavaScript function, strict TypeScript declaration and Rust leaf have
independently written semantic/boundary source cases and a CI-only native oracle.
The cases include5000 entries and an unused value beyond1MiB, true/1/false/empty,
exact Unicode versus normalization,64/65 alternatives, structural/proxy maps,
subclass lookup/iteration overrides and effectful literal descriptors. No test,
compiler, translator, parser or Rust invocation has run during this draft.

Actual Rust std/map/String identity, JS/TS canonical native symbols, checked
literal predicate selection, meta serialization/reparse, both emitters,
interpreters and independent whole-caller reconstruction remain registration
work. The native leaf is not yet exported by the crate root, no application
signature/body is changed, and no new function is counted translated. A source
spelling or successful runtime lookup cannot supply those private facts. The
future reusable language rule should represent lookup plus pure literal
membership; repository rules should select this exact core and local formatting.
The old4096-entry/1MiB opaque-map APIs and their refusals remain separate.

All execution and receiving/runtime/strict-TS/native qualification are UNRUN.
This advances the core portion of the real application adoption path, not a
closed O02/B03/F01/V02 requirement or complete synchronization claim.
