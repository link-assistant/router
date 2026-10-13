# Original Clap ValueEnum source frontend

The additional unchanged Clap, clap_builder and clap_derive 4.6.7 archives and
Heck 0.5.0 archive match the existing Cargo.lock. Their licenses remain inside
the complete original archives. All previous eight package entries and their
197 audited members remain unchanged; the expanded profile contains twelve
packages and 232 audited members. Clap's actual Cargo dependency enables
`derive`, `env` and `string` with default features.

`derive-clap-value-enum.mjs` checks the original feature reexport, actual
`proc_macro_derive(ValueEnum, attributes(clap,value))` registration, entry and
generator module. It retains the complete quote inventory from all sixteen
audited Clap derive Rust members: 170 original quote groups. The existing quote
frontend now checks delimiter-map own properties, so an original identifier
such as `constructor` cannot become an inherited delimiter lookup.

The selected source route admits nongeneric enums with one to 128 distinct
ASCII unit variants, default Heck kebab casing, and original variant
`#[value(name="...",alias="...")]` literal helpers. Name assignments stay
literal tokens. Alias methods preserve source order. Derived names follow the
original Heck word-mode algorithm on ASCII; unsupported Unicode identifiers
retain an independent casing obligation. Variant documentation, additional
helpers, skip branches, generic parameters, payloads and discriminants remain
outside this route. Container documentation is ignored by the original
ValueEnum constructor.

Original source rules and precise generator-function spans verify attribute
parsing, kind/name/default bindings, empty documentation/deprecation sequences,
alias-method storage, Name translation, Heck word boundaries, and lowercase
output. Checked private fragments instantiate the original Name, Method,
field/deprecation, variant-list, possible-value and outer-impl templates. A
semantic syntax roundtrip and structural check retain exactly one trait impl
containing two methods, without emitted bang macros or macro definitions.
Only an actual locked derive owner in a closed original context receives this
source output. Generated `allow` and `automatically_derived` attributes receive
separate original ancestor/binding evidence; local shadows remain refused.

The complete unchanged `src/clients.rs` now retains its original ClientKind
declaration, all eight variants, literal helper names and aliases, and its
Schemars String override. A bounded clients-entry comparison against the
pre-Clap gate snapshot observed executable constants increase from one to 21
and refusals decrease from 136 to 119. The tests execute original constant
values in emitted JavaScript and independently strict-compiled TypeScript.
These entry-specific observations do not establish full-corpus coverage.

The generated ValueEnum methods are syntax evidence, never implemented runtime
traits. Full joined bang closure, error streams, complete JsonSchema behavior,
consuming receiver ownership, imported-function identity, unrelated module
resolution and full runtime parity retain their own obligations. The source
certificate keeps `generatedImplBehavior` and `bangMacroComplete` false.
