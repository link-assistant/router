# Owned String-vector literal source draft

This continues the [native caller draft](owned-text-vector-forward-source-draft.md).
Every new rule, source equation, receiving case, strict target and Rust oracle
remains **UNRUN**. No local parser, translator, preparer, test, compiler or Rust
tool was executed, and no CI/review feedback was inspected.

The singleton variadic runtime wrapper calls the existing paired String-vector
`from_slice` core with a freshly frozen argument array. Its native counterpart
remains the actual qualified `vec_text_from_slice(&[...])` call; there is no
invented native literal function. The source reader derives from the complete
failure-aware primitive literal reader, with two exact new physical pins. Those
inputs join the original eight String-vector inputs and keep whole FD/hash/CST/
closing checks. No source, input, owner, hash or result cache crosses operations.

The literal source bound is 64 individual operands. The paired runtime still
supports its independent 4,096-value resource bound. String is never primitive
Copy. Actual owned String operands move into the temporary array once, then the
native core clones them into an independent Vec and drops the temporary. Lookup
returns an independent optional String, not a loan into that Vec.

The current source ABI checks the complete actual import, captured freeze,
variadic body and strict declaration, then joins the actual original cloned
slice ABI. Same-root receiving observations contain ten complete source records;
separate mirrored roots contain eighteen. Shape rows and public observations
retain false native type/caller/namespace authority. Cached source records and
their native ABI snapshot are frozen, so public observation mutation cannot
alter later private source checks. Returned per-call shape data is recreated.

Both explicit String-vector caller profiles now bind the actual new imports and
written utility types, check original operands, run their full move/loan pass,
serialize/reparse meta and reissue the original complete sources. Owned String
operands remain moves. Actual readonly str operands use the existing explicit,
source-qualified owned-text copy rule; its text-core dependencies and resource
contract remain in force. A borrowed str is not relabeled as owned String.
Both interpreters, runtime preparation and strict TS/Rust emission contain the
new call path. Whole-operation source sharing is selected without using a public
flag as an admission permit.

The native path keeps the original active module/scopes, actual original core
binding, checker methods and private caller/emission issuer. It lowers only an
actual single shared bounded array passed to the fixed clone-from-slice core,
checks each actual by-value standard String in order and flattens the temporary
to the paired runtime call. This closed call returns no temporary loan; it does
not manufacture array promotion or escaping shared storage proof. The complete
original ownership flow consumes every argument and retains its ordinary
branch, loop, helper and argument-duration loan checks.

The canonical inverse now observes this exact temporary-array form and proposes
the actual variadic import before fresh JS source/type/move reissue. Source
review found that the prior primitive Rust reader lacked primary array syntax.
An additive bounded literal reader supplies that syntax; original primitive
reader APIs and their refusal domain remain unchanged. The inverse consumers
opt into the new reader. Full authoritative Rust reproduction is still required,
and syntax observations cannot issue executable IR.

Independent source cases cover runtime extrema and Unicode/NUL, malformed String
payloads, exact physical inputs, mirrors, strict declarations, public observation
mutation, both JS/TS/interpreter/meta/inverse paths, native temporary arrays,
64 individual native parameters, aliases, duplicate moves, source spread/excess
arity, stale source, readonly results, reader refusals and full source inverses.
Independent Rust oracle source uses the real public core edge and is CI-only.
The original native core and exact 24-step root history remain unchanged.

Production source adoption, all original owner/namespace qualification, broader
aggregate/capture/reference/async/network/state coverage, complete receiving
qualification, platform/profile freshness, resource/performance evidence and
full bidirectional synchronization remain OPEN. This source draft does not
establish executable coverage, original-body equivalence or runtime parity.
