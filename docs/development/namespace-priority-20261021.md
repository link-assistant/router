# Original external trait namespace failures

Status: source diagnosis only; the ten published positive cases remain failing.
No namespace repair, receiving tests, performance qualification or Rust execution
is claimed here. Original test bodies, positive expectations and deadlines remain
unchanged.

The [compressed source receipt](namespace-priority-20261021-source-receipt.json.gz)
retains all ten complete original failure blocks from the completed CI cycle at
`4ed3325bee3156e6c36082c2fbd26d7a53f01535`, the complete cycle receipt, package
identity, exact rejected source spans and compiler/test source hashes inspected
at `e5cfccf20a35042fe81a16e9627f2fe40065535d`. It is diagnostic data and supplies
no executable or namespace authority. Its SHA256 is
`536b9165eff39590f9561e0f7ee1081a633c089105d0ec2eb94ca72fb7d4cd12`.

The published errors comprise six cases in
`external-trait-default-context.test.mjs` and four in
`external-trait-sources.test.mjs`. Nine throw
`original outer item has an unproved attribute producer`; the checked identity
caller reports the same error inside its refused function. The first common
source rejection is the complete pinned `base64` 0.23.1 package's
`src/engine/mod.rs`, SHA256
`6ce97ed46c6548e97e45d5b67ad41a2028ff2353f0311ed32317e9fe3b83532b`:

| Original line | UTF-16 span | Sibling declaration | Actual derives |
| --- | --- | --- | --- |
| 490 | 18105–18517 | `DecodePaddingMode` enum | `Clone, Copy, Debug, PartialEq, Eq` |
| 501 | 18571–18814 | `DecodeMetadata` struct | `PartialEq, Eq, Debug` |

`external-trait-sources.mjs` checks every original outer item before following
the exported `Engine` route. Its `originalNamespace` therefore rejects these
sibling derives before inspecting `Engine`'s members or `Send`/`Sync` owners.
A small native original-source census confirmed those two rejection candidates
in the root and engine files. Root conditional lint alternatives already pass
`originalConditionalNamespaceAttribute`; adding lint spellings does not address
this failure. The sparse worker checkout omits `rust/Cargo.toml`; the census
read its exact `HEAD:rust/Cargo.toml` bytes through Git, keeping the root workspace
manifest separate from the original crate manifest.

The missing proof joins are concrete:

1. Each sibling invocation needs a private original owner and complete enclosing
   output for every actual derive. A registered builtin name alone does not
   authenticate its original ancestor scope or sibling producer effects.
2. `derive-footprints.mjs` requires closed original attribute/import scopes.
   Its ordinary module closure rejects unknown conditional items; the requested
   ancestor path only closes its supported conditional module cases. The source
   plan in `derive-ancestor-attribute-scope.mjs` explicitly retains unresolved
   global bang effects and unknown child contents.
3. The optional external-default context refines one exact root `no_std`
   predicate using `std` only. It deliberately leaves attribute, namespace and
   prelude authority false. It does not resolve every dependency feature,
   target, test flag, tool owner or derive producer.
4. `createToolAttributeContext` requires complete active ancestor type scopes
   before issuing `rustfmt::skip`. The architecture census in
   `primitive-import-roles.mjs` proves a non-trait candidate property and reports
   `namespaceComplete: false`. It cannot prove absence of a competing `rustfmt`
   type prefix in a glob import or supply tool ownership.

A reusable repair needs a privately issued, name-specific export and producer
closure: authenticated complete source views; all unresolved cfg alternatives;
the actual named and glob export routes; independent enclosing-output proofs
for every producer; and original ancestor macro, type and tool owners. The
language sequence must establish that closure before a repository sequence can
join the exact external package/caller. Public metadata, CST reconstruction,
token-name censuses and modeled Cargo input roles cannot supply these proofs.
The old two-argument external-trait route and std-only optional context remain
separate domains; the new modeled library context still refuses the unresolved
namespace.

The earlier packet `router-builtin-enclosing-namespace-717-source-v1` was checked
as a candidate only. Its own final source review scopes its optional Debug
enclosing format separately from the legacy path. Current source already
contains its private backend-dispatch repair. Installing that old packet over
the evolved compiler or promoting its source-only flags would not close the
external ancestor/tool obligations above.
