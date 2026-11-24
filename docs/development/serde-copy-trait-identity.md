# Serde trait identity beside Copy layouts

A lifetime-only manual `serde::Deserialize` implementation can coexist with a
separately proved derived Copy layout. The private source classifier proves the
actual trait identity and monomorphic target; it supplies no Deserialize
execution, generated Copy implementation, field move or Drop authority.

The locked original Serde and serde_core archives provide both facade routes:
`not(docsrs)` reexports serde_core's trait, while `docsrs` exposes the original
local core declaration. Both require the original `pub trait Deserialize<'de>:
Sized` declaration, exact reexports, module paths and literal private-include
namespace inputs. The source reader observes the actual unique empty
`crate_root!` arm and its complete transcriber. It selects literal declarations
outside nested definitions. The nested `tri!` variables remain unresolved, and
the existing full declarative expansion failure is preserved. No complete
external namespace or full macro expansion is certified.

Only a genuine immutable original resolver scope set can accompany the private
owner seal. The complete native map must retain those exact scope objects.
Source header, module bytes, target, lifetime binder and trait alias identities
are rechecked. A local serde/Deserialize/Drop declaration, a conflicting serde
alias, unresolved type scope, additional type/const generics, cfg/unsafe output,
nested impl, or unresolved body macro retains the Copy refusal. Public hashes,
serialized/refrozen dependency proofs and copied owner records cannot issue it.
All ordinary Copy and Clone derive, layout, field and implementation checks
remain necessary.

The unchanged whole `src/model_contract.rs` now admits two additional original
methods in the bounded entry probe: `ModelSelectorKind::from_catalog_value` and
`ModelSelectorKind::as_wire`. Emitted JS and strict TypeScript exercise the
original catalog synonyms, fallbacks and four wire spellings. Generic
Deserialize remains refused. `permits_resolution` reaches an independent
`matches!` namespace obligation; `ok_or_else`, owned String and nominal error
routes remain separate refusals. Whole-library admission and complete Rust
parity still require the coordinator's corpus review and gates.
