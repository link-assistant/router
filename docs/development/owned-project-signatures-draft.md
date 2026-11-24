# Paired project signature proposal draft

The owned project unit can now draft synchronization after edits to JS modules
whose parameter annotations have been removed. A complete source copy of the
existing annotation proposer obtains domains from a fresh whole-project TS
check, including its actual dependency bindings and all helper bodies. It
selects matching module functions and parameter identities, proposes only
missing JSDoc/constructor return annotations, and then sends the complete
edited JS project through the existing private checker and CST/meta pipeline.

Paired source is a proposal for input types, not authority for a changed JS
body. Unsupported paired bodies, missing modules, mismatched parameter names,
out-of-domain new bodies and source conflicts still refuse. The paired project
is checked once when needed within the invocation; fully annotated JS requires
no paired target body. The temporary batch membership is removed in `finally`.
There is no cross-invocation source/hash/owner/verdict/result cache.

Generated runtime import identifiers avoid every actual native identifier in
the module. Byte inputs and base64 error inputs reuse existing checked ABI
boundaries. Complete original JS/TS source, source spans and CST inverses enter
the transaction metadata. Actual JS authority remains unchanged on disk. Rust
restoration also proposes these annotations when its baseline JS lacks them.

The prior implementation, transaction adapter and source preparer retain
complete adjacent originals and the two required substitution sequences.
Independent whole-project behavior, incompatible body, missing source, stale
source, identifier collision and invocation membership regressions are drafted
and unrun. New untyped functions without any written signature still need an
explicit type source. General inference/generics, other effects, production
coverage, receiving qualification and issue completion remain open.
