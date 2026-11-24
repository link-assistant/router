# Original mapped standard bodies

`Result::map` and data-producing `Option::map_or` select complete Rust 1.89
members from the retained core archives, parse their original match bodies and
check the resulting ordinary constructor, match and let IR. The member reader
balances the generic prefix before reading parameters, so an inline
`F: FnOnce(T) -> U` bound cannot be mistaken for `(self, op: F)`.

The caller must be an unchanged privately captured original source call. The
checker retains canonical input, output and error arguments, constructor field
identities, primitive identities and ownership. Constructor IR with only a
monomorphic data name recovers generic arguments from its actual checked
registry inside this source-owned route. A portable output hint supplies no
namespace or ownership authority.

Payloads and results require original primitive/shared-reference Copy evidence,
closed canonical Option/Result layouts with recursively checked payloads, or
private original nominal Copy/no-Drop evidence. Shared references copy the
reference, with precise depth and source lifetime origins; they grant no pointee
move, Drop or pointer-equality authority. Captured mutable bindings, captured
writes and unproved owned captures remain refused. Immutable aggregate domain
guards reject proxies, getters and malformed input layouts before field reads.

The source match invokes the checked callback once on the selected Some/Ok arm.
`map_or` evaluates its receiver and eager default once before the source body.
Private frame issuance, complete caller signature/body finalization, layout
rechecking, re-parsing and exact emitter renaming reject changed proofs,
callbacks, source bodies or caller metadata. A fresh process reconstructs the
route from original source. Serialized metadata alone cannot recreate a private
issuer. The old iterator and scalar `map_or` routes retain their existing checks.

The unchanged whole `src/model_contract.rs` probe retains all three selected
owners as refusals: the two response validators reach unproved owned String and
nominal error payloads; `ModelSelectorKind::from_catalog_value` reaches its
independent private Copy/no-Drop obligation while the generic Deserialize impl
remains uncompiled. `ok_or_else` and consuming receiver dependencies remain
refused. The bounded module probe has no complete original-owner gains. This
batch does not establish complete standard-library translation or Rust parity.
