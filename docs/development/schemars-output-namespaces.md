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
