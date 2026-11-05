# Owned ordered text maps: source draft

This batch drafts an opaque bounded compatibility core for `BTreeMap<String,
String>`-shaped application needs. It does not silently replace `HashMap`, JSON
objects, maps with other payloads, or a borrowed standard map parameter. All
execution is UNRUN; CI/review feedback remains NOT_INSPECTED.11/70 source bundles
remain DRAFTED and59 OPEN. No application function or acceptance row is closed.

## Matching implementations and boundary

The actual public native module is
`rust/src/translation_ordered_text_map_core.rs`. Its `OrderedTextMap` has a
private `BTreeMap<String,String>` field, with deliberately untranslated standard
library internals. Ten operations cover empty construction, owned pair-list
construction, consuming insertion/removal, borrowed lookup/membership/length,
explicit independent copy, sorted owned pairs and sorted owned keys. Deriving
Clone is a native library detail; no general application `.clone()` admission
is introduced. The JavaScript ABI and strict declarations live in
`tools/translation/ordered-text-map-20261102-runtime.{mjs,d.mts}`.

Both implementations impose4096 input/final entries and1048576 aggregate UTF-8
bytes. Input pair limits count superseded duplicate occurrences before collapse;
last value wins, while final order is ascending native UTF-8 key order. Insertion
checks the new pair and complete final map, so replacement can shrink a full
map. Removal/lookup keys retain the same string-byte bound. JavaScript validates
Unicode scalar strings, including rejection of lone UTF-16 surrogates, and orders
by scalar values rather than native JavaScript UTF-16 comparison. Empty strings,
NUL, composed/decomposed spellings and prototype-like keys remain distinct data.
Neither implementation normalizes Unicode or uses locale collation.

JavaScript snapshots ordinary dense own-data arrays and exact map records,
rejects accessors/proxies/sparse/exotic/unsorted/duplicate carrier shapes, and
freezes independent output container storage. Public structural ABI acceptance
and the erased TypeScript brand never establish a native owner, move, borrow,
Copy, Drop or source identity. No hostile cold-import or replaced-primordial
qualification is claimed. Allocation/OOM and native panic-hook/process behavior
are outside successful bounded operation equivalence; runtime failures have no
claim of identical language exception representations.

`get` returns `Option<&str>` tied exclusively to the map receiver in Rust;
JavaScript returns the existing Some/None-shaped scalar ABI. Future caller
checking must preserve that map-root loan across moves/writes/later arguments.
The temporary key grants no returned lifetime. No mutable map aliases are exposed.

## Automated source and descriptor paths

`ordered-text-map-20261102-contracts.mjs` contains one ten-row operation catalogue
with argument/result roles, consumed/shared inputs, map-root returned-loan data,
ordering and explicit incomplete caller qualification fields. The declaration
emitter uses those same descriptors and refuses unknown roles; it has not run.
Independent case source checks the complete declaration text rather than counting
API declarations as application coverage.

`proposeOrderedTextMapSourceCopies` uses exactly `language` then `repository`
substitution sequences over complete pinned original modules. It copies the
existing fixed-type core selector and adds the actual public root edge without
changing any original selector API. Every full Rust/JavaScript equation transports
serialized/reparsed lossless CST and retains its full inverse. Pins identify
copy ancestry only. No copied source is executed or automatically installed by
that proposal API.

`selectOriginalOrderedTextMapCore` retains the original selector's genuine source
view, active configuration, actual physical native file, exact root declaration,
resolved namespace origin, declaration span and closing joins. A same-path scope
copy, hash, forged source view, attribute/alias, changed native source or guessed
module name cannot replace those joins. Its result is detached DATA and does not
issue a checked native map type, source-call receipt or executable caller. The
full native constant is retained separately for that exact source comparison.

## Independent case sources and current evidence

Eight runtime cases independently describe missing versus empty values, UTF-8
order, duplicate replacement, independent immutable copies, normalization and
special keys, no-coercion/proxy/accessor refusals, and complete input/output
resource boundaries. Three source cases describe genuine module selection,
forged/stale source refusal and full two-phase source-copy/CST inverses. One
strict TypeScript case file describes the opaque declaration and integer ABI,
scalar key and immutable output constraints. Ten independent native cases cover
values, ordering, replacement/removal/copy, entry and byte boundaries. The native
file is an ordinary `rust/tests/*_test.rs` target for gated CI discovery; no local
Rust tool has run. The declaration case still needs explicit future strict-driver
integration; a `.mts` source file alone is not compiler execution evidence.

The complete packet retains every implementation/case above, both complete
before/after source equations, and unchanged full production review sources.
Packet a5028ebb4b62360871ca0e892ccf07c3e010c305c2c5a2b8e03c15225b35d29b256: `a5028ebb4b62360871ca0e892ccf07c3e010c305c2c5a2b8e03c15225b35d29b` (127225 decoded / 29108 packed bytes).
These are authored source bytes, not parser/semantic/runtime test artifacts.
Historical archives remain unchanged.

## Actual application targets and remaining work

The retained actual source review targets include `openai::resolve_model_with`
and `query_stream_requested` (borrowed text-map lookup), the `RejectionFile`
record/get/remove/serialization callers in `refresh_rejections.rs`, and nested
text maps in `deploy_config.rs`. They are prioritization examples, not a current
complete inventory or measured function denominator. None is migrated or
qualified in this batch. Existing pure JSON state operations already cover
JSON-object mutation; this core supplies a different opaque native text-map
boundary rather than duplicating those operations.

Still OPEN: actual private native type/parser/checked-meta registration for the
opaque newtype; qualified caller capture and whole-body ownership/loan checking;
forward checked interpretation, target imports/guards and packaging; reverse
written-type/witness admission, checked interpretation, Rust emission and paired
edit inversion; actual complete application migration with resolved original
standard-map owners; record/tuple/pair-list and serde/trait boundaries; full
production input-domain qualification; mirrored/export/profile source freshness;
receiving/platform/performance qualification and synchronization. A header/role
catalogue alone must not activate any of these paths. Standard library map
internals may stay native after those actual caller boundaries are qualified.

No existing resource or source refusal is relaxed. The root source addition has
not been regenerated into older bank/profile pins; complete follow-up equations
and freshness evidence remain required before claiming those outputs current.
