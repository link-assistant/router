# Schemars type override confinement

`derive-schemars-with.mjs` translates the bounded `#[schemars(with="String")]`
type-input route using the unchanged, licensed Schemars 1.2.2 and Syn 3.0.5
archives already identified in this directory's manifest. It shares the
macro-free nongeneric TypePath parser with original derive generic defaults.
Container, field and variant helpers retain their original literal values and
type token spans. References, generics, macros, expressions and comments remain
outside this input profile.

After a sealed locked `schemars::JsonSchema` owner is resolved, the derive
footprint attaches a sealed output-confinement proof. Twelve actual source-token
rules verify the Syn type import, parser import, `WithAttr` type binding,
container and field/variant parser branches, literal input branch, generic
literal parser call, Syn TypePath parser, output `WithAttr` owner binding, and selected
`WithAttr::Type(ty) => (ty.clone(), None)` output branch. Each rule records the
original package, member checksum, precise source span, span checksum and every
matched token. Archive identity alone does not establish this behavior.

The output records the cloned type syntax and zero helper definitions. It
confers no type-owner resolution, complete derive output, bang closure,
`JsonSchema` execution or runtime parity. Unknown type paths can be confined as
syntax while their schema implementation remains unresolved.

The tests inspect the complete unchanged `src/clients.rs` and prove its actual
`ClientKind` String helper confinement. This Schemars batch alone leaves Clap
`ValueEnum` and `value` helpers requiring independent original source proofs;
the later Clap source frontend supplies those bounded input/output proofs.
This Schemars batch adds zero whole original modules by itself. A fixture
with the same type override independently executes its borrowed string helper
in emitted JavaScript and strictly compiled TypeScript. Node and Bun both run
the original-source, adversarial, sealed-proof and nearby derive regression
tests without a Rust build.
