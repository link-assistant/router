Lift the actual pinned Serde 1.0.229 default
nongeneric named-field Deserialize generator into reusable quote/meta fragments.
Original field Type tokens, generated field Idents/Lifetimes, identifier visitors,
sequence/map visitors, missing/duplicate-field branches and source ordering are
retained. Default helpers or the actual container `deny_unknown_fields` flag are
selected; the pinned `has_flatten` helper and accepted input prove its false value
before excluding the flattened-map `format_args!` output branch.

The pinned serde_derive Cargo manifest has `default = []`. The sealed dependency
profile does not establish Cargo's complete feature union, so both disabled and
enabled `deserialize_in_place` outputs are independently composed and inspected.
Empty-field vacuous `all` selection is retained. No branch is discarded based on
the machine's platform or an assumed feature default. Syn Type/Lifetime/generic
printing, Fragment statement/match adapters, fixed Serde empty macro ownership,
standard generated attributes and error-output ownership remain separate pinned
obligations. Every selected output undergoes semantic syntax serialization and
reparse before namespace inspection; the full 330-quote/28-member provenance
inventory remains intact.

Borrowed field lifetime selection, rename/alias/default/custom codec helpers,
flatten, generics, tuple/enum payloads and other derive owners remain refused or
residual. This output grammar does not implement Deserialize, trait effects,
destructors, layouts or generated type/value namespaces. No binder hook or
namespace uncertainty flag is changed. The actual CatalogRecord complete-file
pin is SHA-256 2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5,
UTF-16 declaration span 1956..2355 and declaration SHA-256
3a3ce14fae59aa072caeee14af08b6e3810b15caccb661c9165ccab3dc43132a; the authored
whole-context case still requires genuine original library/Cargo/parent evidence
and retains neutral root bang-macro uncertainty.

The final 103-case source-output and related scope passed in Node and Bun at clean `e1f10dd8d`, with all initial and retry failures retained in `dev/log/issues/759/translator-derive-bang-verification`. No automatic bulk/project activation, generated trait execution, complete runtime parity or Rust execution is claimed.
