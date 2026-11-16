# Owned JSON lists and shared slices: source draft

Every implementation and independent case remains unrun. The complete existing
JSON state contract now composes all list-bearing operations with the resource
caller checker: values copy/extraction, owned array construction, borrowed
extension and moved-list extension. Existing native/runtime implementations,
physical unit source mappings and runtime budgets remain unchanged.

Owned `Vec<Json>` and shared `[Json]` inputs have distinct closed domains.
Public shared inputs must name an actual imported list operation parameter;
an ordinary array annotation cannot establish that ABI. Owned list locals must
come from actual checked operations. Moving them twice, changing their domain,
returning a slice rooted in local storage or replacing storage with a live view
remains refused. Public shared aliases and helper results retain every original
root. A temporary owned list may be borrowed by a complete consuming library
call that returns independent owned storage; it cannot supply an escaping root.

Mutable owned list replacement uses the same actual loop/branch ownership and
root joins as owned JSON. The structural returned-reference query retains slice
lifetimes. Native emission uses the fully qualified standard Vec type and the
actual native slice type; projection and source-unit annotation proposals keep
those domains and require complete fresh original caller checking. No public
metadata or erased array shape can issue those types.

Complete original contracts, source capture, domains, flow, native projection,
reference-query and paired-source-unit files retain native-selected language
then repository substitutions, serialized/reparsed CST and full inverses.
Independent unrun JS/strict TS cases cover values, moves, input identity,
replacement, public aliases, local shared loans, malformed adapter inputs and
paired-source annotations. Separate Rust oracle source covers the same finite
values and native slice identity. General iteration/callback rules, generic
element domains, temporary escaping loans, incompatible state, namespace/bootstrap,
production parity and all unfinished requirements remain open.
