# Original Clap ValueEnum source frontend

The additional unchanged Clap, clap_builder and clap_derive 4.6.7 archives and
Heck 0.5.0 archive match the existing Cargo.lock. Their licenses remain inside
the complete original archives. All previous eight package entries and their
197 audited members remain unchanged; the expanded profile contains twelve
packages and 232 audited members; the later bounded Args route audits two more
existing archive members, bringing the current total to 234. Clap's actual Cargo dependency enables
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
retain an independent casing obligation. Additional helpers, skip branches,
generic parameters, payloads and discriminants remain
outside this route. Container documentation is ignored by the original
ValueEnum constructor. Original container attributes and variant attributes
ignored by `ClapAttr::parse_all` retain their complete token syntax and spans.
Their actual owners still need the independent enclosing input/context proof;
an unknown attribute or unproved sibling Args/Subcommand never gains authority
from ValueEnum's ignore branch.

The default-feature document route now consumes original line comments and
bounded ASCII `doc` string literals. The actual `extract_doc_comment`,
`format_doc_comment`, `split_paragraphs`, `merge_lines`, `remove_period` and
default `parse_markdown` definitions supply the input/output rules. Leading
and trailing blank lines, paragraph joins, literal Markdown punctuation and
single final period removal follow the original source. The actual ValueEnum
constructor requests only the short `help` method; paragraph-long text is
retained as input evidence and does not become a `long_help` method.

Literal feature arrays from the original Clap, clap_derive and clap_builder
Cargo files supply the selected dependency feature paths from the sealed root
manifest configuration. The optional derive dependency and its empty default
feature list are retained with original spans. The selected configuration
does not enable `unstable-markdown` or `unstable-v5`. This bounded selection
does not claim whole-Cargo feature unification. Other configurations, richer
Rust literal escapes, non-ASCII doc text, block comments, configuration attrs
and actual Clap directives keep independent input/output obligations.

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

A later bounded comparison on two complete unchanged original entries admits
all eleven derive certificates in `src/subscription_usage_types.rs` and four
in the project view of `src/deploy_config.rs`. Entry refusals fall from 14 to
3 and from 80 to 69 respectively. Both original `UsageProvider.as_str` and
`ProviderKeyMode.as_str` pass the existing source/Copy receiver checks and
execute in emitted JavaScript and separately strict-compiled TypeScript;
the three original deployment array constants also execute. These are manual
methods automatically lowered from their original tokens. Generated ValueEnum
trait methods remain unimplemented. SubscriptionProvider imports, format
macros, other CLI derives and unrelated original type/trait effects remain
explicitly refused.

The generated ValueEnum methods are syntax evidence, never implemented runtime
traits. Full joined bang closure, error streams, complete JsonSchema behavior,
consuming receiver ownership, imported-function identity, unrelated module
resolution and full runtime parity retain their own obligations. The source
certificate keeps `generatedImplBehavior` and `bangMacroComplete` false.
