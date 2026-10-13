# Original bounded Clap Args source route

This frontend uses the unchanged, licensed Clap 4.6.7 and Heck 0.5.0 archives
already pinned by Cargo.lock. It audits two additional existing archive members:
clap_builder `src/builder/value_parser.rs` and Heck `src/shouty_snake.rs`. The
profile now contains 234 audited members. Original archive bytes, existing
member checksums, all 804 Router Rust files and Cargo inputs remain unchanged.

The route accepts original nongeneric module-level named structs with one to
32 `Vec<String>` or `Option<String>` fields, subject to the existing fragment
budgets. Bounded field helpers use explicit boolean/string literals; bare
`long` uses the original default casing rule. Arbitrary expressions, custom
parsers, `default_value_t`, ranges, payload/type extensions, flatten/subcommand
directives and richer documentation remain refused. Only a single plain ASCII
documentation line is translated per container or field.

The complete original source and declaration span supply associated container
documentation, including the line immediately before the derive attribute.
Original field doc comments keep their token-tree attributes and precise source
spans. Documentation period removal and the otherwise absent `long_help` and
`long_about` methods are retained. Field IDs preserve the original written
identifiers; long flags use kebab casing and value names use shouty snake casing.

Original source rules and generator function spans verify the actual Args
feature reexport and registration, field kinds, helper/default/group bindings,
type extraction, action selection, documentation and method generation.
Private fragments instantiate every selected constructor, updater,
augmentation, group, parser, method and outer-impl quote template. Both original
`raw-deprecated` output branches are retained separately and roundtrip through
semantic syntax. The resulting syntax contains two trait impls and only the
original fixed `clap::value_parser!(String)` calls.

The actual original `value_parser` declarative definition is compiled and
expanded with its original type capture. Its output remains one expression
block containing no macro/attribute syntax or exported declarations. This
expansion does not execute the parser or resolve runtime trait dispatch.
Generated builtin attributes and the Clap macro path also require separate
original context checks. An unproved sibling Clap output or generated attribute
shadow cannot bootstrap another declaration's namespace certificate.

The token-tree delimiter lookup now checks own properties, so original
`constructor` and `toString` identifiers preserve their token identity.

The whole unchanged `src/verification.rs` gains its original VerificationArgs
declaration and seven executable owners: SCHEMA, SKIP_LOG, tests, unit, AREAS,
status and results. The bounded pre-Args gate comparison observed zero to seven
executables and 30 to 20 refusals. Tests execute the original status/results
behavior and constants in emitted JavaScript and separately strict-compiled
TypeScript. These observations concern that complete source entry, not full
corpus parity or CLI execution.

The certificate retains `generatedImplBehavior` and joined `bangMacroComplete`
as false. Generator error streams, other derive owners, richer input routes,
standard matches/formatting macro contexts, Args/FromArgMatches execution and
full runtime parity remain separate obligations.
