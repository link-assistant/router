# Original Schemars output prerequisites

The retained Rust1.89 `source_util.rs` supplies the complete original
`module_path!` function. Its empty-input branch obtains the expansion module
path and returns `MacEager::expr(cx.expr_str(...))`. The retained builder writes
a string token into `ExprKind::Lit` with empty attributes and no token carrier.
The original literal visitor has no child invocations or namespace exports.

The pure macro reader keeps complete qualified source calls, their absolute
root flag and lexical spans. It selects empty `core::module_path!` and bounded
`core::concat!` inputs containing actual string tokens or the exact nested
empty module-path call. The original concat helper eagerly expands each input
expression, then accumulates string literals in source order and uses the same
literal constructor. Unknown/effectful calls, other nested macros, non-string
inputs, arguments to module-path, invalid bounded escapes and incomplete
Unicode scalar strings retain refusals. Macro-like text inside an opaque
string token cannot become an item or invocation.

These source candidates do not certify caller macro bindings, def-site module
identity, decoded string values, a complete Schemars output or trait behavior.
The eventual original JsonSchema issuer must separately join its actual
private invocation, helpers, every generated template and every macro owner.
No generated trait implementation, Copy/no-Drop or const operation executes.

The append-only source profile verifies the complete new compiler member,
reuses unchanged original constructor/parser/expander archives and retains
both Rust licenses. Source rules and complete function spans remain evidence;
public hashes, copied candidates or caller-supplied source plans grant no
private authority.

The genuine derive dependency issuer also retains the exact actual Cargo
manifest and lock strings in a private WeakMap. Its accessor returns frozen
source data only. Independent issuances retain separate objects; repeated
access to one issuance preserves identity. Copies, proxies, getters and forged
carriers cannot select those bytes. The existing JSON issuer validates the
retained inputs and its own archives, preserving its separate private brand.
No public digest can replace this source handoff.

Typed `parse_quote!` and `parse_quote_spanned!` templates use an explicit opt-in
inventory mode. Both original Syn declarations must match, including forwarding
the span before the actual `=>` separator. Default inventories, counts and
digests remain unchanged. The opt-in retains each complete source template and
the same private compiler brand; it does not execute Syn parsing or certify an
output namespace. Schemars' actual `get_doc` template retains its qualified
concat call and opaque string arguments.

The actual JsonSchema registration independently declares `schemars`, `serde`,
`validate` and `garde` helper names. Nested Serde/Schemars joins now retain its
genuine declaring owner as well as any actual Serde sibling owners. They use
the existing private complete invocation and ancestor checks. This is helper
registration evidence; unsupported helper behavior and generated bang outputs
remain separate obligations.

The pure Schemars data candidate retains leading outer line docs after the
preceding complete original item. It keeps their comment source and lexical
spans instead of extending the derive invocation or manufacturing attribute
source. Locked proc-macro2's original outer-doc branch constructs `doc =`
string tokens at the comment span; locked Syn parses those outer attributes
before declaration visibility. Inner and block docs remain outside this
bounded attachment route. Explicit attributes and field line docs retain their
original source independently.

For named fields, the candidate retains both the existing visibility-to-type
definition span and an additional Syn token span beginning at the first field
attribute. The original Syn Field parser and printer establish attribute,
visibility, name, colon and type order. This is an input candidate, not a Rust
Span identity or namespace capability. Only the private output issuer can join
it to the original module and derive invocation.

The selected output route now instantiates the complete original Schemars
anonymous-const/JsonSchema impl quote. Bounded named structs preserve field
subschema calls, source-ordered property insertion, each independent default
and predicate branch, and actual doc TITLE/DESCRIPTION definitions and metadata
mutators. Externally tagged unit enums preserve the original Map construction
and source-ordered name pushes. ASCII snake-case names follow the retained
original Serde-internals table and branch. Identifier value recipes remain
restricted to ASCII; opaque docs retain bounded Unicode scalar strings.

Each generated core concat/module-path call joins its pinned expression
constructor proof to the genuine original caller. Named creators and optional
default serialization expand complete original Schemars macros, their actual
private serde_json reexport, and all original JSON rules. The explicit 37-rule
budget retains the whole json_internal definition; the engine default remains
32. Nested inputs retain private parent expansion lineage. Declaration headers
and all generated attributes remain evidence rather than public authority.
Unknown nested macros, configuration, helpers, payload enum layouts, explicit
discriminants, custom serialization, flattening and generic inputs refuse.

The unchanged complete model_contract source retains 46 original derive
obligations. On the hydrated Main source baseline, selected outputs increase
from 40 to 46 and residual outputs decrease from six to zero. All six
JsonSchema invocations close their bang-output obligation. The existing
source-owned Copy and const match routes then admit the original
`ModelSelectorKind.permits_resolution` method: four methods become five,
while the two executable functions and two generated methods remain unchanged.
All 19 remaining refusal records are identical to the baseline after removing
that method's prior refusal. These are complete standalone-source observations;
whole-library admission remains a separate canonical check.

The original four-variant predicate executes in JavaScript and independently
strict-compiled TypeScript. Its runtime authority comes from the existing
original Copy/const match proof. This JsonSchema route authorizes no schema
methods, default/predicate callbacks, serializer, formatting, allocator,
Copy/no-Drop or const behavior. Ordinary matches also execute after the
namespace join under their independent checked body contracts.

Source function syntax is reused only by its genuine frozen dependency source
identity. Binding inputs are reused only by the genuine immutable derive
context; every private invocation, source module, helper and shadow check still
runs. No parser mutable maps or semantic body success are cached. Copies,
foreign contexts, altered sources, getters and serialized evidence cannot
reconstruct authority without genuine original issuance.
