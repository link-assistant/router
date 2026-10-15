# Original dependency namespace inputs

These are complete, checksum-locked source inputs for a future bounded namespace
consumer. They issue no private proof and change no resolver or admission path.
The existing `toml-value-namespace` archive, manifest and selector are unchanged.
`manifest.json` records every regular member, both license files, and the original
Router Cargo manifest/lock identities. The existing toml_edit archive is referenced
in place; the newly acquired toml_datetime archive is its original crates.io bytes.

The actual source route for the original `src/clients.rs` import is:

1. Router's manifest selects `toml_edit = "0.25"`; Cargo.lock selects
   `0.25.15+spec-1.1.0`. Its normalized manifest declares a normal library,
   `build = false`, Rust edition 2024, and default `parse`/`display` features.
2. toml_edit `src/lib.rs` declares unconditional `mod item;` and, at line 119,
   `pub use crate::item::{Item, array, table, value};`.
3. `src/item.rs:431` declares the complete unconditional public generic function
   `value<V: Into<Value>>(v: V) -> Item`, whose original body constructs
   `Item::Value(v.into())`. This is function identity, without call authority.
4. The same crate root also has `pub use toml_datetime::*;` at line 127. That edge
   must participate in a proof that importing the selected name cannot also
   import an attribute macro. A known function does not establish that absence.
5. The locked toml_datetime `1.1.1+spec-1.1.0` root reexports the five nominal
   items Date, Datetime, DatetimeParseError, Offset and Time from `datetime`.
   Its conditional public `de` and `ser` modules, builtin derives and original
   attribute effects still need checked source confinement.

Both roots contain `cfg_attr(docsrs, feature(doc_cfg))`. The datetime root also
contains `cfg_attr(all(not(feature = "std"), not(test)), no_std)` and alloc/serde
conditions. toml_edit has parse/display/serde/debug/unbounded branches. The two
retained manifests give original feature edges, not a complete feature-unification
proof for the original Router dependency graph. The docsrs/test conditions and
unexamined dependency feature edges must not silently become false. Original
builtin derives, doc/include_str attributes, and the local visit macro expansions
also need an exact source effect bound wherever they can affect an exported name.
The source inventory alone does not discharge any of those obligations.

A reusable consumer should authenticate the complete archive/member selection
against the genuine Cargo dependency issuer, then retain the original module
graph, condition/feature context, import aliases, visibility and all contributing
attribute/expansion outputs. It should issue a private proof for one selected
original import path and the namespace dimensions actually closed. It must not
turn the old public function descriptor or an archive checksum into a complete
external module table. Unknown globs, attributes, output constructors or conditions
must remain residual; copied certificates and another analysis's source graph
must not inherit authority. Any caching may retain immutable source parsing only;
it must not substitute public digests for private context identity.

For serde_json Default, the same original source graph and condition machinery
could provide prerequisites. It would still need the original core prelude/trait
owner and generated payload output proofs. A textual `impl Default` header is
not a checked trait identity. There is no JSON Default or ClientKind runtime gain
from these retained inputs. Complete original library translation and the next
meaningful Node/Bun consumer checks remain unrun for this draft.
